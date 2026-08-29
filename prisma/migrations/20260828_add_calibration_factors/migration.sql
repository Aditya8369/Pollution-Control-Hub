-- CreateTable
CREATE TABLE "CalibrationEvent" (
    "id" TEXT NOT NULL,
    "lowCostSensorId" TEXT NOT NULL,
    "referenceSensorId" TEXT NOT NULL,
    "lowCostReading" DOUBLE PRECISION NOT NULL,
    "referenceReading" DOUBLE PRECISION NOT NULL,
    "pollutant" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedBy" TEXT NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CalibrationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorrectionCoefficient" (
    "id" TEXT NOT NULL,
    "lowCostSensorId" TEXT NOT NULL,
    "pollutant" TEXT NOT NULL,
    "slope" DOUBLE PRECISION NOT NULL,
    "intercept" DOUBLE PRECISION NOT NULL,
    "rSquared" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CorrectionCoefficient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CalibrationEvent_lowCostSensorId_pollutant_idx" ON "CalibrationEvent"("lowCostSensorId", "pollutant");
CREATE INDEX "CorrectionCoefficient_lowCostSensorId_pollutant_isActive_idx" ON "CorrectionCoefficient"("lowCostSensorId", "pollutant", "isActive");
