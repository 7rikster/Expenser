// TypeScript interfaces for API response shapes

export interface CategoryBreakdown {
  category: string;
  amount: number;
  percentage: number;
}

export interface ExpenseSummary {
  total: number;
  categories: CategoryBreakdown[];
}

export interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  dailyBudget: number | null;
  monthlyBudget: number | null;
}

export interface DashboardData {
  user: UserProfile;
  todayExpense: ExpenseSummary;
  thisMonthExpense: ExpenseSummary;
  lastMonthExpense: ExpenseSummary;
  transactionCount: number;
}

export interface MonthlyTrendPoint {
  month: string;
  total: number;
}

export interface WeeklyPatternPoint {
  day: string;
  total: number;
}

export interface Transaction {
  id: string;
  type: "INCOME" | "EXPENSE";
  amount: number;
  description: string | null;
  date: string;
  category: string;
  isRecurring: boolean;
  recurringInterval: string | null;
  status: "COMPLETED" | "PENDING" | "FAILED";
  createdAt: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface TransactionListResponse {
  transactions: Transaction[];
  pagination: PaginationInfo;
}

export interface ApiResponse<T> {
  status: "success" | "error";
  data: T;
  msg?: string;
}
