-- CreateTable
CREATE TABLE "SpatialGrid3D" (
    "id" TEXT NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpatialGrid3D_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SpatialGrid3D_cacheKey_createdAt_idx" ON "SpatialGrid3D"("cacheKey", "createdAt" DESC);
