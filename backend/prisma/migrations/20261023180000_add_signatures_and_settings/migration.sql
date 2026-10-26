-- AlterTable users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "signatureUrl" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "titleAmharic" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" TEXT;

-- AlterTable student_grades
ALTER TABLE "student_grades" ADD COLUMN IF NOT EXISTS "teacherSignature" TEXT;

-- AlterTable certificate_records
ALTER TABLE "certificate_records" ADD COLUMN IF NOT EXISTS "numberOfCourses" INTEGER;
ALTER TABLE "certificate_records" ADD COLUMN IF NOT EXISTS "totalScore" DECIMAL(6,2);
ALTER TABLE "certificate_records" ADD COLUMN IF NOT EXISTS "averageScore" DECIMAL(5,2);
ALTER TABLE "certificate_records" ADD COLUMN IF NOT EXISTS "rankInClass" INTEGER;
ALTER TABLE "certificate_records" ADD COLUMN IF NOT EXISTS "totalStudentsInClass" INTEGER;
ALTER TABLE "certificate_records" ADD COLUMN IF NOT EXISTS "courseBreakdown" JSONB;
ALTER TABLE "certificate_records" ADD COLUMN IF NOT EXISTS "signatory1Signature" TEXT;
ALTER TABLE "certificate_records" ADD COLUMN IF NOT EXISTS "signatory2Signature" TEXT;
ALTER TABLE "certificate_records" ADD COLUMN IF NOT EXISTS "signatory3Signature" TEXT;

-- CreateTable system_settings
CREATE TABLE IF NOT EXISTS "system_settings" (
    "id" TEXT NOT NULL,
    "systemNameAmharic" TEXT NOT NULL DEFAULT 'መርሃ ህይወት ሰንበት ትምህርት ቤት',
    "systemNameEnglish" TEXT NOT NULL DEFAULT 'Merha Hiwot Sunday School',
    "churchNameAmharic" TEXT NOT NULL DEFAULT 'ደብረ አሚን ተክለ ሃይማኖት ቤተ ክርስቲያን',
    "churchNameEnglish" TEXT NOT NULL DEFAULT 'Debre Amin Teklehaimanot Church',
    "mottoAmharic" TEXT DEFAULT 'ሕፃናትን ወደ እኔ ይመጡ ዘንድ ተዉአቸው፤ አትከልክሏቸውም፤ የእግዚአብሔር መንግሥት እንደ እነዚህ ላሉት ናትና።',
    "primaryColorHex" TEXT NOT NULL DEFAULT '#1E3A8A',
    "accentColorHex" TEXT NOT NULL DEFAULT '#D4AF37',
    "logoUrl" TEXT,
    "currentAcademicYear" INTEGER NOT NULL DEFAULT 2018,
    "defaultPassingScore" DECIMAL(5,2) NOT NULL DEFAULT 50.00,
    "teachingAdminName" TEXT DEFAULT 'ዲ/ን ዮሐንስ',
    "churchAdminName" TEXT DEFAULT 'መጋቤ ሐዲስ',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- Seed default system setting row
INSERT INTO "system_settings" ("id", "systemNameAmharic", "systemNameEnglish", "churchNameAmharic", "churchNameEnglish", "mottoAmharic", "primaryColorHex", "accentColorHex", "currentAcademicYear", "defaultPassingScore", "teachingAdminName", "churchAdminName", "updatedAt")
VALUES ('default', 'መርሃ ህይወት ሰንበት ትምህርት ቤት', 'Merha Hiwot Sunday School', 'ደብረ አሚን ተክለ ሃይማኖት ቤተ ክርስቲያን', 'Debre Amin Teklehaimanot Church', 'ሕፃናትን ወደ እኔ ይመጡ ዘንድ ተዉአቸው፤ አትከልክሏቸውም፤ የእግዚአብሔር መንግሥት እንደ እነዚህ ላሉት ናትና።', '#1E3A8A', '#D4AF37', 2018, 50.00, 'ዲ/ን ዮሐንስ', 'መጋቤ ሐዲስ', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
