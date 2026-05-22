import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthApi } from "./use-dashboard";
import { CandidateTransaction } from "./../store/assistant-store";

export function useProcessAssistantMessage() {
  const authFetch = useAuthApi();
  return useMutation({
    mutationFn: (formData: FormData) =>
      authFetch<{ transactions: Omit<CandidateTransaction, "id">[] }>("/ai/assistant", {
        method: "POST",
        data: formData,
      }),
  });
}

export function useBulkCreateTransactions() {
  const authFetch = useAuthApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (transactions: Omit<CandidateTransaction, "id">[]) =>
      authFetch("/transaction/bulk-create", {
        method: "POST",
        data: { transactions },
      }),
    onSuccess: () => {
      // Invalidate all caches to dynamically re-render the charts and lists on dashboard/reports
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["category-breakdown"] });
      queryClient.invalidateQueries({ queryKey: ["weekly-pattern"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["monthly-trend"] });
    },
  });
}