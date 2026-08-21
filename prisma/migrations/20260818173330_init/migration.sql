-- CreateEnum
CREATE TYPE "Role" AS ENUM ('DEVOTEE', 'STAFF', 'MANAGER', 'ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED', 'EXPIRED', 'CHECKED_IN', 'COMPLETED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentEntityType" AS ENUM ('PUJA_BOOKING', 'SEVA_BOOKING', 'DONATION', 'PRASAD_ORDER', 'ACCOMMODATION_BOOKING');

-- CreateEnum
CREATE TYPE "DonationStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "EventRegistrationStatus" AS ENUM ('REGISTERED', 'CANCELLED', 'ATTENDED');

-- CreateEnum
CREATE TYPE "PrasadOrderStatus" AS ENUM ('PLACED', 'CONFIRMED', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AccommodationStatus" AS ENUM ('PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED', 'CHECKED_IN', 'CHECKED_OUT', 'COMPLETED');

-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('AVAILABLE', 'MAINTENANCE', 'DISABLED');

-- CreateEnum
CREATE TYPE "AnnouncementPriority" AS ENUM ('NORMAL', 'IMPORTANT', 'URGENT');

-- CreateEnum
CREATE TYPE "AnnouncementStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('BOOKING_CONFIRMED', 'PAYMENT_SUCCESS', 'EVENT_REMINDER', 'DARSHAN_REMINDER', 'ANNOUNCEMENT', 'PRASAD_UPDATE', 'GENERAL');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'READ');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('PUSH', 'IN_APP');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'VIDEO', 'DOCUMENT', 'AUDIO');

-- CreateEnum
CREATE TYPE "MediaProvider" AS ENUM ('CLOUDINARY', 'S3', 'LOCAL');

-- CreateEnum
CREATE TYPE "SlotStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "AartiStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "TempleStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'BOOKING_STATUS_CHANGE', 'PAYMENT_STATUS_CHANGE', 'DONATION_STATUS_CHANGE', 'SCHEDULE_CHANGE', 'USER_ROLE_CHANGE', 'CONTENT_CHANGE', 'CHECK_IN', 'CANCEL', 'REFUND');

-- CreateEnum
CREATE TYPE "CrowdLevel" AS ENUM ('LOW', 'MODERATE', 'HIGH', 'VERY_HIGH');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "role" "Role" NOT NULL DEFAULT 'DEVOTEE',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "fcmToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Temple" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT DEFAULT 'India',
    "pincode" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "status" "TempleStatus" NOT NULL DEFAULT 'ACTIVE',
    "establishedYear" INTEGER,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Temple_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deity" (
    "id" TEXT NOT NULL,
    "templeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "significance" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TempleInformation" (
    "id" TEXT NOT NULL,
    "templeId" TEXT NOT NULL,
    "history" TEXT,
    "architecture" TEXT,
    "timings" TEXT,
    "guidelines" TEXT,
    "about" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TempleInformation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Media" (
    "id" TEXT NOT NULL,
    "templeId" TEXT NOT NULL,
    "provider" "MediaProvider" NOT NULL DEFAULT 'CLOUDINARY',
    "publicId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mediaType" "MediaType" NOT NULL DEFAULT 'IMAGE',
    "fileName" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "alt" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deityId" TEXT,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GalleryItem" (
    "id" TEXT NOT NULL,
    "templeId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "title" TEXT,
    "caption" TEXT,
    "category" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GalleryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DarshanSchedule" (
    "id" TEXT NOT NULL,
    "templeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "dayOfWeek" INTEGER,
    "specificDate" TIMESTAMP(3),
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "maxCapacity" INTEGER NOT NULL DEFAULT 0,
    "isSpecial" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DarshanSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DarshanSlot" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "capacity" INTEGER NOT NULL,
    "bookedCount" INTEGER NOT NULL DEFAULT 0,
    "status" "SlotStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DarshanSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AartiSchedule" (
    "id" TEXT NOT NULL,
    "templeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "dayOfWeek" INTEGER,
    "specificDate" TIMESTAMP(3),
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isSpecial" BOOLEAN NOT NULL DEFAULT false,
    "overrideReason" TEXT,
    "status" "AartiStatus" NOT NULL DEFAULT 'ACTIVE',
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AartiSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Puja" (
    "id" TEXT NOT NULL,
    "templeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "deityId" TEXT,
    "pricePaise" INTEGER NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 30,
    "defaultCapacity" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Puja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Seva" (
    "id" TEXT NOT NULL,
    "templeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "deityId" TEXT,
    "pricePaise" INTEGER NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 30,
    "defaultCapacity" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Seva_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PujaSlot" (
    "id" TEXT NOT NULL,
    "pujaId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "capacity" INTEGER NOT NULL,
    "bookedCount" INTEGER NOT NULL DEFAULT 0,
    "status" "SlotStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PujaSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SevaSlot" (
    "id" TEXT NOT NULL,
    "sevaId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "capacity" INTEGER NOT NULL,
    "bookedCount" INTEGER NOT NULL DEFAULT 0,
    "status" "SlotStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SevaSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "templeId" TEXT NOT NULL,
    "bookingType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "slotDate" TIMESTAMP(3) NOT NULL,
    "slotStartTime" TIMESTAMP(3) NOT NULL,
    "slotEndTime" TIMESTAMP(3) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "devoteeName" TEXT NOT NULL,
    "devoteePhone" TEXT NOT NULL,
    "devoteeEmail" TEXT,
    "amountPaise" INTEGER NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "reference" TEXT NOT NULL,
    "qrToken" TEXT,
    "qrGeneratedAt" TIMESTAMP(3),
    "checkedInAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelledReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingAttendee" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "age" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingAttendee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckIn" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "templeId" TEXT NOT NULL,
    "checkedInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "location" TEXT,
    "verifiedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT,
    "donationId" TEXT,
    "prasadOrderId" TEXT,
    "accommodationId" TEXT,
    "entityType" "PaymentEntityType" NOT NULL,
    "userId" TEXT NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "razorpayOrderId" TEXT,
    "razorpayPaymentId" TEXT,
    "razorpaySignature" TEXT,
    "receiptNumber" TEXT,
    "description" TEXT,
    "paidAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "refundAmountPaise" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentEvent" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "razorpayEventId" TEXT,
    "status" TEXT NOT NULL,
    "amountPaise" INTEGER,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DonationCause" (
    "id" TEXT NOT NULL,
    "templeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DonationCause_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Donation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "templeId" TEXT NOT NULL,
    "causeId" TEXT NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "donorName" TEXT,
    "message" TEXT,
    "status" "DonationStatus" NOT NULL DEFAULT 'PENDING',
    "reference" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Donation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DonationReceipt" (
    "id" TEXT NOT NULL,
    "donationId" TEXT NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amountPaise" INTEGER NOT NULL,
    "donorName" TEXT,
    "causeName" TEXT NOT NULL,
    "templeName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DonationReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "templeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "location" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "capacity" INTEGER,
    "bookedCount" INTEGER NOT NULL DEFAULT 0,
    "registrationRequired" BOOLEAN NOT NULL DEFAULT true,
    "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventRegistration" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "EventRegistrationStatus" NOT NULL DEFAULT 'REGISTERED',
    "qrToken" TEXT,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelledAt" TIMESTAMP(3),

    CONSTRAINT "EventRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Address" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "line1" TEXT NOT NULL,
    "line2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'India',
    "phone" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrasadProduct" (
    "id" TEXT NOT NULL,
    "templeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "pricePaise" INTEGER NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "reservedStock" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "imageUrl" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrasadProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrasadOrder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "templeId" TEXT NOT NULL,
    "addressId" TEXT NOT NULL,
    "status" "PrasadOrderStatus" NOT NULL DEFAULT 'PLACED',
    "subtotalPaise" INTEGER NOT NULL,
    "deliveryPaise" INTEGER NOT NULL DEFAULT 0,
    "totalPaise" INTEGER NOT NULL,
    "reference" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrasadOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrasadOrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "unitPricePaise" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "lineTotalPaise" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrasadOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "templeId" TEXT NOT NULL,
    "roomNumber" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "pricePaise" INTEGER NOT NULL,
    "status" "RoomStatus" NOT NULL DEFAULT 'AVAILABLE',
    "amenities" TEXT[],
    "description" TEXT,
    "floor" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccommodationBooking" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "templeId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "checkIn" TIMESTAMP(3) NOT NULL,
    "checkOut" TIMESTAMP(3) NOT NULL,
    "guests" INTEGER NOT NULL DEFAULT 1,
    "status" "AccommodationStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "amountPaise" INTEGER NOT NULL,
    "reference" TEXT NOT NULL,
    "qrToken" TEXT,
    "checkedInAt" TIMESTAMP(3),
    "checkedOutAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccommodationBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
    "fcmMessageId" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "templeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "priority" "AnnouncementPriority" NOT NULL DEFAULT 'NORMAL',
    "status" "AnnouncementStatus" NOT NULL DEFAULT 'DRAFT',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorRole" "Role",
    "action" "AuditAction" NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrowdSnapshot" (
    "id" TEXT NOT NULL,
    "templeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "level" "CrowdLevel" NOT NULL DEFAULT 'LOW',
    "occupancyPct" INTEGER NOT NULL DEFAULT 0,
    "estimatedCount" INTEGER NOT NULL DEFAULT 0,
    "availableCapacity" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'computed',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrowdSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "RefreshToken_tokenHash_idx" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "Temple_status_idx" ON "Temple"("status");

-- CreateIndex
CREATE INDEX "Deity_templeId_idx" ON "Deity"("templeId");

-- CreateIndex
CREATE INDEX "Deity_isActive_idx" ON "Deity"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "TempleInformation_templeId_key" ON "TempleInformation"("templeId");

-- CreateIndex
CREATE INDEX "Media_templeId_idx" ON "Media"("templeId");

-- CreateIndex
CREATE INDEX "Media_deityId_idx" ON "Media"("deityId");

-- CreateIndex
CREATE INDEX "GalleryItem_templeId_idx" ON "GalleryItem"("templeId");

-- CreateIndex
CREATE INDEX "GalleryItem_isActive_idx" ON "GalleryItem"("isActive");

-- CreateIndex
CREATE INDEX "DarshanSchedule_templeId_idx" ON "DarshanSchedule"("templeId");

-- CreateIndex
CREATE INDEX "DarshanSchedule_isActive_idx" ON "DarshanSchedule"("isActive");

-- CreateIndex
CREATE INDEX "DarshanSlot_date_idx" ON "DarshanSlot"("date");

-- CreateIndex
CREATE INDEX "DarshanSlot_status_idx" ON "DarshanSlot"("status");

-- CreateIndex
CREATE UNIQUE INDEX "DarshanSlot_scheduleId_date_startTime_key" ON "DarshanSlot"("scheduleId", "date", "startTime");

-- CreateIndex
CREATE INDEX "AartiSchedule_templeId_idx" ON "AartiSchedule"("templeId");

-- CreateIndex
CREATE INDEX "AartiSchedule_status_idx" ON "AartiSchedule"("status");

-- CreateIndex
CREATE INDEX "Puja_templeId_idx" ON "Puja"("templeId");

-- CreateIndex
CREATE INDEX "Puja_isActive_idx" ON "Puja"("isActive");

-- CreateIndex
CREATE INDEX "Seva_templeId_idx" ON "Seva"("templeId");

-- CreateIndex
CREATE INDEX "Seva_isActive_idx" ON "Seva"("isActive");

-- CreateIndex
CREATE INDEX "PujaSlot_date_idx" ON "PujaSlot"("date");

-- CreateIndex
CREATE INDEX "PujaSlot_status_idx" ON "PujaSlot"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PujaSlot_pujaId_date_startTime_key" ON "PujaSlot"("pujaId", "date", "startTime");

-- CreateIndex
CREATE INDEX "SevaSlot_date_idx" ON "SevaSlot"("date");

-- CreateIndex
CREATE INDEX "SevaSlot_status_idx" ON "SevaSlot"("status");

-- CreateIndex
CREATE UNIQUE INDEX "SevaSlot_sevaId_date_startTime_key" ON "SevaSlot"("sevaId", "date", "startTime");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_reference_key" ON "Booking"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_qrToken_key" ON "Booking"("qrToken");

-- CreateIndex
CREATE INDEX "Booking_userId_idx" ON "Booking"("userId");

-- CreateIndex
CREATE INDEX "Booking_templeId_idx" ON "Booking"("templeId");

-- CreateIndex
CREATE INDEX "Booking_status_idx" ON "Booking"("status");

-- CreateIndex
CREATE INDEX "Booking_slotId_idx" ON "Booking"("slotId");

-- CreateIndex
CREATE INDEX "Booking_slotDate_idx" ON "Booking"("slotDate");

-- CreateIndex
CREATE INDEX "Booking_reference_idx" ON "Booking"("reference");

-- CreateIndex
CREATE INDEX "BookingAttendee_bookingId_idx" ON "BookingAttendee"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "CheckIn_bookingId_key" ON "CheckIn"("bookingId");

-- CreateIndex
CREATE INDEX "CheckIn_userId_idx" ON "CheckIn"("userId");

-- CreateIndex
CREATE INDEX "CheckIn_templeId_idx" ON "CheckIn"("templeId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_bookingId_key" ON "Payment"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_donationId_key" ON "Payment"("donationId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_prasadOrderId_key" ON "Payment"("prasadOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_accommodationId_key" ON "Payment"("accommodationId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_razorpayOrderId_key" ON "Payment"("razorpayOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_receiptNumber_key" ON "Payment"("receiptNumber");

-- CreateIndex
CREATE INDEX "Payment_userId_idx" ON "Payment"("userId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_razorpayOrderId_idx" ON "Payment"("razorpayOrderId");

-- CreateIndex
CREATE INDEX "Payment_donationId_idx" ON "Payment"("donationId");

-- CreateIndex
CREATE INDEX "Payment_prasadOrderId_idx" ON "Payment"("prasadOrderId");

-- CreateIndex
CREATE INDEX "Payment_accommodationId_idx" ON "Payment"("accommodationId");

-- CreateIndex
CREATE INDEX "PaymentEvent_paymentId_idx" ON "PaymentEvent"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentEvent_razorpayEventId_key" ON "PaymentEvent"("razorpayEventId");

-- CreateIndex
CREATE INDEX "DonationCause_templeId_idx" ON "DonationCause"("templeId");

-- CreateIndex
CREATE INDEX "DonationCause_isActive_idx" ON "DonationCause"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "DonationCause_templeId_slug_key" ON "DonationCause"("templeId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Donation_reference_key" ON "Donation"("reference");

-- CreateIndex
CREATE INDEX "Donation_userId_idx" ON "Donation"("userId");

-- CreateIndex
CREATE INDEX "Donation_templeId_idx" ON "Donation"("templeId");

-- CreateIndex
CREATE INDEX "Donation_causeId_idx" ON "Donation"("causeId");

-- CreateIndex
CREATE INDEX "Donation_status_idx" ON "Donation"("status");

-- CreateIndex
CREATE UNIQUE INDEX "DonationReceipt_donationId_key" ON "DonationReceipt"("donationId");

-- CreateIndex
CREATE UNIQUE INDEX "DonationReceipt_receiptNumber_key" ON "DonationReceipt"("receiptNumber");

-- CreateIndex
CREATE INDEX "DonationReceipt_receiptNumber_idx" ON "DonationReceipt"("receiptNumber");

-- CreateIndex
CREATE INDEX "Event_templeId_idx" ON "Event"("templeId");

-- CreateIndex
CREATE INDEX "Event_status_idx" ON "Event"("status");

-- CreateIndex
CREATE INDEX "Event_startDate_idx" ON "Event"("startDate");

-- CreateIndex
CREATE UNIQUE INDEX "EventRegistration_qrToken_key" ON "EventRegistration"("qrToken");

-- CreateIndex
CREATE INDEX "EventRegistration_eventId_idx" ON "EventRegistration"("eventId");

-- CreateIndex
CREATE INDEX "EventRegistration_userId_idx" ON "EventRegistration"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EventRegistration_eventId_userId_key" ON "EventRegistration"("eventId", "userId");

-- CreateIndex
CREATE INDEX "Address_userId_idx" ON "Address"("userId");

-- CreateIndex
CREATE INDEX "PrasadProduct_templeId_idx" ON "PrasadProduct"("templeId");

-- CreateIndex
CREATE INDEX "PrasadProduct_isActive_idx" ON "PrasadProduct"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "PrasadOrder_reference_key" ON "PrasadOrder"("reference");

-- CreateIndex
CREATE INDEX "PrasadOrder_userId_idx" ON "PrasadOrder"("userId");

-- CreateIndex
CREATE INDEX "PrasadOrder_templeId_idx" ON "PrasadOrder"("templeId");

-- CreateIndex
CREATE INDEX "PrasadOrder_status_idx" ON "PrasadOrder"("status");

-- CreateIndex
CREATE INDEX "PrasadOrderItem_orderId_idx" ON "PrasadOrderItem"("orderId");

-- CreateIndex
CREATE INDEX "PrasadOrderItem_productId_idx" ON "PrasadOrderItem"("productId");

-- CreateIndex
CREATE INDEX "Room_templeId_idx" ON "Room"("templeId");

-- CreateIndex
CREATE INDEX "Room_status_idx" ON "Room"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Room_templeId_roomNumber_key" ON "Room"("templeId", "roomNumber");

-- CreateIndex
CREATE UNIQUE INDEX "AccommodationBooking_reference_key" ON "AccommodationBooking"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "AccommodationBooking_qrToken_key" ON "AccommodationBooking"("qrToken");

-- CreateIndex
CREATE INDEX "AccommodationBooking_userId_idx" ON "AccommodationBooking"("userId");

-- CreateIndex
CREATE INDEX "AccommodationBooking_templeId_idx" ON "AccommodationBooking"("templeId");

-- CreateIndex
CREATE INDEX "AccommodationBooking_roomId_idx" ON "AccommodationBooking"("roomId");

-- CreateIndex
CREATE INDEX "AccommodationBooking_status_idx" ON "AccommodationBooking"("status");

-- CreateIndex
CREATE INDEX "AccommodationBooking_checkIn_idx" ON "AccommodationBooking"("checkIn");

-- CreateIndex
CREATE INDEX "AccommodationBooking_checkOut_idx" ON "AccommodationBooking"("checkOut");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_status_idx" ON "Notification"("status");

-- CreateIndex
CREATE INDEX "Notification_type_idx" ON "Notification"("type");

-- CreateIndex
CREATE INDEX "Announcement_templeId_idx" ON "Announcement"("templeId");

-- CreateIndex
CREATE INDEX "Announcement_status_idx" ON "Announcement"("status");

-- CreateIndex
CREATE INDEX "Announcement_priority_idx" ON "Announcement"("priority");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_entity_idx" ON "AuditLog"("entity");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "CrowdSnapshot_templeId_idx" ON "CrowdSnapshot"("templeId");

-- CreateIndex
CREATE INDEX "CrowdSnapshot_date_idx" ON "CrowdSnapshot"("date");

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deity" ADD CONSTRAINT "Deity_templeId_fkey" FOREIGN KEY ("templeId") REFERENCES "Temple"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TempleInformation" ADD CONSTRAINT "TempleInformation_templeId_fkey" FOREIGN KEY ("templeId") REFERENCES "Temple"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_templeId_fkey" FOREIGN KEY ("templeId") REFERENCES "Temple"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_deityId_fkey" FOREIGN KEY ("deityId") REFERENCES "Deity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GalleryItem" ADD CONSTRAINT "GalleryItem_templeId_fkey" FOREIGN KEY ("templeId") REFERENCES "Temple"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GalleryItem" ADD CONSTRAINT "GalleryItem_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DarshanSchedule" ADD CONSTRAINT "DarshanSchedule_templeId_fkey" FOREIGN KEY ("templeId") REFERENCES "Temple"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DarshanSlot" ADD CONSTRAINT "DarshanSlot_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "DarshanSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AartiSchedule" ADD CONSTRAINT "AartiSchedule_templeId_fkey" FOREIGN KEY ("templeId") REFERENCES "Temple"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Puja" ADD CONSTRAINT "Puja_templeId_fkey" FOREIGN KEY ("templeId") REFERENCES "Temple"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Puja" ADD CONSTRAINT "Puja_deityId_fkey" FOREIGN KEY ("deityId") REFERENCES "Deity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Seva" ADD CONSTRAINT "Seva_templeId_fkey" FOREIGN KEY ("templeId") REFERENCES "Temple"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Seva" ADD CONSTRAINT "Seva_deityId_fkey" FOREIGN KEY ("deityId") REFERENCES "Deity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PujaSlot" ADD CONSTRAINT "PujaSlot_pujaId_fkey" FOREIGN KEY ("pujaId") REFERENCES "Puja"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SevaSlot" ADD CONSTRAINT "SevaSlot_sevaId_fkey" FOREIGN KEY ("sevaId") REFERENCES "Seva"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_templeId_fkey" FOREIGN KEY ("templeId") REFERENCES "Temple"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingAttendee" ADD CONSTRAINT "BookingAttendee_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_donationId_fkey" FOREIGN KEY ("donationId") REFERENCES "Donation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_prasadOrderId_fkey" FOREIGN KEY ("prasadOrderId") REFERENCES "PrasadOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_accommodationId_fkey" FOREIGN KEY ("accommodationId") REFERENCES "AccommodationBooking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentEvent" ADD CONSTRAINT "PaymentEvent_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DonationCause" ADD CONSTRAINT "DonationCause_templeId_fkey" FOREIGN KEY ("templeId") REFERENCES "Temple"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_templeId_fkey" FOREIGN KEY ("templeId") REFERENCES "Temple"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_causeId_fkey" FOREIGN KEY ("causeId") REFERENCES "DonationCause"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DonationReceipt" ADD CONSTRAINT "DonationReceipt_donationId_fkey" FOREIGN KEY ("donationId") REFERENCES "Donation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_templeId_fkey" FOREIGN KEY ("templeId") REFERENCES "Temple"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrasadProduct" ADD CONSTRAINT "PrasadProduct_templeId_fkey" FOREIGN KEY ("templeId") REFERENCES "Temple"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrasadOrder" ADD CONSTRAINT "PrasadOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrasadOrder" ADD CONSTRAINT "PrasadOrder_templeId_fkey" FOREIGN KEY ("templeId") REFERENCES "Temple"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrasadOrder" ADD CONSTRAINT "PrasadOrder_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "Address"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrasadOrderItem" ADD CONSTRAINT "PrasadOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "PrasadOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrasadOrderItem" ADD CONSTRAINT "PrasadOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "PrasadProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_templeId_fkey" FOREIGN KEY ("templeId") REFERENCES "Temple"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccommodationBooking" ADD CONSTRAINT "AccommodationBooking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccommodationBooking" ADD CONSTRAINT "AccommodationBooking_templeId_fkey" FOREIGN KEY ("templeId") REFERENCES "Temple"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccommodationBooking" ADD CONSTRAINT "AccommodationBooking_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_templeId_fkey" FOREIGN KEY ("templeId") REFERENCES "Temple"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrowdSnapshot" ADD CONSTRAINT "CrowdSnapshot_templeId_fkey" FOREIGN KEY ("templeId") REFERENCES "Temple"("id") ON DELETE CASCADE ON UPDATE CASCADE;
