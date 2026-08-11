import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { IncomeService } from './income.service';
import { toEthiopian } from '../../common/constants/ethiopian-calendar';

@Injectable()
export class IncomeAutoRecordScheduler {
  private readonly logger = new Logger(IncomeAutoRecordScheduler.name);

  constructor(private income: IncomeService) {}

  /**
   * Runs daily at 00:30 Africa/Addis_Ababa. On the 26th (or later, as a
   * recovery if the 26th was missed) of every Ethiopian month it auto-generates
   * that month's UNPAID MonthlyPayment rows per active student. No revenue is
   * booked here — income is derived from PAID MonthlyPayment rows. Idempotent:
   * students that already have a row for the month are never re-created.
   */
  @Cron('30 0 * * *', { name: 'auto-monthly-student-fees', timeZone: 'Africa/Addis_Ababa' })
  async runDaily() {
    const { year, month, day } = toEthiopian(new Date());
    if (day < 26) return;

    const result = await this.income.autoRecordMonthlyFees(year, month);
    if (!result.alreadyRecorded) {
      this.logger.log(
        `Auto-generated student-fee rows for ${result.monthLabel} ${year}: ${result.created} created, ${result.skipped} skipped`,
      );
    }
  }
}
