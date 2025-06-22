-- CreateTable
CREATE TABLE "Hotel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingUrl" TEXT NOT NULL,
    "externalHotelId" TEXT,
    "name" TEXT,
    "location" TEXT,
    "currency" TEXT,
    "ratingOverall" REAL,
    "ratingLocation" REAL,
    "amenities" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DailyPrice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hotelId" TEXT NOT NULL,
    "checkInDate" DATETIME NOT NULL,
    "price" REAL NOT NULL,
    "available" BOOLEAN NOT NULL,
    "scrapedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DailyPrice_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OwnHotelHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "priceApplied" REAL NOT NULL,
    "reservations" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Criterion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "displayName" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "HotelCriterionWeight" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hotelId" TEXT NOT NULL,
    "criterionId" TEXT NOT NULL,
    "season" TEXT NOT NULL,
    "weight" REAL NOT NULL,
    CONSTRAINT "HotelCriterionWeight_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "HotelCriterionWeight_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES "Criterion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Hotel_bookingUrl_key" ON "Hotel"("bookingUrl");

-- CreateIndex
CREATE UNIQUE INDEX "DailyPrice_hotelId_checkInDate_key" ON "DailyPrice"("hotelId", "checkInDate");

-- CreateIndex
CREATE UNIQUE INDEX "Criterion_key_key" ON "Criterion"("key");

-- CreateIndex
CREATE UNIQUE INDEX "HotelCriterionWeight_hotelId_criterionId_season_key" ON "HotelCriterionWeight"("hotelId", "criterionId", "season");
