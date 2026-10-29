"use client";

import { useEffect, useState, useCallback } from "react";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorMessage from "@/components/ErrorMessage";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { IMeal, MealStatus } from "@/types";
import { formatDateShort, formatCurrency, getTodayDateString } from "@/lib/utils";
import { Plus } from "lucide-react";

type FilterType = "all" | "lunch" | "dinner" | "received" | "not_received";
interface GroupedMeals { date: string; meals: IMeal[]; }

interface MealSlot {
  included: boolean;
  status: MealStatus;
}

const defaultSlot = (): MealSlot => ({ included: true, status: "received" });

export default function HistoryPage() {
  const [meals, setMeals] = useState<IMeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [filterMonth, setFilterMonth] = useState("");
  const [editingMeal, setEditingMeal] = useState<IMeal | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // ── Add Meal Dialog ─────────────────────────────────────────────────────
  const [showAdd, setShowAdd] = useState(false);
  const [addDate, setAddDate] = useState(getTodayDateString());
  const [lunch, setLunch] = useState<MealSlot>(defaultSlot());
  const [dinner, setDinner] = useState<MealSlot>(defaultSlot());
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");

  const openAddModal = () => {
    setAddDate(getTodayDateString());
    setLunch(defaultSlot());
    setDinner(defaultSlot());
    setAddError("");
    setShowAdd(true);
  };

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

  const handleAddMeals = async () => {
    setAddError("");
    if (!addDate) { setAddError("Please select a date."); return; }
    if (!lunch.included && !dinner.included) { setAddError("Please include at least one meal."); return; }

    setAddLoading(true);
    try {
      const tasks: Promise<Response>[] = [];
      const post = (mealType: string, status: MealStatus) =>
        fetch("/api/meals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date: addDate, mealType, status }),
        });

      if (lunch.included) tasks.push(post("lunch", lunch.status));
      if (dinner.included) tasks.push(post("dinner", dinner.status));

      const results = await Promise.all(tasks);
      const bodies = await Promise.all(results.map((r) => r.json()));
      const failed = bodies.find((b) => !b.success);
      if (failed) throw new Error(failed.error || "Failed to save.");

      setShowAdd(false);
      await fetchMeals();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to save meals.");
    } finally {
      setAddLoading(false);
    }
  };

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

  // Grouping
  const grouped: GroupedMeals[] = [];
  const dateMap = new Map<string, IMeal[]>();
  for (const meal of meals) {
    const arr = dateMap.get(meal.date) ?? [];
    arr.push(meal);
    dateMap.set(meal.date, arr);
  }
  for (const [date, dateMeals] of Array.from(dateMap.entries())) {
    grouped.push({ date, meals: (dateMeals as IMeal[]).sort((a, b) => a.mealType.localeCompare(b.mealType)) });
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

  // Reusable meal slot row for the dialog
  const MealSlotRow = ({
    icon, label, color, slot, onChange,
  }: {
    icon: string; label: string; color: string;
    slot: MealSlot; onChange: (s: MealSlot) => void;
  }) => (
    <div className={`rounded-2xl border p-4 space-y-3 transition-opacity ${!slot.included ? "opacity-50" : ""}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <span className={`font-semibold text-sm ${color}`}>{label}</span>
        </div>
        {/* Include toggle */}
        <button
          type="button"
          onClick={() => onChange({ ...slot, included: !slot.included })}
          className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
            slot.included
              ? "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {slot.included ? "Include ✓" : "Skip"}
        </button>
      </div>
      {slot.included && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onChange({ ...slot, status: "received" })}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              slot.status === "received"
                ? "bg-green-500 text-white"
                : "bg-muted text-muted-foreground hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-700"
            }`}
          >
            ✅ Received
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...slot, status: "not_received" })}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              slot.status === "not_received"
                ? "bg-gray-500 dark:bg-gray-600 text-white"
                : "bg-muted text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            ❌ Not Received
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="px-4 py-6 space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Meal History</h1>
        <Button size="sm" onClick={openAddModal} className="gap-1.5">
          <Plus className="w-4 h-4" />
          Add Meal
        </Button>
      </div>

      {error && <ErrorMessage message={error} onRetry={fetchMeals} />}

      {/* Filters */}
      <div className="space-y-2">
        <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}
          className="w-full rounded-xl border border-border p-3 text-sm bg-card text-foreground">
          {monthOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <div className="flex gap-2 flex-wrap">
          {filterOptions.map((opt) => (
            <button key={opt.value} onClick={() => setFilter(opt.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                filter === opt.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              }`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Meal List */}
      {loading ? <LoadingSpinner /> : grouped.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-muted-foreground">No meal records found.</p>
          <p className="text-muted-foreground/60 text-sm mt-1">
            Tap <strong>Add Meal</strong> to record meals for any date.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(({ date, meals: dateMeals }) => (
            <div key={date} className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="px-4 py-2 bg-muted/50 border-b border-border">
                <p className="text-sm font-semibold text-foreground">{formatDateShort(date)}</p>
              </div>
              <div className="divide-y divide-border/50">
                {dateMeals.map((meal) => (
                  <div key={meal._id} className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{meal.mealType === "lunch" ? "🍱" : "🌙"}</span>
                      <div>
                        <p className="text-sm font-semibold text-foreground capitalize">{meal.mealType}</p>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            meal.status === "received"
                              ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300"
                              : "bg-muted text-muted-foreground"
                          }`}>
                            {meal.status === "received" ? "Received" : "Not Received"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {meal.status === "received" ? formatCurrency(meal.price) : "₹0"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => setEditingMeal(meal)}
                        className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button onClick={() => setDeletingId(meal._id)}
                        className="p-2 rounded-xl bg-red-50 dark:bg-red-900/30 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors">
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

      {/* ── Add Meal Dialog ─────────────────────────────────────────────── */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Meals for a Date</DialogTitle>
            <DialogDescription>Select a date and set status for lunch and/or dinner.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Date picker */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Date</label>
              <input
                type="date"
                value={addDate}
                onChange={(e) => setAddDate(e.target.value)}
                max={getTodayDateString()}
                className="w-full rounded-xl border border-border p-3 text-base bg-muted text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Lunch slot */}
            <MealSlotRow
              icon="🍱" label="Lunch"
              color="text-orange-600 dark:text-orange-400"
              slot={lunch} onChange={setLunch}
            />

            {/* Dinner slot */}
            <MealSlotRow
              icon="🌙" label="Dinner"
              color="text-indigo-600 dark:text-indigo-400"
              slot={dinner} onChange={setDinner}
            />

            {addError && (
              <p className="text-destructive text-sm bg-destructive/10 rounded-xl px-3 py-2">
                ⚠️ {addError}
              </p>
            )}
          </div>

          <div className="flex gap-3 mt-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowAdd(false)}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleAddMeals} disabled={addLoading}>
              {addLoading ? "Saving..." : "Save Meals"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      {editingMeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setEditingMeal(null)} />
          <div className="relative bg-card text-card-foreground rounded-2xl shadow-xl w-full max-w-sm p-6 border border-border">
            <h3 className="text-lg font-bold text-foreground mb-1">Edit Meal</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {formatDateShort(editingMeal.date)} — {editingMeal.mealType === "lunch" ? "Lunch 🍱" : "Dinner 🌙"}
            </p>
            <div className="flex gap-3">
              <button onClick={() => handleEdit(editingMeal, "received")} disabled={actionLoading}
                className={`flex-1 py-3 rounded-xl font-semibold text-sm ${editingMeal.status === "received" ? "bg-green-500 text-white" : "bg-muted text-muted-foreground border-2 border-green-300 dark:border-green-700"} disabled:opacity-60`}>
                ✅ Received
              </button>
              <button onClick={() => handleEdit(editingMeal, "not_received")} disabled={actionLoading}
                className={`flex-1 py-3 rounded-xl font-semibold text-sm ${editingMeal.status === "not_received" ? "bg-gray-500 text-white" : "bg-muted text-muted-foreground border-2 border-gray-300 dark:border-gray-600"} disabled:opacity-60`}>
                ❌ Not Received
              </button>
            </div>
            <button onClick={() => setEditingMeal(null)} className="w-full mt-3 py-2 text-muted-foreground text-sm">Cancel</button>
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
