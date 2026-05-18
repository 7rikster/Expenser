"use client";

import { memo } from "react";
import { format } from "date-fns";
import { Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { defaultCategories } from "@/lib/data";
import { categoryIconMap } from "@/lib/transaction-constants";
import type { Transaction } from "@/lib/types";
import type { LucideIcon } from "lucide-react";

interface TransactionRowProps {
  transaction: Transaction;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (transaction: Transaction) => void;
  isDeleting: boolean;
}

function getCategoryMeta(categoryId: string) {
  const cat = defaultCategories.find((c) => c.id === categoryId);
  const name = cat?.name || categoryId;
  const color = cat?.color || "#64748b";
  const iconName = cat?.icon || "MoreHorizontal";
  const Icon: LucideIcon =
    categoryIconMap[iconName] || categoryIconMap.MoreHorizontal;
  return { name, color, Icon };
}

function TransactionRowComponent({
  transaction: tx,
  isSelected,
  onToggleSelect,
  onDelete,
  onEdit,
  isDeleting,
}: TransactionRowProps) {
  const { name: categoryName, color, Icon: CategoryIcon } = getCategoryMeta(tx.category);
  const isIncome = tx.type === "INCOME";

  return (
    <TableRow
      className={`group transition-all duration-200 hover:bg-muted/60 ${
        isSelected ? "bg-primary/5 hover:bg-primary/10" : ""
      }`}
    >
      {/* Checkbox */}
      <TableCell className="w-[44px] pl-4">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggleSelect(tx.id)}
          aria-label={`Select ${tx.description || categoryName}`}
          className="cursor-pointer"
        />
      </TableCell>

      {/* Category Icon + Description */}
      <TableCell>
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-110"
            style={{ backgroundColor: `${color}15` }}
          >
            <CategoryIcon className="h-4 w-4" style={{ color }} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate max-w-[200px]">
              {tx.description || categoryName}
            </p>
            {tx.isRecurring && (
              <Badge
                variant="secondary"
                className="mt-0.5 text-[10px] px-1.5 py-0 h-4"
              >
                Recurring
              </Badge>
            )}
          </div>
        </div>
      </TableCell>

      {/* Category badge */}
      <TableCell>
        <Badge
          variant="outline"
          className="text-xs font-medium"
          style={{
            borderColor: `${color}40`,
            color: color,
            backgroundColor: `${color}08`,
          }}
        >
          <span
            className="mr-1.5 h-1.5 w-1.5 rounded-full inline-block"
            style={{ backgroundColor: color }}
          />
          {categoryName}
        </Badge>
      </TableCell>

      {/* Amount */}
      <TableCell className="text-right">
        <span
          className={`text-sm font-semibold tabular-nums ${
            isIncome
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-red-500 dark:text-red-400"
          }`}
        >
          {isIncome ? "+" : "-"}₹
          {Number(tx.amount).toLocaleString("en-IN", {
            minimumFractionDigits: 2,
          })}
        </span>
      </TableCell>

      {/* Type badge */}
      <TableCell>
        <Badge
          className={`text-[11px] font-medium px-2 py-0.5 ${
            isIncome
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
              : "bg-red-500/10 text-red-500 dark:text-red-400 border-red-500/20"
          }`}
          variant="outline"
        >
          {isIncome ? "Income" : "Expense"}
        </Badge>
      </TableCell>

      {/* Date */}
      <TableCell className="text-sm text-muted-foreground">
        {format(new Date(tx.date), "MMM dd, yyyy")}
      </TableCell>

      {/* Actions: Edit + Delete */}
      <TableCell className="w-[100px] pr-4">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 cursor-pointer text-muted-foreground hover:text-primary"
            onClick={() => onEdit(tx)}
            aria-label="Edit transaction"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 cursor-pointer text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(tx.id)}
            disabled={isDeleting}
            aria-label="Delete transaction"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export const TransactionRow = memo(TransactionRowComponent);
