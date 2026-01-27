-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "RecurringInterval" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('COMPLETED', 'PENDING', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "imageUrl" TEXT,
    "dailyBudget" DECIMAL(10,2),
    "monthlyBudget" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dailyExpenses" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dailyExpenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dailyExpenseItems" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "dailyId" TEXT NOT NULL,

    CONSTRAINT "dailyExpenseItems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthlyExpenses" (
    "id" TEXT NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monthlyExpenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthlyExpenseItems" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "monthId" TEXT NOT NULL,

    CONSTRAINT "monthlyExpenseItems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "category" TEXT NOT NULL,
    "receiptUrl" TEXT,
    "isRecurring" BOOLEAN NOT NULL,
    "recurringInterval" "RecurringInterval",
    "nextRecurringDate" TIMESTAMP(3),
    "lastProcessed" TIMESTAMP(3),
    "status" "TransactionStatus" NOT NULL DEFAULT 'COMPLETED',
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_clerkUserId_key" ON "users"("clerkUserId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "dailyExpenses_userId_idx" ON "dailyExpenses"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "dailyExpenses_userId_date_key" ON "dailyExpenses"("userId", "date");

-- CreateIndex
CREATE INDEX "dailyExpenseItems_dailyId_idx" ON "dailyExpenseItems"("dailyId");

-- CreateIndex
CREATE INDEX "monthlyExpenses_userId_idx" ON "monthlyExpenses"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "monthlyExpenses_userId_month_key" ON "monthlyExpenses"("userId", "month");

-- CreateIndex
CREATE UNIQUE INDEX "monthlyExpenseItems_category_key" ON "monthlyExpenseItems"("category");

-- CreateIndex
CREATE INDEX "monthlyExpenseItems_monthId_idx" ON "monthlyExpenseItems"("monthId");

-- CreateIndex
CREATE INDEX "transactions_userId_idx" ON "transactions"("userId");

-- AddForeignKey
ALTER TABLE "dailyExpenses" ADD CONSTRAINT "dailyExpenses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dailyExpenseItems" ADD CONSTRAINT "dailyExpenseItems_dailyId_fkey" FOREIGN KEY ("dailyId") REFERENCES "dailyExpenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthlyExpenses" ADD CONSTRAINT "monthlyExpenses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthlyExpenseItems" ADD CONSTRAINT "monthlyExpenseItems_monthId_fkey" FOREIGN KEY ("monthId") REFERENCES "monthlyExpenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
