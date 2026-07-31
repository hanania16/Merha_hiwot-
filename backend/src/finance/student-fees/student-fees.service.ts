import { Injectable, NotFoundException } from '@nestjs/common';
import { EthiopianMonth, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { ETHIOPIAN_MONTHS, currentEthiopianYear, toEthiopian } from '../../common/constants/ethiopian-calendar';
import { LATE_PENALTY_CAP, baseFeeFor, latePenaltyFor, latePenaltyForMonth } from '../../common/constants/fee-rules';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { QueryFeesDto } from './dto/query-fees.dto';

const monthOrder = (month: EthiopianMonth) =>
  ETHIOPIAN_MONTHS.find((m) => m.value === month)?.order ?? 1;

@Injectable()
export class StudentFeesService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  /**
   * Finance never creates students — it imports the active roster maintained
   * by the Attendance dashboard and overlays payment status per Ethiopian month.
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
      include: { class: true, monthlyPayments: { where: { ethiopianYear } } },
      orderBy: { fullName: 'asc' },
    });

    const totalMonths = ETHIOPIAN_MONTHS.length;

    const mapped = students.map((s) => {
      const paidMonths = s.monthlyPayments.filter((p) => p.status === 'PAID');
      const unpaidCount = totalMonths - paidMonths.length;
      const lastPaid = paidMonths.sort(
        (a, b) => (b.paidDate?.getTime() ?? 0) - (a.paidDate?.getTime() ?? 0),
      )[0];

      const overallStatus =
        paidMonths.length === totalMonths ? 'PAID' : paidMonths.length === 0 ? 'UNPAID' : 'PARTIAL';

      const base = baseFeeFor({
        classLevel: s.class.level,
        isWorkingMember: s.isWorkingMember,
        monthlySalary: s.monthlySalary ? Number(s.monthlySalary) : null,
      });
      const penalty = overallStatus !== 'PAID' ? latePenaltyFor(s.class.level) : 0;
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
        lastPaidYear: lastPaid ? ethiopianYear : null,
        monthlyBaseFee: base,
        currentMonthPenalty: penalty,
        outstandingBalance: unpaidCount > 0 ? Math.round((unpaidCount * base + penalty) * 100) / 100 : 0,
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
      include: { class: true, monthlyPayments: { where: { ethiopianYear } } },
    });
    if (!student) throw new NotFoundException('Student not found');

    const base = baseFeeFor({
      classLevel: student.class.level,
      isWorkingMember: student.isWorkingMember,
      monthlySalary: student.monthlySalary ? Number(student.monthlySalary) : null,
    });

    const paidMonths = student.monthlyPayments.filter((p) => p.status === 'PAID');
    const unpaidMonthCount = ETHIOPIAN_MONTHS.length - paidMonths.length;
    const currentMonthPenalty = unpaidMonthCount > 0 ? latePenaltyFor(student.class.level) : 0;
    const previousUnpaidMonths = Math.max(unpaidMonthCount - 1, 0);
    const previousUnpaidTotal = Math.round(previousUnpaidMonths * base * 100) / 100;
    const currentMonthBase = unpaidMonthCount > 0 ? base : 0;
    const totalDue = Math.round((currentMonthBase + currentMonthPenalty + previousUnpaidTotal) * 100) / 100;

    return {
      studentId,
      monthlyBaseFee: base,
      currentMonthBase,
      currentMonthPenalty,
      previousUnpaidMonths,
      previousUnpaidTotal,
      totalDue,
      paymentHistory: student.monthlyPayments,
    };
  }

  /** Records payment for one or more Ethiopian months; idempotent upsert per month. Applies fee rules automatically. */
  async recordPayment(dto: RecordPaymentDto, userId: string) {
    const student = await this.prisma.student.findUnique({ where: { id: dto.studentId }, include: { class: true } });
    if (!student) throw new NotFoundException('Student not found');

    const base = baseFeeFor({
      classLevel: student.class.level,
      isWorkingMember: student.isWorkingMember,
      monthlySalary: student.monthlySalary ? Number(student.monthlySalary) : null,
    });
    const amountPerMonth = dto.amountPerMonth ?? base;

    const results = [];
    for (const month of dto.months) {
      const penalty = dto.includePenalty
        ? latePenaltyForMonth(student.class.level, dto.ethiopianYear, monthOrder(month))
        : 0;
      const total = Math.round((amountPerMonth + penalty) * 100) / 100;
      const existing = await this.prisma.monthlyPayment.findUnique({
        where: { studentId_ethiopianYear_month: { studentId: dto.studentId, ethiopianYear: dto.ethiopianYear, month } },
      });

      const payment = await this.prisma.monthlyPayment.upsert({
        where: { studentId_ethiopianYear_month: { studentId: dto.studentId, ethiopianYear: dto.ethiopianYear, month } },
        update: {
          status: 'PAID',
          baseAmount: amountPerMonth,
          penaltyAmount: penalty,
          amount: total,
          notes: dto.notes,
          paidDate: new Date(),
          recordedById: userId,
        },
        create: {
          studentId: dto.studentId,
          ethiopianYear: dto.ethiopianYear,
          month,
          status: 'PAID',
          baseAmount: amountPerMonth,
          penaltyAmount: penalty,
          amount: total,
          notes: dto.notes,
          paidDate: new Date(),
          recordedById: userId,
        },
      });

      await this.audit.log({
        userId,
        action: existing ? 'PAYMENT_UPDATED' : 'PAYMENT_RECORDED',
        entityType: 'MonthlyPayment',
        entityId: payment.id,
        oldValue: existing,
        newValue: payment,
      });

      results.push(payment);
    }
    return results;
  }

  /** Auto-creates an unpaid fee record for every active student for the given Ethiopian month. */
  async generateMonthlyFees(ethiopianYear: number, month: EthiopianMonth, userId: string) {
    const students = await this.prisma.student.findMany({
      where: { status: 'ACTIVE' },
      include: { class: true },
    });

    const today = toEthiopian(new Date());
    const records = students.map((student) => {
      const isWorkingMember = student.isWorkingMember;
      const base = baseFeeFor({
        classLevel: student.class.level,
        isWorkingMember,
        monthlySalary: student.monthlySalary ? Number(student.monthlySalary) : null,
      });
      const penalty =
        ethiopianYear < today.year || (ethiopianYear === today.year && monthOrder(month) < today.month)
          ? LATE_PENALTY_CAP[student.class.level]
          : 0;
      return {
        studentId: student.id,
        ethiopianYear,
        month,
        status: 'UNPAID' as PaymentStatus,
        baseAmount: base,
        penaltyAmount: penalty,
        amount: Math.round((base + penalty) * 100) / 100,
        recordedById: userId,
      };
    });

    const result = await this.prisma.monthlyPayment.createMany({
      data: records,
      skipDuplicates: true,
    });

    await this.audit.log({
      userId,
      action: 'MONTHLY_FEES_GENERATED',
      entityType: 'MonthlyPayment',
      entityId: `${ethiopianYear}-${month}`,
      oldValue: { ethiopianYear, month },
      newValue: { count: result.count },
    });

    return { generated: result.count, month, ethiopianYear };
  }

  /** Students who haven't paid the current Ethiopian month — used by both the Finance reminder and the Attendance "fee reminder" section. */
  async getUnpaidThisMonth(ethiopianYear = currentEthiopianYear(), currentMonth?: string) {
    const students = await this.prisma.student.findMany({
      where: { status: 'ACTIVE' },
      include: { class: true, monthlyPayments: { where: { ethiopianYear } } },
    });

    return students
      .filter((s) => {
        if (!currentMonth) {
          const paidCount = s.monthlyPayments.filter((p) => p.status === 'PAID').length;
          return paidCount < ETHIOPIAN_MONTHS.length;
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
