"use client";

import { AlertCircle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface TransactionsErrorProps {
  error: Error | null;
  onRetry: () => void;
}

export function TransactionsError({ error, onRetry }: TransactionsErrorProps) {
  return (
    <Card className="border-destructive/20 bg-destructive/5 shadow-sm">
      <CardContent className="flex flex-col items-center justify-center py-12 px-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 mb-4">
          <AlertCircle className="h-7 w-7 text-destructive" />
        </div>

        <h3 className="text-lg font-semibold mb-1">
          Failed to load transactions
        </h3>
        <p className="text-sm text-muted-foreground text-center max-w-sm mb-6">
          {error?.message ||
            "Something went wrong while fetching your transactions. Please try again."}
        </p>

        <Button
          variant="outline"
          className="gap-2 cursor-pointer"
          onClick={onRetry}
        >
          <RefreshCcw className="h-4 w-4" />
          Try again
        </Button>
      </CardContent>
    </Card>
  );
}
