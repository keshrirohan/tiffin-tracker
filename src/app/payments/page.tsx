"use client";

import { useEffect, useState, useCallback } from "react";
import PaymentCard from "@/components/PaymentCard";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorMessage from "@/components/ErrorMessage";
import ConfirmDialog from "@/components/ConfirmDialog";
import { IPayment, BillSummary } from "@/types";
import { formatCurrency, getTodayDateString } from "@/lib/utils";

interface PaymentForm { amount: string; date: string; note: string; }
const emptyForm = (): PaymentForm => ({ amount: "", date: getTodayDateString(), note: "" });

export default function PaymentsPage() {
  const [payments, setPayments] = useState<IPayment[]>([]);
  const [summary, setSummary] = useState<BillSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<IPayment | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState<PaymentForm>(emptyForm());
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setError("");
    try {
      const [pr, br] = await Promise.all([fetch("/api/payments"), fetch("/api/bill")]);
      const [pd, bd] = await Promise.all([pr.json(), br.json()]);
      if (pd.success) setPayments(pd.data);
      if (bd.success) setSummary(bd.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load payments.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openAddForm = () => { setEditingPayment(null); setForm(emptyForm()); setFormError(""); setIsFormOpen(true); };
  const openEditForm = (p: IPayment) => { setEditingPayment(p); setForm({ amount: String(p.amount), date: p.date, note: p.note ?? "" }); setFormError(""); setIsFormOpen(true); };

  const handleSubmit = async () => {
    setFormError("");
    const amount = Number(form.amount);
    if (!form.amount || isNaN(amount) || amount <= 0) { setFormError("Please enter a valid amount."); return; }
    if (!form.date) { setFormError("Please select a date."); return; }
    setFormLoading(true);
    try {
      const url = editingPayment ? `/api/payments/${editingPayment._id}` : "/api/payments";
      const method = editingPayment ? "PUT" : "POST";
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, date: form.date, note: form.note.trim() || undefined }),
      });
      const data = await res.json();
      if (!data.success) { setFormError(data.error || "Failed to save payment."); return; }
      setIsFormOpen(false); setEditingPayment(null); setForm(emptyForm());
      await fetchData();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save payment.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/payments/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to delete.");
      setDeletingId(null);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete payment.");
    }
  };

  const isPaid = summary && summary.remaining <= 0 && summary.totalBill > 0;

  return (
    <div className="px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payments</h1>
        <button onClick={openAddForm}
          className="flex items-center gap-1 px-3 py-2 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add
        </button>
      </div>

      {error && <ErrorMessage message={error} onRetry={fetchData} />}

      {summary && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-blue-50 dark:bg-blue-900/30 rounded-2xl p-3 text-center">
            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">Total Bill</p>
            <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{formatCurrency(summary.totalBill)}</p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/30 rounded-2xl p-3 text-center">
            <p className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">Paid</p>
            <p className="text-lg font-bold text-green-700 dark:text-green-300">{formatCurrency(summary.totalPaid)}</p>
          </div>
          <div className={`rounded-2xl p-3 text-center ${isPaid ? "bg-green-100 dark:bg-green-900/40" : "bg-red-50 dark:bg-red-900/30"}`}>
            <p className={`text-xs font-medium mb-1 ${isPaid ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
              {isPaid ? "Status" : "Due"}
            </p>
            {isPaid ? (
              <p className="text-base font-bold text-green-700 dark:text-green-300">✅ PAID</p>
            ) : (
              <p className="text-lg font-bold text-red-700 dark:text-red-300">{formatCurrency(summary.remaining)}</p>
            )}
          </div>
        </div>
      )}

      {loading ? <LoadingSpinner /> : payments.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">💳</p>
          <p className="text-gray-500 dark:text-gray-400">No payments recorded yet.</p>
          <button onClick={openAddForm} className="mt-3 text-orange-500 text-sm font-semibold">Add your first payment</button>
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Payment History</h2>
          {payments.map((p) => (
            <PaymentCard key={p._id} payment={p} onEdit={openEditForm} onDelete={(id) => setDeletingId(id)} />
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setIsFormOpen(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              {editingPayment ? "Edit Payment" : "Add Payment"}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount (₹) *</label>
                <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="Enter amount" min="1"
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-600 p-3 text-base bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date *</label>
                <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                  max={getTodayDateString()}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-600 p-3 text-base bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Note (optional)</label>
                <input type="text" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })}
                  placeholder="e.g. UPI, Cash" maxLength={200}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-600 p-3 text-base bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>
              {summary && !editingPayment && summary.remaining > 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400">Remaining balance: {formatCurrency(summary.remaining)}</p>
              )}
              {formError && <p className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2">⚠️ {formError}</p>}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setIsFormOpen(false)}
                className="flex-1 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold text-sm">
                Cancel
              </button>
              <button onClick={handleSubmit} disabled={formLoading}
                className="flex-1 py-3 rounded-xl bg-orange-500 text-white font-semibold text-sm disabled:opacity-60">
                {formLoading ? "Saving..." : editingPayment ? "Update" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog isOpen={!!deletingId} title="Delete Payment"
        message="Are you sure you want to delete this payment? This will update your remaining balance."
        confirmLabel="Delete" onConfirm={() => deletingId && handleDelete(deletingId)}
        onCancel={() => setDeletingId(null)} danger />
    </div>
  );
}
