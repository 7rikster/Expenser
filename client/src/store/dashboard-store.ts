import { create } from "zustand";

interface DashboardFilters {
  selectedMonth: string; // format: "YYYY-MM"
  selectedCategory: string; // "" = all
  transactionPage: number;
}

interface DashboardUIState extends DashboardFilters {
  setSelectedMonth: (month: string) => void;
  setSelectedCategory: (category: string) => void;
  setTransactionPage: (page: number) => void;
  resetFilters: () => void;
}

const now = new Date();
const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

const initialFilters: DashboardFilters = {
  selectedMonth: currentMonth,
  selectedCategory: "",
  transactionPage: 1,
};

export const useDashboardStore = create<DashboardUIState>((set) => ({
  ...initialFilters,
  setSelectedMonth: (month) => set({ selectedMonth: month, transactionPage: 1 }),
  setSelectedCategory: (category) => set({ selectedCategory: category, transactionPage: 1 }),
  setTransactionPage: (page) => set({ transactionPage: page }),
  resetFilters: () => set(initialFilters),
}));
