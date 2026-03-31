"use client";

import { lazy, Suspense, useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

import { SummaryCards } from "@/components/dashboard/summary-cards";
import { DashboardFilters } from "@/components/dashboard/dashboard-filters";
import { BudgetProgress } from "@/components/dashboard/budget-progress";
import { AIInsights } from "@/components/dashboard/ai-insights";

import {
  useDashboardData,
  useMonthlyTrend,
  useWeeklyPattern,
  useTransactionList,
  useDeleteTransaction,
  useCreateUser,
} from "@/hooks/use-dashboard";
import { useDashboardStore } from "@/store/dashboard-store";

// Lazy load heavy chart components
const ExpenseTrendChart = lazy(() =>
  import("@/components/dashboard/expense-trend-chart").then((m) => ({
    default: m.ExpenseTrendChart,
  }))
);
const CategoryPieChart = lazy(() =>
  import("@/components/dashboard/category-pie-chart").then((m) => ({
    default: m.CategoryPieChart,
  }))
);
const WeeklyBarChart = lazy(() =>
  import("@/components/dashboard/weekly-bar-chart").then((m) => ({
    default: m.WeeklyBarChart,
  }))
);
const RecentTransactions = lazy(() =>
  import("@/components/dashboard/recent-transactions").then((m) => ({
    default: m.RecentTransactions,
  }))
);

function ChartSkeleton() {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-6">
        <Skeleton className="h-4 w-32 mb-4" />
        <Skeleton className="h-[280px] w-full rounded-lg" />
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { user, isLoaded } = useUser();
  const hasInitialized = useRef(false);

  const createUser = useCreateUser();
  const { selectedMonth, selectedCategory } =
    useDashboardStore();


  useEffect(() => {
    if (!isLoaded || !user || hasInitialized.current) return;
    hasInitialized.current = true;

    const name = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
    createUser.mutate({
      email: user.emailAddresses[0]?.emailAddress || "",
      name: name || "No Name",
      imageUrl: user.imageUrl,
    });
  }, [isLoaded, user]);

  // React Query hooks
  const { data: dashboardData, isLoading: isDashboardLoading } = useDashboardData();
  const { data: trendData, isLoading: isTrendLoading } = useMonthlyTrend();
  const { data: weeklyData, isLoading: isWeeklyLoading } = useWeeklyPattern();
  const { data: transactionData, isLoading: isTransactionsLoading } = useTransactionList({
    month: selectedMonth,
    category: selectedCategory || undefined,
    page: 1,
    limit: 10,
  });
  const deleteTransaction = useDeleteTransaction();

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Summary Cards */}
      <SummaryCards data={dashboardData} isLoading={isDashboardLoading} />

      {/* Filters */}
      {/* <DashboardFilters /> */}

      {/* Charts Row: Trend + Pie */}
      <div className="grid gap-6 lg:grid-cols-7">
        <div className="lg:col-span-4">
          <Suspense fallback={<ChartSkeleton />}>
            <ExpenseTrendChart data={trendData} isLoading={isTrendLoading} />
          </Suspense>
        </div>
        <div className="lg:col-span-3">
          <Suspense fallback={<ChartSkeleton />}>
            <CategoryPieChart
              categories={dashboardData?.thisMonthExpense.categories}
              isLoading={isDashboardLoading}
            />
          </Suspense>
        </div>
      </div>

      {/* Weekly Pattern + Budget Tracking */}
      <div className="grid gap-6 lg:grid-cols-7">
        <div className="lg:col-span-4">
          <Suspense fallback={<ChartSkeleton />}>
            <WeeklyBarChart data={weeklyData} isLoading={isWeeklyLoading} />
          </Suspense>
        </div>
        <div className="lg:col-span-3">
          <BudgetProgress data={dashboardData} isLoading={isDashboardLoading} />
        </div>
      </div>

      {/* Transactions Table */}
      <Suspense fallback={<ChartSkeleton />}>
        <RecentTransactions
          transactions={transactionData?.transactions}
          isLoading={isTransactionsLoading}
          onBulkDelete={(ids) => deleteTransaction.mutateAsync(ids)}
          isDeleting={deleteTransaction.isPending}
        />
      </Suspense>

      {/* AI Insights */}
      <AIInsights
        dashboardData={dashboardData}
        trendData={trendData}
        isLoading={isDashboardLoading || isTrendLoading}
      />
    </div>
  );
}
