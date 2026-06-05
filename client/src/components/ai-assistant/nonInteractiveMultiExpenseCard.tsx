import { CandidateTransaction } from "@/store/assistant-store";
import { Card, CardContent } from "../ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { defaultCategories } from "@/lib/data";
import { format } from "date-fns/format";
import { memo } from "react";

interface InteractiveMultiExpenseCardProps {
  candidates: CandidateTransaction[];
}

function getCategoryName(categoryId: string): string {
  const cat = defaultCategories.find((c) => c.id === categoryId);
  return cat?.name || categoryId;
}

function getCategoryColor(categoryId: string): string {
  const cat = defaultCategories.find((c) => c.id === categoryId);
  return cat?.color || "#64748b";
}

function NonInteractiveMultiExpenseCardComponent({
  candidates,
}: InteractiveMultiExpenseCardProps) {
  return (
    <>
      <Card className="border-0 shadow-sm gap-3">
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-semibold text-xs sm:text-md">Category</TableHead>
                  <TableHead className="font-semibold text-xs sm:text-md">Description</TableHead>
                  <TableHead className="font-semibold text-xs sm:text-md">Date</TableHead>
                  <TableHead className="font-semibold text-right text-xs sm:text-md">
                    Amount
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidates.map((candidate) => (
                  <TableRow key={candidate.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{
                            backgroundColor: getCategoryColor(
                              candidate.category,
                            ),
                          }}
                        />
                        <span className="font-medium text-xs sm:text-md">
                          {getCategoryName(candidate.category)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs sm:text-md text-muted-foreground max-w-[200px] truncate">
                      {candidate.description || "—"}
                    </TableCell>
                    <TableCell className="text-xs sm:text-md text-muted-foreground">
                      {format(new Date(candidate.date), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={`text-xs sm:text-md font-semibold tabular-nums ${
                          candidate.type === "INCOME"
                            ? "text-green-500"
                            : "text-red-500 dark:text-red-400"
                        }`}
                      >
                        {candidate.type === "INCOME" ? "+" : "-"}₹
                        {Number(candidate.amount).toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

export const NonInteractiveMultiExpenseCard = memo(
  NonInteractiveMultiExpenseCardComponent,
);
