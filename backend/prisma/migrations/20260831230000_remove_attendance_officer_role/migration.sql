-- Remove the ATTENDANCE_OFFICER role from the system.
-- The only account holding this role is the seeded demo account
-- (attendance@marahiwot.org) created by prisma/seed.ts purely to demo the
-- now-removed Attendance feature. There were no real operators on it, so it is
-- removed rather than reassigned. Its admin/finance seed counterparts remain.

-- Delete the demo account row first (a value cannot be removed from an enum
-- while a row still references it). Only the seeded demo account holds this role;
-- its admin/finance counterparts are untouched.
DELETE FROM "users" WHERE "role" = 'ATTENDANCE_OFFICER';

-- This database build does not support ALTER TYPE ... DROP VALUE, so rebuild the
-- enum via the standard re-create + re-point + drop pattern. Only the "users".
-- "role" column uses the "Role" type; the ATTENDANCE_OFFICER row is already gone,
-- so the text cast is lossless.
CREATE TYPE "Role_new" AS ENUM ('ADMINISTRATOR', 'FINANCE_OFFICER');
ALTER TABLE "users" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
DROP TYPE "Role";
ALTER TYPE "Role_new" RENAME TO "Role";
