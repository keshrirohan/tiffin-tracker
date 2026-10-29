"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorMessage from "@/components/ErrorMessage";
import ConfirmDialog from "@/components/ConfirmDialog";
import ExportButton from "@/components/ExportButton";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/components/ThemeProvider";
import { ISettings } from "@/types";

type NotifPermission = "default" | "granted" | "denied" | "unsupported";

/** Subscribe this device to Web Push and store on server */
async function subscribeToPush(): Promise<boolean> {
  try {
    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    const sub = existing ?? await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""
      ),
    });
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription: sub.toJSON() }),
    });
    return true;
  } catch (e) {
    console.error("Push subscribe error:", e);
    return false;
  }
}

/** Unsubscribe this device from Web Push */
async function unsubscribeFromPush(): Promise<void> {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await fetch("/api/push/subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      });
      await sub.unsubscribe();
    }
  } catch (e) {
    console.error("Push unsubscribe error:", e);
  }
}

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const arr = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i);
  return arr.buffer;
}

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
    if (result === "granted" && "serviceWorker" in navigator) {
      await subscribeToPush();
    }
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

      // Handle push subscription based on whether any reminder is enabled
      if ("serviceWorker" in navigator && notifPermission === "granted") {
        if (lunchEnabled || dinnerEnabled) {
          await subscribeToPush();
        } else {
          await unsubscribeFromPush();
        }
      }

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

  const notifText: Record<NotifPermission, string> = {
    default: "Not yet asked",
    granted: "✅ Allowed — background push enabled",
    denied: "❌ Blocked — enable in browser settings",
    unsupported: "⚠️ Not supported on this device",
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="px-4 py-6 space-y-5">
      <h1 className="text-2xl font-bold text-foreground">Settings</h1>

      {error && <ErrorMessage message={error} />}
      {success && (
        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
          <p className="text-green-700 dark:text-green-400 text-sm font-medium">✅ {success}</p>
        </div>
      )}

      {/* Account */}
      {session?.user && (
        <div className="bg-card rounded-2xl border border-border p-4">
          <h2 className="text-base font-bold text-foreground mb-3">👤 Account</h2>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <span className="text-white font-bold">{session.user.name?.[0]?.toUpperCase()}</span>
            </div>
            <div>
              <p className="font-semibold text-foreground">{session.user.name}</p>
              <p className="text-xs text-muted-foreground">{session.user.email}</p>
            </div>
          </div>
          <button onClick={() => signOut({ callbackUrl: "/login" })}
            className="mt-3 w-full py-2.5 border-2 border-destructive/30 text-destructive rounded-xl text-sm font-semibold hover:bg-destructive/5 transition-colors">
            Sign Out
          </button>
        </div>
      )}

      {/* Theme */}
      <div className="bg-card rounded-2xl border border-border p-4">
        <h2 className="text-base font-bold text-foreground mb-3">🎨 Appearance</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Dark Mode</p>
            <p className="text-xs text-muted-foreground">Currently {theme === "dark" ? "on" : "off"}</p>
          </div>
          <Switch checked={theme === "dark"} onCheckedChange={toggleTheme} />
        </div>
      </div>

      {/* Meal Price */}
      <div className="bg-card rounded-2xl border border-border p-4">
        <h2 className="text-base font-bold text-foreground mb-3">💰 Meal Price</h2>
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-foreground">₹</span>
          <input type="number" value={mealPrice} onChange={(e) => setMealPrice(e.target.value)} min="1"
            className="flex-1 rounded-xl border border-border p-3 text-lg font-bold bg-muted text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <p className="text-xs text-muted-foreground mt-2">Price per meal. Existing records keep their original price.</p>
      </div>

      {/* Notifications */}
      <div className="bg-card rounded-2xl border border-border p-4 space-y-4">
        <div>
          <h2 className="text-base font-bold text-foreground">🔔 Reminders</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Sends a push notification even when the app is closed.</p>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Permission</p>
          <span className={`text-sm font-medium ${notifPermission === "granted" ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
            {notifText[notifPermission]}
          </span>
        </div>
        {notifPermission === "default" && (
          <button onClick={requestNotifPermission}
            className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-orange-600 transition-colors">
            Enable Push Notifications
          </button>
        )}
        {/* Lunch */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">🍱 Lunch Reminder</p>
            <Switch checked={lunchEnabled} onCheckedChange={setLunchEnabled} />
          </div>
          {lunchEnabled && (
            <input type="time" value={lunchTime} onChange={(e) => setLunchTime(e.target.value)}
              className="w-full rounded-xl border border-border p-2 text-sm bg-muted text-foreground" />
          )}
        </div>
        {/* Dinner */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">🌙 Dinner Reminder</p>
            <Switch checked={dinnerEnabled} onCheckedChange={setDinnerEnabled} />
          </div>
          {dinnerEnabled && (
            <input type="time" value={dinnerTime} onChange={(e) => setDinnerTime(e.target.value)}
              className="w-full rounded-xl border border-border p-2 text-sm bg-muted text-foreground" />
          )}
        </div>
        {notifPermission !== "granted" && (lunchEnabled || dinnerEnabled) && (
          <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-2">
            ⚠️ Allow notifications first to receive background reminders.
          </p>
        )}
      </div>

      <button onClick={handleSave} disabled={saving}
        className="w-full py-4 bg-primary hover:bg-orange-600 text-primary-foreground rounded-2xl font-bold text-base disabled:opacity-60 transition-colors">
        {saving ? "Saving..." : "Save Settings"}
      </button>

      {/* Export */}
      <div className="bg-card rounded-2xl border border-border p-4">
        <h2 className="text-base font-bold text-foreground mb-3">📤 Export Data</h2>
        <ExportButton />
      </div>

      {/* Danger Zone */}
      <div className="bg-card rounded-2xl border border-destructive/20 p-4">
        <h2 className="text-base font-bold text-destructive mb-2">⚠️ Danger Zone</h2>
        <p className="text-xs text-muted-foreground mb-3">Permanently delete all meal records and payment history.</p>
        <button onClick={() => setShowClearConfirm(true)}
          className="w-full py-3 bg-destructive hover:bg-red-600 text-white rounded-xl font-semibold text-sm transition-colors">
          Clear All Data
        </button>
      </div>

      <div className="text-center pb-4">
        <p className="text-xs text-muted-foreground">Tiffin Tracker v1.0 {settings && `• Meal price: ₹${settings.mealPrice}`}</p>
      </div>

      <ConfirmDialog isOpen={showClearConfirm} title="Clear All Data"
        message="This will permanently delete ALL meal records and payment history. This cannot be undone. Are you absolutely sure?"
        confirmLabel={clearLoading ? "Clearing..." : "Yes, Clear All"}
        onConfirm={handleClearData} onCancel={() => setShowClearConfirm(false)} danger />
    </div>
  );
}
