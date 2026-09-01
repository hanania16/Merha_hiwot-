-- Remove the Attendance feature (tables + unused enum types).
-- Data is preserved in database backups; no other feature reads these tables.

-- Drop attendance-related tables (child before parent).
DROP TABLE IF EXISTS "event_attendance";
DROP TABLE IF EXISTS "attendance";
DROP TABLE IF EXISTS "attendance_events";
DROP TABLE IF EXISTS "inactivation_records";
DROP TABLE IF EXISTS "events";

-- Drop enum types that are no longer referenced by any remaining table.
DROP TYPE IF EXISTS "EventStatus";
DROP TYPE IF EXISTS "EventType";
DROP TYPE IF EXISTS "AttendanceStatus";
