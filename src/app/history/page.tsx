"use client";

import { useEffect, useState, useCallback } from "react";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorMessage from "@/components/ErrorMessage";
import ConfirmDialog from "@/components/ConfirmDialog";
import { IMeal, MealStatus, MealType } from "@/types";
import { formatDateShort, formatCurrency, getTodayDateString } from "@/lib/utils";

type FilterType = "all" | "lunch" | "dinner" | "received" | "not_received";
interface GroupedMeals { date: string; meals: IMeal[]; }

export default function HistoryPage() {
  const [meals, setMeals] = useState<IMeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [filterMonth, setFilterMonth] = useState("");
  const [editingMeal, setEditingMeal] = useState<IMeal | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // ── Add Meal state ──────────────────────────────────────────────────────
  const [showAddModal, setShowAddModal] = useState(false);
  const [addDate, setAddDate] = useState(getTodayDateString());
  const [addMealType, setAddMealType] = useState<MealType>("lunch");
  const [addStatus, setAddStatus] = useState<MealStatus>("received");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");

  const fetchMeals = useCallback(async () => {
    setError("");
    try {
      let url = "/api/meals?";
      if (filterMonth) url += `month=${filterMonth}&`;
      if (filter === "lunch" || filter === "dinner") url += `mealType=${filter}&`;
      if (filter === "received" || filter === "not_received") url += `status=${filter}&`;
      const res = await fetch(url);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to load history.");
      setMeals(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load history.");
    } finally {
      setLoading(false);
    }
  }, [filter, filterMonth]);

  useEffect(() => { setLoading(true); fetchMeals(); }, [fetchMeals]);

  const handleEdit = async (meal: IMeal, newStatus: MealStatus) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/meals/${meal._id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to update.");
      setEditingMeal(null);
      await fetchMeals();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update meal.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/meals/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to delete.");
      setDeletingId(null);
      await fetchMeals();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete meal.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddMeal = async () => {
    setAddError("");
    if (!addDate) { setAddError("Please select a date."); return; }
    setAddLoading(true);
    try {
      const res = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: addDate, mealType: addMealType, status: addStatus }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to add meal.");
      setShowAddModal(false);
      setAddDate(getTodayDateString());
      setAddMealType("lunch");
      setAddStatus("received");
      await fetchMeals();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to add meal.");
    } finally {
      setAddLoading(false);
    }
  };

  // Group by date
  const grouped: GroupedMeals[] = [];
  const dateMap = new Map<string, IMeal[]>();
  for (const meal of meals) {
    const arr = dateMap.get(meal.date) ?? [];
    arr.push(meal);
    dateMap.set(meal.date, arr);
  }
  for (const [date, dateMeals] of Array.from(dateMap.entries())) {
    grouped.push({ date, meals: (dateMeals as IMeal[]).sort((a: IMeal, b: IMeal) => a.mealType.localeCompare(b.mealType)) });
  }
  grouped.sort((a, b) => b.date.localeCompare(a.date));

  const filterOptions: { value: FilterType; label: string }[] = [
    { value: "all", label: "All" }, { value: "lunch", label: "Lunch" },
    { value: "dinner", label: "Dinner" }, { value: "received", label: "Received" },
    { value: "not_received", label: "Not Received" },
  ];

  const now = new Date();
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const monthOptions = [{ value: "", label: "All Months" }];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthOptions.push({
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: `${monthNames[d.getMonth()]} ${d.getFullYear()}`,
    });
  }

  return (
    <div className="px-4 py-6 space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Meal History</h1>
        <button
          onClick={() => { setShowAddModal(true); setAddError(""); setAddDate(getTodayDateString()); }}
          className="flex items-center gap-1.5 px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-semibold transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Meal
        </button>
      </div>

      {error && <ErrorMessage message={error} onRetry={fetchMeals} />}

      {/* Filters */}
      <div className="space-y-2">
        <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}
          className="w-full rounded-xl border border-gray-200 dark:border-gray-600 p-3 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
          {monthOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <div className="flex gap-2 flex-wrap">
          {filterOptions.map((opt) => (
            <button key={opt.value} onClick={() => setFilter(opt.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${filter === opt.value ? "bg-orange-500 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"}`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Meal List */}
      {loading ? <LoadingSpinner /> : grouped.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-gray-500 dark:text-gray-400">No meal records found.</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
            Tap <strong>Add Meal</strong> to record a meal for any date.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(({ date, meals: dateMeals }) => (
            <div key={date} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{formatDateShort(date)}</p>
              </div>
              <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
                {dateMeals.map((meal) => (
                  <div key={meal._id} className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{meal.mealType === "lunch" ? "🍱" : "🌙"}</span>
                      <div>
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 capitalize">{meal.mealType}</p>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${meal.status === "received" ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"}`}>
                            {meal.status === "received" ? "Received" : "Not Received"}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {meal.status === "received" ? formatCurrency(meal.price) : "₹0"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => setEditingMeal(meal)}
                        className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button onClick={() => setDeletingId(meal._id)}
                        className="p-2 rounded-xl bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add Meal Modal ──────────────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setShowAddModal(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Add Meal for a Date</h3>

            <div className="space-y-4">
              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Date
                </label>
                <input
                  type="date"
                  value={addDate}
                  onChange={(e) => setAddDate(e.target.value)}
                  max={getTodayDateString()}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-600 p-3 text-base bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              {/* Meal Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Meal Type
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setAddMealType("lunch")}
                    className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-colors ${addMealType === "lunch" ? "bg-orange-500 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"}`}
                  >
                    🍱 Lunch
                  </button>
                  <button
                    onClick={() => setAddMealType("dinner")}
                    className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-colors ${addMealType === "dinner" ? "bg-indigo-500 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"}`}
                  >
                    🌙 Dinner
                  </button>
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Status
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setAddStatus("received")}
                    className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-colors ${addStatus === "received" ? "bg-green-500 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"}`}
                  >
                    ✅ Received
                  </button>
                  <button
                    onClick={() => setAddStatus("not_received")}
                    className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-colors ${addStatus === "not_received" ? "bg-gray-500 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"}`}
                  >
                    ❌ Not Received
                  </button>
                </div>
              </div>

              {addError && (
                <p className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2">
                  ⚠️ {addError}
                </p>
              )}
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMeal}
                disabled={addLoading}
                className="flex-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm disabled:opacity-60 transition-colors"
              >
                {addLoading ? "Saving..." : "Save Meal"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      {editingMeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setEditingMeal(null)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Edit Meal</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {formatDateShort(editingMeal.date)} — {editingMeal.mealType === "lunch" ? "Lunch 🍱" : "Dinner 🌙"}
            </p>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Change status to:</p>
            <div className="flex gap-3">
              <button onClick={() => handleEdit(editingMeal, "received")} disabled={actionLoading}
                className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-colors ${editingMeal.status === "received" ? "bg-green-500 text-white" : "bg-green-50 dark:bg-green-900/20 border-2 border-green-300 dark:border-green-700 text-green-700 dark:text-green-400"} disabled:opacity-60`}>
                ✅ Received
              </button>
              <button onClick={() => handleEdit(editingMeal, "not_received")} disabled={actionLoading}
                className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-colors ${editingMeal.status === "not_received" ? "bg-gray-400 dark:bg-gray-600 text-white" : "bg-gray-50 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"} disabled:opacity-60`}>
                ❌ Not Received
              </button>
            </div>
            <button onClick={() => setEditingMeal(null)} className="w-full mt-3 py-2 text-gray-500 dark:text-gray-400 text-sm">Cancel</button>
          </div>
        </div>
      )}

      <ConfirmDialog isOpen={!!deletingId} title="Delete Meal Record"
        message="Are you sure you want to delete this meal record? This will update your bill."
        confirmLabel="Delete" onConfirm={() => deletingId && handleDelete(deletingId)}
        onCancel={() => setDeletingId(null)} danger />
    </div>
  );
}
