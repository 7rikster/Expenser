import {
  Wallet,
  Laptop,
  TrendingUp,
  Building,
  Home,
  Plus,
  Car,
  ShoppingCart,
  Zap,
  Film,
  UtensilsCrossed,
  ShoppingBag,
  HeartPulse,
  GraduationCap,
  Smile,
  Plane,
  Shield,
  Gift,
  Receipt,
  MoreHorizontal,
  type LucideIcon,
} from "lucide-react";

// ─── Icon mapping ────────────────────────────────────────────
export const categoryIconMap: Record<string, LucideIcon> = {
  Wallet,
  Laptop,
  TrendingUp,
  Building,
  Home,
  Plus,
  Car,
  Shopping: ShoppingCart,
  Zap,
  Film,
  UtensilsCrossed,
  ShoppingBag,
  HeartPulse,
  GraduationCap,
  Smile,
  Plane,
  Shield,
  Gift,
  Receipt,
  MoreHorizontal,
};

// ─── Month options (last 12 months, newest first) ────────────
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function generateMonthOptions() {
  const now = new Date();
  const options: { value: string; label: string }[] = [];

  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    options.push({
      value: `${year}-${month}`,
      label: `${MONTH_NAMES[d.getMonth()]} ${year}`,
    });
  }

  return options;
}

/** Current month in YYYY-MM format */
export function getCurrentMonth() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

// ─── Type filter options ─────────────────────────────────────
export const TYPE_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "EXPENSE", label: "Expense" },
  { value: "INCOME", label: "Income" },
] as const;

// ─── Sort options ────────────────────────────────────────────
export const SORT_OPTIONS = [
  { value: "latest", label: "Latest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "highest", label: "Highest Amount" },
  { value: "lowest", label: "Lowest Amount" },
] as const;

// ─── Default pagination ─────────────────────────────────────
export const DEFAULT_PAGE_SIZE = 10;

// ─── Filter defaults ────────────────────────────────────────
export interface TransactionFilters {
  search: string;
  month: string;
  category: string;
  type: string;
  sort: string;
  page: number;
  limit: number;
}

export const DEFAULT_FILTERS: TransactionFilters = {
  search: "",
  month: getCurrentMonth(),
  category: "all",
  type: "all",
  sort: "latest",
  page: 1,
  limit: DEFAULT_PAGE_SIZE,
};
