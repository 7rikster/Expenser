"use client";

import { Receipt, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface EmptyTransactionsProps {
  hasFilters: boolean;
  onResetFilters: () => void;
}

export function EmptyTransactions({
  hasFilters,
  onResetFilters,
}: EmptyTransactionsProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      {/* Icon */}
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-muted/60 mb-6">
        <Receipt className="h-10 w-10 text-muted-foreground/60" />
      </div>

      {/* Text */}
      <h3 className="text-lg font-semibold mb-1">
        {hasFilters ? "No matching transactions" : "No transactions yet"}
      </h3>
      <p className="text-sm text-muted-foreground text-center max-w-sm mb-6">
        {hasFilters
          ? "Try adjusting your filters or search query to find what you're looking for."
          : "Start tracking your finances by adding your first transaction."}
      </p>

      {/* Actions */}
      {hasFilters ? (
        <Button
          variant="outline"
          className="gap-2 cursor-pointer"
          onClick={onResetFilters}
        >
          Clear all filters
        </Button>
      ) : (
        <Link href="/transactions/add-expense">
          <Button className="gap-2 cursor-pointer">
            <Plus className="h-4 w-4" />
            Add Transaction
          </Button>
        </Link>
      )}
    </div>
  );
}
