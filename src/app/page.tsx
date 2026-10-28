"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import MealCard from "@/components/MealCard";
import BillSummary from "@/components/BillSummary";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorMessage from "@/components/ErrorMessage";
import { getTodayDateString, formatDate } from "@/lib/utils";
import { IMeal, MealStatus, BillSummary as BillSummaryType } from "@/types";

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

  const handleMarkMeal = async (mealType: "lunch" | "dinner", status: MealStatus) => {
    const setMarking = mealType === "lunch" ? setMarkingLunch : setMarkingDinner;
    setMarking(true);
    setError("");
    try {
      const res = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: today, mealType, status }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to save.");
      setMeals((prev) => ({ ...prev, [mealType]: data.data }));
      const billRes = await fetch("/api/bill");
      const billData = await billRes.json();
      if (billData.success) setSummary(billData.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save your meal. Please try again.");
    } finally {
      setMarking(false);
    }
  };

  if (status === "loading" || loading) return <LoadingSpinner message="Loading your tiffin tracker..." />;
  if (status === "unauthenticated") return null;

  return (
    <div className="px-4 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">🍱 Tiffin Tracker</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{formatDate(today)}</p>
        </div>
        {session?.user?.name && (
          <div className="text-right">
            <p className="text-xs text-gray-400 dark:text-gray-500">Hello,</p>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{session.user.name}</p>
          </div>
        )}
      </div>

      {error && <ErrorMessage message={error} onRetry={fetchData} />}

      {summary && (
        <section>
          <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Current Bill</h2>
          <BillSummary summary={summary} />
        </section>
      )}

      <section>
        <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Today&apos;s Meals</h2>
        <div className="space-y-3">
          <MealCard mealType="lunch" status={meals.lunch?.status} price={mealPrice} onMark={(s) => handleMarkMeal("lunch", s)} loading={markingLunch} />
          <MealCard mealType="dinner" status={meals.dinner?.status} price={mealPrice} onMark={(s) => handleMarkMeal("dinner", s)} loading={markingDinner} />
        </div>
      </section>

      {!meals.lunch && !meals.dinner && !error && (
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-2xl p-4 border border-orange-100 dark:border-orange-800/40">
          <p className="text-orange-700 dark:text-orange-300 text-sm font-medium">
            👆 Tap &quot;Received&quot; or &quot;Not Received&quot; to record today&apos;s meals.
          </p>
        </div>
      )}
    </div>
  );
}
