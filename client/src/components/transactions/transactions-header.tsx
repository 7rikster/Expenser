"use client";

import { ArrowDownUp } from "lucide-react";

export function TransactionsHeader() {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <ArrowDownUp className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
          <p className="text-sm text-muted-foreground">
            Manage and track your expenses and income
          </p>
        </div>
      </div>
    </div>
  );
}
