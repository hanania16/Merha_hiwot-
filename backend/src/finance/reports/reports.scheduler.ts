import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { FinanceReportsService } from './reports.service';

@Injectable()
export class FinanceReportsScheduler {
  private readonly logger = new Logger(FinanceReportsScheduler.name);

  constructor(private reports: FinanceReportsService) {}

  /**
   * Runs daily at 23:50 Africa/Addis_Ababa. When the day is the last day of an
   * Ethiopian month it saves a permanent MONTHLY report snapshot; on the last
   * Pagume day it also saves the YEARLY snapshot. Idempotent upserts mean a
   * period is never duplicated even if the job fires more than once.
   */
  @Cron('50 23 * * *', { name: 'finance-report-snapshots', timeZone: 'Africa/Addis_Ababa' })
  async runDailySnapshotCheck() {
    const saved = await this.reports.generateCurrentSnapshots();
    if (saved.length > 0) {
      this.logger.log(`Auto-generated report snapshot(s): ${JSON.stringify(saved)}`);
    }
  }
}
