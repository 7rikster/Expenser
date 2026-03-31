"use client";

import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardData } from "@/lib/types";

interface BudgetProgressProps {
  data: DashboardData | undefined;
  isLoading: boolean;
}

function ProgressBar({
  label,
  spent,
  budget,
}: {
  label: string;
  spent: number;
  budget: number;
}) {
  const percentage = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const remaining = Math.max(budget - spent, 0);

  let barColor = "bg-emerald-500";
  if (percentage > 90) barColor = "bg-red-500";
  else if (percentage > 70) barColor = "bg-amber-500";
  else if (percentage > 50) barColor = "bg-blue-500";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-sm text-muted-foreground">
          ₹{spent.toLocaleString("en-IN", { minimumFractionDigits: 2 })} / ₹
          {budget.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </p>
      </div>
      <div className="h-2.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${barColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {percentage.toFixed(1)}% used
        </p>
        <p className="text-xs font-medium">
          ₹{remaining.toLocaleString("en-IN", { minimumFractionDigits: 2 })} remaining
        </p>
      </div>
    </div>
  );
}

function BudgetProgressComponent({ data, isLoading }: BudgetProgressProps) {
  if (isLoading || !data) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Budget Tracking</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Skeleton className="h-16 w-full rounded-md" />
          <Skeleton className="h-16 w-full rounded-md" />
        </CardContent>
      </Card>
    );
  }

  const dailyBudget = Number(data.user.dailyBudget || 0);
  const monthlyBudget = Number(data.user.monthlyBudget || 0);
  const todaySpent = Number(data.todayExpense.total);
  const monthSpent = Number(data.thisMonthExpense.total);

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Budget Tracking</CardTitle>
        <p className="text-sm text-muted-foreground">Daily and monthly budget usage</p>
      </CardHeader>
      <CardContent className="space-y-6 pt-2">
        {dailyBudget > 0 ? (
          <ProgressBar label="Today" spent={todaySpent} budget={dailyBudget} />
        ) : (
          <div className="text-center py-3">
            <p className="text-sm text-muted-foreground">No daily budget set</p>
          </div>
        )}
        {monthlyBudget > 0 ? (
          <ProgressBar label="This Month" spent={monthSpent} budget={monthlyBudget} />
        ) : (
          <div className="text-center py-3">
            <p className="text-sm text-muted-foreground">No monthly budget set</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export const BudgetProgress = memo(BudgetProgressComponent);
