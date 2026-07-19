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

export function formatETB(amount: number) {
  return `${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} ETB`;
}
