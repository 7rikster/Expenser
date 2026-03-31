"use client";

import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { CategoryBreakdown } from "@/lib/types";
import { defaultCategories } from "@/lib/data";

interface CategoryPieChartProps {
  categories: CategoryBreakdown[] | undefined;
  isLoading: boolean;
}

// Color palette for pie slices
const COLORS = [
  "#6366f1", // indigo
  "#f43f5e", // rose
  "#06b6d4", // cyan
  "#f59e0b", // amber
  "#10b981", // emerald
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#64748b", // slate
];

function getCategoryColor(categoryId: string, index: number): string {
  const cat = defaultCategories.find((c) => c.id === categoryId);
  return cat?.color || COLORS[index % COLORS.length];
}

function getCategoryName(categoryId: string): string {
  const cat = defaultCategories.find((c) => c.id === categoryId);
  return cat?.name || categoryId;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const { category, amount, percentage } = payload[0].payload;
    return (
      <div className="bg-card border border-border rounded-lg px-4 py-3 shadow-lg">
        <p className="text-sm font-medium text-foreground">{getCategoryName(category)}</p>
        <p className="text-sm text-muted-foreground">
          ₹{Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })} ({percentage}%)
        </p>
      </div>
    );
  }
  return null;
};

function CategoryPieChartComponent({ categories, isLoading }: CategoryPieChartProps) {
  if (isLoading || !categories) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Category Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[280px] w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (categories.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Category Breakdown</CardTitle>
          <p className="text-sm text-muted-foreground">This month&apos;s spending by category</p>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[280px]">
          <p className="text-muted-foreground text-sm">No expense data yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Category Breakdown</CardTitle>
        <p className="text-sm text-muted-foreground">This month&apos;s spending by category</p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-col sm:flex-row flex-wrap items-center gap-4">
          <div className="h-[200px] w-[200px] sm:h-[200px] sm:w-[200px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categories}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="amount"
                  strokeWidth={0}
                >
                  {categories.map((entry, index) => (
                    <Cell
                      key={entry.category}
                      fill={getCategoryColor(entry.category, index)}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-3 min-w-0 w-full sm:w-auto">
            {categories.map((cat, index) => (
              <div key={cat.category} className="flex items-center gap-3">
                <div
                  className="h-3 w-3 rounded-full shrink-0"
                  style={{ backgroundColor: getCategoryColor(cat.category, index) }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{getCategoryName(cat.category)}</p>
                </div>
                <p className="text-sm font-semibold tabular-nums shrink-0">
                  {cat.percentage}%
                </p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export const CategoryPieChart = memo(CategoryPieChartComponent);
