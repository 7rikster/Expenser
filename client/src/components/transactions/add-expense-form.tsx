"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExpenseFormData, expenseSchema } from "@/lib/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import axios from "axios";
import ReceiptScanner from "./receipt-scanner";
import { ScannedData } from "@/lib/types";
import { useNaturalLanguageExtraction, useUploadReceipt } from "@/hooks/use-dashboard";
import NaturalLanguageFormFill from "./natural-language-form-fill";

interface category {
  id: string;
  name: string;
  type: string;
  color: string;
  icon: string;
  subcategories?: string[];
}

function AddExpenseForm({ categories }: { categories: category[] }) {
  const { getToken } = useAuth();
  const { isLoaded } = useUser();
  const queryClient = useQueryClient();
  const {mutateAsync: uploadReceipt,isPending: isReceiptScanning } = useUploadReceipt();
  const {mutateAsync: extractLanguage, isPending: isExtracting} = useNaturalLanguageExtraction();

  const router = useRouter();
  const {
    register,
    setValue,
    handleSubmit,
    formState: { errors },
    watch,
    getValues,
    reset,
  } = useForm({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      type: "EXPENSE",
      amount: "",
      description: "",
      date: new Date(),
      isRecurring: false,
    },
  });
  const type = watch("type");
  const isRecurring = watch("isRecurring");
  const date = watch("date");
  const category = watch("category");

  const [transactionLoading, setTransactionLoading] = useState(false);

  const filteredCategories = categories.filter(
    (category) => category.type === type,
  );

  const onSubmit = async (data: ExpenseFormData) => {
    const formData = {
      ...data,
      amount: parseFloat(data.amount),
    };
    setTransactionLoading(true);
    const token = await getToken();
    if (!token) {
      setTransactionLoading(false);
      return;
    }
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/transaction/create`,
        {
          ...formData,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      console.log("Transaction created:", response.data);
      toast.success("Transaction added successfully!");
      // Remove all dashboard-related queries from cache so stale data is not shown
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["monthly-trend"] });
      queryClient.invalidateQueries({ queryKey: ["weekly-pattern"] });
      queryClient.invalidateQueries({ queryKey: ["category-breakdown"] });

      reset();
      router.push("/dashboard");
    } catch (err) {
      toast.error("Failed to create expense.");
      console.error("Error creating/fetching user:", err);
    } finally {
      setTransactionLoading(false);
    }
  };
  const handleScanComplete = (scannedData: ScannedData) => {
    console.log("Scanned Data: ", scannedData);
    if (scannedData) {
      setValue("amount", scannedData.amount.toString());
      if (scannedData.date) setValue("date", new Date(scannedData.date));
      if (scannedData.description) {
        setValue("description", scannedData.description);
      }
      if (scannedData.category) {
        setValue("category", scannedData.category);
      }
    }
  };

  return (
    <form className="space-y-4 sm:space-y-6" onSubmit={handleSubmit(onSubmit)}>
      {/* AI Receipt scanner and Natural Language Form Fill */}
      <div className="space-y-3">
        <ReceiptScanner 
        onScanComplete={handleScanComplete}
        uploadReceipt={uploadReceipt}
        isUploading={isReceiptScanning}
        isNaturalLanguageExtracting = {isExtracting}
        />
        <div className="w-full text-center"><p>Or</p></div>
        <NaturalLanguageFormFill 
        onScanComplete={handleScanComplete}
        extractLanguage = {extractLanguage}
        isExtracting = {isExtracting}
        isReceiptScanning = {isReceiptScanning}
        />
      </div>
      <div className="space-y-2 w-full">
        <Label className="text-sm font-medium" htmlFor="type">
          Type
        </Label>
        <Select
          onValueChange={(value) =>
            setValue("type", value as "EXPENSE" | "INCOME")
          }
          defaultValue={type}
        >
          <SelectTrigger className="w-full" id="type">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="EXPENSE">Expense</SelectItem>
            <SelectItem value="INCOME">Income</SelectItem>
          </SelectContent>
        </Select>
        {errors.type && (
          <p className="text-sm text-red-500">{errors.type.message}</p>
        )}
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-sm font-medium" htmlFor="amount">
            Amount
          </Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            placeholder="0.00"
            {...register("amount")}
          />
          {errors.amount && (
            <p className="text-sm text-red-500">{errors.amount.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium" htmlFor="category">
            Category
          </Label>
          <Select
            onValueChange={(value) => setValue("category", value)}
            value={category || ""}
          >
            <SelectTrigger className="w-full" id="category">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {filteredCategories.map((category: category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.category && (
            <p className="text-sm text-red-500">{errors.category.message}</p>
          )}
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-medium" htmlFor="date">
          Date
        </Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              id="date"
              className="w-full pl-3 text-left font-normal"
            >
              {date ? format(date as Date, "PPP") : <span>Pick a Date</span>}
              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={date as Date}
              onSelect={(date) => setValue("date", date)}
              disabled={(date) =>
                date > new Date() || date < new Date("1900-01-01")
              }
              initialFocus
            />
          </PopoverContent>
        </Popover>
        {errors.date && (
          <p className="text-sm text-red-500">{errors.date.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-medium" htmlFor="description">
          Description
        </Label>
        <Input
          id="description"
          type="text"
          placeholder="Description"
          {...register("description")}
        />
        {errors.description && (
          <p className="text-sm text-red-500">{errors.description.message}</p>
        )}
      </div>

      <div className="flex items-center justify-between rounded-lg border p-3">
        <div className="space-y-0.5">
          <Label
            className="text-sm font-medium cursor-pointer"
            htmlFor="isRecurring"
          >
            Recurring transaction
          </Label>
          <p className="text-sm text-muted-foreground">
            Set up a recurring transaction for this transaction
          </p>
        </div>
        <Switch
          className="cursor-pointer"
          id="isRecurring"
          checked={isRecurring}
          onCheckedChange={(checked) => setValue("isRecurring", checked)}
        />
      </div>

      {isRecurring && (
        <div className="space-y-2">
          <Label className="text-sm font-medium" htmlFor="recurringInterval">
            Recurring Interval
          </Label>
          <Select
            onValueChange={(value) =>
              setValue(
                "recurringInterval",
                value as "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY",
              )
            }
            defaultValue={getValues("recurringInterval") || ""}
          >
            <SelectTrigger className="w-full" id="recurringInterval">
              <SelectValue placeholder="Select recurring interval" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DAILY">Daily</SelectItem>
              <SelectItem value="WEEKLY">Weekly</SelectItem>
              <SelectItem value="MONTHLY">Monthly</SelectItem>
              <SelectItem value="YEARLY">Yearly</SelectItem>
            </SelectContent>
          </Select>
          {errors.recurringInterval && (
            <p className="text-sm text-red-500">
              {errors.recurringInterval.message}
            </p>
          )}
        </div>
      )}
      <div className="flex gap-4">
        <Button
          type="button"
          variant="outline"
          className="flex-1 cursor-pointer"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
        <Button
          className="flex-1 cursor-pointer"
          type="submit"
          disabled={transactionLoading || isReceiptScanning || isExtracting}
        >
          {transactionLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-white" />
            </>
          ) : (
            "Add Transaction"
          )}
        </Button>
      </div>
    </form>
  );
}

export default AddExpenseForm;
