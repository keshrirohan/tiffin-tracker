"use client";

import { formatMonthYear } from "@/lib/utils";

interface MonthSelectorProps { year: number; month: number; onChange: (year: number, month: number) => void; }

export default function MonthSelector({ year, month, onChange }: MonthSelectorProps) {
  const now = new Date();
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

  const goToPrev = () => { if (month === 1) { onChange(year - 1, 12); } else { onChange(year, month - 1); } };
  const goToNext = () => {
    if (isCurrentMonth) return;
    if (month === 12) { onChange(year + 1, 1); } else { onChange(year, month + 1); }
  };

  return (
    <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-3">
      <button onClick={goToPrev} className="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" aria-label="Previous month">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <h2 className="text-base font-bold text-gray-800 dark:text-white">{formatMonthYear(year, month)}</h2>
      <button onClick={goToNext} disabled={isCurrentMonth}
        className="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed" aria-label="Next month">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}
