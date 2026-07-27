interface SubCategoryItem {
  name: string;
  amount: number;
}
interface CategoryBreakdownItem {
  category: string;
  amount: number;
  percentage: number;
  subCategories?: SubCategoryItem[];
}

interface RecurringExpense {
  description: string;
  amount: number;
  category: string;
  interval: string;
}

interface CategoryBudget {
  category: string;
  budgeted: number;
  spent: number;
  exceeded: boolean;
}

interface BudgetStatus {
  totalBudget: number;
  totalSpent: number;
  difference: number;
  exceeded: boolean;
  categoryBudgets: CategoryBudget[];
}

interface MonthlyReviewData {
  month: Date;
  totalIncome: number;
  totalExpense: number;
  netSavings: number;
  savingsRate: number;
  categoryBreakdown: CategoryBreakdownItem[];
  recurringExpenses: RecurringExpense[];
  budgetStatus: BudgetStatus;
  summary: string;
}

export function generateMonthlyNarrative(
    review: MonthlyReviewData
): string{
    const lines: string[] = [];

  const month = review.month.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });

  lines.push(`Monthly Financial Report`);
  lines.push(`Month: ${month}`);
  lines.push("");

  // Core metrics
  lines.push("Financial Overview:");
  lines.push(`Income: ₹${review.totalIncome.toFixed(2)}.`);
  lines.push(`Expenses: ₹${review.totalExpense.toFixed(2)}.`);
  lines.push(`Net savings: ₹${review.netSavings.toFixed(2)}.`);
  lines.push(`Savings rate: ${review.savingsRate.toFixed(2)}%.`);
  lines.push("");

  // Categories
  lines.push("Category Breakdown:");

  if (review.categoryBreakdown.length === 0) {
    lines.push("No expenses recorded.");
  } else {
    for (const category of review.categoryBreakdown) {
      lines.push(
        `- ${category.category}: ₹${category.amount.toFixed(
          2
        )} (${category.percentage.toFixed(1)}% of total expenses)`
      );

      if (category.subCategories && category.subCategories.length > 0) {
        for (const sub of category.subCategories) {
          lines.push(`  • ${sub.name}: ₹${sub.amount.toFixed(2)}`);
        }
      }
    }
  }

  lines.push("");

  // Recurring expenses
  lines.push("Recurring Expenses:");

  if (review.recurringExpenses.length === 0) {
    lines.push("None.");
  } else {
    for (const recurring of review.recurringExpenses) {
      lines.push(
        `- ${recurring.description}: ₹${recurring.amount.toFixed(
          2
        )} (${recurring.category}, ${recurring.interval})`
      );
    }
  }

  lines.push("");

  // Budget
  lines.push("Budget Performance:");
  lines.push(
    `Overall budget: ₹${review.budgetStatus.totalBudget.toFixed(2)}.`
  );
  lines.push(
    `Total spent: ₹${review.budgetStatus.totalSpent.toFixed(2)}.`
  );

  if (review.budgetStatus.exceeded) {
    lines.push(
      `Budget exceeded by ₹${Math.abs(
        review.budgetStatus.difference
      ).toFixed(2)}.`
    );
  } else {
    lines.push(
      `Budget remaining: ₹${review.budgetStatus.difference.toFixed(2)}.`
    );
  }

  lines.push("");

  lines.push("Category Budgets:");

  if (review.budgetStatus.categoryBudgets.length === 0) {
    lines.push("No category budgets defined.");
  } else {
    for (const budget of review.budgetStatus.categoryBudgets) {
      lines.push(
        `- ${budget.category}: spent ₹${budget.spent.toFixed(
          2
        )} of ₹${budget.budgeted.toFixed(2)} budget. ${
          budget.exceeded ? "Budget exceeded." : "Within budget."
        }`
      );
    }
  }

  lines.push("");

  lines.push("Executive Summary:");
  lines.push(review.summary);

  return lines.join("\n");
}