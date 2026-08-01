import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ApprovalDecision, Prisma, TransactionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * The ONLY sanctioned way to edit an existing Income or Expense row. Every
 * mutation here runs inside a transaction and writes per-field audit rows, so
 * no silent overwrite can ever happen.
 */

export type LedgerEntity = 'Income' | 'Expense';

/** Minimal common shape of the Prisma income/expense delegates. */
interface LedgerDelegate {
  findUnique(args: { where: { id: string } }): Promise<Record<string, unknown> | null>;
  update(args: { where: { id: string }; data: Record<string, unknown> }): Promise<Record<string, unknown>>;
}

const INCOME_EDITABLE_FIELDS = [
  'date',
  'amount',
  'category',
  'sourceType',
  'paymentMethod',
  'description',
  'referenceNumber',
  'notes',
  'accountId',
  'receiptId',
  'monthlyPaymentId',
  'studentId',
];

const EXPENSE_EDITABLE_FIELDS = [
  'date',
  'amount',
  'category',
  'paymentMethod',
  'description',
  'referenceNumber',
  'receiptDocumentUrl',
  'notes',
  'accountId',
];

/** Normalize Decimal/Date values to JSON-serialisable primitives. */
function serialize(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'object' && 'toNumber' in (value as object)) {
    return Number((value as { toNumber(): number }).toNumber());
  }
  if (value instanceof Date) return value.toISOString();
  return value;
}

function comparable(value: unknown): unknown {
  return serialize(value);
}

function valuesEqual(a: unknown, b: unknown): boolean {
  const va = comparable(a);
  const vb = comparable(b);
  if (va === vb) return true;
  if (typeof va === 'number' && typeof vb === 'number') return va === vb;
  return false;
}

@Injectable()
export class FinanceAuditService {
  constructor(private prisma: PrismaService) {}

  private delegate(tx: Prisma.TransactionClient, entityType: LedgerEntity): LedgerDelegate {
    return (entityType === 'Income' ? tx.income : tx.expense) as unknown as LedgerDelegate;
  }

  /**
   * Wraps an Income/Expense update in a transaction, diffs the old vs new
   * value for each submitted field, and writes one audit_logs row per changed
   * field. Throws if `reason` is empty. Fields that belong to the approval
   * workflow (status, approvedById, approvedAt, recordedById) are stripped —
   * approvals must go through approveTransaction().
   */
  async auditedUpdate(params: {
    entityType: LedgerEntity;
    id: string;
    changes: Record<string, unknown>;
    changedBy: string;
    reason: string;
  }): Promise<{ id: string }> {
    const { entityType, id, changes, changedBy, reason } = params;

    if (!reason || !reason.trim()) {
      throw new BadRequestException('reason is required for finance edits');
    }

    const editable = entityType === 'Income' ? INCOME_EDITABLE_FIELDS : EXPENSE_EDITABLE_FIELDS;
    const clean: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(changes)) {
      if (editable.includes(key) && value !== undefined) clean[key] = value;
    }
    if (Object.keys(clean).length === 0) {
      throw new BadRequestException('No editable fields provided');
    }

    return this.prisma.$transaction(async (tx) => {
      const delegate = this.delegate(tx, entityType);
      const existing = await delegate.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException(`${entityType} record not found`);

      const data = { ...clean };
      if (data.date) data.date = new Date(data.date as string);

      const updated = await delegate.update({ where: { id }, data });

      const auditRows: Prisma.AuditLogCreateManyInput[] = [];
      for (const [field, newValue] of Object.entries(clean)) {
        const oldValue = existing[field];
        if (valuesEqual(oldValue, newValue)) continue;
        auditRows.push({
          userId: changedBy,
          changedById: changedBy,
          action: `${entityType.toUpperCase()}_FIELD_UPDATED:${field}`,
          entityType,
          entityId: id,
          reason,
          oldValue: { [field]: serialize(oldValue) } as Prisma.InputJsonValue,
          newValue: { [field]: serialize(newValue) } as Prisma.InputJsonValue,
        });
      }
      if (auditRows.length > 0) {
        await tx.auditLog.createMany({ data: auditRows });
      }

      return updated as { id: string };
    });
  }

  /**
   * Records a full approval/rejection in TransactionApproval, flips the parent
   * record's status (approvedBy/approvedAt only on APPROVED), and logs to the
   * audit trail. A user can never approve/reject a transaction they recorded.
   */
  async approveTransaction(params: {
    entityType: LedgerEntity;
    id: string;
    approverId: string;
    decision: ApprovalDecision;
    comments?: string;
  }) {
    const { entityType, id, approverId, decision, comments } = params;

    return this.prisma.$transaction(async (tx) => {
      const delegate = this.delegate(tx, entityType);
      const existing = await delegate.findUnique({ where: { id } });

      if (!existing) throw new NotFoundException(`${entityType} record not found`);
      if (existing.status === decision) {
        throw new BadRequestException(`${entityType} is already ${decision.toLowerCase()}`);
      }
      if (existing.recordedById === approverId) {
        throw new ForbiddenException('You cannot approve a transaction you recorded yourself');
      }

      await tx.transactionApproval.create({
        data: {
          incomeId: entityType === 'Income' ? id : null,
          expenseId: entityType === 'Expense' ? id : null,
          decision,
          approverId,
          comments,
        },
      });

      const data =
        decision === ApprovalDecision.APPROVED
          ? { status: TransactionStatus.APPROVED, approvedById: approverId, approvedAt: new Date() }
          : { status: TransactionStatus.REJECTED };

      const updated = await delegate.update({ where: { id }, data });

      await tx.auditLog.create({
        data: {
          userId: approverId,
          changedById: approverId,
          action: `${entityType.toUpperCase()}_${decision}`,
          entityType,
          entityId: id,
          reason: comments ?? `${decision.toLowerCase()} by approver`,
          oldValue: { status: existing.status } as Prisma.InputJsonValue,
          newValue: {
            status: updated.status,
            approvedById: updated.approvedById,
            approvedAt: updated.approvedAt,
          } as Prisma.InputJsonValue,
        },
      });

      return updated;
    });
  }

  /**
   * Runs a cash/bank reconciliation. expectedBalance is SUM(approved income) -
   * SUM(approved expenses) up to periodEnd for the account; discrepancy is
   * actualBalance - expectedBalance and is STORED, never reconciled away.
   * Income/Expense rows are never mutated to force a match.
   */
  async runReconciliation(params: {
    accountId: string;
    periodStart: Date;
    periodEnd: Date;
    actualBalance: number;
    performedBy: string;
  }) {
    const { accountId, periodStart, periodEnd, actualBalance, performedBy } = params;

    const account = await this.prisma.account.findUnique({ where: { id: accountId } });
    if (!account) throw new NotFoundException('Account not found');

    const [incomeAgg, expenseAgg] = await Promise.all([
      this.prisma.income.aggregate({
        _sum: { amount: true },
        where: { accountId, status: TransactionStatus.APPROVED, date: { lte: periodEnd } },
      }),
      this.prisma.expense.aggregate({
        _sum: { amount: true },
        where: { accountId, status: TransactionStatus.APPROVED, date: { lte: periodEnd } },
      }),
    ]);

    const expectedBalance = Number(incomeAgg._sum.amount ?? 0) - Number(expenseAgg._sum.amount ?? 0);
    const discrepancy = Number(actualBalance) - expectedBalance;
    const status = Math.abs(discrepancy) < 0.01 ? 'MATCHED' : 'DISCREPANCY_FOUND';

    return this.prisma.reconciliation.create({
      data: {
        accountId,
        periodStart,
        periodEnd,
        expectedBalance,
        actualBalance,
        discrepancy,
        status: status as never,
        performedById: performedBy,
      },
    });
  }
}
