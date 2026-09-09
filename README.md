# መርሓ ህይወት ሰ/ቤት — Sunday School Management System

A Church Management System for an Ethiopian Orthodox Sunday School, built with NestJS (backend) and Next.js (frontend), sharing one PostgreSQL database.

## What's in this delivery

**Branding & UI**
- Logo is wired into the login page, sidebar, and every PDF export (`backend/assets/logo.jpg`, `frontend/public/logo.jpg`).
- Consistent black/gold/white palette across both dashboards (Students and Finance).
- English/Amharic toggle (top-right of every dashboard page) — sidebar labels and key headings switch instantly; student names display in Amharic when available and the toggle is set to አማ.
- Student names fully support Amharic Unicode (`fullNameAmharic` field, searchable).
- Responsive design with mobile drawer sidebar.

**Student data**
- Every student has an auto-generated Student ID (`MH-0001`, …), English + Amharic name, gender, phone, parent info, class, registration date, and working-member flag (for the 2%-of-salary fee rule).
- Seed data creates 3 class groups (1-3, 4-6, 7-12) and 2 users (Administrator, Finance Officer). Students are created through the registration form.

**Finance — fee rules engine** (`backend/src/common/constants/fee-rules.ts`)
- Classes 1-3: 20 Birr/month. Classes 4-6: 30 Birr/month. Classes 7-12: 50 Birr/month. Working members: 2% of monthly salary.
- **No late-payment penalty.** Paying a month late simply means previously-unpaid months are recorded at their normal base fee (`penaltyAmount` is always **0**). Month recording only runs inside the fee-tracking window (Nehase 2018 onward); any month before that is rejected.
- **Student Fee Management** shows outstanding balance per student = unpaid months × monthly base fee (no penalty).
- **Record Payment** shows the outstanding-balance breakdown before saving (current month base + previous unpaid months) and lets you select months to pay plus a payment method — **Cash**, **Bank Transfer**, or **Telebirr Transfer**. Bank Transfer records the **account owner name**; Telebirr Transfer records the **phone number**; Cash needs no extra field.
- **Bulk payments**: record payments for an entire class level across selected months, with optional per-student overrides.
- **Analytics** adds a payment-status breakdown (`notPaid`, `paidToday`, `paidThisMonth`) plus collection-rate and trend charts.

**Income & Expense management**
- Record income from donations, church contributions, fundraising, special offerings, feast collections (Debre Tabor, New Year, Meskel), and others.
- Record expenses across categories: teaching materials, stationery, snacks, transportation, equipment, maintenance, events, charity, miscellaneous.
- Payment methods: Cash, Bank Transfer, Mobile Money, Cheque, Telebirr Transfer.
- **Append-only corrections**: Income and Expense records are never edited or deleted. Corrections go through REVERSAL entries that create offsetting transactions.

**Accounts & Ledger**
- Cash box and bank account management with opening balances.
- Full account statement with chronological ledger lines and running balance.
- Atomic balance updates via `LedgerService` with row-level locking (`SELECT ... FOR UPDATE`) to prevent concurrent write races.
- `Account.currentBalance` is only modified through `LedgerService` — never directly by user-facing endpoints.

**Approval workflow**
- Income/Expense records go through an approval workflow (`PENDING_APPROVAL` → `APPROVED`/`REJECTED`).
- `TransactionApproval` records form an immutable history of every decision.
- A user cannot approve a transaction they themselves recorded.

**Reconciliation**
- Run reconciliation against cash/bank accounts (expected vs actual balance).
- Track discrepancies with status workflow: MATCHED, DISCREPANCY_FOUND, UNDER_INVESTIGATION, RESOLVED.

**Reports & Export**
- **Period Report**: custom date range with income/expense/balance summaries.
- **Monthly Report**: full audit report for an Ethiopian month.
- **Yearly Report**: full audit report for an Ethiopian year.
- **Report History**: saved monthly/yearly snapshots (auto-saved on the last day of each Ethiopian month/year).
- **PDF Export**: uses PDFKit with Noto Sans Ethiopic fonts for Amharic text support.
- **Excel Export**: uses ExcelJS with gold-colored headers.

**Receipts**
- Create receipts with auto-generated receipt numbers (`MH-YYYY-NNNNN`).
- Upload receipt photos (PNG/JPG, max 5MB) with notes.
- Print PDF receipts.

**Ethiopian Calendar**
- Full Gregorian↔Ethiopian conversion using Julian Day Number algorithm.
- All finance system dates, fee tracking, reports, and snapshots use the Ethiopian calendar.
- Ethiopian date picker component with day/month/year drill-down.
- 13 months (12 × 30 days + Pagume: 5 or 6 days).

**Notification bell** (top-right of every dashboard)
- Unified `/notifications` feed, filtered per role (Administrators see everything; Finance Officers see finance-related notifications).
- Unread badge, mark-one-read, mark-all-read.
- **Saturday weekly digest**: a cron job runs every Saturday at 08:00 (Africa/Addis_Ababa) and creates an in-app notification summarizing students who haven't paid this month. An Administrator can also trigger it on demand via `POST /api/v1/digest/run-now`.
  - In-app notification only — no outbound email/SMS provider is configured.

**Audit trail**
- Every mutation goes through the shared audit log (`GET /api/v1/audit-log`).
- Audited field-level edits diff old vs new values with a mandatory reason string.

## Project structure

```
marha-hiwot/
├── backend/                          NestJS API (TypeScript, Prisma, PostgreSQL)
│   ├── assets/logo.jpg               embedded in every PDF export
│   ├── prisma/schema.prisma          full data model (15 models, 13 enums)
│   ├── prisma/seed.ts                demo users and class groups
│   └── src/
│       ├── common/
│       │   ├── audit/                shared audit log (global)
│       │   ├── constants/            Ethiopian calendar conversion, fee-rules engine
│       │   ├── decorators/           @Public, @Roles, @CurrentUser
│       │   ├── digest/               Saturday weekly-digest cron
│       │   ├── filters/              global exception filter
│       │   ├── guards/               JWT auth guard, roles guard
│       │   └── notifications/        unified bell-icon feed (global)
│       ├── students/                 CRUD, Amharic search, fee status
│       ├── admin/                    synchronized overview stats
│       ├── users/                    user listing (admin-only)
│       ├── auth/                     JWT login, profile
│       ├── services/                 financeAuditService (audited edits, approvals)
│       └── finance/
│           ├── dashboard/            finance dashboard summary + activity timeline
│           ├── student-fees/         fee status, single/bulk payment recording
│           ├── income/               income CRUD, auto-record scheduler, approval, reversal
│           ├── expense/              expense CRUD, approval, reversal
│           ├── accounts/             cash/bank accounts, ledger statement
│           ├── ledger/               atomic balance-update with row locking
│           ├── receipts/             receipt creation, PDF print, photo upload
│           ├── reconciliations/       account reconciliation workflow
│           ├── reports/              period/monthly/yearly reports, PDF/Excel export, snapshots
│           ├── analytics/            charts and data visualization
│           └── notifications/        finance-specific notification feed
├── frontend/                          Next.js App Router (TypeScript, Tailwind)
│   ├── public/logo.jpg
│   ├── lib/
│   │   ├── api.ts                    HTTP client with auth
│   │   ├── auth.ts                   login/logout/role helpers
│   │   ├── i18n.tsx                  English/Amharic translations (~160+ keys)
│   │   ├── ethiopian-calendar.ts     Gregorian↔Ethiopian conversion
│   │   └── header-context.tsx        React context for header slot injection
│   ├── components/
│   │   ├── layout/                   Sidebar, Header, Topbar, NotificationBell
│   │   ├── ui/                       Modal, StatCard, Badge
│   │   ├── EthiopianDatePicker.tsx   Ethiopian calendar date picker
│   │   └── RegisterModal.tsx         student registration form
│   └── app/dashboard/
│       ├── finance/
│       │   ├── page.tsx              finance dashboard (stats + ledger + timeline)
│       │   ├── student-fees/         fee management + payment recording
│       │   ├── income/               income list + record form + fee batch runner
│       │   ├── expense/              expense list + record form
│       │   ├── analytics/            charts (line, pie, bar)
│       │   ├── reports/              period/monthly/yearly reports + history + export
│       │   └── receipts/             receipt list + photo upload + gallery
│       └── students/
│           ├── page.tsx              student list + registration
│           └── [id]/                 student profile + edit + delete
├── docker-compose.yml
└── docker-compose.override.yml
```

## Running locally with Docker (recommended)

```bash
cp backend/.env.example backend/.env      # edit JWT_SECRET before production use
cp frontend/.env.local.example frontend/.env.local

docker compose up --build
```

```bash
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npm run prisma:seed
```

- Backend API: http://localhost:4000/api/v1
- Frontend: http://localhost:3000

## Running locally without Docker

**Backend**
```bash
cd backend
npm install
cp .env.example .env
npx prisma migrate dev --name init
npm run prisma:seed
npm run start:dev
```

**Frontend**
```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

## Seed users

| Email                       | Role          | Password     |
|-----------------------------|---------------|--------------|
| admin@marhahiwot.org        | ADMINISTRATOR | Password123! |
| finance@marhahiwot.org      | FINANCE_OFFICER | Password123! |

## Roles

**ADMINISTRATOR** — full access to everything: students CRUD, finance, accounts, reports, audit log, notifications, digest.

**FINANCE_OFFICER** — full access to all finance modules (fees, income, expense, accounts, reports, receipts, reconciliation, analytics). Can create students but cannot update or delete them. Read-only access to audit logs.

## Notes on scope

- **Amharic coverage**: the toggle translates sidebar/header labels and displays Amharic student names; it's a lightweight dictionary (`lib/i18n.tsx`), not a full i18n framework — extend `DICTIONARY` for more strings as needed.
- **Weekly digest delivery**: in-app notification only — no outbound email/SMS provider is configured.
- **S3 photo upload** is still stubbed (schema field exists, endpoints accept a URL string).
- **Student-fee income ledger (single source of truth)**: `MonthlyPayment` is the source of truth for student-fee revenue. Income recording is **batched**: `recordPayment()`/`recordClassPayments()` only mark months PAID/UNPAID — no `Income` row is created at payment time. A scheduled job runs daily from the 26th of each Ethiopian month, groups that month's newly-PAID `MonthlyPayment` rows by class level (1-3 / 4-6 / 7-12), creates aggregated `STUDENT_FEES` `Income` rows, and stamps each folded row `includedInIncomeAt`. Because income lags payments until the batch runs, the Income page shows a note explaining that `STUDENT_FEES` totals can lag real payments; the Student Fee page remains real-time (reads `MonthlyPayment` directly).

## Cron jobs

| Job | Schedule (Africa/Addis_Ababa) | What it does |
|-----|-------------------------------|--------------|
| `auto-monthly-student-fees` | Daily 00:30 | From the 26th: auto-generates UNPAID `MonthlyPayment` rows for all active students. Daily: sweeps PAID rows into aggregated class-level `STUDENT_FEES` Income rows. |
| `weekly-digest-saturday` | Saturdays 08:00 | Creates a `WEEKLY_DIGEST` notification summarizing unpaid students. |
| `finance-report-snapshots` | Daily 23:50 | Last day of Ethiopian month: auto-saves MONTHLY report snapshot. Last day of year: saves YEARLY snapshot. |

## Known follow-ups

- **Legacy student-fee Income rows — review + delete on production**. Old accrual-estimate `Income` rows are double-counted against individually-recorded payments. Preview then delete:
  ```sql
  SELECT id, amount, "referenceNumber", description FROM income
  WHERE "sourceType" = 'STUDENT_FEE'
    AND ("referenceNumber" IS NULL OR "referenceNumber" LIKE 'AUTO:STUDENT_FEES:%' OR "referenceNumber" NOT LIKE 'STUDENT_FEE:%' AND "referenceNumber" NOT LIKE 'STUDENT_FEES:%');
  ```
- **Working member with no salary on file** — outstanding undercounts to 0 (`backend/src/common/constants/fee-rules.ts`). A `isWorkingMember` student with `monthlySalary = NULL` gets `2% of 0 = 0 Birr` as the per-month fee. **Live status: 1 affected** (MH-0006). Action: populate salary and require it in registration.
- **Jest config issue**: `jest` fails to parse `.ts` spec sources (decorator syntax) while compiled `dist/` versions pass.
