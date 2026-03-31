"use client";

import { memo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { defaultCategories } from "@/lib/data";
import { useDashboardStore } from "@/store/dashboard-store";

function DashboardFiltersComponent() {
  const {
    selectedMonth,
    selectedCategory,
    setSelectedMonth,
    setSelectedCategory,
    resetFilters,
  } = useDashboardStore();

  // Generate last 12 months for the month selector
  const months = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    months.push({ value, label });
  }

  const expenseCategories = defaultCategories.filter((c) => c.type === "EXPENSE");

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={selectedMonth} onValueChange={setSelectedMonth}>
        <SelectTrigger className="w-[180px] h-9 text-sm">
          <SelectValue placeholder="Select month" />
        </SelectTrigger>
        <SelectContent>
          {months.map((m) => (
            <SelectItem key={m.value} value={m.value}>
              {m.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={selectedCategory || "all"} onValueChange={(v) => setSelectedCategory(v === "all" ? "" : v)}>
        <SelectTrigger className="w-[180px] h-9 text-sm">
          <SelectValue placeholder="All categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          {expenseCategories.map((cat) => (
            <SelectItem key={cat.id} value={cat.id}>
              {cat.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="ghost"
        size="sm"
        onClick={resetFilters}
        className="h-9 text-muted-foreground hover:text-foreground cursor-pointer"
      >
        <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
        Reset
      </Button>
    </div>
  );
}

export const DashboardFilters = memo(DashboardFiltersComponent);
