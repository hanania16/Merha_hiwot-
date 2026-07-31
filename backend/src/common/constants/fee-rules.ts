import { ClassLevel } from '@prisma/client';
import { ethiopianDayOfMonth } from './ethiopian-calendar';

/** Monthly fee by class group, in Birr. */
export const CLASS_MONTHLY_FEE: Record<ClassLevel, number> = {
  CLASS_1_3: 20,
  CLASS_4_6: 30,
  CLASS_7_12: 50,
};

export const WORKING_MEMBER_RATE = 0.02; // 2% of monthly salary

export const GRACE_PERIOD_DAYS = 7; // first 7 days of the Ethiopian month
export const LATE_PENALTY_AMOUNT = 10; // Birr
export const LATE_PENALTY_INTERVAL_DAYS = 3; // every 3 days after the grace period

export function baseFeeFor(params: { classLevel: ClassLevel; isWorkingMember: boolean; monthlySalary?: number | null }) {
  if (params.isWorkingMember) {
    return Math.round((params.monthlySalary ?? 0) * WORKING_MEMBER_RATE * 100) / 100;
  }
  return CLASS_MONTHLY_FEE[params.classLevel];
}

/**
 * Late penalty, calculated as of `asOf` (defaults to today), for a fee that
 * became due within the current Ethiopian month. Grace period = first 7 days;
 * after that, 10 Birr every 3 days.
 */
export function latePenaltyAsOf(asOf: Date = new Date()): number {
  const dayOfMonth = ethiopianDayOfMonth(asOf);
  if (dayOfMonth <= GRACE_PERIOD_DAYS) return 0;
  const daysLate = dayOfMonth - GRACE_PERIOD_DAYS;
  return Math.ceil(daysLate / LATE_PENALTY_INTERVAL_DAYS) * LATE_PENALTY_AMOUNT;
}

export interface OutstandingBreakdown {
  currentMonthBase: number;
  currentMonthPenalty: number;
  previousUnpaidMonths: number;
  previousUnpaidTotal: number;
  totalDue: number;
}
