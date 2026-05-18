"use client";

import { useState, useCallback } from "react";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Trash2, X } from "lucide-react";
import { TransactionRow } from "./transaction-row";
import { EditTransactionDialog } from "./edit-transaction-dialog";
import type { Transaction } from "@/lib/types";
import { toast } from "sonner";

interface TransactionsTableProps {
  transactions: Transaction[];
  onBulkDelete: (ids: string[]) => Promise<any>;
  onUpdate: (id: string, data: { description?: string; amount?: number; category?: string }) => Promise<any>;
  isDeleting: boolean;
  isUpdating: boolean;
}

export function TransactionsTable({
  transactions,
  onBulkDelete,
  onUpdate,
  isDeleting,
  isUpdating,
}: TransactionsTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const allVisibleIds = transactions.map((tx) => tx.id);
  const allSelected =
    allVisibleIds.length > 0 &&
    allVisibleIds.every((id) => selectedIds.has(id));
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

  const clearSelection = () => setSelectedIds(new Set());

  const handleBulkDelete = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    toast.promise(
      onBulkDelete(ids).then(() => setSelectedIds(new Set())),
      {
        loading: "Deleting...",
        success: `${ids.length} transaction${ids.length > 1 ? "s" : ""} deleted`,
        error: "Failed to delete transactions",
      },
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
      },
    );
  };

  const handleEdit = useCallback((tx: Transaction) => {
    setEditingTransaction(tx);
    setEditDialogOpen(true);
  }, []);

  const handleSave = async (
    id: string,
    data: { description?: string; amount?: number; category?: string },
  ) => {
    await toast.promise(onUpdate(id, data), {
      loading: "Saving changes...",
      success: "Transaction updated",
      error: "Failed to update transaction",
    });
  };

  return (
    <>
      <Card className="border-0 shadow-sm overflow-hidden pt-0 pb-3">
        <CardContent className="p-0">
          {/* ── Bulk-action bar ─────────────────────────────── */}
          <div
            className={`
              flex items-center justify-between px-4
              bg-destructive/10 border-b border-destructive/20
              transition-all duration-300 ease-in-out origin-top
              ${
                someSelected
                  ? "opacity-100 max-h-16 scale-y-100"
                  : "opacity-0 max-h-0 scale-y-0 py-0 overflow-hidden border-0"
              }
            `}
          >
            <div className="flex items-center gap-2 text-sm font-medium text-destructive">
              <span>{selectedIds.size} selected</span>
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
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="h-14">
                <TableRow className="bg-muted/40 hover:bg-muted/40 border-b">
                  <TableHead className="w-[44px] pl-4">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={toggleAll}
                      aria-label="Select all transactions"
                      className="cursor-pointer"
                    />
                  </TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                    Description
                  </TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                    Category
                  </TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground text-right">
                    Amount
                  </TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                    Type
                  </TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                    Date
                  </TableHead>
                  <TableHead className="w-[100px] pr-4" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TransactionRow
                    key={tx.id}
                    transaction={tx}
                    isSelected={selectedIds.has(tx.id)}
                    onToggleSelect={toggleOne}
                    onDelete={handleSingleDelete}
                    onEdit={handleEdit}
                    isDeleting={isDeleting}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ── Edit Dialog ────────────────────────────────────── */}
      <EditTransactionDialog
        transaction={editingTransaction}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSave={handleSave}
        isSaving={isUpdating}
      />
    </>
  );
}
