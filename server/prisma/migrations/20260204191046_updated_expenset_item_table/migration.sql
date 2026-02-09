/*
  Warnings:

  - A unique constraint covering the columns `[dailyId,category]` on the table `dailyExpenseItems` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[monthId,category]` on the table `monthlyExpenseItems` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "monthlyExpenseItems_category_key";

-- CreateIndex
CREATE UNIQUE INDEX "dailyExpenseItems_dailyId_category_key" ON "dailyExpenseItems"("dailyId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "monthlyExpenseItems_monthId_category_key" ON "monthlyExpenseItems"("monthId", "category");
