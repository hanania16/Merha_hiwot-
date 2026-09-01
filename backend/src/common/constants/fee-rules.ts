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

/**
 * Number of fee-chargeable Ethiopian months in a year. Pagume (month 13) is
 * intentionally excluded — no student fee is ever assessed or recorded for it.
 */
export const ETHIOPIAN_MONTHS_PER_YEAR = 12;

/**
 * Number of fee-chargeable Ethiopian months that have been tracked since Nehase
 * 2018, through the current Ethiopian month (inclusive). Pagume (month 13) does
 * not add an elapsed month — it is clamped to Nehase (month 12).
 */
export function feeMonthsElapsed(asOf: Date = new Date()): number {
  const { year, month } = toEthiopian(asOf);
  const chargeableMonth = Math.min(month, FEE_TRACKING_START_MONTH_ORDER);
  const index = (year - FEE_TRACKING_START_YEAR) * ETHIOPIAN_MONTHS_PER_YEAR + (chargeableMonth - FEE_TRACKING_START_MONTH_ORDER);
  return Math.max(index + 1, 0);
}

/**
 * Whether an Ethiopian (year, monthOrder) is a fee-chargeable month inside the
 * tracking window (Nehase 2018 onward). Pagume (monthOrder 13) is always out of
 * window — it is never a chargeable/payable month.
 */
export function isWithinFeeTrackingWindow(ethiopianYear: number, monthOrder: number): boolean {
  if (monthOrder > FEE_TRACKING_START_MONTH_ORDER) return false;
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
