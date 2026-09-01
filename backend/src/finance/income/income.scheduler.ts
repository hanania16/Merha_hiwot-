import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { IncomeService } from './income.service';
import { toEthiopian } from '../../common/constants/ethiopian-calendar';

@Injectable()
export class IncomeAutoRecordScheduler {
  private readonly logger = new Logger(IncomeAutoRecordScheduler.name);

  constructor(private income: IncomeService) {}

  /**
   * Runs daily at 00:30 Africa/Addis_Ababa.
   *
   * - From the 26th of every Ethiopian month (and every day after it) it creates
   *   the current month's UNPAID MonthlyPayment rows (autoRecordMonthlyFees).
   * - Every day it runs the class-income sweep (recordMonthlyClassIncome) with NO
   *   month filter, so ALL PAID student fees that haven't been booked yet
   *   (includedInIncomeAt = null) are folded into class-level STUDENT_FEES Income
   *   rows — for whatever month/year they were actually paid. Running this every
   *   day (not just from the 26th) is what closes the boundary gaps: Pagume (the
   *   short final month whose days are always < 26), same-month payments made
   *   after the previous 00:30 run, and catch-up / back-dated payments are all
   *   swept on the next daily run instead of being left unincluded forever.
   */
  @Cron('30 0 * * *', { name: 'auto-monthly-student-fees', timeZone: 'Africa/Addis_Ababa' })
  async runDaily() {
    const { year, month, day } = toEthiopian(new Date());
    if (day >= 26) {
      await this.income.autoRecordMonthlyFees(year, month);
    }

    const result = await this.income.recordMonthlyClassIncome();
    if (result.results.length > 0) {
      this.logger.log(
        `Recorded class fee income for ${result.results.length} class/month group(s): ${JSON.stringify(result.results)}`,
      );
    }
  }
}