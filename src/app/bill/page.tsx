"use client";

import { useEffect, useState, useCallback } from "react";
import MonthSelector from "@/components/MonthSelector";
import BillSummary from "@/components/BillSummary";
import ExportButton from "@/components/ExportButton";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorMessage from "@/components/ErrorMessage";
import { getCurrentYearMonth } from "@/lib/utils";
import { BillSummary as BillSummaryType } from "@/types";

export default function BillPage() {
  const { year: cy, month: cm } = getCurrentYearMonth();
  const [year, setYear] = useState(cy);
  const [month, setMonth] = useState(cm);
  const [summary, setSummary] = useState<BillSummaryType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchBill = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const m = `${year}-${String(month).padStart(2, "0")}`;
      const res = await fetch(`/api/bill?month=${m}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to load bill.");
      setSummary(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load bill.");
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { fetchBill(); }, [fetchBill]);

  return (
    <div className="px-4 py-6 space-y-4">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Monthly Bill</h1>
      <MonthSelector year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m); }} />
      {error && <ErrorMessage message={error} onRetry={fetchBill} />}
      {loading ? <LoadingSpinner /> : summary ? (
        <>
          <BillSummary summary={summary} />
          {summary.totalMeals === 0 && (
            <div className="text-center py-8">
              <p className="text-4xl mb-2">📋</p>
              <p className="text-gray-500 dark:text-gray-400">No meal records for this month.</p>
            </div>
          )}
          <ExportButton defaultYear={year} defaultMonth={month} />
        </>
      ) : null}
    </div>
  );
}
