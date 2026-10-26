-- AlterEnum: Add TEACHER to Role
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'TEACHER';

-- CreateEnum: GradeStatus
CREATE TYPE "GradeStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED');

-- CreateEnum: AcademicSemester
CREATE TYPE "AcademicSemester" AS ENUM ('SEMESTER_1', 'SEMESTER_2', 'YEAR_ROUND');

-- CreateEnum: MessageCategory
CREATE TYPE "MessageCategory" AS ENUM ('GENERAL', 'CURRICULUM', 'EXAM_SCHEDULE', 'STUDENT_AFFAIR', 'MEETING', 'URGENT');

-- CreateEnum: CertificateTemplate
CREATE TYPE "CertificateTemplate" AS ENUM ('STANDARD_COMPLETION', 'HONOR_EXCELLENCE', 'DISTINGUISHED_SERVICE', 'PARTICIPATION');

-- CreateTable: courses
CREATE TABLE "courses" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameAmharic" TEXT NOT NULL,
    "classLevel" "ClassLevel" NOT NULL,
    "maxScore" DECIMAL(5,2) NOT NULL DEFAULT 100,
    "passScore" DECIMAL(5,2) NOT NULL DEFAULT 50,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "teacherId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable: student_grades
CREATE TABLE "student_grades" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "ethiopianYear" INTEGER NOT NULL DEFAULT 2018,
    "semester" "AcademicSemester" NOT NULL DEFAULT 'SEMESTER_1',
    "assessmentScore" DECIMAL(5,2) DEFAULT 0,
    "midExamScore" DECIMAL(5,2) DEFAULT 0,
    "finalExamScore" DECIMAL(5,2) DEFAULT 0,
    "conductScore" DECIMAL(5,2) DEFAULT 0,
    "totalScore" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "letterGrade" TEXT,
    "rank" INTEGER,
    "status" "GradeStatus" NOT NULL DEFAULT 'SUBMITTED',
    "remarks" TEXT,
    "submittedById" TEXT,
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_grades_pkey" PRIMARY KEY ("id")
);

-- CreateTable: department_messages
CREATE TABLE "department_messages" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" "MessageCategory" NOT NULL DEFAULT 'GENERAL',
    "targetAudience" TEXT NOT NULL DEFAULT 'ALL',
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "department_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable: certificate_records
CREATE TABLE "certificate_records" (
    "id" TEXT NOT NULL,
    "certificateNumber" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "templateType" "CertificateTemplate" NOT NULL DEFAULT 'HONOR_EXCELLENCE',
    "titleAmharic" TEXT NOT NULL,
    "titleEnglish" TEXT NOT NULL,
    "recipientNameAmharic" TEXT NOT NULL,
    "recipientNameEnglish" TEXT NOT NULL,
    "courseOrClass" TEXT NOT NULL,
    "academicYear" INTEGER NOT NULL DEFAULT 2018,
    "issueDateEthiopian" TEXT NOT NULL,
    "customMessageAmharic" TEXT,
    "bibleVerseAmharic" TEXT,
    "overallGrade" TEXT,
    "rankText" TEXT,
    "signatory1Title" TEXT NOT NULL DEFAULT 'የክፍሉ መምህር',
    "signatory1Name" TEXT NOT NULL DEFAULT 'መምህር ተክለ ማርያም',
    "signatory2Title" TEXT NOT NULL DEFAULT 'የትምህርት ክፍል ኃላፊ',
    "signatory2Name" TEXT NOT NULL DEFAULT 'ዲ/ን ዮሐንስ',
    "signatory3Title" TEXT NOT NULL DEFAULT 'የሰ/ት/ቤቱ ሰብሳቢ',
    "signatory3Name" TEXT NOT NULL DEFAULT 'መጋቤ ሐዲስ',
    "borderStyle" TEXT NOT NULL DEFAULT 'ETHIOPIC_GOLD_DOUBLE',
    "themeColor" TEXT NOT NULL DEFAULT '#D4AF37',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "certificate_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "courses_code_key" ON "courses"("code");
CREATE INDEX "student_grades_studentId_idx" ON "student_grades"("studentId");
CREATE INDEX "student_grades_courseId_idx" ON "student_grades"("courseId");
CREATE UNIQUE INDEX "student_grades_studentId_courseId_ethiopianYear_semester_key" ON "student_grades"("studentId", "courseId", "ethiopianYear", "semester");
CREATE UNIQUE INDEX "certificate_records_certificateNumber_key" ON "certificate_records"("certificateNumber");

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_grades" ADD CONSTRAINT "student_grades_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_grades" ADD CONSTRAINT "student_grades_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_grades" ADD CONSTRAINT "student_grades_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "student_grades" ADD CONSTRAINT "student_grades_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "department_messages" ADD CONSTRAINT "department_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate_records" ADD CONSTRAINT "certificate_records_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "certificate_records" ADD CONSTRAINT "certificate_records_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
