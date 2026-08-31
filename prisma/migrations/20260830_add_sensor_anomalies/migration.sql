-- CreateTable
CREATE TABLE "SensorAnomaly" (
    "id" TEXT NOT NULL,
    "sensorId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metricValue" DOUBLE PRECISION NOT NULL,
    "expectedRange" JSONB NOT NULL,
    "isAcknowledged" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SensorAnomaly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SensorIsolationLog" (
    "sensorId" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'ACTIVE',
    "reason" TEXT,
    "isolatedAt" TIMESTAMP(3),
    "isolatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SensorIsolationLog_pkey" PRIMARY KEY ("sensorId")
);

-- CreateIndex
CREATE INDEX "SensorAnomaly_sensorId_detectedAt_idx" ON "SensorAnomaly"("sensorId", "detectedAt" DESC);
CREATE INDEX "SensorAnomaly_isAcknowledged_idx" ON "SensorAnomaly"("isAcknowledged");
