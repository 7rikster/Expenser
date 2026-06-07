-- AlterTable
ALTER TABLE "users" ADD COLUMN     "balance" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "monthlyIncomes" (
    "id" TEXT NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monthlyIncomes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthlyIncomeItems" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "monthId" TEXT NOT NULL,

    CONSTRAINT "monthlyIncomeItems_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "monthlyIncomes_userId_idx" ON "monthlyIncomes"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "monthlyIncomes_userId_month_key" ON "monthlyIncomes"("userId", "month");

-- CreateIndex
CREATE INDEX "monthlyIncomeItems_monthId_idx" ON "monthlyIncomeItems"("monthId");

-- CreateIndex
CREATE UNIQUE INDEX "monthlyIncomeItems_monthId_category_key" ON "monthlyIncomeItems"("monthId", "category");

-- AddForeignKey
ALTER TABLE "monthlyIncomes" ADD CONSTRAINT "monthlyIncomes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthlyIncomeItems" ADD CONSTRAINT "monthlyIncomeItems_monthId_fkey" FOREIGN KEY ("monthId") REFERENCES "monthlyIncomes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
