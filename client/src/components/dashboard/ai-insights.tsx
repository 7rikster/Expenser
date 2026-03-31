"use client";

import { memo, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Lightbulb,
  Target,
  ShieldCheck,
} from "lucide-react";
import type { DashboardData, MonthlyTrendPoint } from "@/lib/types";

interface AIInsightsProps {
  dashboardData: DashboardData | undefined;
  trendData: MonthlyTrendPoint[] | undefined;
  isLoading: boolean;
}

interface Insight {
  id: string;
  type: "success" | "warning" | "info" | "alert";
  icon: React.ElementType;
  title: string;
  description: string;
}

function generateInsights(
  dashboard: DashboardData,
  trend: MonthlyTrendPoint[]
): Insight[] {
  const insights: Insight[] = [];
  const monthlySpent = Number(dashboard.thisMonthExpense.total);
  const lastMonthSpent = Number(dashboard.lastMonthExpense.total);
  const monthlyBudget = Number(dashboard.user.monthlyBudget || 0);
  const dailyBudget = Number(dashboard.user.dailyBudget || 0);
  const todaySpent = Number(dashboard.todayExpense.total);

  // Monthly comparison
  if (lastMonthSpent > 0) {
    const change = ((monthlySpent - lastMonthSpent) / lastMonthSpent) * 100;
    if (change > 20) {
      insights.push({
        id: "spending-spike",
        type: "alert",
        icon: TrendingUp,
        title: "Spending Spike Detected",
        description: `Your spending is up ${change.toFixed(0)}% compared to last month. Consider reviewing recent transactions to identify areas for cutback.`,
      });
    } else if (change < -10) {
      insights.push({
        id: "spending-decrease",
        type: "success",
        icon: TrendingDown,
        title: "Great Savings!",
        description: `You've reduced spending by ${Math.abs(change).toFixed(0)}% compared to last month. Keep up the good work!`,
      });
    }
  }

  // Budget utilization
  if (monthlyBudget > 0) {
    const utilization = (monthlySpent / monthlyBudget) * 100;
    const daysInMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth() + 1,
      0
    ).getDate();
    const dayOfMonth = new Date().getDate();
    const expectedUtilization = (dayOfMonth / daysInMonth) * 100;

    if (utilization > 90) {
      insights.push({
        id: "budget-critical",
        type: "alert",
        icon: AlertTriangle,
        title: "Budget Almost Exhausted",
        description: `You've used ${utilization.toFixed(0)}% of your monthly budget. Only ₹${(monthlyBudget - monthlySpent).toLocaleString("en-IN", { minimumFractionDigits: 2 })} remaining.`,
      });
    } else if (utilization > expectedUtilization + 15) {
      insights.push({
        id: "budget-ahead",
        type: "warning",
        icon: Target,
        title: "Ahead of Budget Pace",
        description: `You're spending faster than expected. At this rate, you may exceed your budget by month end. Consider reducing daily spending.`,
      });
    } else if (utilization < expectedUtilization - 10 && dayOfMonth > 10) {
      insights.push({
        id: "budget-under",
        type: "success",
        icon: ShieldCheck,
        title: "Under Budget",
        description: `You're well within your budget — ${utilization.toFixed(0)}% used with ${(100 - (dayOfMonth / daysInMonth) * 100).toFixed(0)}% of the month remaining.`,
      });
    }
  }

  // Top category alert
  const categories = dashboard.thisMonthExpense.categories;
  if (categories.length > 0 && categories[0].percentage > 40) {
    insights.push({
      id: "category-dominant",
      type: "warning",
      icon: AlertTriangle,
      title: `High "${categories[0].category}" Spending`,
      description: `${categories[0].percentage}% of your expenses are in ${categories[0].category}. Diversifying spending can help build a healthier financial profile.`,
    });
  }

  // Daily budget check
  if (dailyBudget > 0 && todaySpent > dailyBudget) {
    insights.push({
      id: "daily-exceeded",
      type: "alert",
      icon: AlertTriangle,
      title: "Daily Budget Exceeded",
      description: `Today's spending of ₹${todaySpent.toLocaleString("en-IN", { minimumFractionDigits: 2 })} exceeds your daily budget of ₹${dailyBudget.toLocaleString("en-IN", { minimumFractionDigits: 2 })}.`,
    });
  }

  // Spending trend
  if (trend.length >= 3) {
    const lastThree = trend.slice(-3);
    const increasing = lastThree.every((v, i) => i === 0 || v.total >= lastThree[i - 1].total);
    if (increasing && lastThree[2].total > 0) {
      insights.push({
        id: "trend-increasing",
        type: "info",
        icon: Lightbulb,
        title: "Consistent Spending Increase",
        description: `Your expenses have been increasing for the past 3 months. Setting up a stricter budget could help reverse this trend.`,
      });
    }
  }

  // Fallback if no insights
  if (insights.length === 0) {
    insights.push({
      id: "all-good",
      type: "success",
      icon: ShieldCheck,
      title: "Everything Looks Good",
      description: "Your spending patterns are within normal ranges. Keep tracking to maintain healthy finances!",
    });
  }

  return insights;
}

const typeStyles: Record<string, { bg: string; border: string; icon: string }> = {
  success: {
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
    border: "border-emerald-200 dark:border-emerald-500/20",
    icon: "text-emerald-600 dark:text-emerald-400",
  },
  warning: {
    bg: "bg-amber-50 dark:bg-amber-500/10",
    border: "border-amber-200 dark:border-amber-500/20",
    icon: "text-amber-600 dark:text-amber-400",
  },
  info: {
    bg: "bg-blue-50 dark:bg-blue-500/10",
    border: "border-blue-200 dark:border-blue-500/20",
    icon: "text-blue-600 dark:text-blue-400",
  },
  alert: {
    bg: "bg-red-50 dark:bg-red-500/10",
    border: "border-red-200 dark:border-red-500/20",
    icon: "text-red-600 dark:text-red-400",
  },
};

function AIInsightsComponent({
  dashboardData,
  trendData,
  isLoading,
}: AIInsightsProps) {
  const insights = useMemo(() => {
    if (!dashboardData || !trendData) return [];
    return generateInsights(dashboardData, trendData);
  }, [dashboardData, trendData]);

  if (isLoading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Quick Insights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-violet-500 animate-pulse" />
          <CardTitle className="text-base font-semibold">Quick Insights</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          Smart analysis of your spending patterns
        </p>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {insights.map((insight) => {
          const styles = typeStyles[insight.type];
          return (
            <div
              key={insight.id}
              className={`flex gap-3 p-4 rounded-lg border ${styles.bg} ${styles.border} transition-colors`}
            >
              <insight.icon className={`h-5 w-5 shrink-0 mt-0.5 ${styles.icon}`} />
              <div>
                <p className="text-sm font-semibold">{insight.title}</p>
                <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">
                  {insight.description}
                </p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export const AIInsights = memo(AIInsightsComponent);
