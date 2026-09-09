import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { IncomeService } from './income.service';
import { toEthiopian } from '../../common/constants/ethiopian-calendar';

@Injectable()
export class IncomeAutoRecordScheduler {
  constructor(private income: IncomeService) {}

  /**
   * Runs daily at 00:30 Africa/Addis_Ababa.
   * Only creates UNPAID MonthlyPayment rows from the 26th onward.
   * Income posting is now real-time (triggered on each payment).
   */
  @Cron('30 0 * * *', { name: 'auto-monthly-student-fees', timeZone: 'Africa/Addis_Ababa' })
  async runDaily() {
    const { year, month, day } = toEthiopian(new Date());
    if (day >= 26) {
      await this.income.autoRecordMonthlyFees(year, month);
    }
  }
}
