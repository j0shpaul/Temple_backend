-- AlterTable
ALTER TABLE "User" ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "emergencyContact" TEXT,
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "isProfileComplete" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "User_latitude_longitude_idx" ON "User"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "User_isProfileComplete_idx" ON "User"("isProfileComplete");
