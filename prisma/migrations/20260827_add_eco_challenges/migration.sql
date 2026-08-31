-- CreateTable
CREATE TABLE "Challenge" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "targetValue" INTEGER NOT NULL,
    "unit" TEXT NOT NULL,
    "rewardType" TEXT NOT NULL,
    "rewardValue" INTEGER NOT NULL,
    "badgeName" TEXT,
    "tenant_id" UUID,
    "created_by" UUID,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "verification_type" TEXT NOT NULL DEFAULT 'manual',
    "is_global" BOOLEAN NOT NULL DEFAULT true,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Challenge_pkey" PRIMARY KEY ("id")
);


-- CreateTable
CREATE TABLE "UserChallengeProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "tenant_id" UUID,
    "team_id" UUID,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "rewardClaimed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserChallengeProgress_pkey" PRIMARY KEY ("id")
);


-- CreateIndex
CREATE UNIQUE INDEX "UserChallengeProgress_userId_challengeId_key" ON "UserChallengeProgress"("userId", "challengeId");


-- CreateIndex
CREATE INDEX "Challenge_isActive_endDate_idx" ON "Challenge"("isActive", "endDate");
CREATE INDEX "idx_challenges_tenant_id" ON "Challenge"("tenant_id");
CREATE INDEX "UserChallengeProgress_tenant_id_team_id_idx" ON "UserChallengeProgress"("tenant_id", "team_id");


-- AddForeignKey
ALTER TABLE "UserChallengeProgress" ADD CONSTRAINT "UserChallengeProgress_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

