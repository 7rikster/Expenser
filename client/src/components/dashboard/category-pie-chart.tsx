"use client";

import { memo, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { CategoryBreakdown } from "@/lib/types";
import { defaultCategories } from "@/lib/data";
import { useCategoryBreakdown } from "@/hooks/use-dashboard";
import { useDashboardStore } from "@/store/dashboard-store";

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

/**
 * Generate the last 12 months as selectable options.
 * Returns array of { value: "YYYY-MM", label: "Month YYYY" }.
 */
function generateMonthOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  const now = new Date();

  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("default", { month: "long", year: "numeric" });
    options.push({ value, label });
  }

  return options;
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

function CategoryPieChartComponent() {
  const monthOptions = useMemo(() => generateMonthOptions(), []);
  const { selectedMonth: pieMonth, setSelectedMonth: setPieMonth } = useDashboardStore();

  const { data: expenseData, isLoading } = useCategoryBreakdown(pieMonth);
  const categories = expenseData?.categories;

  // Find the label for the currently selected month
  const selectedLabel = monthOptions.find((o) => o.value === pieMonth)?.label ?? "This month";

  if (isLoading || !categories) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base font-semibold">Category Breakdown</CardTitle>
            <Skeleton className="h-9 w-[160px] rounded-md" />
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[180px] w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (categories.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base font-semibold">Category Breakdown</CardTitle>
            <Select value={pieMonth} onValueChange={setPieMonth}>
              <SelectTrigger className="w-[160px] h-9 text-sm">
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-sm text-muted-foreground">{selectedLabel}&apos;s spending by category</p>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[180px]">
          <p className="text-muted-foreground text-sm">No expense data yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base font-semibold">Category Breakdown</CardTitle>
          <Select value={pieMonth} onValueChange={setPieMonth}>
            <SelectTrigger className="w-[160px] h-9 text-sm">
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-sm text-muted-foreground">{selectedLabel}&apos;s spending by category</p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-col sm:flex-row flex-wrap items-center gap-4">
          <div className="h-[200px] w-[200px] sm:h-[180px] sm:w-[160px] flex-1">
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
                  <p className="text-sm font-medium truncate">{getCategoryName(cat.category)}</p>
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
