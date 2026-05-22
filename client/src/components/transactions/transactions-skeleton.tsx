"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function TransactionsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Filters skeleton */}
      <Card className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between py-8 px-6 rounded-lg">
        <Skeleton className="h-9 w-full max-w-sm" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-[140px]" />
          <Skeleton className="h-9 w-[160px]" />
          <Skeleton className="h-9 w-[130px]" />
          <Skeleton className="h-9 w-[160px]" />
        </div>
      </Card>

      {/* Table skeleton */}
      <Card className="border-0 shadow-sm overflow-hidden p-0">
        <CardContent className="p-0">
          {/* Header row */}
          <div className="flex items-center gap-4 px-4 py-5 bg-muted/40 border-b">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-16 ml-auto" />
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-6" />
          </div>

          {/* Data rows */}
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 px-4 py-4 border-b last:border-0"
            >
              <Skeleton className="h-4 w-4 rounded" />
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
                <div className="space-y-1.5 flex-1 min-w-0">
                  <Skeleton className="h-3.5 w-32" />
                  {i % 3 === 0 && <Skeleton className="h-3 w-16" />}
                </div>
              </div>
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-4 w-20 ml-auto" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Pagination skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-48" />
        <div className="flex gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-8 rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}
