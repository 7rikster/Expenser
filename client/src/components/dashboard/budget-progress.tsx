"use client";

import { memo, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardData, CategoryBudget, BudgetResponse } from "@/lib/types";
import { Button } from "../ui/button";
import { Loader2, SquarePen, AlertTriangle, Trash2, Plus } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Separator } from "../ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useUpdateBudget, useDismissBudgetWarning } from "@/hooks/use-budget";
import { defaultCategories } from "@/lib/data";
import { getCurrentMonth, categoryIconMap } from "@/lib/transaction-constants";
import { toast } from "sonner";

interface BudgetProgressProps {
  data: DashboardData | undefined;
  isLoading: boolean;
  budgetResponse: BudgetResponse | undefined;
  isBudgetLoading: boolean;
  showCircles?: boolean;
}

function CircularProgress({
  spent,
  budget,
  icon: Icon,
  label,
}: {
  spent: number;
  budget: number;
  icon?: any;
  label: string;
}) {
  const percentage = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  
  // SVG Circle Calculations
  const radius = 24;
  const strokeWidth = 4;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  let strokeColor = "stroke-emerald-500";
  if (percentage > 90) strokeColor = "stroke-red-500";
  else if (percentage > 70) strokeColor = "stroke-amber-500";
  else if (percentage > 50) strokeColor = "stroke-blue-500";
  const [hovered, setHovered] = useState(false);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div 
          className="relative flex items-center justify-center h-16 w-16 group cursor-pointer"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          {/* SVG Circle Progress */}
          <svg className="w-14 h-14 transform -rotate-90">
            {/* Background Circle */}
            <circle
              className="stroke-muted"
              fill="transparent"
              strokeWidth={strokeWidth}
              r={radius}
              cx="28"
              cy="28"
            />
            {/* Progress Circle */}
            <circle
              className={`${strokeColor} transition-all duration-500 ease-out`}
              fill="transparent"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              style={{ strokeDashoffset }}
              strokeLinecap="round"
              r={radius}
              cx="28"
              cy="28"
            />
          </svg>
          {/* Center Content: Icon toggles to Percentage on hover */}
          <div className="absolute inset-0 flex items-center justify-center">
            {hovered ? (
              <span className="text-[10px] font-bold text-foreground transition-all duration-150">
                {percentage.toFixed(0)}%
              </span>
            ) : Icon ? (
              <Icon className="h-5 w-5 text-muted-foreground group-hover:opacity-0 transition-opacity duration-150" />
            ) : (
              <span className="text-xs font-semibold text-muted-foreground group-hover:opacity-0 transition-opacity duration-150">
                {label.slice(0, 2)}
              </span>
            )}
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top">
        <div className="text-xs space-y-0.5">
          <p className="font-semibold">{label}</p>
          <p className="text-[10px] opacity-80">
            ₹{spent.toLocaleString("en-IN")} / ₹{budget.toLocaleString("en-IN")}
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

function ProgressBar({
  label,
  spent,
  budget,
  icon: Icon,
}: {
  label: string;
  spent: number;
  budget: number;
  icon?: any;
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
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
          <p className="text-sm font-medium">{label}</p>
        </div>
        <p className="text-sm font-semibold">
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
        <p className="text-xs font-medium text-muted-foreground">
          ₹{remaining.toLocaleString("en-IN", { minimumFractionDigits: 2 })} remaining
        </p>
      </div>
    </div>
  );
}

function BudgetProgressComponent({ data, isLoading, budgetResponse, isBudgetLoading, showCircles }: BudgetProgressProps) {
  // console.log("Rendering BudgetProgress with data:", data, "budgetResponse:", budgetResponse);
  const currentMonth = getCurrentMonth();
  // const { data: budgetResponse, isLoading: isBudgetLoading } = useBudget(currentMonth);
  const { mutate: updateBudget, isPending: isUpdating } = useUpdateBudget();
  const { mutate: dismissWarning, isPending: isDismissing } = useDismissBudgetWarning();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [monthlyLimit, setMonthlyLimit] = useState(0);
  const [editCategories, setEditCategories] = useState<CategoryBudget[]>([]);
  
  // States for adding a new category budget
  const [newCategory, setNewCategory] = useState<string>("");
  const [newAmount, setNewAmount] = useState<number>(0);
  const [showWarning, setShowWarning] = useState(true);

  useEffect(() => {
    if(budgetResponse?.budget){
      setMonthlyLimit(budgetResponse.budget.amount);
      setEditCategories(
        budgetResponse.budget.categoryBudgets.map((cb) => ({
          category: cb.category,
          amount: Number(cb.amount),
        }))
      );
    } 
  },[budgetResponse]);

  // Initialize dialog state when it opens
  useEffect(() => {
    if (isDialogOpen) {
      if (budgetResponse?.budget) {
        setMonthlyLimit(budgetResponse.budget.amount);
        setEditCategories(
          budgetResponse.budget.categoryBudgets.map((cb) => ({
            category: cb.category,
            amount: Number(cb.amount),
          }))
        );
      } else {
        setMonthlyLimit(0);
        setEditCategories([]);
      }
      setNewCategory("");
      setNewAmount(0);
    }
  }, [isDialogOpen, budgetResponse]);

  if (isLoading || isBudgetLoading || !data) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row justify-between items-center">
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold">Budget Tracking</CardTitle>
            <Skeleton className="h-3.5 w-48" />
          </div>
          <Skeleton className="h-9 w-24 rounded-md" />
        </CardHeader>
        <CardContent className="space-y-6">
          <Skeleton className="h-16 w-full rounded-md" />
          <Skeleton className="h-16 w-full rounded-md" />
        </CardContent>
      </Card>
    );
  }


  const monthSpent = Number(data.thisMonthExpense.total);
  const budget = budgetResponse?.budget;
  const monthlyBudgetAmount = budget ? Number(budget.amount) : 0;

  const handleDismissWarning = () => {
    if (!budgetResponse?.budget?.id) return;
    setShowWarning(false);
    dismissWarning(
      { budgetId: budgetResponse.budget.id },
      {
        onSuccess: () => {
          toast.success("Warning dismissed.");
        },
        onError: () => {
          toast.error("Failed to dismiss warning.");
          setShowWarning(true);
        },
      }
    );
  };

  const handleAddCategoryBudget = () => {
    if (!newCategory || newAmount <= 0) {
      toast.error("Select a category and enter a valid limit.");
      return;
    }
    if (editCategories.some((ec) => ec.category === newCategory)) {
      toast.error("Budget limit for this category is already added.");
      return;
    }
    setEditCategories((prev) => [...prev, { category: newCategory, amount: newAmount }]);
    setNewCategory("");
    setNewAmount(0);
  };

  const handleUpdateCategoryLimit = (category: string, amount: number) => {
    setEditCategories((prev) =>
      prev.map((ec) => (ec.category === category ? { ...ec, amount } : ec))
    );
  };

  const handleDeleteCategoryBudget = (category: string) => {
    setEditCategories((prev) => prev.filter((ec) => ec.category !== category));
  };

  const handleSave = () => {
    if (monthlyLimit <= 0) {
      toast.error("Please enter a valid monthly budget limit.");
      return;
    }
    updateBudget(
      {
        amount: monthlyLimit,
        month: currentMonth,
        categoryBudgets: editCategories,
      },
      {
        onSuccess: () => {
          setIsDialogOpen(false);
          toast.success("Budget settings saved successfully.");
        },
        onError: () => {
          toast.error("Failed to update budget settings.");
        },
      }
    );
  };

  // Filter out categories that are already added to category budgets
  const expenseCategories = defaultCategories.filter((c) => c.type === "EXPENSE");
  const availableCategories = expenseCategories.filter(
    (c) => !editCategories.some((ec) => ec.category === c.id)
  );

  return (
    <Card className="border-0 shadow-sm h-full">
      <CardHeader className="pb-2">
        {budgetResponse?.budgetStatus === "template" && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-amber-500 text-xs flex items-center gap-2.5 justify-between">
            <div className="flex gap-1">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p className="opacity-90">This is your last month's budget. Click 'Copy' to use it for the current month or click 'Configure' to set a new budget.</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSave}
              disabled={isUpdating}
              className="h-7 text-amber-500 hover:text-amber-600 hover:bg-amber-500/10 cursor-pointer shrink-0"
            >
              {isUpdating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Copy"}
            </Button>
          </div>
          )}
        <div className="flex justify-between items-center">
          
          <div>
            <CardTitle className="text-base font-semibold">Budget Tracking</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Monthly budget and category allocations
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="cursor-pointer flex gap-1.5 items-center">
                <SquarePen className="h-3.5 w-3.5" />
                <span>Configure</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Configure Budget</DialogTitle>
                <DialogDescription>
                  Set your total monthly budget and manage optional category-specific limits.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 my-4">
                {/* 1. Monthly Budget */}
                <div className="space-y-2">
                  <Label htmlFor="monthly-amount" className="font-medium text-sm">
                    Monthly Budget (₹)
                  </Label>
                  <Input
                    id="monthly-amount"
                    type="number"
                    min="0"
                    placeholder="e.g. 50000"
                    value={monthlyLimit || ""}
                    onChange={(e) => setMonthlyLimit(Number(e.target.value))}
                  />
                </div>

                <Separator />

                {/* 2. Category Budgets List */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-sm">Category-wise Limits</h4>

                  {editCategories.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">
                      No category budgets added yet.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {editCategories.map((ec) => {
                        const catDef = defaultCategories.find((c) => c.id === ec.category);
                        return (
                          <div key={ec.category} className="flex items-center gap-2">
                            <span className="text-xs font-medium w-1/3 truncate">
                              {catDef?.name || ec.category}
                            </span>
                            <Input
                              type="number"
                              min="0"
                              className="h-8 flex-1 text-xs"
                              placeholder="Limit (₹)"
                              value={ec.amount || ""}
                              onChange={(e) =>
                                handleUpdateCategoryLimit(ec.category, Number(e.target.value))
                              }
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteCategoryBudget(ec.category)}
                              className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <Separator />

                {/* 3. Add Category Budget Form */}
                <div className="space-y-3 bg-muted/40 p-3 rounded-lg border border-border">
                  <h5 className="text-xs font-semibold">Add Category Limit</h5>
                  <div className="flex gap-2">
                    <div className="w-1/2">
                      <Select value={newCategory} onValueChange={setNewCategory}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableCategories.map((c) => (
                            <SelectItem key={c.id} value={c.id} className="text-xs">
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Input
                      type="number"
                      placeholder="Amount (₹)"
                      className="h-8 w-1/3 text-xs"
                      value={newAmount || ""}
                      onChange={(e) => setNewAmount(Number(e.target.value))}
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddCategoryBudget}
                      className="h-8 flex-1 text-xs cursor-pointer"
                      disabled={isUpdating}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add
                    </Button>
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-2 ">
                <DialogClose asChild>
                  <Button variant="outline" disabled={isUpdating}>
                    Cancel
                  </Button>
                </DialogClose>
                <Button
                  onClick={handleSave}
                  disabled={isUpdating || monthlyLimit <= 0}
                  className="cursor-pointer"
                >
                  {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  Save Changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-2">
        {showWarning && budgetResponse?.warning && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-amber-500 text-xs flex items-start gap-2.5 justify-between">
            <div className="flex gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Budget Warning</p>
                <p className="opacity-90">{budgetResponse.warning}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismissWarning}
              disabled={isDismissing}
              className="h-7 text-amber-500 hover:text-amber-600 hover:bg-amber-500/10 cursor-pointer shrink-0"
            >
              {isDismissing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Dismiss"}
            </Button>
          </div>
        )}

        {monthlyBudgetAmount > 0 ? (
          <ProgressBar label="Total Monthly Budget" spent={monthSpent} budget={monthlyBudgetAmount} />
        ) : (
          <div className="text-center py-4 bg-muted/20 border border-dashed rounded-lg">
            <p className="text-sm text-muted-foreground">No monthly budget configured yet.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Click Configure to establish limits and start tracking.
            </p>
          </div>
        )}

        {budget?.categoryBudgets && budget.categoryBudgets.length > 0 && (
          <div className="space-y-4 pt-2">
            <h4 className="text-sm font-semibold border-b pb-1">Category Budgets</h4>
            {showCircles ? (
              <div className="flex flex-wrap gap-4 justify-center items-center">
                {budget.categoryBudgets.map((cb) => {
                  const categorySpent =
                    data.thisMonthExpense.categories.find((cat) => cat.category === cb.category)
                      ?.amount || 0;
                  const catDef = defaultCategories.find((c) => c.id === cb.category);
                  const icon = catDef ? categoryIconMap[catDef.icon] : undefined;
                  return (
                    <CircularProgress
                      key={cb.id || cb.category}
                      label={catDef?.name || cb.category}
                      spent={categorySpent}
                      budget={Number(cb.amount)}
                      icon={icon}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="space-y-4">
                {budget.categoryBudgets.map((cb) => {
                  const categorySpent =
                    data.thisMonthExpense.categories.find((cat) => cat.category === cb.category)
                      ?.amount || 0;
                  const catDef = defaultCategories.find((c) => c.id === cb.category);
                  const icon = catDef ? categoryIconMap[catDef.icon] : undefined;
                  return (
                    <ProgressBar
                      key={cb.id || cb.category}
                      label={catDef?.name || cb.category}
                      spent={categorySpent}
                      budget={Number(cb.amount)}
                      icon={icon}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export const BudgetProgress = memo(BudgetProgressComponent);