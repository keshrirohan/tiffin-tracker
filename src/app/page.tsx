"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import MealCard from "@/components/MealCard";
import BillSummary from "@/components/BillSummary";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorMessage from "@/components/ErrorMessage";
import { getTodayDateString, formatDate } from "@/lib/utils";
import { IMeal, MealStatus, BillSummary as BillSummaryType } from "@/types";

type SaveState = "idle" | "saving" | "saved" | "error";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const today = getTodayDateString();

  const [meals, setMeals] = useState<{ lunch?: IMeal; dinner?: IMeal }>({});
  const [summary, setSummary] = useState<BillSummaryType | null>(null);
  const [mealPrice, setMealPrice] = useState(60);
  const [loading, setLoading] = useState(true);
  const [markingLunch, setMarkingLunch] = useState(false);
  const [markingDinner, setMarkingDinner] = useState(false);
  const [error, setError] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  const fetchData = useCallback(async () => {
    if (!session) return;
    setError("");
    try {
      const [mealsRes, billRes, settingsRes] = await Promise.all([
        fetch(`/api/meals?date=${today}`),
        fetch("/api/bill"),
        fetch("/api/settings"),
      ]);
      const [mealsData, billData, settingsData] = await Promise.all([
        mealsRes.json(), billRes.json(), settingsRes.json(),
      ]);
      if (mealsData.success) {
        const map: { lunch?: IMeal; dinner?: IMeal } = {};
        for (const m of mealsData.data) {
          if (m.mealType === "lunch") map.lunch = m;
          else map.dinner = m;
        }
        setMeals(map);
      }
      if (billData.success) setSummary(billData.data);
      if (settingsData.success) setMealPrice(settingsData.data.mealPrice);
    } catch {
      setError("Unable to load data. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }, [today, session]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Show "Saved ✓" for 2 seconds then reset to idle
  const showSaved = () => {
    setSaveState("saved");
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setSaveState("idle"), 2000);
  };

  const handleMarkMeal = async (mealType: "lunch" | "dinner", status: MealStatus) => {
    const setMarking = mealType === "lunch" ? setMarkingLunch : setMarkingDinner;
    setMarking(true);
    setSaveState("saving");
    setError("");

    try {
      const res = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: today, mealType, status }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to save.");

      // Auto-save: update local state immediately
      setMeals((prev) => ({ ...prev, [mealType]: data.data }));

      // Refresh bill in background
      fetch("/api/bill")
        .then((r) => r.json())
        .then((bd) => { if (bd.success) setSummary(bd.data); });

      showSaved();
    } catch (err) {
      setSaveState("error");
      setError(err instanceof Error ? err.message : "Unable to save. Please try again.");
      setTimeout(() => setSaveState("idle"), 3000);
    } finally {
      setMarking(false);
    }
  };

  if (status === "loading" || loading) return <LoadingSpinner message="Loading your tiffin tracker..." />;
  if (status === "unauthenticated") return null;

  const isSaving = saveState === "saving";

  return (
    <div className="px-4 py-6 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">🍱 Tiffin Tracker</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{formatDate(today)}</p>
        </div>

        <div className="flex flex-col items-end gap-1">
          {session?.user?.name && (
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{session.user.name}</p>
          )}

          {/* Auto-save status indicator */}
          {saveState === "saving" && (
            <span className="flex items-center gap-1.5 text-xs text-orange-500 font-medium">
              <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Saving…
            </span>
          )}
          {saveState === "saved" && (
            <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium animate-pulse">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Saved
            </span>
          )}
          {saveState === "error" && (
            <span className="text-xs text-red-500 font-medium">⚠ Save failed</span>
          )}
        </div>
      </div>

      {error && <ErrorMessage message={error} onRetry={fetchData} />}

      {/* Bill Summary */}
      {summary && (
        <section>
          <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            Current Bill
          </h2>
          <BillSummary summary={summary} />
        </section>
      )}

      {/* Today's Meals — auto-save on tap */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Today&apos;s Meals
          </h2>
          {isSaving && (
            <span className="text-xs text-orange-500 dark:text-orange-400 font-medium">
              Auto-saving…
            </span>
          )}
        </div>
        <div className="space-y-3">
          <MealCard
            mealType="lunch"
            status={meals.lunch?.status}
            price={mealPrice}
            onMark={(s) => handleMarkMeal("lunch", s)}
            loading={markingLunch}
          />
          <MealCard
            mealType="dinner"
            status={meals.dinner?.status}
            price={mealPrice}
            onMark={(s) => handleMarkMeal("dinner", s)}
            loading={markingDinner}
          />
        </div>
      </section>

      {/* First-time hint */}
      {!meals.lunch && !meals.dinner && !error && (
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-2xl p-4 border border-orange-100 dark:border-orange-800/40">
          <p className="text-orange-700 dark:text-orange-300 text-sm font-medium">
            👆 Tap &quot;Received&quot; or &quot;Not Received&quot; — it saves automatically.
          </p>
        </div>
      )}
    </div>
  );
}
