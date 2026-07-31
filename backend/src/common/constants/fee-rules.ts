import { ClassLevel } from '@prisma/client';
import { ethiopianDayOfMonth, toEthiopian } from './ethiopian-calendar';

/** Monthly base fee by class group, in Birr. */
export const CLASS_MONTHLY_FEE: Record<ClassLevel, number> = {
  CLASS_1_3: 20,
  CLASS_4_6: 30,
  CLASS_7_12: 50,
};

export const WORKING_MEMBER_RATE = 0.02; // 2% of monthly salary

/** No penalty if paid within the first 10 days of the Ethiopian month. */
export const GRACE_PERIOD_DAYS = 10;

/** Daily late penalty once past the grace period, per class group. */
export const LATE_DAILY_RATE: Record<ClassLevel, number> = {
  CLASS_1_3: 5,
  CLASS_4_6: 10,
  CLASS_7_12: 10,
};

/** Maximum penalty for one month, per class group. */
export const LATE_PENALTY_CAP: Record<ClassLevel, number> = {
  CLASS_1_3: 20,
  CLASS_4_6: 50,
  CLASS_7_12: 50,
};

export function baseFeeFor(params: { classLevel: ClassLevel; isWorkingMember: boolean; monthlySalary?: number | null }) {
  if (params.isWorkingMember) {
    return Math.round((params.monthlySalary ?? 0) * WORKING_MEMBER_RATE * 100) / 100;
  }
  return CLASS_MONTHLY_FEE[params.classLevel];
}

/**
 * Late penalty for a fee due in the current Ethiopian month, as of `asOf`.
 * After the 10-day grace the penalty accrues daily (5 Birr/day for classes 1-3,
 * 10 Birr/day otherwise) up to the class cap (20 / 50 Birr).
 */
export function latePenaltyFor(classLevel: ClassLevel, asOf: Date = new Date()): number {
  const dayOfMonth = ethiopianDayOfMonth(asOf);
  if (dayOfMonth <= GRACE_PERIOD_DAYS) return 0;
  const daysLate = dayOfMonth - GRACE_PERIOD_DAYS;
  return Math.min(daysLate * LATE_DAILY_RATE[classLevel], LATE_PENALTY_CAP[classLevel]);
}

/**
 * Late penalty for a specific Ethiopian month's fee.
 *  - future month  -> 0
 *  - current month -> accrues as of `asOf` (today)
 *  - past month    -> grace has fully elapsed, so the month is at the class cap
 */
export function latePenaltyForMonth(classLevel: ClassLevel, ethiopianYear: number, month: number, asOf: Date = new Date()): number {
  const today = toEthiopian(asOf);
  if (ethiopianYear > today.year || (ethiopianYear === today.year && month > today.month)) return 0;
  if (ethiopianYear === today.year && month === today.month) return latePenaltyFor(classLevel, asOf);
  return LATE_PENALTY_CAP[classLevel];
}

export interface OutstandingBreakdown {
  currentMonthBase: number;
  currentMonthPenalty: number;
  previousUnpaidMonths: number;
  previousUnpaidTotal: number;
  totalDue: number;
}
