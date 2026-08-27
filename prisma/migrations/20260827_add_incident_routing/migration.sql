-- CreateTable
CREATE TABLE "IncidentReport" (
    "id" TEXT NOT NULL,
    "reportedBy" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "locationLat" DOUBLE PRECISION NOT NULL,
    "locationLng" DOUBLE PRECISION NOT NULL,
    "locationAddress" TEXT,
    "imageUrl" TEXT,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IncidentReport_pkey" PRIMARY KEY ("id")
);


-- CreateTable
CREATE TABLE "RoutedIncident" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ROUTED',
    "severity" TEXT NOT NULL,
    "routingConfidence" INTEGER NOT NULL,
    "assignedDepartment" TEXT,
    "verificationNotes" TEXT,
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoutedIncident_pkey" PRIMARY KEY ("id")
);


-- CreateIndex
CREATE UNIQUE INDEX "RoutedIncident_incidentId_key" ON "RoutedIncident"("incidentId");


-- CreateIndex
CREATE INDEX "RoutedIncident_status_category_idx" ON "RoutedIncident"("status", "category");


-- CreateIndex
CREATE INDEX "IncidentReport_reportedAt_idx" ON "IncidentReport"("reportedAt" DESC);


-- AddForeignKey
ALTER TABLE "RoutedIncident" ADD CONSTRAINT "RoutedIncident_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "IncidentReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

