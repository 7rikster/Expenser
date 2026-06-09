import { prisma } from "../lib/index.js";
import { Prisma as P } from "../../generated/prisma/client";

function alignToUTCMidnight(date: Date, isStartOfMonth = false): Date {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = isStartOfMonth ? 1 : date.getDate();
  return new Date(Date.UTC(year, month, day));
}

async function runMigration() {
  console.log("🚀 Starting database date-alignment migration with merge strategy...");

  try {
    // 1️⃣ Migrate UserBudgets
    console.log("\n📊 Migrating UserBudget months...");
    const budgets = await prisma.userBudget.findMany({
      include: { categoryBudgets: true }
    });
    console.log(`Found ${budgets.length} UserBudget records.`);

    let budgetUpdatedCount = 0;
    let budgetMergedCount = 0;

    for (const budget of budgets) {
      const original = new Date(budget.month);
      const aligned = alignToUTCMidnight(original, true);

      if (original.toISOString() !== aligned.toISOString()) {
        // Check if a destination budget already exists
        const destination = await prisma.userBudget.findFirst({
          where: { userId: budget.userId, month: aligned },
          include: { categoryBudgets: true }
        });

        if (destination) {
          console.log(`  Merging duplicate budget for user ${budget.userId}: ${original.toISOString()} ➡️ ${aligned.toISOString()}`);
          
          // Merge category budgets
          for (const sourceCb of budget.categoryBudgets) {
            const destCb = destination.categoryBudgets.find(c => c.category === sourceCb.category);
            if (destCb) {
              // Both exist, update destination amount to be the max or sum (budgets are limits, usually we update to the newer or sum them. Let's update to max or sum. Sum is safer or we can just keep the destination one. Let's sum them.)
              await prisma.categoryBudget.update({
                where: { id: destCb.id },
                data: { amount: new P.Decimal(destCb.amount.toString()).add(new P.Decimal(sourceCb.amount.toString())) }
              });
            } else {
              // Move source cb to destination
              await prisma.categoryBudget.update({
                where: { id: sourceCb.id },
                data: { userBudgetId: destination.id }
              });
            }
          }

          // Update destination budget total amount
          await prisma.userBudget.update({
            where: { id: destination.id },
            data: { amount: new P.Decimal(destination.amount.toString()).add(new P.Decimal(budget.amount.toString())) }
          });

          // Delete source budget
          await prisma.userBudget.delete({ where: { id: budget.id } });
          budgetMergedCount++;
        } else {
          // No duplicate, safe to update
          console.log(`  updating budget ${budget.id}: ${original.toISOString()} ➡️ ${aligned.toISOString()}`);
          await prisma.userBudget.update({
            where: { id: budget.id },
            data: { month: aligned }
          });
          budgetUpdatedCount++;
        }
      }
    }
    console.log(`✅ Updated ${budgetUpdatedCount} budgets, merged ${budgetMergedCount} duplicate budgets.`);


    // 2️⃣ Migrate MonthlyExpenses
    console.log("\n📉 Migrating MonthlyExpense months...");
    const monthlyExpenses = await prisma.monthlyExpense.findMany({
      include: { expenseItems: true }
    });
    console.log(`Found ${monthlyExpenses.length} MonthlyExpense records.`);

    let meUpdatedCount = 0;
    let meMergedCount = 0;

    for (const me of monthlyExpenses) {
      const original = new Date(me.month);
      const aligned = alignToUTCMidnight(original, true);

      if (original.toISOString() !== aligned.toISOString()) {
        const destination = await prisma.monthlyExpense.findFirst({
          where: { userId: me.userId, month: aligned },
          include: { expenseItems: true }
        });

        if (destination) {
          console.log(`  Merging duplicate monthly expense for user ${me.userId}: ${original.toISOString()} ➡️ ${aligned.toISOString()}`);

          for (const sourceItem of me.expenseItems) {
            const destItem = destination.expenseItems.find(i => i.category === sourceItem.category);
            if (destItem) {
              await prisma.monthlyExpenseItem.update({
                where: { id: destItem.id },
                data: { amount: new P.Decimal(destItem.amount.toString()).add(new P.Decimal(sourceItem.amount.toString())) }
              });
            } else {
              await prisma.monthlyExpenseItem.update({
                where: { id: sourceItem.id },
                data: { monthId: destination.id }
              });
            }
          }

          await prisma.monthlyExpense.update({
            where: { id: destination.id },
            data: { total: new P.Decimal(destination.total.toString()).add(new P.Decimal(me.total.toString())) }
          });

          await prisma.monthlyExpense.delete({ where: { id: me.id } });
          meMergedCount++;
        } else {
          console.log(`  updating monthly expense ${me.id}: ${original.toISOString()} ➡️ ${aligned.toISOString()}`);
          await prisma.monthlyExpense.update({
            where: { id: me.id },
            data: { month: aligned }
          });
          meUpdatedCount++;
        }
      }
    }
    console.log(`✅ Updated ${meUpdatedCount} monthly expenses, merged ${meMergedCount} duplicates.`);


    // 3️⃣ Migrate MonthlyIncomes
    console.log("\n📈 Migrating MonthlyIncome months...");
    const monthlyIncomes = await prisma.monthlyIncome.findMany({
      include: { incomeItems: true }
    });
    console.log(`Found ${monthlyIncomes.length} MonthlyIncome records.`);

    let miUpdatedCount = 0;
    let miMergedCount = 0;

    for (const mi of monthlyIncomes) {
      const original = new Date(mi.month);
      const aligned = alignToUTCMidnight(original, true);

      if (original.toISOString() !== aligned.toISOString()) {
        const destination = await prisma.monthlyIncome.findFirst({
          where: { userId: mi.userId, month: aligned },
          include: { incomeItems: true }
        });

        if (destination) {
          console.log(`  Merging duplicate monthly income for user ${mi.userId}: ${original.toISOString()} ➡️ ${aligned.toISOString()}`);

          for (const sourceItem of mi.incomeItems) {
            const destItem = destination.incomeItems.find(i => i.category === sourceItem.category);
            if (destItem) {
              await prisma.monthlyIncomeItem.update({
                where: { id: destItem.id },
                data: { amount: new P.Decimal(destItem.amount.toString()).add(new P.Decimal(sourceItem.amount.toString())) }
              });
            } else {
              await prisma.monthlyIncomeItem.update({
                where: { id: sourceItem.id },
                data: { monthId: destination.id }
              });
            }
          }

          await prisma.monthlyIncome.update({
            where: { id: destination.id },
            data: { total: new P.Decimal(destination.total.toString()).add(new P.Decimal(mi.total.toString())) }
          });

          await prisma.monthlyIncome.delete({ where: { id: mi.id } });
          miMergedCount++;
        } else {
          console.log(`  updating monthly income ${mi.id}: ${original.toISOString()} ➡️ ${aligned.toISOString()}`);
          await prisma.monthlyIncome.update({
            where: { id: mi.id },
            data: { month: aligned }
          });
          miUpdatedCount++;
        }
      }
    }
    console.log(`✅ Updated ${miUpdatedCount} monthly incomes, merged ${miMergedCount} duplicates.`);


    // 4️⃣ Migrate DailyExpenses
    console.log("\n📅 Migrating DailyExpense dates...");
    const dailyExpenses = await prisma.dailyExpense.findMany({
      include: { expenseItems: true }
    });
    console.log(`Found ${dailyExpenses.length} DailyExpense records.`);

    let deUpdatedCount = 0;
    let deMergedCount = 0;

    for (const de of dailyExpenses) {
      const original = new Date(de.date);
      const aligned = alignToUTCMidnight(original, false);

      if (original.toISOString() !== aligned.toISOString()) {
        const destination = await prisma.dailyExpense.findFirst({
          where: { userId: de.userId, date: aligned },
          include: { expenseItems: true }
        });

        if (destination) {
          console.log(`  Merging duplicate daily expense for user ${de.userId}: ${original.toISOString()} ➡️ ${aligned.toISOString()}`);

          for (const sourceItem of de.expenseItems) {
            const destItem = destination.expenseItems.find(i => i.category === sourceItem.category);
            if (destItem) {
              await prisma.dailyExpenseItem.update({
                where: { id: destItem.id },
                data: { amount: new P.Decimal(destItem.amount.toString()).add(new P.Decimal(sourceItem.amount.toString())) }
              });
            } else {
              await prisma.dailyExpenseItem.update({
                where: { id: sourceItem.id },
                data: { dailyId: destination.id }
              });
            }
          }

          await prisma.dailyExpense.update({
            where: { id: destination.id },
            data: { total: new P.Decimal(destination.total.toString()).add(new P.Decimal(de.total.toString())) }
          });

          await prisma.dailyExpense.delete({ where: { id: de.id } });
          deMergedCount++;
        } else {
          console.log(`  updating daily expense ${de.id}: ${original.toISOString()} ➡️ ${aligned.toISOString()}`);
          await prisma.dailyExpense.update({
            where: { id: de.id },
            data: { date: aligned }
          });
          deUpdatedCount++;
        }
      }
    }
    console.log(`✅ Updated ${deUpdatedCount} daily expenses, merged ${deMergedCount} duplicates.`);

    console.log("\n🎉 Database migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed with error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

runMigration();
