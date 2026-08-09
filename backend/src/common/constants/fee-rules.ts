import { ClassLevel } from '@prisma/client';
import { toEthiopian } from './ethiopian-calendar';

/** Monthly base fee by class group, in Birr. */
export const CLASS_MONTHLY_FEE: Record<ClassLevel, number> = {
  CLASS_1_3: 20,
  CLASS_4_6: 30,
  CLASS_7_12: 50,
};

export const WORKING_MEMBER_RATE = 0.02; // 2% of monthly salary

/** Fee tracking begins at Nehase 2018 — months before it are never back-charged. */
export const FEE_TRACKING_START_YEAR = 2018;
/** Nehase is the 12th Ethiopian month. */
export const FEE_TRACKING_START_MONTH_ORDER = 12;

/** Number of Ethiopian months in a year (13 with Pagume). */
export const ETHIOPIAN_MONTHS_PER_YEAR = 13;

/**
 * Number of Ethiopian months that have been tracked since Nehase 2018,
 * through the current Ethiopian month (inclusive).
 */
export function feeMonthsElapsed(asOf: Date = new Date()): number {
  const { year, month } = toEthiopian(asOf);
  const index = (year - FEE_TRACKING_START_YEAR) * ETHIOPIAN_MONTHS_PER_YEAR + (month - FEE_TRACKING_START_MONTH_ORDER);
  return Math.max(index + 1, 0);
}

/** Whether an Ethiopian (year, monthOrder) is inside the fee tracking window (Nehase 2018 onward). */
export function isWithinFeeTrackingWindow(ethiopianYear: number, monthOrder: number): boolean {
  return (
    ethiopianYear > FEE_TRACKING_START_YEAR ||
    (ethiopianYear === FEE_TRACKING_START_YEAR && monthOrder >= FEE_TRACKING_START_MONTH_ORDER)
  );
}

export function baseFeeFor(params: { classLevel: ClassLevel; isWorkingMember: boolean; monthlySalary?: number | null }) {
  if (params.isWorkingMember) {
    return Math.round((params.monthlySalary ?? 0) * WORKING_MEMBER_RATE * 100) / 100;
  }
  return CLASS_MONTHLY_FEE[params.classLevel];
}
