export type MealType = "lunch" | "dinner";
export type MealStatus = "received" | "not_received";

export interface IMeal {
  _id: string;
  userId: string;
  date: string; // YYYY-MM-DD local date string
  mealType: MealType;
  status: MealStatus;
  price: number;
  createdAt: string;
  updatedAt: string;
}

export interface IPayment {
  _id: string;
  userId: string;
  amount: number;
  date: string; // YYYY-MM-DD
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ISettings {
  _id: string;
  userId: string;
  mealPrice: number;
  lunchReminderEnabled: boolean;
  lunchReminderTime: string; // "HH:MM"
  dinnerReminderEnabled: boolean;
  dinnerReminderTime: string; // "HH:MM"
  createdAt: string;
  updatedAt: string;
}

export interface IUser {
  _id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface BillSummary {
  totalMeals: number;
  lunchCount: number;
  dinnerCount: number;
  totalBill: number;
  totalPaid: number;
  remaining: number;
}

export interface MonthlyBill extends BillSummary {
  year: number;
  month: number; // 1-12
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
