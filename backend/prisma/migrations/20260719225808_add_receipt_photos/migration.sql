-- CreateTable
CREATE TABLE "receipt_photos" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "receipt_photos_pkey" PRIMARY KEY ("id")
);
