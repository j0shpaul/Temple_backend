-- CreateTable
CREATE TABLE "StaffAssignment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "templeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StaffAssignment_userId_idx" ON "StaffAssignment"("userId");

-- CreateIndex
CREATE INDEX "StaffAssignment_templeId_idx" ON "StaffAssignment"("templeId");

-- CreateIndex
CREATE UNIQUE INDEX "StaffAssignment_userId_templeId_key" ON "StaffAssignment"("userId", "templeId");

-- AddForeignKey
ALTER TABLE "StaffAssignment" ADD CONSTRAINT "StaffAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffAssignment" ADD CONSTRAINT "StaffAssignment_templeId_fkey" FOREIGN KEY ("templeId") REFERENCES "Temple"("id") ON DELETE CASCADE ON UPDATE CASCADE;
