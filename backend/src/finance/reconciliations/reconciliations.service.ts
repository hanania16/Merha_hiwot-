import { Injectable, NotFoundException } from '@nestjs/common';
import { ReconciliationStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { FinanceAuditService } from '../../services/financeAuditService';
import { CreateReconciliationDto } from './dto/create-reconciliation.dto';
import { ResolveReconciliationDto } from './dto/resolve-reconciliation.dto';

@Injectable()
export class ReconciliationsService {
  constructor(private prisma: PrismaService, private financeAudit: FinanceAuditService) {}

  /** Runs a reconciliation — computes expected balance and stores the discrepancy. */
  run(dto: CreateReconciliationDto, userId: string) {
    return this.financeAudit.runReconciliation({
      accountId: dto.accountId,
      periodStart: new Date(dto.periodStart),
      periodEnd: new Date(dto.periodEnd),
      actualBalance: dto.actualBalance,
      performedBy: userId,
    });
  }

  findAll(accountId?: string) {
    return this.prisma.reconciliation.findMany({
      where: { accountId },
      include: {
        account: { select: { name: true, type: true } },
        performedBy: { select: { fullName: true } },
        resolvedBy: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const reconciliation = await this.prisma.reconciliation.findUnique({
      where: { id },
      include: {
        account: { select: { name: true, type: true } },
        performedBy: { select: { fullName: true } },
        resolvedBy: { select: { fullName: true } },
      },
    });
    if (!reconciliation) throw new NotFoundException('Reconciliation record not found');
    return reconciliation;
  }

  /** Investigation/resolution workflow. Discrepancies are investigated, never auto-corrected. */
  async resolve(id: string, dto: ResolveReconciliationDto, userId: string) {
    const existing = await this.prisma.reconciliation.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Reconciliation record not found');

    const resolved = dto.status === ReconciliationStatus.RESOLVED;
    return this.prisma.reconciliation.update({
      where: { id },
      data: {
        status: dto.status,
        resolutionNotes: dto.resolutionNotes,
        resolvedById: resolved ? userId : null,
        resolvedAt: resolved ? new Date() : null,
      },
    });
  }
}
