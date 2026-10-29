import { format, parseISO, startOfMonth, endOfMonth } from "date-fns";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** shadcn/ui class helper */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}


/**
 * Returns today's date as YYYY-MM-DD string in local timezone.
 */
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Formats a YYYY-MM-DD date string to a readable format.
 */
export function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "EEEE, d MMMM yyyy");
  } catch {
    return dateStr;
  }
}

/**
 * Formats a YYYY-MM-DD date string to a short readable format.
 */
export function formatDateShort(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "d MMM yyyy");
  } catch {
    return dateStr;
  }
}

/**
 * Returns month name + year from year/month numbers.
 */
export function formatMonthYear(year: number, month: number): string {
  // month is 1-indexed
  const date = new Date(year, month - 1, 1);
  return format(date, "MMMM yyyy");
}

/**
 * Returns start and end date strings (YYYY-MM-DD) for a given month.
 */
export function getMonthRange(
  year: number,
  month: number
): { start: string; end: string } {
  const date = new Date(year, month - 1, 1);
  const start = format(startOfMonth(date), "yyyy-MM-dd");
  const end = format(endOfMonth(date), "yyyy-MM-dd");
  return { start, end };
}

/**
 * Formats currency in Indian Rupees.
 */
export function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

/**
 * Returns a user-friendly error message.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // Don't expose internal error details to users
    if (
      error.message.includes("ECONNREFUSED") ||
      error.message.includes("MongoServerSelection") ||
      error.message.includes("connect")
    ) {
      return "Unable to connect to the database. Please check your internet connection and try again.";
    }
    if (error.message.includes("duplicate key") || error.message.includes("E11000")) {
      return "A record for this meal already exists.";
    }
    if (error.message.includes("validation")) {
      return "Invalid data provided. Please check your inputs.";
    }
  }
  return "Something went wrong. Please try again.";
}

/**
 * Returns current year and month (1-indexed).
 */
export function getCurrentYearMonth(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}
