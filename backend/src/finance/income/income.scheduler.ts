import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { IncomeService } from './income.service';
import { ETHIOPIAN_MONTHS, monthLabel, toEthiopian } from '../../common/constants/ethiopian-calendar';

@Injectable()
export class IncomeAutoRecordScheduler {
  private readonly logger = new Logger(IncomeAutoRecordScheduler.name);

  constructor(private income: IncomeService) {}

  /**
   * Runs daily at 00:30 Africa/Addis_Ababa. On the 26th (or later, as a
   * recovery if the 26th was missed) of every Ethiopian month it auto-records
   * that month's student-fee income per class level. Idempotent — a month is
   * only ever recorded once.
   */
  @Cron('30 0 * * *', { name: 'auto-monthly-student-fees', timeZone: 'Africa/Addis_Ababa' })
  async runDaily() {
    const { year, month, day } = toEthiopian(new Date());
    if (day < 26) return;

    const result = await this.income.autoRecordMonthlyFees(year, month);
    if (!result.alreadyRecorded) {
      const name = ETHIOPIAN_MONTHS.find((m) => m.order === month)?.value;
      this.logger.log(
        `Auto-recorded student-fee income for ${name ? monthLabel(name) : month} ${year}: ${JSON.stringify(result.results)}`,
      );
    }
  }
}
