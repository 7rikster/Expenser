"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthApi } from "./use-dashboard";
import type { BudgetResponse, UserBudget } from "@/lib/types";

export function useBudget(month?: string) {
  const authFetch = useAuthApi();

  return useQuery<BudgetResponse>({
    queryKey: ["budget", month],
    queryFn: () => authFetch<BudgetResponse>("/budget", { params: { month } }),
  });
}

export function useUpdateBudget() {
  const authFetch = useAuthApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { amount: number; month: string; categoryBudgets: { category: string; amount: number }[] }) =>
      authFetch<UserBudget>("/budget", { method: "PUT", data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["budget", variables.month] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDismissBudgetWarning() {
  const authFetch = useAuthApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { month?: string; budgetId?: string }) =>
      authFetch<any>("/budget/dismiss-warning", { method: "PATCH", data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget"] });
    },
  });
}