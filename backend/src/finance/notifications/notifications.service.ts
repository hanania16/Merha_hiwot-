import { Injectable } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const LARGE_EXPENSE_THRESHOLD = Number(process.env.LARGE_EXPENSE_THRESHOLD ?? 5000);

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  create(type: NotificationType, title: string, message: string, metadata?: Record<string, unknown>) {
    return this.prisma.notification.create({
      data: { type, title, message, metadata: metadata as any },
    });
  }

  async notifyLargeExpenseIfNeeded(amount: number, category: string, expenseId: string) {
    if (amount < LARGE_EXPENSE_THRESHOLD) return null;
    return this.create(
      'LARGE_EXPENSE',
      'Large expense recorded',
      `An expense of ${amount.toLocaleString()} ETB was recorded under ${category}.`,
      { expenseId, amount },
    );
  }

  async findAll(unreadOnly = false) {
    return this.prisma.notification.findMany({
      where: unreadOnly ? { isRead: false } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async markRead(id: string) {
    return this.prisma.notification.update({ where: { id }, data: { isRead: true } });
  }

  /** Recomputes unpaid-fee and missing-payment-record notifications. Intended to run on a schedule. */
  async refreshFeeNotifications(ethiopianYear: number, unpaidThresholdMonths = 1) {
    const students = await this.prisma.student.findMany({
      where: { status: 'ACTIVE' },
      include: { monthlyPayments: { where: { ethiopianYear } } },
    });

    const results = [];
    for (const student of students) {
      const unpaidCount = student.monthlyPayments.filter((p) => p.status !== 'PAID').length;
      if (unpaidCount >= unpaidThresholdMonths) {
        results.push(
          await this.create(
            'UNPAID_FEES',
            'Unpaid student fees',
            `${student.fullName} has ${unpaidCount} unpaid month(s) for ${ethiopianYear}.`,
            { studentId: student.id, unpaidCount },
          ),
        );
      }
      if (student.monthlyPayments.length === 0) {
        results.push(
          await this.create(
            'MISSING_PAYMENT_RECORD',
            'Missing payment record',
            `${student.fullName} has no payment records for ${ethiopianYear}.`,
            { studentId: student.id },
          ),
        );
      }
    }
    return results;
  }
}
