"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorMessage from "@/components/ErrorMessage";
import ConfirmDialog from "@/components/ConfirmDialog";
import ExportButton from "@/components/ExportButton";
import { useTheme } from "@/components/ThemeProvider";
import { ISettings } from "@/types";

type NotifPermission = "default" | "granted" | "denied" | "unsupported";

export default function SettingsPage() {
  const { data: session } = useSession();
  const { theme, toggleTheme } = useTheme();
  const [settings, setSettings] = useState<ISettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [notifPermission, setNotifPermission] = useState<NotifPermission>("default");
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearLoading, setClearLoading] = useState(false);

  const [mealPrice, setMealPrice] = useState("60");
  const [lunchEnabled, setLunchEnabled] = useState(false);
  const [lunchTime, setLunchTime] = useState("14:00");
  const [dinnerEnabled, setDinnerEnabled] = useState(false);
  const [dinnerTime, setDinnerTime] = useState("21:00");

  const fetchSettings = useCallback(async () => {
    setError("");
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to load settings.");
      const s: ISettings = data.data;
      setSettings(s);
      setMealPrice(String(s.mealPrice));
      setLunchEnabled(s.lunchReminderEnabled);
      setLunchTime(s.lunchReminderTime);
      setDinnerEnabled(s.dinnerReminderEnabled);
      setDinnerTime(s.dinnerReminderTime);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
    if (typeof window !== "undefined") {
      if (!("Notification" in window)) setNotifPermission("unsupported");
      else setNotifPermission(Notification.permission as NotifPermission);
    }
  }, [fetchSettings]);

  const requestNotifPermission = async () => {
    if (!("Notification" in window)) { setNotifPermission("unsupported"); return; }
    const result = await Notification.requestPermission();
    setNotifPermission(result as NotifPermission);
  };

  const handleSave = async () => {
    setSaving(true); setError(""); setSuccess("");
    const price = Number(mealPrice);
    if (isNaN(price) || price < 1) { setError("Meal price must be at least ₹1."); setSaving(false); return; }
    try {
      const res = await fetch("/api/settings", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mealPrice: price, lunchReminderEnabled: lunchEnabled, lunchReminderTime: lunchTime, dinnerReminderEnabled: dinnerEnabled, dinnerReminderTime: dinnerTime }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to save settings.");
      if (notifPermission === "granted") scheduleNotifications(lunchEnabled, lunchTime, dinnerEnabled, dinnerTime);
      setSuccess("Settings saved!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleClearData = async () => {
    setClearLoading(true);
    try {
      const res = await fetch("/api/clear-data", { method: "DELETE" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to clear data.");
      setShowClearConfirm(false);
      setSuccess("All data cleared.");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear data.");
    } finally {
      setClearLoading(false);
    }
  };

  const scheduleNotifications = (le: boolean, lt: string, de: boolean, dt: string) => {
    const now = new Date();
    const notify = (enabled: boolean, timeStr: string, label: string) => {
      if (!enabled) return;
      const [h, m] = timeStr.split(":").map(Number);
      const t = new Date(); t.setHours(h, m, 0, 0);
      const ms = t.getTime() - now.getTime();
      if (ms > 0 && ms < 86400000) {
        setTimeout(() => {
          if (Notification.permission === "granted") new Notification(`${label} reminder 🍱`, { body: `Did your ${label.toLowerCase()} arrive today?`, icon: "/icons/icon-192x192.png" });
        }, ms);
      }
    };
    notify(le, lt, "Lunch");
    notify(de, dt, "Dinner");
  };

  const notifText: Record<NotifPermission, string> = {
    default: "Not yet asked",
    granted: "✅ Allowed",
    denied: "❌ Blocked — enable in browser settings",
    unsupported: "⚠️ Not supported on this device",
  };

  const Toggle = ({ on, onToggle, color = "orange" }: { on: boolean; onToggle: () => void; color?: string }) => (
    <button onClick={onToggle}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${on ? (color === "indigo" ? "bg-indigo-500" : "bg-orange-500") : "bg-gray-200 dark:bg-gray-600"}`}
      role="switch" aria-checked={on}>
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${on ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );

  if (loading) return <LoadingSpinner />;

  return (
    <div className="px-4 py-6 space-y-5">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>

      {error && <ErrorMessage message={error} />}
      {success && (
        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
          <p className="text-green-700 dark:text-green-400 text-sm font-medium">✅ {success}</p>
        </div>
      )}

      {/* Account */}
      {session?.user && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
          <h2 className="text-base font-bold text-gray-800 dark:text-white mb-3">👤 Account</h2>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold">{session.user.name?.[0]?.toUpperCase()}</span>
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">{session.user.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{session.user.email}</p>
            </div>
          </div>
          <button onClick={() => signOut({ callbackUrl: "/login" })}
            className="mt-3 w-full py-2.5 border-2 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
            Sign Out
          </button>
        </div>
      )}

      {/* Theme */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
        <h2 className="text-base font-bold text-gray-800 dark:text-white mb-3">🎨 Appearance</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Dark Mode</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Currently {theme === "dark" ? "on" : "off"}</p>
          </div>
          <Toggle on={theme === "dark"} onToggle={toggleTheme} />
        </div>
      </div>

      {/* Meal Price */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
        <h2 className="text-base font-bold text-gray-800 dark:text-white mb-3">💰 Meal Price</h2>
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-gray-700 dark:text-gray-200">₹</span>
          <input type="number" value={mealPrice} onChange={(e) => setMealPrice(e.target.value)} min="1"
            className="flex-1 rounded-xl border border-gray-200 dark:border-gray-600 p-3 text-lg font-bold bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white" />
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Price per meal. Existing records keep their original price.</p>
      </div>

      {/* Notifications */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 space-y-4">
        <h2 className="text-base font-bold text-gray-800 dark:text-white">🔔 Reminders</h2>
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-400">Permission</p>
          <span className={`text-sm font-medium ${notifPermission === "granted" ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-gray-400"}`}>
            {notifText[notifPermission]}
          </span>
        </div>
        {notifPermission === "default" && (
          <button onClick={requestNotifPermission}
            className="w-full py-3 bg-orange-500 text-white rounded-xl font-semibold text-sm">
            Enable Notifications
          </button>
        )}
        {/* Lunch */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">🍱 Lunch Reminder</p>
            <Toggle on={lunchEnabled} onToggle={() => setLunchEnabled(!lunchEnabled)} />
          </div>
          {lunchEnabled && (
            <input type="time" value={lunchTime} onChange={(e) => setLunchTime(e.target.value)}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-600 p-2 text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white" />
          )}
        </div>
        {/* Dinner */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">🌙 Dinner Reminder</p>
            <Toggle on={dinnerEnabled} onToggle={() => setDinnerEnabled(!dinnerEnabled)} color="indigo" />
          </div>
          {dinnerEnabled && (
            <input type="time" value={dinnerTime} onChange={(e) => setDinnerTime(e.target.value)}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-600 p-2 text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white" />
          )}
        </div>
        {notifPermission !== "granted" && (lunchEnabled || dinnerEnabled) && (
          <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-2">
            ⚠️ Allow notifications first to receive reminders.
          </p>
        )}
      </div>

      <button onClick={handleSave} disabled={saving}
        className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-bold text-base disabled:opacity-60 transition-colors">
        {saving ? "Saving..." : "Save Settings"}
      </button>

      {/* Export */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
        <h2 className="text-base font-bold text-gray-800 dark:text-white mb-3">📤 Export Data</h2>
        <ExportButton />
      </div>

      {/* Danger Zone */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-red-100 dark:border-red-900/40 p-4">
        <h2 className="text-base font-bold text-red-700 dark:text-red-400 mb-2">⚠️ Danger Zone</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Permanently delete all meal records and payment history.</p>
        <button onClick={() => setShowClearConfirm(true)}
          className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold text-sm">
          Clear All Data
        </button>
      </div>

      <div className="text-center pb-4">
        <p className="text-xs text-gray-400 dark:text-gray-500">Tiffin Tracker v1.0 {settings && `• Meal price: ₹${settings.mealPrice}`}</p>
      </div>

      <ConfirmDialog isOpen={showClearConfirm} title="Clear All Data"
        message="This will permanently delete ALL meal records and payment history. This cannot be undone. Are you absolutely sure?"
        confirmLabel={clearLoading ? "Clearing..." : "Yes, Clear All"}
        onConfirm={handleClearData} onCancel={() => setShowClearConfirm(false)} danger />
    </div>
  );
}
