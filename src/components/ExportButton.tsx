"use client";

import { useState } from "react";
import { getMonthRange } from "@/lib/utils";

interface ExportButtonProps {
  defaultYear?: number;
  defaultMonth?: number;
}

export default function ExportButton({ defaultYear, defaultMonth }: ExportButtonProps) {
  const now = new Date();
  const [year, setYear] = useState(defaultYear ?? now.getFullYear());
  const [month, setMonth] = useState(defaultMonth ?? now.getMonth() + 1);
  const [exportType, setExportType] = useState<"month" | "custom">("month");
  const [format, setFormat] = useState<"pdf" | "csv">("pdf");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const handleExport = async () => {
    setError("");
    setLoading(true);
    try {
      let start: string, end: string;
      if (exportType === "month") {
        const range = getMonthRange(year, month);
        start = range.start; end = range.end;
      } else {
        if (!startDate || !endDate) { setError("Please select both dates."); setLoading(false); return; }
        if (startDate > endDate) { setError("Start date must be before end date."); setLoading(false); return; }
        start = startDate; end = endDate;
      }

      const res = await fetch(`/api/export?startDate=${start}&endDate=${end}&format=${format}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Export failed.");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const disposition = res.headers.get("content-disposition");
      const match = disposition?.match(/filename="(.+)"/);
      a.download = match ? match[1] : `tiffin-bill.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setLoading(false);
    }
  };

  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-semibold text-sm transition-colors w-full justify-center"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Export Bill
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setIsOpen(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Export Bill</h3>

            {/* Format selector */}
            <div className="mb-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">Format</p>
              <div className="flex gap-2">
                {(["pdf", "csv"] as const).map((f) => (
                  <button key={f} onClick={() => setFormat(f)}
                    className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${format === f ? "bg-orange-500 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"}`}>
                    {f === "pdf" ? "📄 PDF" : "📊 CSV"}
                  </button>
                ))}
              </div>
            </div>

            {/* Range selector */}
            <div className="mb-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">Period</p>
              <div className="flex gap-2 mb-3">
                {(["month", "custom"] as const).map((t) => (
                  <button key={t} onClick={() => setExportType(t)}
                    className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${exportType === t ? "bg-orange-500 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"}`}>
                    {t === "month" ? "By Month" : "Custom"}
                  </button>
                ))}
              </div>

              {exportType === "month" ? (
                <div className="flex gap-2">
                  <select value={month} onChange={(e) => setMonth(Number(e.target.value))}
                    className="flex-1 rounded-xl border border-gray-200 dark:border-gray-600 p-2 text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white">
                    {months.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                  </select>
                  <select value={year} onChange={(e) => setYear(Number(e.target.value))}
                    className="w-24 rounded-xl border border-gray-200 dark:border-gray-600 p-2 text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white">
                    {years.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              ) : (
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Start Date</label>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                      max={new Date().toISOString().split("T")[0]}
                      className="w-full rounded-xl border border-gray-200 dark:border-gray-600 p-2 text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">End Date</label>
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                      max={new Date().toISOString().split("T")[0]}
                      className="w-full rounded-xl border border-gray-200 dark:border-gray-600 p-2 text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white" />
                  </div>
                </div>
              )}
            </div>

            {error && <p className="text-red-600 dark:text-red-400 text-sm mb-3">⚠️ {error}</p>}

            <div className="flex gap-3">
              <button onClick={() => setIsOpen(false)}
                className="flex-1 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold text-sm">
                Cancel
              </button>
              <button onClick={handleExport} disabled={loading}
                className="flex-1 py-3 rounded-xl bg-orange-500 text-white font-semibold text-sm disabled:opacity-60">
                {loading ? "Exporting..." : `Export ${format.toUpperCase()}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
