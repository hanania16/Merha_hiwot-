/**
 * Equivalence test: compare real TypeScript toEthiopian() against PL/pgSQL results.
 * Reads sql_ethiopian_results.csv, runs the real function, reports mismatches.
 */
const fs = require('fs');

// ── Exact copy of the real TypeScript algorithm from ethiopian-calendar.ts ──
const ETHIOPIAN_MONTHS = [
  { value: 'MESKEREM', order: 1 }, { value: 'TIKIMT', order: 2 },
  { value: 'HIDAR', order: 3 }, { value: 'TAHSAS', order: 4 },
  { value: 'TIR', order: 5 }, { value: 'YEKATIT', order: 6 },
  { value: 'MEGABIT', order: 7 }, { value: 'MIYAZIA', order: 8 },
  { value: 'GINBOT', order: 9 }, { value: 'SENE', order: 10 },
  { value: 'HAMLE', order: 11 }, { value: 'NEHASE', order: 12 },
  { value: 'PAGUME', order: 13 },
];

function toEthiopian(gregorian) {
  const JD_EPOCH_OFFSET_AMETE_MIHRET = 1723856;
  const jdn = gregorianToJdn(gregorian);
  const r = (jdn - JD_EPOCH_OFFSET_AMETE_MIHRET) % 1461;
  const n = (r % 365) + 365 * Math.floor(r / 1460);
  const year =
    4 * Math.floor((jdn - JD_EPOCH_OFFSET_AMETE_MIHRET) / 1461) +
    Math.floor(r / 365) -
    Math.floor(r / 1460);
  const month = Math.floor(n / 30) + 1;
  const day = (n % 30) + 1;
  return { year, month, day };
}

function gregorianToJdn(date) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const a = Math.floor((14 - m) / 12);
  const y2 = y + 4800 - a;
  const m2 = m + 12 * a - 3;
  return d + Math.floor((153 * m2 + 2) / 5) + 365 * y2 + Math.floor(y2 / 4) - Math.floor(y2 / 100) + Math.floor(y2 / 400) - 32045;
}

// ── Read SQL results ──
const csv = fs.readFileSync('/tmp/sql_ethiopian_results.csv', 'utf-8');
const lines = csv.trim().split('\n').slice(1); // skip header

let mismatches = 0;
let checked = 0;
const mismatchDetails = [];

for (const line of lines) {
  const [dateStr, sqlYear, sqlMonth, sqlDay] = line.split(',');
  const year = parseInt(sqlYear);
  const month = parseInt(sqlMonth);
  const day = parseInt(sqlDay);

  // Parse the SQL date (YYYY-MM-DD) and create JS Date in UTC
  const [gy, gm, gd] = dateStr.split('-').map(Number);
  const jsDate = new Date(Date.UTC(gy, gm - 1, gd));

  const result = toEthiopian(jsDate);
  checked++;

  if (result.year !== year || result.month !== month || result.day !== day) {
    mismatches++;
    mismatchDetails.push({
      date: dateStr,
      sql: { year, month, day },
      ts: { year: result.year, month: result.month, day: result.day },
    });
  }
}

console.log(`Checked: ${checked} dates`);
console.log(`Mismatches: ${mismatches}`);

if (mismatches > 0) {
  console.log('\nMISMATCH DETAILS:');
  for (const m of mismatchDetails) {
    console.log(`  ${m.date}: SQL=${m.sql.year}/${m.sql.month}/${m.sql.day} TS=${m.ts.year}/${m.ts.month}/${m.ts.day}`);
  }
} else {
  console.log('\nALL DATES MATCH — PL/pgSQL is equivalent to real TypeScript toEthiopian()');
}

// ── Extra: print specific boundary dates for manual review ──
console.log('\n--- KEY BOUNDARY DATES (TypeScript output) ---');
const keyDates = [
  '2019-09-10', '2019-09-11', '2019-09-12',
  '2020-09-09', '2020-09-10', '2020-09-11', '2020-09-12',
  '2023-09-10', '2023-09-11', '2023-09-12',
  '2024-09-10', '2024-09-11', '2024-09-12',
  '2026-09-10', '2026-09-11', '2026-09-12', '2026-09-13',
  '2027-09-10', '2027-09-11', '2027-09-12',
];
for (const ds of keyDates) {
  const [y, m, d] = ds.split('-').map(Number);
  const r = toEthiopian(new Date(Date.UTC(y, m - 1, d)));
  const monthName = ETHIOPIAN_MONTHS.find(x => x.order === r.month)?.value ?? r.month;
  console.log(`  ${ds} → ${r.year} ${monthName} ${r.day}`);
}
