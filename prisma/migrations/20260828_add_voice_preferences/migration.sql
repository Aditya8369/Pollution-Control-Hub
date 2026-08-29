-- CreateTable
CREATE TABLE "UserAccessibilityPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "voiceEnabled" BOOLEAN NOT NULL DEFAULT false,
    "voiceLanguage" TEXT NOT NULL DEFAULT 'en-US',
    "voiceUri" TEXT,
    "voiceRate" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "voicePitch" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "voiceVolume" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "aqiAlertThreshold" INTEGER NOT NULL DEFAULT 100,
    "customThresholdOverrides" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserAccessibilityPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserAccessibilityPreference_userId_key" ON "UserAccessibilityPreference"("userId");
