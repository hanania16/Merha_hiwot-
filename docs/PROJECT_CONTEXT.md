# Marha Hiwot Sunday School — Project Context

## What This Is
Finance-only management system for Marha Hiwot Sunday School. No admin/student management, no approval workflows. Built with NestJS backend, Next.js frontend, PostgreSQL, all running in Docker.

## Key Architecture Decisions
- **Append-only ledger**: Income/Expense are never edited or deleted. Corrections are reversal entries linked to originals.
- **Real-time student-fee posting**: Each payment upsert immediately posts/updates a class-level Income row via `postStudentFeeIncome()`. No batch cron.
- **Running balance chain**: Every Income/Expense write goes through `LedgerService.apply()` which locks the account row and computes a running balance atomically.
- **Images baked into Docker**: Code changes require `docker compose build` + `docker compose up -d`. No volume mounts for source.

## Infrastructure
- Docker Compose: PostgreSQL (port 5440), NestJS backend (port 4000), Next.js frontend (port 3000)
- DB: user `marha_user`, password `marha_password`, database `marha_hiwot`
- Login: `admin@marhahiwot.org` / `Password123!` or `finance@marhahiwot.org` / `Password123!`
- API prefix: `/api/v1`, auth at `/api/v1/auth/login`, response key is `accessToken`

## Fee Rules
- Classes 1-3: 20 Birr/mo, 4-6: 30 Birr/mo, 7-12: 50 Birr/mo
- Working members: 2% of salary
- No late penalties
- Fee tracking starts Nehase 2018; Pagume is never charged
- `referenceNumber` format: `STUDENT_FEE:{classLevel}:{year}:{month}` (singular)

## Ethiopian Calendar
- Source of truth: `backend/src/common/constants/ethiopian-calendar.ts`
- `toEthiopian(date)` — Gregorian → Ethiopian (JDN-based, accurate for the full Gregorian leap-year cycle)
- `toGregorian(year, month, day)` — Ethiopian → Gregorian
- `ETHIOPIAN_MONTHS` — ordered array with value/label/order
- Any future date conversion MUST use this TypeScript function, not a re-ported SQL version (see below)

## Structural Date Fix (2026-09-13)
### Problem
`Income.date` and `Expense.date` are recording timestamps (always `new Date()`), NOT the period date. This meant Monthly/Yearly Reports, Dashboard, and grouped Income/Expense views used Gregorian date ranges that didn't align with Ethiopian periods. Example: Nehase 2018 income was split across multiple Gregorian months, showing 470 instead of the correct 540.

### Solution
Added `ethiopianYear Int?` and `ethiopianMonth EthiopianMonth?` columns to both `income` and `expenses` tables.

**Schema**: `backend/prisma/schema.prisma` — fields on Income and Expense models, composite indexes
**Migration**: `backend/prisma/migrations/20260913140000_add_income_expense_period_columns/migration.sql`

### Backfill
- SQL PL/pgSQL function `gregorian_to_ethiopian()` — proven equivalent to real TypeScript `toEthiopian()` across 5,844 test dates (2015–2030)
- Verification script: `backend/scripts/archive/verify-ethiopian-equivalence.js`
- Student-fee income: parsed from `referenceNumber` (source of truth)
- All other income/expenses: derived from `date` via JDN function
- 13 rows backfilled, 0 null period remaining

### Write Paths (all stamp ethiopianYear/ethiopianMonth)
- `postStudentFeeIncome()` in `student-fees.service.ts` — stamps from fee period params
- `IncomeService.create()` in `income.service.ts` — derives from `dto.date` via `toEthiopian()`
- `ExpenseService.create()` in `expense.service.ts` — same
- `IncomeService.reverse()` — copies from original income
- `ExpenseService.reverse()` — copies from original expense

### Read Paths (all filter by ethiopianYear/ethiopianMonth)
- Dashboard `getSummary()` / `getMonthlyActivities()` — `dashboard.service.ts`
- Reports `auditRollup()` / `monthlyReport()` / `yearlyReport()` — `reports.service.ts`
- Income `findAll()` / Expense `findAll()` — accept `ethiopianYear`/`ethiopianMonth` query params
- Frontend Income/Expense pages send period enum values instead of Gregorian `from`/`to`

### Period Report (unchanged)
`buildFinancialReport()` still filters by `date` — it's a custom arbitrary-range tool by design.

### Verified Results
| Period | Income | Expense |
|--------|--------|---------|
| Nehase 2018 | 540 | 0 |
| Ginbot 2018 | 30 | 0 |
| Pagume 2018 | 1,700 | 58,867 |
| Dashboard (Meskerem 2019) | 40 | 0 |

## Other Completed Work
- Removed admin/student management, approval system, batch cron
- Income page collapsible groups, month filtering on Income/Expense pages
- Fixed expense form, updated income source types, fixed overwrite bug
- All code committed through 120+ commits
- Historical PAYMENT_UPDATED audit log investigation — resolved
- Retroactive ledger fixes — all Income/Expense totals verified
- Reports page E2E test — completed with findings
- Finance dashboard inspection — 10 issues identified and resolved (dead currentBalance, reversal date, reversal notifications, misleading error state, Ethiopian calendar periods)
- Added `REVERSAL` to `NotificationType` enum in schema.prisma

## Key DB Table Names
`monthly_payments`, `students`, `class_groups`, `audit_logs`, `income`, `expenses`, `finance_reports`, `reconciliations`, `accounts`, `users`

## Account
"Church Main Cash" ID: `e2146a49-fc3b-4d54-aec9-14df008bb8fe`
DB user ID: `15e16893-e986-4701-9537-6802aab65faf`

## Open Items

1. **Pagume 2018 expenses — unconfirmed test data**: Two expense entries totaling 58,867 ETB (56,789 + 2,078) in Pagume 2018, both `TEACHING_MATERIALS`, no description, same date, same recorder. Flagged as potentially test data. Pending manual verification against actual finance records before being treated as real transactions.

## Closed Items

1. **Legacy STUDENT_FEES: prefix — RESOLVED (2026-09-18)**: One income row (`eaf43fd4`, 370 ETB, CLASS_7_12, NEHASE 2018) previously used the old plural `STUDENT_FEES:` prefix from the batch era (full ref: `STUDENT_FEES:CLASS_7_12:2018:NEHASE:1788014755609`). Renamed to singular `STUDENT_FEE:CLASS_7_12:2018:NEHASE`. All 3 contributing MonthlyPayment rows (Hanania Mesret 20, Ledger Verify Student 50, eyerus germa 300) were already correctly tracked — they were only "orphans" in the test's prefix-based query, not actual data inconsistencies. All read paths (Dashboard, Reports Monthly/Yearly, Income page grouped view) filter by `sourceType: 'STUDENT_FEE'`, not by `referenceNumber` prefix, so the plural prefix never caused exclusion. The rename was necessary to prevent duplicate Income rows if a future CLASS_7_12 NEHASE 2018 payment triggers `postStudentFeeIncome()`, which does `findFirst({ where: { referenceNumber } })` with the singular form. Verified: Income page shows 3 rows (540 ETB), Reports Monthly shows 540/3, Reports Yearly shows 570/4.

## Rules for Future Work
1. **Ethiopian date conversion**: Always use `toEthiopian()` from `ethiopian-calendar.ts`. Never re-port the JDN algorithm to SQL or any other language. The verification script at `backend/scripts/archive/verify-ethiopian-equivalence.js` can validate equivalence if needed.
2. **Income/Expense writes**: Must stamp `ethiopianYear`/`ethiopianMonth` at creation time.
3. **Period-based queries**: Use `ethiopianYear`/`ethiopianMonth` columns, not Gregorian date ranges (unless the feature explicitly needs arbitrary Gregorian ranges).
4. **Docker**: Every code change requires `docker compose build` + `docker compose up -d`.
