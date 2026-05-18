"use client";

import { useEffect, useState } from "react";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { defaultCategories } from "@/lib/data";
import type { Transaction } from "@/lib/types";

interface EditTransactionDialogProps {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, data: { description?: string; amount?: number; category?: string }) => Promise<any>;
  isSaving: boolean;
}

export function EditTransactionDialog({
  transaction,
  open,
  onOpenChange,
  onSave,
  isSaving,
}: EditTransactionDialogProps) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");

  // Sync form state when the dialog opens with a new transaction
  useEffect(() => {
    if (transaction && open) {
      setDescription(transaction.description || "");
      setAmount(String(transaction.amount));
      setCategory(transaction.category);
    }
  }, [transaction, open]);

  if (!transaction) return null;

  const filteredCategories = defaultCategories.filter(
    (c) => c.type === transaction.type,
  );

  const handleSave = async () => {
    const updates: Record<string, any> = {};

    const newAmount = parseFloat(amount);
    if (!isNaN(newAmount) && newAmount !== transaction.amount) {
      updates.amount = newAmount;
    }
    if (description !== (transaction.description || "")) {
      updates.description = description;
    }
    if (category !== transaction.category) {
      updates.category = category;
    }

    // Nothing changed
    if (Object.keys(updates).length === 0) {
      onOpenChange(false);
      return;
    }

    await onSave(transaction.id, updates);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Edit Transaction</DialogTitle>
          <DialogDescription>
            Update the details of this transaction.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Input
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Transaction description"
            />
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="edit-amount">Amount</Label>
            <Input
              id="edit-amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="edit-category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="edit-category" className="w-full">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {filteredCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date (read-only display) */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Date</Label>
            <p className="text-sm font-medium">
              {format(new Date(transaction.date), "MMMM dd, yyyy")}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
            className="cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !amount || parseFloat(amount) <= 0}
            className="cursor-pointer"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                Saving…
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
