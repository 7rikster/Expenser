"use client";

import { memo, useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useWeeklyPattern } from "@/hooks/use-dashboard";

// ─── Week Utilities ──────────────────────────────────────────

/** Returns the Monday (ISO week start) of the week containing `date`. */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun, 1=Mon … 6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Format a Date as YYYY-MM-DD using LOCAL date parts (not UTC). */
function toLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Format a date range label like "12 May – 18 May 2026" */
function formatWeekRange(weekStartStr: string): string {
  const start = new Date(weekStartStr + "T00:00:00");
  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  const sDay = start.getDate();
  const sMonth = start.toLocaleString("default", { month: "short" });
  const eDay = end.getDate();
  const eMonth = end.toLocaleString("default", { month: "short" });
  const eYear = end.getFullYear();

  if (sMonth === eMonth) {
    return `${sDay} – ${eDay} ${sMonth} ${eYear}`;
  }
  return `${sDay} ${sMonth} – ${eDay} ${eMonth} ${eYear}`;
}

// ─── Custom Tooltip ──────────────────────────────────────────

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const { date, amount } = payload[0].payload;
    const d = new Date(date + "T00:00:00");
    const dayLabel = d.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    return (
      <div className="bg-card border border-border rounded-lg px-4 py-3 shadow-lg">
        <p className="text-sm font-medium text-foreground">{dayLabel}</p>
        <p className="text-sm text-muted-foreground">
          ₹{Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </p>
      </div>
    );
  }
  return null;
};

// ─── Arrow Icons ─────────────────────────────────────────────

function ChevronLeft({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

// ─── Main Component ──────────────────────────────────────────

function WeeklyBarChartComponent() {
  // Current week start as the default
  const currentWeekStart = useMemo(() => toLocalDate(getWeekStart(new Date())), []);
  const [weekStart, setWeekStart] = useState(currentWeekStart);

  const { data, isLoading } = useWeeklyPattern(weekStart);

  // Navigation handlers
  const goToPreviousWeek = useCallback(() => {
    setWeekStart((prev) => {
      const d = new Date(prev + "T00:00:00");
      d.setDate(d.getDate() - 7);
      return toLocalDate(d);
    });
  }, []);

  const goToNextWeek = useCallback(() => {
    setWeekStart((prev) => {
      const d = new Date(prev + "T00:00:00");
      d.setDate(d.getDate() + 7);
      return toLocalDate(d);
    });
  }, []);

  // Disable "next" if it would go beyond the current week
  const isNextDisabled = weekStart >= currentWeekStart;

  const weekRangeLabel = useMemo(() => formatWeekRange(weekStart), [weekStart]);

  if (isLoading || !data) {
    return (
      <Card className="border-0 shadow-sm h-full justify-center">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Weekly Spending</CardTitle>
          <Skeleton className="h-6 w-32 rounded-md" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[280px] w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm h-full justify-center">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base font-semibold">Weekly Spending</CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 cursor-pointer"
              onClick={goToPreviousWeek}
              aria-label="Previous week"
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 cursor-pointer"
              onClick={goToNextWeek}
              disabled={isNextDisabled}
              aria-label="Next week"
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{weekRangeLabel}</p>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="weekBarGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={1} />
                  <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0.6} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                dy={10}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                tickFormatter={(v) => `₹${v}`}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--accent)", opacity: 0.3 }} />
              <Bar
                dataKey="amount"
                fill="url(#weekBarGradient)"
                radius={[6, 6, 0, 0]}
                maxBarSize={48}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export const WeeklyBarChart = memo(WeeklyBarChartComponent);
