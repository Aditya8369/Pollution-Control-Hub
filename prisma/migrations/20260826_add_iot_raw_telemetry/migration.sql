-- CreateTable
CREATE TABLE "IoTSensor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "lastSeen" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IoTSensor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IoTTelemetry" (
    "id" TEXT NOT NULL,
    "sensorId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pm25" DOUBLE PRECISION,
    "pm10" DOUBLE PRECISION,
    "temperature" DOUBLE PRECISION,
    "humidity" DOUBLE PRECISION,
    "rawPayload" JSONB,

    CONSTRAINT "IoTTelemetry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IoTTelemetry_sensorId_timestamp_idx" ON "IoTTelemetry"("sensorId", "timestamp" DESC);
CREATE INDEX "IoTTelemetry_timestamp_idx" ON "IoTTelemetry"("timestamp" DESC);

-- AddForeignKey
ALTER TABLE "IoTTelemetry" ADD CONSTRAINT "IoTTelemetry_sensorId_fkey" FOREIGN KEY ("sensorId") REFERENCES "IoTSensor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
