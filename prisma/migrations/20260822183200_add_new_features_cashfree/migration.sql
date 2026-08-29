-- CreateEnum
CREATE TYPE "GurukulAdmissionStatus" AS ENUM ('PENDING', 'REVIEWING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "JigyasaStatus" AS ENUM ('PENDING', 'ANSWERED', 'REJECTED');

-- CreateEnum
CREATE TYPE "MahaprasadBookingStatus" AS ENUM ('PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED', 'COMPLETED');

-- AlterEnum
ALTER TYPE "PaymentEntityType" ADD VALUE 'MAHAPRASAD_BOOKING';

-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'PROCESSING';
ALTER TYPE "PaymentStatus" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "failureReason" TEXT,
ADD COLUMN     "gateway" TEXT NOT NULL DEFAULT 'CASHFREE',
ADD COLUMN     "mahaprasadId" TEXT;

-- AlterTable
ALTER TABLE "PaymentEvent" ALTER COLUMN "paymentId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Paath" (
    "id" TEXT NOT NULL,
    "templeId" TEXT,
    "title" TEXT NOT NULL,
    "sanskritText" TEXT NOT NULL,
    "transliteration" TEXT NOT NULL,
    "hindiMeaning" TEXT NOT NULL,
    "englishMeaning" TEXT,
    "audioUrl" TEXT,
    "durationSeconds" INTEGER,
    "category" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Paath_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Gurukul" (
    "id" TEXT NOT NULL,
    "templeId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "about" TEXT,
    "philosophy" TEXT,
    "admissionInfo" TEXT,
    "contactInfo" TEXT,
    "rules" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Gurukul_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GurukulSchedule" (
    "id" TEXT NOT NULL,
    "gurukulId" TEXT NOT NULL,
    "activityName" TEXT NOT NULL,
    "description" TEXT,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GurukulSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GurukulAdmission" (
    "id" TEXT NOT NULL,
    "gurukulId" TEXT,
    "studentName" TEXT NOT NULL,
    "guardianName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "dateOfBirth" TEXT,
    "previousEducation" TEXT,
    "address" TEXT,
    "message" TEXT,
    "status" "GurukulAdmissionStatus" NOT NULL DEFAULT 'PENDING',
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GurukulAdmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MahaprasadSlot" (
    "id" TEXT NOT NULL,
    "templeId" TEXT NOT NULL,
    "sessionName" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 100,
    "bookedCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "pricePerPersonPaise" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MahaprasadSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MahaprasadBooking" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "slotId" TEXT NOT NULL,
    "numberOfPeople" INTEGER NOT NULL DEFAULT 1,
    "devoteeName" TEXT NOT NULL,
    "devoteePhone" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "status" "MahaprasadBookingStatus" NOT NULL DEFAULT 'CONFIRMED',
    "paymentId" TEXT,
    "qrToken" TEXT,
    "checkedInAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MahaprasadBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Jigyasa" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "askerName" TEXT NOT NULL,
    "askerPhone" TEXT,
    "question" TEXT NOT NULL,
    "category" TEXT,
    "answer" TEXT,
    "answeredBy" TEXT,
    "answeredAt" TIMESTAMP(3),
    "status" "JigyasaStatus" NOT NULL DEFAULT 'PENDING',
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Jigyasa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Paath_templeId_idx" ON "Paath"("templeId");

-- CreateIndex
CREATE INDEX "Paath_isPublished_idx" ON "Paath"("isPublished");

-- CreateIndex
CREATE INDEX "Paath_category_idx" ON "Paath"("category");

-- CreateIndex
CREATE INDEX "Paath_displayOrder_idx" ON "Paath"("displayOrder");

-- CreateIndex
CREATE INDEX "Gurukul_templeId_idx" ON "Gurukul"("templeId");

-- CreateIndex
CREATE INDEX "Gurukul_isPublished_idx" ON "Gurukul"("isPublished");

-- CreateIndex
CREATE INDEX "GurukulSchedule_gurukulId_idx" ON "GurukulSchedule"("gurukulId");

-- CreateIndex
CREATE INDEX "GurukulSchedule_isActive_idx" ON "GurukulSchedule"("isActive");

-- CreateIndex
CREATE INDEX "GurukulSchedule_displayOrder_idx" ON "GurukulSchedule"("displayOrder");

-- CreateIndex
CREATE INDEX "GurukulAdmission_gurukulId_idx" ON "GurukulAdmission"("gurukulId");

-- CreateIndex
CREATE INDEX "GurukulAdmission_status_idx" ON "GurukulAdmission"("status");

-- CreateIndex
CREATE INDEX "GurukulAdmission_phone_idx" ON "GurukulAdmission"("phone");

-- CreateIndex
CREATE INDEX "GurukulAdmission_createdAt_idx" ON "GurukulAdmission"("createdAt");

-- CreateIndex
CREATE INDEX "MahaprasadSlot_templeId_idx" ON "MahaprasadSlot"("templeId");

-- CreateIndex
CREATE INDEX "MahaprasadSlot_date_idx" ON "MahaprasadSlot"("date");

-- CreateIndex
CREATE INDEX "MahaprasadSlot_isActive_idx" ON "MahaprasadSlot"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "MahaprasadBooking_reference_key" ON "MahaprasadBooking"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "MahaprasadBooking_paymentId_key" ON "MahaprasadBooking"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "MahaprasadBooking_qrToken_key" ON "MahaprasadBooking"("qrToken");

-- CreateIndex
CREATE INDEX "MahaprasadBooking_userId_idx" ON "MahaprasadBooking"("userId");

-- CreateIndex
CREATE INDEX "MahaprasadBooking_slotId_idx" ON "MahaprasadBooking"("slotId");

-- CreateIndex
CREATE INDEX "MahaprasadBooking_status_idx" ON "MahaprasadBooking"("status");

-- CreateIndex
CREATE INDEX "MahaprasadBooking_reference_idx" ON "MahaprasadBooking"("reference");

-- CreateIndex
CREATE INDEX "Jigyasa_userId_idx" ON "Jigyasa"("userId");

-- CreateIndex
CREATE INDEX "Jigyasa_status_idx" ON "Jigyasa"("status");

-- CreateIndex
CREATE INDEX "Jigyasa_isPublic_idx" ON "Jigyasa"("isPublic");

-- CreateIndex
CREATE INDEX "Jigyasa_category_idx" ON "Jigyasa"("category");

-- CreateIndex
CREATE INDEX "Jigyasa_createdAt_idx" ON "Jigyasa"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_mahaprasadId_key" ON "Payment"("mahaprasadId");

-- CreateIndex
CREATE INDEX "Payment_mahaprasadId_idx" ON "Payment"("mahaprasadId");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_mahaprasadId_fkey" FOREIGN KEY ("mahaprasadId") REFERENCES "MahaprasadBooking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paath" ADD CONSTRAINT "Paath_templeId_fkey" FOREIGN KEY ("templeId") REFERENCES "Temple"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gurukul" ADD CONSTRAINT "Gurukul_templeId_fkey" FOREIGN KEY ("templeId") REFERENCES "Temple"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GurukulSchedule" ADD CONSTRAINT "GurukulSchedule_gurukulId_fkey" FOREIGN KEY ("gurukulId") REFERENCES "Gurukul"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GurukulAdmission" ADD CONSTRAINT "GurukulAdmission_gurukulId_fkey" FOREIGN KEY ("gurukulId") REFERENCES "Gurukul"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MahaprasadSlot" ADD CONSTRAINT "MahaprasadSlot_templeId_fkey" FOREIGN KEY ("templeId") REFERENCES "Temple"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MahaprasadBooking" ADD CONSTRAINT "MahaprasadBooking_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "MahaprasadSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MahaprasadBooking" ADD CONSTRAINT "MahaprasadBooking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Jigyasa" ADD CONSTRAINT "Jigyasa_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
