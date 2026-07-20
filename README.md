# መርሓ ህይወት ሰ/ቤት — Sunday School Management System

A two-dashboard Church Management System for an Ethiopian Orthodox Sunday School, plus an Admin overview, sharing one PostgreSQL database.

## What's in this delivery

**Branding & UI**
- Your provided logo is wired into the login page, sidebar, and every PDF export (`backend/assets/logo.jpg`, `frontend/public/logo.jpg`).
- Consistent black/gold/white palette across all three dashboards (Finance, Attendance, Admin).
- English/Amharic toggle (top-right of every dashboard page) — sidebar labels and key headings switch instantly; student names display in Amharic when available and the toggle is set to አማ.
- Student names fully support Amharic Unicode (`fullNameAmharic` field, searchable).

**Student data**
- Every student has an auto-generated Student ID (`MH-0001`, …), English + Amharic name, gender, phone, parent info, class, registration date, and working-member flag (for the 2%-of-salary fee rule).
- Seed data now includes 15 realistic bilingual students, 3 teachers, and 3 events.

**Attendance automation**
- **Auto-inactivation**: the 5th consecutive absence automatically flips a student to `INACTIVE` and writes an `InactivationRecord` (consecutive days, last attendance date, date marked inactive, reason). The student row is never deleted — see `/dashboard/attendance/inactive`.
- **Attendance analytics**: present/absent/late/permission counts, inactive count, and 1–3/4–6/7–12 consecutive-absence-day buckets.
- **Filters**: class (1-3/4-6/7-12), active/inactive status, and date-range filters across the students, take-attendance, and reports pages.
- **Ethiopian Calendar**: a real Gregorian↔Ethiopian conversion (`common/constants/ethiopian-calendar.ts`, mirrored in the frontend) drives the fee grace-period rule and date displays — not just the year label.
- **Fee reminder**: the Attendance dashboard shows unpaid-this-month students pulled live from Finance (read-only, no duplicated logic).

**Events** — replaces the old static header: `/dashboard/attendance/events`. Create events with name, date, type, description, participating classes; student count and attendance are computed live; record per-student event attendance; a participation report ranks students by events attended.

**Classes page removed** — class management now lives inside Student Registration (class filter + picker), Take Attendance (class selector), and Reports (class-range reports), per the new class groupings (1-3 / 4-6 / 7-12).

**Finance — fee rules engine** (`backend/src/common/constants/fee-rules.ts`)
- Classes 1-3 and 4-6: 30 Birr/month. Classes 7-12: 50 Birr/month. Working members: 2% of monthly salary.
- Late payment rule: first 7 days of the Ethiopian month are grace period; after that, +10 Birr every 3 days, computed automatically.
- **Student Fee Management** now shows outstanding balance (current month + previous unpaid months + penalty) per student.
- **Record Payment** shows the full breakdown before saving and lets you include/exclude the current penalty.
- **Analytics** adds a payment-status breakdown: not paid, overdue, paid today, paid this month, paid late — plus the existing collection-rate and trend charts.

**Notification bell** (top-right of every dashboard)
- Unified `/notifications` feed, filtered per role (Administrators see everything).
- Unread badge, mark-one-read, mark-all-read.
- **Saturday weekly digest**: a cron job (`common/digest`, `@nestjs/schedule`, `0 8 * * 6` Africa/Addis_Ababa) runs every Saturday at 08:00 and creates one notification summarizing (a) students about to be auto-inactivated (4 consecutive absences — one more triggers it), (b) students who haven't paid this month, and (c) a general status line if nothing's urgent. An Administrator can also trigger it on demand via `POST /api/v1/digest/run-now`.
  - **Note:** this creates an in-app notification only, since I don't have email/SMS credentials to send it externally. To also get it by email or SMS, connect a provider (SMTP env vars, or an email/SMS MCP connector) and call it at the end of `WeeklyDigestService.runWeeklyDigest()`.

**Admin dashboard** (`/dashboard/admin`, Administrators only) — one synchronized snapshot: total/active/inactive students, new registrations, total income/expenses, current balance, outstanding fees, event stats, today's attendance %. It reads the same tables every other dashboard reads — no separate logic, so it can never drift out of sync.

**Backend synchronization** — registering a student, paying a fee, an attendance-triggered inactivation, or an event RSVP all read/write the same Prisma tables; every dashboard queries those tables live, so there's nothing to keep in sync manually. Every mutation still goes through the shared audit log (`GET /api/v1/audit-log`).

## Project structure

```
marha-hiwot/
├── backend/                        NestJS API (TypeScript, Prisma, PostgreSQL)
│   ├── assets/logo.jpg             embedded in every PDF export
│   ├── prisma/schema.prisma        full data model (15 models, 12 enums)
│   ├── prisma/seed.ts              bilingual demo data
│   └── src/
│       ├── common/
│       │   ├── audit/              shared audit log (global)
│       │   ├── notifications/      unified bell-icon feed (global)
│       │   ├── digest/             Saturday weekly-digest cron
│       │   └── constants/          Ethiopian calendar conversion, fee-rules engine
│       ├── students/                full CRUD, Amharic search, inactive-students list
│       ├── admin/                   synchronized overview
│       ├── finance/                 dashboard, student-fees (fee engine), income, expense,
│       │                            analytics, reports (PDF/Excel + logo), receipts
│       └── attendance/
│           ├── class-groups/ · teachers/
│           ├── attendance-events/ · attendance-records/   (auto-inactivation lives here)
│           ├── events/              Events module
│           ├── dashboard/ · analytics/ · reports/ · notifications/
├── frontend/                        Next.js App Router (TypeScript, Tailwind)
│   ├── public/logo.jpg
│   ├── lib/i18n.tsx                 English/Amharic context
│   ├── lib/ethiopian-calendar.ts    Gregorian↔Ethiopian conversion
│   ├── components/layout/           Sidebar (logo, nav), Header (language + bell), NotificationBell
│   └── app/dashboard/
│       ├── admin/
│       ├── attendance/{ , students, students/[id], take, inactive, events, analytics, reports}
│       └── finance/{ , student-fees, income, expense, analytics, reports, receipts}
├── docker-compose.yml
└── .github/workflows/ci.yml
```

## Running locally with Docker (recommended)

```bash
cp backend/.env.example backend/.env      # edit JWT_SECRET before production use
cp frontend/.env.local.example frontend/.env.local

docker compose up --build
```

```bash
docker compose exec backend npx prisma migrate dev --name init
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



Seed data includes one student already auto-inactivated (5 consecutive absences) and one at 4 consecutive absences (shows as "upcoming inactive" — exactly what the Saturday digest flags), so you can see the automation working immediately.

## Notes on scope

- **Amharic coverage**: the toggle translates sidebar/header labels and displays Amharic student names; it's a lightweight dictionary (`lib/i18n.tsx`), not a full i18n framework — extend `DICTIONARY` for more strings as needed.
- **Weekly digest delivery**: in-app notification only (see above) — no outbound email/SMS provider is configured.
- **S3 photo upload** is still stubbed (schema field exists, endpoints accept a URL string).
- Frontend type-checked and production-built clean (20 routes) after every change in this pass. `prisma generate`/`migrate` couldn't be verified in this sandbox (needs `binaries.prisma.sh`, not reachable here) — works normally with standard internet access.
