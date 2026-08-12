import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { IncomeService } from './income.service';
import { toEthiopian } from '../../common/constants/ethiopian-calendar';

@Injectable()
export class IncomeAutoRecordScheduler {
  private readonly logger = new Logger(IncomeAutoRecordScheduler.name);

  constructor(private income: IncomeService) {}

  /**
   * Runs daily at 00:30 Africa/Addis_Ababa. From the 26th of every Ethiopian
   * month (and every day after it) it batches the month's PAID student fees into
   * class-level STUDENT_FEES Income rows. It deliberately keeps running past the
   * 26th so a student who pays late simply gets swept into the next daily run —
   * those rows keep includedInIncomeAt = null until the batch folds them in,
   * exactly once. The UNPAID MonthlyPayment row generation (autoRecordMonthlyFees)
   * is unchanged and runs here too.
   */
  @Cron('30 0 * * *', { name: 'auto-monthly-student-fees', timeZone: 'Africa/Addis_Ababa' })
  async runDaily() {
    const { year, month, day } = toEthiopian(new Date());
    if (day < 26) return;

    await this.income.autoRecordMonthlyFees(year, month);

    const result = await this.income.recordMonthlyClassIncome(year, month);
    if (result.results.length > 0) {
      this.logger.log(
        `Recorded class fee income for ${result.monthLabel} ${year}: ${JSON.stringify(result.results)}`,
      );
    }
  }
}