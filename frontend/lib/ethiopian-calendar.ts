export const ETHIOPIAN_MONTHS = [
  { value: 'MESKEREM', label: 'መስከረም', order: 1 },
  { value: 'TIKIMT', label: 'ጥቅምት', order: 2 },
  { value: 'HIDAR', label: 'ኅዳር', order: 3 },
  { value: 'TAHSAS', label: 'ታኅሣሥ', order: 4 },
  { value: 'TIR', label: 'ጥር', order: 5 },
  { value: 'YEKATIT', label: 'የካቲት', order: 6 },
  { value: 'MEGABIT', label: 'መጋቢት', order: 7 },
  { value: 'MIYAZIA', label: 'ሚያዝያ', order: 8 },
  { value: 'GINBOT', label: 'ግንቦት', order: 9 },
  { value: 'SENE', label: 'ሰኔ', order: 10 },
  { value: 'HAMLE', label: 'ሐምሌ', order: 11 },
  { value: 'NEHASE', label: 'ነሐሴ', order: 12 },
  { value: 'PAGUME', label: 'ጳጉሜ', order: 13 },
] as const;

export function monthLabel(value: string) {
  return ETHIOPIAN_MONTHS.find((m) => m.value === value)?.label ?? value;
}

function gregorianToJdn(date: Date): number {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const a = Math.floor((14 - m) / 12);
  const y2 = y + 4800 - a;
  const m2 = m + 12 * a - 3;
  return d + Math.floor((153 * m2 + 2) / 5) + 365 * y2 + Math.floor(y2 / 4) - Math.floor(y2 / 100) + Math.floor(y2 / 400) - 32045;
}

/** Gregorian -> Ethiopian calendar conversion (Amete Mihret era). */
export function toEthiopian(gregorian: Date): { year: number; month: number; day: number } {
  const JD_EPOCH_OFFSET_AMETE_MIHRET = 1723856;
  const jdn = gregorianToJdn(gregorian);
  const r = (jdn - JD_EPOCH_OFFSET_AMETE_MIHRET) % 1461;
  const n = (r % 365) + 365 * Math.floor(r / 1460);
  const year =
    4 * Math.floor((jdn - JD_EPOCH_OFFSET_AMETE_MIHRET) / 1461) + Math.floor(r / 365) - Math.floor(r / 1460);
  const month = Math.floor(n / 30) + 1;
  const day = (n % 30) + 1;
  return { year, month, day };
}

export function currentEthiopianYear() {
  return toEthiopian(new Date()).year;
}

export function formatEthiopianDateFromGregorian(date: Date): string {
  const { year, month, day } = toEthiopian(date);
  const label = ETHIOPIAN_MONTHS.find((m) => m.order === month)?.label ?? String(month);
  return `${day} ${label} ${year}`;
}

function jdnToGregorian(jdn: number): Date {
  const a = jdn + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((146097 * b) / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  const day = e - Math.floor((153 * m + 2) / 5) + 1;
  const month = m + 3 - 12 * Math.floor(m / 10);
  const year = 100 * b + d - 4800 + Math.floor(m / 10);
  return new Date(year, month - 1, day);
}

/** Ethiopian -> Gregorian calendar conversion. */
export function toGregorian(year: number, month: number, day: number): Date {
  const JD_EPOCH_OFFSET_AMETE_MIHRET = 1723856;
  const jdn =
    JD_EPOCH_OFFSET_AMETE_MIHRET +
    365 * (year - 1) +
    Math.floor(year / 4) +
    30 * month -
    30 +
    (day - 1);
  return jdnToGregorian(jdn);
}

/** Ethiopian year is a leap year (Pagume has 6 days instead of 5). */
export function isEthiopianLeapYear(year: number): boolean {
  return year % 4 === 0;
}

/** Max days in an Ethiopian month (1-12 have 30, Pagume has 5 or 6). */
export function ethiopianMonthDays(year: number, month: number): number {
  if (month >= 1 && month <= 12) return 30;
  if (month === 13) return isEthiopianLeapYear(year) ? 6 : 5;
  return 0;
}

export function formatETB(amount: number) {
  return `${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} ETB`;
}
