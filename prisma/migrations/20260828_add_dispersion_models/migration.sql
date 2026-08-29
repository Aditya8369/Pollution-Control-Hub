-- CreateTable
CREATE TABLE "PointSource" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "locationLat" DOUBLE PRECISION NOT NULL,
    "locationLng" DOUBLE PRECISION NOT NULL,
    "emissionRate" DOUBLE PRECISION NOT NULL,
    "stackHeight" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PointSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DispersionRun" (
    "id" TEXT NOT NULL,
    "pointSourceId" TEXT NOT NULL,
    "windMetrics" JSONB NOT NULL,
    "plumeCoordinates" JSONB NOT NULL,
    "maxDownwindConcentration" DOUBLE PRECISION NOT NULL,
    "distanceToMaxConcentration" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DispersionRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PointSource_isActive_idx" ON "PointSource"("isActive");
CREATE INDEX "DispersionRun_pointSourceId_timestamp_idx" ON "DispersionRun"("pointSourceId", "timestamp" DESC);

-- AddForeignKey
ALTER TABLE "DispersionRun" ADD CONSTRAINT "DispersionRun_pointSourceId_fkey" FOREIGN KEY ("pointSourceId") REFERENCES "PointSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
