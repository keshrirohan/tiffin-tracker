import { formatCurrency } from "@/lib/utils";
import { BillSummary as BillSummaryType } from "@/types";

interface BillSummaryProps {
  summary: BillSummaryType;
  compact?: boolean;
}

export default function BillSummary({ summary, compact = false }: BillSummaryProps) {
  const isPaid = summary.remaining <= 0 && summary.totalBill > 0;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-blue-50 dark:bg-blue-900/30 rounded-2xl p-4 text-center">
          <p className="text-xs text-blue-600 dark:text-blue-400 font-medium uppercase tracking-wide mb-1">Total Bill</p>
          <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{formatCurrency(summary.totalBill)}</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/30 rounded-2xl p-4 text-center">
          <p className="text-xs text-green-600 dark:text-green-400 font-medium uppercase tracking-wide mb-1">Paid</p>
          <p className="text-2xl font-bold text-green-700 dark:text-green-300">{formatCurrency(summary.totalPaid)}</p>
        </div>
        <div className={`rounded-2xl p-4 text-center ${isPaid ? "bg-green-100 dark:bg-green-900/40" : "bg-red-50 dark:bg-red-900/30"}`}>
          <p className={`text-xs font-medium uppercase tracking-wide mb-1 ${isPaid ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
            {isPaid ? "Status" : "Due"}
          </p>
          {isPaid ? (
            <p className="text-xl font-bold text-green-700 dark:text-green-300">✅ PAID</p>
          ) : (
            <p className="text-2xl font-bold text-red-700 dark:text-red-300">{formatCurrency(summary.remaining)}</p>
          )}
        </div>
      </div>
      {!compact && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Meals", value: summary.totalMeals, color: "text-gray-800 dark:text-gray-100" },
            { label: "Lunches", value: summary.lunchCount, color: "text-orange-600 dark:text-orange-400" },
            { label: "Dinners", value: summary.dinnerCount, color: "text-indigo-600 dark:text-indigo-400" },
          ].map((s) => (
            <div key={s.label} className="bg-white dark:bg-gray-800 rounded-2xl p-3 text-center border border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{s.label}</p>
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
