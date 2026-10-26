-- CreateTable
CREATE TABLE IF NOT EXISTS "_ClassGroupTeachers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_ClassGroupTeachers_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "_ClassGroupTeachers_B_index" ON "_ClassGroupTeachers"("B");

-- AddForeignKey
ALTER TABLE "_ClassGroupTeachers" 
DROP CONSTRAINT IF EXISTS "_ClassGroupTeachers_A_fkey";
ALTER TABLE "_ClassGroupTeachers" 
ADD CONSTRAINT "_ClassGroupTeachers_A_fkey" FOREIGN KEY ("A") REFERENCES "class_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "_ClassGroupTeachers" 
DROP CONSTRAINT IF EXISTS "_ClassGroupTeachers_B_fkey";
ALTER TABLE "_ClassGroupTeachers" 
ADD CONSTRAINT "_ClassGroupTeachers_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
