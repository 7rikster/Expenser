"use client";

import { Search, RotateCcw, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { defaultCategories } from "@/lib/data";
import {
  generateMonthOptions,
  TYPE_OPTIONS,
  SORT_OPTIONS,
  type TransactionFilters,
} from "@/lib/transaction-constants";
import { useEffect, useMemo, useRef, useState } from "react";

interface TransactionsFiltersProps {
  filters: TransactionFilters;
  onFilterChange: (updates: Partial<TransactionFilters>) => void;
  onReset: () => void;
  hasActiveFilters: boolean;
}

// Unique categories for the dropdown (combining income & expense)
const uniqueCategories = [
  { id: "all", name: "All Categories" },
  ...defaultCategories.map((c) => ({ id: c.id, name: c.name })),
];

export function TransactionsFilters({
  filters,
  onFilterChange,
  onReset,
  hasActiveFilters,
}: TransactionsFiltersProps) {
  // ── Dynamic month options (last 12 months) ───────────────
  const monthOptions = useMemo(() => generateMonthOptions(), []);
  // ── Local search state with debounce ─────────────────────
  const [searchInput, setSearchInput] = useState(filters.search);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setSearchInput(filters.search);
  }, [filters.search]);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onFilterChange({ search: value });
    }, 400);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const activeCount = [
    filters.search !== "",
    filters.month !== "all",
    filters.category !== "all",
    filters.type !== "all",
    filters.sort !== "latest",
  ].filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* ── Filter bar ──────────────────────────────────────── */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="transaction-search"
            placeholder="Search transactions..."
            className="pl-9 h-9"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Month */}
          <Select
            value={filters.month}
            onValueChange={(v) => onFilterChange({ month: v })}
          >
            <SelectTrigger id="filter-month" className="w-[170px] h-9">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Category */}
          <Select
            value={filters.category}
            onValueChange={(v) => onFilterChange({ category: v })}
          >
            <SelectTrigger id="filter-category" className="w-[160px] h-9">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {uniqueCategories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Type */}
          <Select
            value={filters.type}
            onValueChange={(v) => onFilterChange({ type: v })}
          >
            <SelectTrigger id="filter-type" className="w-[130px] h-9">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              {TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Sort */}
          <Select
            value={filters.sort}
            onValueChange={(v) => onFilterChange({ sort: v })}
          >
            <SelectTrigger id="filter-sort" className="w-[160px] h-9">
              <SlidersHorizontal className="h-3.5 w-3.5 mr-1" />
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Reset */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground hover:text-foreground cursor-pointer h-9"
              onClick={onReset}
              id="reset-filters"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
              {activeCount > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-0.5 h-5 w-5 p-0 text-[10px]"
                >
                  {activeCount}
                </Badge>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
