"use client";

import { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DollarSign,
  TrendingDown,
  TrendingUp,
  Receipt,
  PiggyBank,
} from "lucide-react";
import type { DashboardData } from "@/lib/types";

interface SummaryCardsProps {
  data: DashboardData | undefined;
  isLoading: boolean;
}

function SummaryCardsComponent({ data, isLoading }: SummaryCardsProps) {
  if (isLoading || !data) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="border-0 shadow-sm">
            <CardContent className="p-6">
              <Skeleton className="h-4 w-24 mb-3" />
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
  console.log("Data: ",data);
  const monthlySpent = Number(data.thisMonthExpense.total);
  const lastMonthSpent = Number(data.lastMonthExpense.total || 0);
  const monthlyBudget = Number(data.user.monthlyBudget || 0);
  const remaining = monthlyBudget - monthlySpent;
  const monthChange =
    lastMonthSpent > 0
      ? ((monthlySpent - lastMonthSpent) / lastMonthSpent) * 100
      : 0;

  const cards = [
    {
      title: "Monthly Expenses",
      value: `₹${monthlySpent.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
      subtitle: `${data.thisMonthExpense.categories.length} categories`,
      icon: DollarSign,
      iconBg: "bg-blue-500/10 dark:bg-blue-500/20",
      iconColor: "text-blue-600 dark:text-blue-400",
    },
    {
      title: "Budget Remaining",
      value: `₹${Math.max(0, remaining).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
      subtitle: monthlyBudget > 0
        ? `${Math.round((monthlySpent / monthlyBudget) * 100)}% used`
        : "No budget set",
      icon: PiggyBank,
      iconBg:
        remaining > 0
          ? "bg-emerald-500/10 dark:bg-emerald-500/20"
          : "bg-red-500/10 dark:bg-red-500/20",
      iconColor:
        remaining > 0
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-red-600 dark:text-red-400",
    },
    {
      title: "Transactions",
      value: data.transactionCount.toString(),
      subtitle: "This month",
      icon: Receipt,
      iconBg: "bg-violet-500/10 dark:bg-violet-500/20",
      iconColor: "text-violet-600 dark:text-violet-400",
    },
    {
      title: "vs Last Month",
      value: `${monthChange >= 0 ? "+" : ""}${monthChange.toFixed(1)}%`,
      subtitle:
        lastMonthSpent > 0
          ? `₹${lastMonthSpent.toLocaleString("en-IN", { minimumFractionDigits: 2 })} last month`
          : "No data",
      icon: monthChange <= 0 ? TrendingDown : TrendingUp,
      iconBg:
        monthChange <= 0
          ? "bg-emerald-500/10 dark:bg-emerald-500/20"
          : "bg-amber-500/10 dark:bg-amber-500/20",
      iconColor:
        monthChange <= 0
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-amber-600 dark:text-amber-400",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card
          key={card.title}
          className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200"
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-muted-foreground">
                {card.title}
              </p>
              <div className={`p-2 rounded-lg ${card.iconBg}`}>
                <card.icon className={`h-4 w-4 ${card.iconColor}`} />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight">{card.value}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {card.subtitle}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export const SummaryCards = memo(SummaryCardsComponent);
