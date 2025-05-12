-- CreateTable
CREATE TABLE "identity_cards" (
    "id" TEXT NOT NULL,
    "brandName" TEXT NOT NULL,
    "website" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "shortDescription" TEXT NOT NULL,
    "fullDescription" TEXT NOT NULL,
    "keyFeaturesJson" TEXT NOT NULL,
    "competitorsJson" TEXT NOT NULL,
    "data" TEXT NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "identity_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prompt_sets" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "spontaneous" TEXT NOT NULL,
    "direct" TEXT NOT NULL,
    "comparison" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prompt_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_reports" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "spontaneous" TEXT NOT NULL,
    "sentiment" TEXT NOT NULL,
    "comparison" TEXT NOT NULL,
    "llmVersions" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weekly_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "raw_responses" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "llmProvider" TEXT NOT NULL,
    "promptType" TEXT NOT NULL,
    "promptIndex" INTEGER NOT NULL,
    "response" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "raw_responses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "prompt_sets_companyId_key" ON "prompt_sets"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_reports_companyId_weekStart_key" ON "weekly_reports"("companyId", "weekStart");

-- CreateIndex
CREATE INDEX "raw_responses_reportId_idx" ON "raw_responses"("reportId");

-- AddForeignKey
ALTER TABLE "prompt_sets" ADD CONSTRAINT "prompt_sets_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "identity_cards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_reports" ADD CONSTRAINT "weekly_reports_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "identity_cards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
