import { z } from "zod";
import { ca } from "zod/v4/locales";

export const expenseSchema = z
  .object({
    type: z.enum(["EXPENSE", "INCOME"]),
    amount: z.string().min(1, "Amount is required"),
    description: z.string().optional(),
    date: z.coerce.date({ message: "Date is required" }),
    category: z
      .string()
      .min(1, "Category is required"),
    isRecurring: z.boolean().default(false),
    recurringInterval: z
      .enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"])
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.isRecurring && !data.recurringInterval) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Recurring interval is required when the transaction is recurring",
        path: ["recurringInterval"],
      });
    }
  });

export type ExpenseFormData = z.output<typeof expenseSchema>;
