-- CreateTable
CREATE TABLE "EiaReport" (
    "id" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "summary" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'GENERATING',
    "downloadUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EiaReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EiaBaselineSnapshot" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "pollutant" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,

    CONSTRAINT "EiaBaselineSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EiaReport_status_createdAt_idx" ON "EiaReport"("status", "createdAt" DESC);
CREATE INDEX "EiaBaselineSnapshot_reportId_pollutant_idx" ON "EiaBaselineSnapshot"("reportId", "pollutant");

-- AddForeignKey
ALTER TABLE "EiaBaselineSnapshot" ADD CONSTRAINT "EiaBaselineSnapshot_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "EiaReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
