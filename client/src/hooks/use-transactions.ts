"use client";

import { useCallback, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useTransactionList, useDeleteTransaction, useUpdateTransaction } from "./use-dashboard";
import {
  DEFAULT_FILTERS,
  type TransactionFilters,
} from "@/lib/transaction-constants";

/**
 * Custom hook that manages transaction filters via URL search params,
 * data fetching through React Query, and bulk-delete mutations.
 */
export function useTransactions() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // ── Read filters from URL ──────────────────────────────────
  const filters: TransactionFilters = useMemo(() => {
    return {
      search: searchParams.get("search") || DEFAULT_FILTERS.search,
      month: searchParams.get("month") || DEFAULT_FILTERS.month,
      category: searchParams.get("category") || DEFAULT_FILTERS.category,
      type: searchParams.get("type") || DEFAULT_FILTERS.type,
      sort: searchParams.get("sort") || DEFAULT_FILTERS.sort,
      page: Number(searchParams.get("page")) || DEFAULT_FILTERS.page,
      limit: Number(searchParams.get("limit")) || DEFAULT_FILTERS.limit,
    };
  }, [searchParams]);

  // ── Write filters to URL ───────────────────────────────────
  const setFilters = useCallback(
    (updates: Partial<TransactionFilters>) => {
      const params = new URLSearchParams(searchParams.toString());
      const merged = { ...filters, ...updates };

      // Reset to page 1 when any filter (besides page) changes
      if (!("page" in updates)) {
        merged.page = 1;
      }

      Object.entries(merged).forEach(([key, value]) => {
        const defaultValue =
          DEFAULT_FILTERS[key as keyof TransactionFilters];
        if (
          String(value) === String(defaultValue) ||
          value === "" ||
          value === undefined
        ) {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      });

      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [searchParams, filters, router, pathname],
  );

  const resetFilters = useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [router, pathname]);

  // ── Build API params ───────────────────────────────────────
  const apiParams = useMemo(() => {
    const params: Record<string, any> = {
      page: filters.page,
      limit: filters.limit,
      month: filters.month,
    };
    if (filters.search) params.search = filters.search;
    if (filters.category !== "all") params.category = filters.category;
    if (filters.type !== "all") params.type = filters.type;
    if (filters.sort !== "latest") params.sort = filters.sort;
    return params;
  }, [filters]);

  // ── Data fetching ──────────────────────────────────────────
  const query = useTransactionList(apiParams);
  const deleteMutation = useDeleteTransaction();
  const updateMutation = useUpdateTransaction();

  const hasActiveFilters = useMemo(() => {
    return (
      filters.search !== DEFAULT_FILTERS.search ||
      filters.month !== DEFAULT_FILTERS.month ||
      filters.category !== DEFAULT_FILTERS.category ||
      filters.type !== DEFAULT_FILTERS.type ||
      filters.sort !== DEFAULT_FILTERS.sort
    );
  }, [filters]);

  return {
    filters,
    setFilters,
    resetFilters,
    hasActiveFilters,
    transactions: query.data?.transactions ?? [],
    pagination: query.data?.pagination ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    deleteMutation,
    updateMutation,
  };
}
