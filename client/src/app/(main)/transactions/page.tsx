"use client";

import { Suspense } from "react";
import { TransactionsHeader } from "@/components/transactions/transactions-header";
import { TransactionsFilters } from "@/components/transactions/transactions-filters";
import { TransactionsTable } from "@/components/transactions/transactions-table";
import { TransactionsPagination } from "@/components/transactions/transactions-pagination";
import { TransactionsSkeleton } from "@/components/transactions/transactions-skeleton";
import { EmptyTransactions } from "@/components/transactions/empty-transactions";
import { TransactionsError } from "@/components/transactions/transactions-error";
import { useTransactions } from "@/hooks/use-transactions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

function TransactionsContent() {
  const {
    filters,
    setFilters,
    resetFilters,
    hasActiveFilters,
    transactions,
    pagination,
    isLoading,
    isError,
    error,
    refetch,
    deleteMutation,
    updateMutation,
  } = useTransactions();

  // ── Loading state ────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6">
        <TransactionsSkeleton />
      </div>
    );
  }

  // ── Error state ──────────────────────────────────────────
  if (isError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          {/* <TransactionsHeader /> */}
        </div>
        <TransactionsError
          error={error instanceof Error ? error : null}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Filters ───────────────────────────────────────── */}
      <Card className="border-0 shadow-sm">
        <CardContent className="py-3 px-4">
          <TransactionsFilters
            filters={filters}
            onFilterChange={setFilters}
            onReset={resetFilters}
            hasActiveFilters={hasActiveFilters}
          />
        </CardContent>
      </Card>

      {/* ── Table / Empty state ───────────────────────────── */}
      {transactions.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            <EmptyTransactions
              hasFilters={hasActiveFilters}
              onResetFilters={resetFilters}
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <TransactionsTable
            transactions={transactions}
            onBulkDelete={(ids) => deleteMutation.mutateAsync(ids)}
            onUpdate={(id, data) => updateMutation.mutateAsync({ id, data })}
            isDeleting={deleteMutation.isPending}
            isUpdating={updateMutation.isPending}
          />

          {/* ── Pagination ──────────────────────────────── */}
          {pagination && (
            <TransactionsPagination
              pagination={pagination}
              onPageChange={(page) => setFilters({ page })}
            />
          )}
        </>
      )}
    </div>
  );
}

export default function TransactionsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <TransactionsHeader />
          <TransactionsSkeleton />
        </div>
      }
    >
      <TransactionsContent />
    </Suspense>
  );
}