-- CreateTable
CREATE TABLE "RouteExposureCache" (
    "id" TEXT NOT NULL,
    "routeHash" TEXT NOT NULL,
    "startLat" DOUBLE PRECISION NOT NULL,
    "startLng" DOUBLE PRECISION NOT NULL,
    "endLat" DOUBLE PRECISION NOT NULL,
    "endLng" DOUBLE PRECISION NOT NULL,
    "mode" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RouteExposureCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RouteExposureCache_routeHash_key" ON "RouteExposureCache"("routeHash");

-- CreateIndex
CREATE INDEX "RouteExposureCache_createdAt_idx" ON "RouteExposureCache"("createdAt" DESC);
