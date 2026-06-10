-- CreateTable
CREATE TABLE "spendingInsights" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "spendingInsights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthlyReviews" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "totalIncome" DECIMAL(12,2) NOT NULL,
    "totalExpense" DECIMAL(12,2) NOT NULL,
    "netSavings" DECIMAL(12,2) NOT NULL,
    "savingsRate" DECIMAL(5,2) NOT NULL,
    "categoryBreakdown" JSONB NOT NULL,
    "recurringExpenses" JSONB NOT NULL,
    "budgetStatus" JSONB NOT NULL,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monthlyReviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "spendingInsights_userId_idx" ON "spendingInsights"("userId");

-- CreateIndex
CREATE INDEX "spendingInsights_userId_month_idx" ON "spendingInsights"("userId", "month");

-- CreateIndex
CREATE INDEX "monthlyReviews_userId_idx" ON "monthlyReviews"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "monthlyReviews_userId_month_key" ON "monthlyReviews"("userId", "month");

-- AddForeignKey
ALTER TABLE "spendingInsights" ADD CONSTRAINT "spendingInsights_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthlyReviews" ADD CONSTRAINT "monthlyReviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
