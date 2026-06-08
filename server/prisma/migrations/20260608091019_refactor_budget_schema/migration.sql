/*
  Warnings:

  - You are about to drop the column `dailyBudget` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `monthlyBudget` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "dailyBudget",
DROP COLUMN "monthlyBudget";

-- CreateTable
CREATE TABLE "userBudgets" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "userBudgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categoryBudgets" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "userBudgetId" TEXT NOT NULL,

    CONSTRAINT "categoryBudgets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "userBudgets_userId_idx" ON "userBudgets"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "userBudgets_userId_month_key" ON "userBudgets"("userId", "month");

-- CreateIndex
CREATE INDEX "categoryBudgets_userBudgetId_idx" ON "categoryBudgets"("userBudgetId");

-- CreateIndex
CREATE UNIQUE INDEX "categoryBudgets_userBudgetId_category_key" ON "categoryBudgets"("userBudgetId", "category");

-- AddForeignKey
ALTER TABLE "userBudgets" ADD CONSTRAINT "userBudgets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categoryBudgets" ADD CONSTRAINT "categoryBudgets_userBudgetId_fkey" FOREIGN KEY ("userBudgetId") REFERENCES "userBudgets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
