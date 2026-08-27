-- CreateTable
CREATE TABLE "ForecastCache" (
    "id" TEXT NOT NULL,
    "locationKey" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ForecastCache_pkey" PRIMARY KEY ("id")
);


-- CreateIndex
CREATE INDEX "ForecastCache_locationKey_createdAt_idx" ON "ForecastCache"("locationKey", "createdAt" DESC);


-- Add a comment to explain the table's purpose
COMMENT ON TABLE "ForecastCache" IS 'Caches daily AQI forecast results and attribution metadata to minimize redundant computation loads.';

