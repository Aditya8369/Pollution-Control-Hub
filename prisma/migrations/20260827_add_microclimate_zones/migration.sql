-- CreateTable
CREATE TABLE "MicroclimateCache" (
    "id" TEXT NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MicroclimateCache_pkey" PRIMARY KEY ("id")
);


-- CreateTable
CREATE TABLE "MicroclimateZone" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "centerLat" DOUBLE PRECISION NOT NULL,
    "centerLng" DOUBLE PRECISION NOT NULL,
    "radiusMeters" INTEGER NOT NULL,
    "avgTemperatureDiff" DOUBLE PRECISION NOT NULL,
    "healthAdvisory" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MicroclimateZone_pkey" PRIMARY KEY ("id")
);


-- CreateIndex
CREATE INDEX "MicroclimateCache_cacheKey_createdAt_idx" ON "MicroclimateCache"("cacheKey", "createdAt" DESC);


-- CreateIndex
CREATE INDEX "MicroclimateZone_userId_idx" ON "MicroclimateZone"("userId");


-- AddForeignKey
ALTER TABLE "MicroclimateZone" ADD CONSTRAINT "MicroclimateZone_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;