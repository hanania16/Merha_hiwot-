import { toEthiopian, toGregorian, formatEthiopianDate } from './ethiopian-calendar';

/**
 * Locks down the Gregorian <-> Ethiopian conversion at the exact boundaries the
 * finance reports depend on (UTC-midnight, half-open [from, to) periods), so an
 * off-by-one regression can never silently misfile a transaction across months
 * or years.
 *
 * All assertions use LOCAL calendar components (getFullYear/getMonth/getDate),
 * matching how the rest of the app stores and compares dates, so the tests are
 * timezone-agnostic.
 */

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const gdate = (y: number, m: number, day: number) => new Date(y, m - 1, day);

describe('Ethiopian calendar conversion', () => {
  describe('toGregorian (Ethiopian -> Gregorian)', () => {
    it('maps a normal month boundary — Hamle 1 and Nehasé 1, 2018', () => {
      expect(iso(toGregorian(2018, 11, 1))).toBe('2026-07-08');
      expect(iso(toGregorian(2018, 12, 1))).toBe('2026-08-07');
    });

    it('maps Meskerem 1 across a normal (non-leap) year boundary', () => {
      expect(iso(toGregorian(2018, 1, 1))).toBe('2025-09-11');
      expect(iso(toGregorian(2019, 1, 1))).toBe('2026-09-11');
    });

    it('maps the leap-year Nehasé 30 / Pagume boundary (2019 is a leap year)', () => {
      expect(iso(toGregorian(2019, 12, 30))).toBe('2027-09-05');
      expect(iso(toGregorian(2019, 13, 1))).toBe('2027-09-06');
      expect(iso(toGregorian(2019, 13, 6))).toBe('2027-09-11');
    });

    it('maps the leap -> non-leap rollover — year after a leap year starts on Sept 12', () => {
      expect(iso(toGregorian(2020, 1, 1))).toBe('2027-09-12');
    });
  });

  describe('toEthiopian (Gregorian -> Ethiopian)', () => {
    it('returns 24 Hamle 2018 for 2026-07-31 (regression: no +1 off-by-one)', () => {
      expect(toEthiopian(gdate(2026, 7, 31))).toEqual({ year: 2018, month: 11, day: 24 });
    });

    it('returns 1 Meskerem 2018 for 2025-09-11', () => {
      expect(toEthiopian(gdate(2025, 9, 11))).toEqual({ year: 2018, month: 1, day: 1 });
    });

    it('returns 1 Meskerem 2000 for 2007-09-12 (Ethiopian Millennium reference)', () => {
      expect(toEthiopian(gdate(2007, 9, 12))).toEqual({ year: 2000, month: 1, day: 1 });
    });

    it('returns Pagume 6, 2019 for 2027-09-11 (leap year has 6 Pagume days)', () => {
      expect(toEthiopian(gdate(2027, 9, 11))).toEqual({ year: 2019, month: 13, day: 6 });
    });

    it('returns Pagume 5, 2018 for 2026-09-10 (non-leap year has 5 Pagume days)', () => {
      expect(toEthiopian(gdate(2026, 9, 10))).toEqual({ year: 2018, month: 13, day: 5 });
    });

    it('rolls leap year 2019 into 2020 — 2027-09-12 is 1 Meskerem 2020', () => {
      expect(toEthiopian(gdate(2027, 9, 12))).toEqual({ year: 2020, month: 1, day: 1 });
    });

    it('rolls non-leap year 2018 into 2019 — 2026-09-11 is 1 Meskerem 2019', () => {
      expect(toEthiopian(gdate(2026, 9, 11))).toEqual({ year: 2019, month: 1, day: 1 });
    });
  });

  describe('round trips', () => {
    const cases: Array<[number, number, number]> = [
      [2018, 11, 1],
      [2018, 11, 30],
      [2018, 12, 1],
      [2018, 13, 5],
      [2019, 1, 1],
      [2019, 12, 30],
      [2019, 13, 6],
      [2020, 1, 1],
    ];

    it.each(cases)('Ethiopian %i/%i/%i converts and round-trips', (y, m, day) => {
      const g = toGregorian(y, m, day);
      expect(toEthiopian(g)).toEqual({ year: y, month: m, day });
    });
  });

  describe('formatEthiopianDate', () => {
    it('formats 2026-07-31 as "24 Hamle 2018"', () => {
      expect(formatEthiopianDate(gdate(2026, 7, 31))).toBe('24 ሐምሌ 2018');
    });
  });
});
