"use client";

import { BudgetProgress } from "@/components/dashboard/budget-progress";
import { useBudget } from "@/hooks/use-budget";
import { useDashboardData } from "@/hooks/use-dashboard";
import { getCurrentMonth } from "@/lib/transaction-constants";

export default function BudgetPage() {
  const { data: dashboardData, isLoading } = useDashboardData();
  const { data: budgetResponse, isLoading: isBudgetLoading } = useBudget(getCurrentMonth());

  return (
    <div className="space-y-6 max-w-[1000px] mx-auto p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Budgets</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Set monthly targets and track category-specific allocations.
        </p>
      </div>

      <div className="grid gap-6">
        <BudgetProgress data={dashboardData} isLoading={isLoading} budgetResponse={budgetResponse} isBudgetLoading={isBudgetLoading} />
      </div>
    </div>
  );
}