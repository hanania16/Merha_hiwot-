import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { StudentFeesService } from '../../finance/student-fees/student-fees.service';

@Injectable()
export class WeeklyDigestService {
  private readonly logger = new Logger(WeeklyDigestService.name);

  constructor(
    private prisma: PrismaService,
    private studentFees: StudentFeesService,
  ) {}

  /**
   * Runs every Saturday at 08:00 server time. Creates one in-app WEEKLY_DIGEST
   * notification summarizing: students who haven't paid this month, and a
   * general "things to review" count. Visible to Administrators, Finance
   * Officers, and Attendance Officers via the bell icon.
   *
   * NOTE: this creates an in-app notification only. To also email/SMS this
   * digest, connect an email or SMS provider (e.g. via an MCP connector or
   * SMTP credentials) and call it at the end of runWeeklyDigest().
   */
  @Cron('0 8 * * 6', { name: 'weekly-digest-saturday', timeZone: 'Africa/Addis_Ababa' })
  async runWeeklyDigest() {
    this.logger.log('Generating Saturday weekly digest...');

    const unpaidThisMonth = await this.studentFees.getUnpaidThisMonth();

    const parts: string[] = [];
    if (unpaidThisMonth.length > 0) {
      parts.push(`${unpaidThisMonth.length} student(s) haven't paid this month's fee.`);
    }
    if (parts.length === 0) {
      parts.push('No urgent follow-ups this week — fees look healthy.');
    }

    await this.prisma.notification.create({
      data: {
        type: 'WEEKLY_DIGEST',
        title: 'Weekly report — things to review',
        message: parts.join(' '),
        metadata: {
          generatedAt: new Date().toISOString(),
          unpaidThisMonth,
        } as any,
      },
    });

    this.logger.log('Weekly digest notification created.');
    return { unpaidThisMonth };
  }

  /** Manual trigger for testing/demo — calls the same logic as the Saturday cron. */
  async runNow() {
    return this.runWeeklyDigest();
  }
}
