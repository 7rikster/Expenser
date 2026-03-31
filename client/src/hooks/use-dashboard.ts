"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { useCallback } from "react";
import api, { setAuthToken } from "@/lib/api";
import type {
  DashboardData,
  MonthlyTrendPoint,
  WeeklyPatternPoint,
  TransactionListResponse,
  ApiResponse,
} from "@/lib/types";

/**
 * Helper to get authenticated API calls.
 * Sets the Clerk token before each request.
 */
function useAuthApi() {
  const { getToken } = useAuth();

  const authFetch = useCallback(
    async <T>(url: string, options?: { method?: string; data?: any; params?: any }): Promise<T> => {
      const token = await getToken();
      setAuthToken(token);
      const response = await api({
        url,
        method: options?.method || "GET",
        data: options?.data,
        params: options?.params,
      });
      return response.data.data;
    },
    [getToken]
  );

  return authFetch;
}

// ─── Dashboard Data ──────────────────────────────────────────
export function useDashboardData() {
  const authFetch = useAuthApi();

  return useQuery<DashboardData>({
    queryKey: ["dashboard"],
    queryFn: () => authFetch<DashboardData>("/dashboard"),
  });
}

// ─── Monthly Trend ───────────────────────────────────────────
export function useMonthlyTrend() {
  const authFetch = useAuthApi();

  return useQuery<MonthlyTrendPoint[]>({
    queryKey: ["monthly-trend"],
    queryFn: () => authFetch<MonthlyTrendPoint[]>("/dashboard/monthly-trend"),
  });
}

// ─── Weekly Pattern ──────────────────────────────────────────
export function useWeeklyPattern() {
  const authFetch = useAuthApi();

  return useQuery<WeeklyPatternPoint[]>({
    queryKey: ["weekly-pattern"],
    queryFn: () => authFetch<WeeklyPatternPoint[]>("/dashboard/weekly-pattern"),
  });
}

// ─── Transaction List ────────────────────────────────────────
export function useTransactionList(params: {
  month?: string;
  category?: string;
  page?: number;
  limit?: number;
}) {
  const authFetch = useAuthApi();

  return useQuery<TransactionListResponse>({
    queryKey: ["transactions", params],
    queryFn: () =>
      authFetch<TransactionListResponse>("/transaction/list", { params }),
  });
}

// ─── Delete Transaction (Bulk) ───────────────────────────────
export function useDeleteTransaction() {
  const authFetch = useAuthApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) =>
      authFetch("/transaction/bulk", { method: "DELETE", data: { ids } }),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ["transactions"] });
      queryClient.removeQueries({ queryKey: ["dashboard"] });
      queryClient.removeQueries({ queryKey: ["monthly-trend"] });
      queryClient.removeQueries({ queryKey: ["weekly-pattern"] });
    },
  });
}

// ─── Update Budget ───────────────────────────────────────────
export function useUpdateBudget() {
  const authFetch = useAuthApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { dailyBudget?: number; monthlyBudget?: number }) =>
      authFetch("/user/budget", { method: "PUT", data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

// ─── Create User (initial login) ─────────────────────────────
export function useCreateUser() {
  const authFetch = useAuthApi();

  return useMutation({
    mutationFn: (data: { email: string; name: string; imageUrl?: string }) =>
      authFetch("/user/create", { method: "POST", data }),
  });
}
