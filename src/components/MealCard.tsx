"use client";

import { MealType, MealStatus } from "@/types";
import { formatCurrency } from "@/lib/utils";

interface MealCardProps { mealType: MealType; status?: MealStatus; price: number; onMark: (status: MealStatus) => void; loading?: boolean; }

export default function MealCard({ mealType, status, price, onMark, loading = false }: MealCardProps) {
  const isLunch = mealType === "lunch";
  return (
    <div className={`rounded-2xl border p-4 ${isLunch ? "bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-800/40" : "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800/40"}`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className={`text-lg font-bold ${isLunch ? "text-orange-700 dark:text-orange-300" : "text-indigo-700 dark:text-indigo-300"}`}>
            {isLunch ? "Lunch 🍱" : "Dinner 🌙"}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Price: {formatCurrency(price)}</p>
        </div>
        {status && (
          <div className={`px-3 py-1 rounded-full text-sm font-semibold ${status === "received" ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"}`}>
            {status === "received" ? "✅ Received" : "❌ Not Received"}
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <button onClick={() => onMark("received")} disabled={loading}
          className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all ${status === "received" ? "bg-green-500 text-white shadow-sm" : "bg-white dark:bg-gray-800 border-2 border-green-300 dark:border-green-700 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20"} disabled:opacity-60`}>
          {loading && status !== "received" ? "..." : "Received"}
        </button>
        <button onClick={() => onMark("not_received")} disabled={loading}
          className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all ${status === "not_received" ? "bg-gray-400 dark:bg-gray-600 text-white shadow-sm" : "bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"} disabled:opacity-60`}>
          {loading && status !== "not_received" ? "..." : "Not Received"}
        </button>
      </div>
    </div>
  );
}
