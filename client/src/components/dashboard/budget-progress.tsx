"use client";

import { memo, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardData } from "@/lib/types";
import { Button } from "../ui/button";
import { Loader2, SquarePen } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Field, FieldGroup } from "../ui/field";
import { useUpdateBudget } from "@/hooks/use-dashboard";
import { toast } from "sonner";

interface BudgetProgressProps {
  data: DashboardData | undefined;
  isLoading: boolean;
}

function ProgressBar({
  label,
  spent,
  budget,
}: {
  label: string;
  spent: number;
  budget: number;
}) {
  
  const percentage = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const remaining = Math.max(budget - spent, 0);

  let barColor = "bg-emerald-500";
  if (percentage > 90) barColor = "bg-red-500";
  else if (percentage > 70) barColor = "bg-amber-500";
  else if (percentage > 50) barColor = "bg-blue-500";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-sm text-muted-foreground">
          ₹{spent.toLocaleString("en-IN", { minimumFractionDigits: 2 })} / ₹
          {budget.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </p>
      </div>
      <div className="h-2.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${barColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {percentage.toFixed(1)}% used
        </p>
        <p className="text-xs font-medium">
          ₹{remaining.toLocaleString("en-IN", { minimumFractionDigits: 2 })} remaining
        </p>
      </div>
    </div>
  );
}

function BudgetProgressComponent({ data, isLoading }: BudgetProgressProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [budgetData, setBudgetData] = useState({
    dailyBudget: 0,
    monthlyBudget: 0,
  });
  const {mutate: updateBudget, isPending} = useUpdateBudget();
  if (isLoading || !data) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flew-row justify-between">
          <CardTitle className="text-base font-semibold">Budget Tracking</CardTitle>
          <Skeleton className="h-9 w-16 rounded-md" />
        </CardHeader>
        <CardContent className="space-y-6">
          <Skeleton className="h-16 w-full rounded-md" />
          <Skeleton className="h-16 w-full rounded-md" />
        </CardContent>
      </Card>
    );
  }

  const dailyBudget = Number(data.user.dailyBudget || 0);
  const monthlyBudget = Number(data.user.monthlyBudget || 0);
  const todaySpent = Number(data.todayExpense.total);
  const monthSpent = Number(data.thisMonthExpense.total);
  
  function handleEditBudget() {
    if(budgetData.dailyBudget === 0 || budgetData.monthlyBudget === 0){
      toast.error("Please enter a valid budget.");
      return;
    }
    try{
      updateBudget({
        dailyBudget: budgetData.dailyBudget,
        monthlyBudget: budgetData.monthlyBudget,
      }, {
        onSuccess: () => {
          setIsDialogOpen(false);
          toast.success("Budget updated successfully.")
        },
      })
    }
    catch(err){
      toast.error("Failed to update budget. Try again later.");
    }
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex justify-between">
          <CardTitle className="text-base font-semibold">Budget Tracking</CardTitle>
          <Dialog
            open={isDialogOpen}
            onOpenChange={() => {
              setIsDialogOpen((prev) => !prev);
              setBudgetData({
                dailyBudget: dailyBudget,
                monthlyBudget: monthlyBudget,
              });
            }}
          >
            <DialogTrigger asChild>
              <Button variant="outline" className="cursor-pointer"><SquarePen className="h-4 w-4" /></Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>Edit budget</DialogTitle>
                 <DialogDescription>
                  Make changes to your budget here. Click save when you&apos;re
                  done.
                </DialogDescription>
              </DialogHeader>
              <FieldGroup>

                <Field>
                  <Label htmlFor="daily">
                    Daily Budget
                  </Label>
                  <Input
                    id="daily"
                    type="number"
                    value={budgetData.dailyBudget}
                    onChange={(event) =>
                      setBudgetData((prev) => ({
                        ...prev,
                        dailyBudget: Number(event.target.value),
                      }))
                    }
                    className="col-span-3"
                    />
                </Field>
                <Field>
                  <Label htmlFor="monthly">
                    Monthly Budget
                  </Label>
                  <Input
                    id="monthly"
                    type="number"
                    value={budgetData.monthlyBudget}
                    onChange={(event) =>
                      setBudgetData((prev) => ({
                        ...prev,
                        monthlyBudget: Number(event.target.value),
                      }))
                    }
                    className="col-span-3"
                    />
                </Field>
              </FieldGroup>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant = "outline" className="cursor-pointer" disabled={isPending}>Cancel</Button>
                </DialogClose>
                <Button onClick={handleEditBudget} className="cursor-pointer" disabled={isPending}>
                  {isPending ? <span className="px-2"><Loader2 className="h-4 w-4 animate-spin text-white"/></span> : "Save"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <p className="text-sm text-muted-foreground">Daily and monthly budget usage</p>
      </CardHeader>
      <CardContent className="space-y-6 pt-2">
        {dailyBudget > 0 ? (
          <ProgressBar label="Today" spent={todaySpent} budget={dailyBudget} />
        ) : (
          <div className="text-center py-3">
            <p className="text-sm text-muted-foreground">No daily budget set</p>
          </div>
        )}
        {monthlyBudget > 0 ? (
          <ProgressBar label="This Month" spent={monthSpent} budget={monthlyBudget} />
        ) : (
          <div className="text-center py-3">
            <p className="text-sm text-muted-foreground">No monthly budget set</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export const BudgetProgress = memo(BudgetProgressComponent);
