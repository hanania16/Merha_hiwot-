import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EthiopianMonth, PaymentMethod, PaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { ETHIOPIAN_MONTHS, currentEthiopianYear, monthLabel } from '../../common/constants/ethiopian-calendar';
import {
  FEE_TRACKING_START_YEAR,
  baseFeeFor,
  feeMonthsElapsed,
  isWithinFeeTrackingWindow,
} from '../../common/constants/fee-rules';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { RecordClassPaymentsDto } from './dto/record-class-payments.dto';
import { QueryFeesDto } from './dto/query-fees.dto';

const monthOrder = (month: EthiopianMonth) =>
  ETHIOPIAN_MONTHS.find((m) => m.value === month)?.order ?? 1;

/** Paid months that fall inside the fee tracking window (Nehase 2018 onward). */
const countPaidInWindow = (
  payments: { status: PaymentStatus; ethiopianYear: number; month: EthiopianMonth }[],
) => payments.filter((p) => p.status === 'PAID' && isWithinFeeTrackingWindow(p.ethiopianYear, monthOrder(p.month))).length;

@Injectable()
export class StudentFeesService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  /**
   * Finance never creates students — it imports the active roster maintained
   * by the Attendance dashboard and overlays payment status per Ethiopian month.
   * Fee tracking starts at Nehase 2018; months before it are never charged.
   */
  async listStudentFeeStatus(query: QueryFeesDto, ethiopianYear = currentEthiopianYear()) {
    const students = await this.prisma.student.findMany({
      where: {
        status: 'ACTIVE',
        classId: query.classId,
        OR: query.search
          ? [
              { fullName: { contains: query.search, mode: 'insensitive' } },
              { fullNameAmharic: { contains: query.search, mode: 'insensitive' } },
              { parentName: { contains: query.search, mode: 'insensitive' } },
              { studentCode: { contains: query.search, mode: 'insensitive' } },
            ]
          : undefined,
      },
      include: { class: true, monthlyPayments: { where: { ethiopianYear: { gte: FEE_TRACKING_START_YEAR } } } },
      orderBy: { fullName: 'asc' },
    });

    const elapsed = feeMonthsElapsed();

    const mapped = students.map((s) => {
      const paidCount = countPaidInWindow(s.monthlyPayments);
      const unpaidCount = Math.max(elapsed - paidCount, 0);
      const lastPaid = s.monthlyPayments
        .filter((p) => p.status === 'PAID')
        .sort((a, b) => (b.paidDate?.getTime() ?? 0) - (a.paidDate?.getTime() ?? 0))[0];

      const overallStatus =
        paidCount === 0 ? 'UNPAID' : paidCount >= elapsed ? 'PAID' : 'PARTIAL';

      const base = baseFeeFor({
        classLevel: s.class.level,
        isWorkingMember: s.isWorkingMember,
        monthlySalary: s.monthlySalary ? Number(s.monthlySalary) : null,
      });
      const selectedMonth = query.month
        ? s.monthlyPayments.find((p) => p.month === query.month) ?? null
        : null;

      return {
        studentId: s.id,
        studentCode: s.studentCode,
        fullName: s.fullName,
        fullNameAmharic: s.fullNameAmharic,
        className: s.class.name,
        classLevel: s.class.level,
        parentName: s.parentName,
        parentPhone: s.parentPhone,
        isWorkingMember: s.isWorkingMember,
        status: overallStatus,
        unpaidMonths: unpaidCount,
        lastPaymentDate: lastPaid?.paidDate ?? null,
        lastPaidMonth: lastPaid?.month ?? null,
        lastPaidYear: lastPaid ? lastPaid.ethiopianYear : null,
        monthlyBaseFee: base,
        outstandingBalance: Math.round(unpaidCount * base * 100) / 100,
        months: s.monthlyPayments,
        selectedMonth,
      };
    });

    return query.status ? mapped.filter((m) => m.status === query.status) : mapped;
  }

  async getStudentPaymentHistory(studentId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: { monthlyPayments: { orderBy: [{ ethiopianYear: 'desc' }] }, class: true },
    });
    if (!student) throw new NotFoundException('Student not found');
    return student;
  }

  /** Full outstanding-balance breakdown for the Record Payment dialog. */
  async getOutstandingBalance(studentId: string, ethiopianYear = currentEthiopianYear()) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: { class: true, monthlyPayments: { where: { ethiopianYear: { gte: FEE_TRACKING_START_YEAR } } } },
    });
    if (!student) throw new NotFoundException('Student not found');

    const base = baseFeeFor({
      classLevel: student.class.level,
      isWorkingMember: student.isWorkingMember,
      monthlySalary: student.monthlySalary ? Number(student.monthlySalary) : null,
    });

    const elapsed = feeMonthsElapsed();
    const paidCount = countPaidInWindow(student.monthlyPayments);
    const unpaidCount = Math.max(elapsed - paidCount, 0);
    const previousUnpaidMonths = Math.max(unpaidCount - 1, 0);
    const previousUnpaidTotal = Math.round(previousUnpaidMonths * base * 100) / 100;
    const currentMonthBase = unpaidCount > 0 ? base : 0;
    const totalDue = Math.round((currentMonthBase + previousUnpaidTotal) * 100) / 100;

    return {
      studentId,
      monthlyBaseFee: base,
      currentMonthBase,
      previousUnpaidMonths,
      previousUnpaidTotal,
      totalDue,
      paymentHistory: student.monthlyPayments,
    };
  }

  /** Records payment for one or more Ethiopian months; idempotent upsert per month. No automatic penalties. */
  async recordPayment(dto: RecordPaymentDto, userId: string) {
    const student = await this.prisma.student.findUnique({ where: { id: dto.studentId }, include: { class: true } });
    if (!student) throw new NotFoundException('Student not found');

    const base = baseFeeFor({
      classLevel: student.class.level,
      isWorkingMember: student.isWorkingMember,
      monthlySalary: student.monthlySalary ? Number(student.monthlySalary) : null,
    });
    const amountPerMonth = dto.amountPerMonth ?? base;

    // The MonthlyPayment upsert and its derived Income row run in ONE transaction
    // so a payment can never become PAID without its ledger row (and vice-versa).
    return this.prisma.$transaction(async (tx) => {
      const results = [];
      for (const month of dto.months) {
        const total = Math.round(amountPerMonth * 100) / 100;
        const { payment, newlyPaid } = await this.upsertPayment(tx.monthlyPayment, {
          studentId: dto.studentId,
          ethiopianYear: dto.ethiopianYear,
          month,
          amount: total,
          notes: dto.notes,
          userId,
        });
        if (newlyPaid) {
          await this.deriveFeeIncome(tx, payment, {
            studentName: student.fullName,
            ethiopianYear: dto.ethiopianYear,
            month,
            userId,
          });
        }
        results.push(payment);
      }
      return results;
    });
  }

  /**
   * Single write path for "a student has paid a month" — idempotent upsert plus
   * the PAYMENT_RECORDED / PAYMENT_UPDATED audit log. Shared by single-student
   * and whole-class bulk recording so both produce identical rows and audits.
   * `newlyPaid` is true when the record did not already have PAID status (a new
   * row or an UNPAID→PAID transition) — callers use it to avoid re-deriving
   * ledger income on idempotent re-runs.
   */
  private async upsertPayment(
    monthlyPayment: Prisma.MonthlyPaymentDelegate,
    args: { studentId: string; ethiopianYear: number; month: EthiopianMonth; amount: number; notes?: string; userId: string },
  ): Promise<{ payment: Prisma.MonthlyPaymentGetPayload<{}>; newlyPaid: boolean }> {
    const existing = await monthlyPayment.findUnique({
      where: {
        studentId_ethiopianYear_month: {
          studentId: args.studentId,
          ethiopianYear: args.ethiopianYear,
          month: args.month,
        },
      },
    });

    const payment = await monthlyPayment.upsert({
      where: {
        studentId_ethiopianYear_month: {
          studentId: args.studentId,
          ethiopianYear: args.ethiopianYear,
          month: args.month,
        },
      },
      update: {
        status: 'PAID',
        baseAmount: args.amount,
        penaltyAmount: 0,
        amount: args.amount,
        notes: args.notes,
        paidDate: new Date(),
        recordedById: args.userId,
      },
      create: {
        studentId: args.studentId,
        ethiopianYear: args.ethiopianYear,
        month: args.month,
        status: 'PAID',
        baseAmount: args.amount,
        penaltyAmount: 0,
        amount: args.amount,
        notes: args.notes,
        paidDate: new Date(),
        recordedById: args.userId,
      },
    });

    await this.audit.log({
      userId: args.userId,
      action: existing ? 'PAYMENT_UPDATED' : 'PAYMENT_RECORDED',
      entityType: 'MonthlyPayment',
      entityId: payment.id,
      oldValue: existing,
      newValue: payment,
    });

    return { payment, newlyPaid: !existing || existing.status !== 'PAID' };
  }

  /**
   * Idempotent ledger byproduct: creates exactly one STUDENT_FEES Income row for
   * a MonthlyPayment that actually became PAID, keyed by
   * `STUDENT_FEE:{studentId}:{year}:{month}` so re-running a batch or re-paying
   * an already-paid month is a no-op. The key is enforced by a DB unique
   * constraint on `Income.referenceNumber` and written with an atomic `upsert`,
   * so two concurrent recordings of the same student/month cannot double-write —
   * the loser becomes a no-op instead of a duplicate. This is the single path
   * that turns a MonthlyPayment into an Income ledger row — dashboards read the
   * payment's amount directly, so the ledger can never drift from collections.
   */
  private async deriveFeeIncome(
    db: Prisma.TransactionClient,
    payment: { id: string; studentId: string; amount: number | Prisma.Decimal; paidDate: Date | null },
    args: {
      studentName: string;
      ethiopianYear: number;
      month: EthiopianMonth;
      accountId?: string;
      paymentMethod?: PaymentMethod;
      userId: string;
    },
  ) {
    const marker = `STUDENT_FEE:${payment.studentId}:${args.ethiopianYear}:${args.month}`;

    let accountId = args.accountId;
    if (!accountId) {
      const account = await db.account.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'asc' } });
      accountId = account?.id;
    }
    if (!accountId) return null;

    return db.income.upsert({
      where: { referenceNumber: marker },
      update: {},
      create: {
        date: payment.paidDate ?? new Date(),
        amount: payment.amount,
        category: 'STUDENT_FEES',
        sourceType: 'STUDENT_FEE',
        paymentMethod: args.paymentMethod ?? 'CASH',
        description: `Student fee — ${args.studentName} — ${monthLabel(args.month)} ${args.ethiopianYear}`,
        referenceNumber: marker,
        accountId,
        monthlyPaymentId: payment.id,
        studentId: payment.studentId,
        recordedById: args.userId,
      },
    });
  }

  /**
   * Whole-class bulk recording. Applies the class fee rule per student (or an
   * optional per-student override) for the selected months, reusing the exact
   * same upsert+audit path as single-student recording. The whole batch runs in
   * one DB transaction. A derived STUDENT_FEES Income row is created per
   * student-month that actually became newly PAID (see deriveFeeIncome) so the
   * ledger reflects real collections — never as an aggregate accrual guess.
   */
  async recordClassPayments(dto: RecordClassPaymentsDto, userId: string) {
    const students = await this.prisma.student.findMany({
      where: { status: 'ACTIVE', class: { level: dto.classLevel } },
      include: { class: true },
    });
    if (students.length === 0) {
      throw new BadRequestException('No active students found in this class level');
    }

    return this.prisma.$transaction(async (tx) => {
      const monthResults = [];

      for (const month of dto.months) {
        const paymentIds: string[] = [];
        let monthTotal = 0;
        let newlyPaid = false;
        let incomeCount = 0;

        for (const s of students) {
          const defaultAmount = baseFeeFor({
            classLevel: s.class.level,
            isWorkingMember: s.isWorkingMember,
            monthlySalary: s.monthlySalary ? Number(s.monthlySalary) : null,
          });
          const amount =
            dto.amountOverrides && dto.amountOverrides[s.id] != null
              ? Math.round(Number(dto.amountOverrides[s.id]) * 100) / 100
              : Math.round(defaultAmount * 100) / 100;

          monthTotal += amount;
          const { payment, newlyPaid: np } = await this.upsertPayment(tx.monthlyPayment, {
            studentId: s.id,
            ethiopianYear: dto.ethiopianYear,
            month,
            amount,
            notes: dto.notes,
            userId,
          });
          if (np) {
            newlyPaid = true;
            const income = await this.deriveFeeIncome(tx, payment, {
              studentName: s.fullName,
              ethiopianYear: dto.ethiopianYear,
              month,
              accountId: dto.accountId,
              paymentMethod: dto.paymentMethod,
              userId,
            });
            if (income) incomeCount++;
          }
          paymentIds.push(payment.id);
        }

        const total = Math.round(monthTotal * 100) / 100;

        monthResults.push({
          month,
          classLevel: dto.classLevel,
          studentCount: students.length,
          amount: total,
          incomeCreated: newlyPaid && incomeCount > 0,
          incomeCount,
          paymentCount: paymentIds.length,
        });
      }

      return monthResults;
    });
  }

  /** Students who haven't paid the current Ethiopian month — used by both the Finance reminder and the Attendance "fee reminder" section. */
  async getUnpaidThisMonth(ethiopianYear = currentEthiopianYear(), currentMonth?: string) {
    const students = await this.prisma.student.findMany({
      where: { status: 'ACTIVE' },
      include: { class: true, monthlyPayments: { where: { ethiopianYear: { gte: FEE_TRACKING_START_YEAR } } } },
    });

    const elapsed = feeMonthsElapsed();

    return students
      .filter((s) => {
        if (!currentMonth) {
          return countPaidInWindow(s.monthlyPayments) < elapsed;
        }
        const thisMonthPaid = s.monthlyPayments.some((p) => p.month === currentMonth && p.status === 'PAID');
        return !thisMonthPaid;
      })
      .map((s) => ({
        studentId: s.id,
        studentCode: s.studentCode,
        fullName: s.fullName,
        className: s.class.name,
        parentPhone: s.parentPhone,
      }));
  }
}
