"use client";

import { memo, useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash2, X, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { defaultCategories } from "@/lib/data";
import type { Transaction } from "@/lib/types";
import { toast } from "sonner";

interface RecentTransactionsProps {
  transactions: Transaction[] | undefined;
  isLoading: boolean;
  onBulkDelete: (ids: string[]) => Promise<any>;
  isDeleting: boolean;
}

function getCategoryName(categoryId: string): string {
  const cat = defaultCategories.find((c) => c.id === categoryId);
  return cat?.name || categoryId;
}

function getCategoryColor(categoryId: string): string {
  const cat = defaultCategories.find((c) => c.id === categoryId);
  return cat?.color || "#64748b";
}

function RecentTransactionsComponent({
  transactions,
  isLoading,
  onBulkDelete,
  isDeleting,
}: RecentTransactionsProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const allVisibleIds = transactions?.map((tx) => tx.id) ?? [];
  const allSelected =
    allVisibleIds.length > 0 && allVisibleIds.every((id) => selectedIds.has(id));
  const someSelected = selectedIds.size > 0;

  const toggleOne = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allVisibleIds));
    }
  }, [allSelected, allVisibleIds]);

  const handleBulkDelete = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    
    toast.promise(
      onBulkDelete(ids).then(() => {
        setSelectedIds(new Set());
      }),
      {
        loading: "Deleting...",
        success: `${ids.length} transaction${ids.length > 1 ? "s" : ""} deleted`,
        error: "Failed to delete transactions",
      }
    );
  };

  const handleSingleDelete = (id: string) => {
    toast.promise(
      onBulkDelete([id]).then(() => {
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }),
      {
        loading: "Deleting...",
        success: "Transaction deleted",
        error: "Failed to delete transaction",
      }
    );
  };

  const clearSelection = () => setSelectedIds(new Set());

  if (isLoading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-md" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Recent Transactions</CardTitle>
          <Link href="/transactions">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              View All
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {!transactions || transactions.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground text-sm">No transactions found</p>
          </div>
        ) : (
          <>
            {/* ── Bulk-action bar ─────────────────────────────── */}
            <div
              className={`
                flex items-center justify-between rounded-lg px-4 py-2.5 mb-3
                bg-destructive/10 border border-destructive/20
                transition-all duration-300 ease-in-out origin-top
                ${
                  someSelected
                    ? "opacity-100 max-h-16 scale-y-100"
                    : "opacity-0 max-h-0 scale-y-0 py-0 mb-0 overflow-hidden border-0"
                }
              `}
            >
              <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                <span>
                  {selectedIds.size} selected
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-foreground cursor-pointer"
                  onClick={clearSelection}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
              <Button
                variant="destructive"
                size="sm"
                className="gap-1.5 cursor-pointer"
                onClick={handleBulkDelete}
                disabled={isDeleting}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete{selectedIds.size > 1 ? ` (${selectedIds.size})` : ""}
              </Button>
            </div>

            {/* ── Table ───────────────────────────────────────── */}
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="w-[40px]">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={toggleAll}
                        aria-label="Select all transactions"
                        className="cursor-pointer"
                      />
                    </TableHead>
                    <TableHead className="font-semibold">Category</TableHead>
                    <TableHead className="font-semibold">Description</TableHead>
                    <TableHead className="font-semibold">Date</TableHead>
                    <TableHead className="font-semibold text-right">Amount</TableHead>
                    <TableHead className="font-semibold text-center w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => {
                    const isChecked = selectedIds.has(tx.id);
                    return (
                      <TableRow
                        key={tx.id}
                        className={`group transition-colors ${
                          isChecked
                            ? "bg-destructive/5 hover:bg-destructive/10"
                            : ""
                        }`}
                      >
                        <TableCell>
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => toggleOne(tx.id)}
                            aria-label={`Select transaction ${tx.description || tx.category}`}
                            className="cursor-pointer"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className="h-2.5 w-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: getCategoryColor(tx.category) }}
                            />
                            <span className="font-medium text-sm">
                              {getCategoryName(tx.category)}
                            </span>
                            {tx.isRecurring && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                Recurring
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                          {tx.description || "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(tx.date), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={`text-sm font-semibold tabular-nums ${
                              tx.type === "INCOME"
                                ? "text-green-500"
                                : "text-red-500 dark:text-red-400"
                            }`}
                          >
                            {tx.type === "INCOME" ? "+" : "-"}₹
                            {Number(tx.amount).toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive cursor-pointer"
                            onClick={() => handleSingleDelete(tx.id)}
                            disabled={isDeleting}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>


          </>
        )}
      </CardContent>
    </Card>
  );
}

export const RecentTransactions = memo(RecentTransactionsComponent);
