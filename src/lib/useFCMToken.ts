"use client";

import { useEffect, useRef } from "react";
import { getToken, onMessage, MessagePayload } from "firebase/messaging";
import { getFirebaseMessaging } from "./firebase";

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ?? "";

/**
 * Registers the dedicated firebase-messaging-sw.js service worker
 * and injects the Firebase config into it via postMessage.
 */
async function registerFCMServiceWorker(): Promise<ServiceWorkerRegistration | undefined> {
  if (!("serviceWorker" in navigator)) {
    console.warn("[FCM] Service workers not supported");
    return undefined;
  }

  try {
    // Register our dedicated FCM service worker
    const reg = await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
      scope: "/",
    });
    console.log("[FCM] firebase-messaging-sw.js registered, state:", reg.active?.state ?? "installing");

    // Wait for it to become active
    await navigator.serviceWorker.ready;

    // Inject Firebase config so the SW can initialise Firebase Messaging
    const sw = reg.active ?? reg.installing ?? reg.waiting;
    if (sw) {
      sw.postMessage({
        type: "FIREBASE_CONFIG",
        config: {
          apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
          authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
          projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
          messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
          appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
        },
      });
      console.log("[FCM] Config injected into service worker");
    }

    return reg;
  } catch (e) {
    console.error("[FCM] SW registration failed:", e);
    return undefined;
  }
}

/**
 * Full FCM registration flow:
 * 1. Check Firebase config is present
 * 2. Request notification permission
 * 3. Register firebase-messaging-sw.js
 * 4. Get FCM token
 * 5. Save token to server
 * 6. Set up foreground message handler
 */
export async function registerFCMToken(
  onForegroundMessage?: (payload: MessagePayload) => void
): Promise<string | null> {
  if (typeof window === "undefined") return null;

  // ── Step 1: Check Firebase config ────────────────────────────────────────
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const vapidKey  = VAPID_KEY;
  if (!projectId) {
    console.error("[FCM] NEXT_PUBLIC_FIREBASE_PROJECT_ID is not set");
    return null;
  }
  if (!vapidKey) {
    console.error("[FCM] NEXT_PUBLIC_FIREBASE_VAPID_KEY is not set");
    return null;
  }
  console.log("[FCM] Config check passed — project:", projectId);

  try {
    // ── Step 2: Get Firebase Messaging instance ───────────────────────────
    const messaging = getFirebaseMessaging();
    if (!messaging) {
      console.error("[FCM] getFirebaseMessaging() returned null — not in browser?");
      return null;
    }
    console.log("[FCM] Firebase Messaging instance obtained");

    // ── Step 3: Request notification permission ───────────────────────────
    const permission = Notification.permission;
    console.log("[FCM] Current notification permission:", permission);
    if (permission === "denied") {
      console.warn("[FCM] Notification permission denied by user");
      return null;
    }
    if (permission !== "granted") {
      const result = await Notification.requestPermission();
      console.log("[FCM] Permission request result:", result);
      if (result !== "granted") return null;
    }

    // ── Step 4: Register the FCM service worker ───────────────────────────
    const swReg = await registerFCMServiceWorker();
    if (!swReg) {
      console.error("[FCM] Could not register firebase-messaging-sw.js");
      return null;
    }
    console.log("[FCM] Service worker ready:", swReg.active?.state);

    // ── Step 5: Get FCM token ─────────────────────────────────────────────
    console.log("[FCM] Requesting FCM token with VAPID key:", vapidKey.slice(0, 20) + "...");
    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: swReg,
    });

    if (!token) {
      console.error("[FCM] getToken() returned empty — check VAPID key and Firebase project settings");
      return null;
    }
    console.log("[FCM] ✅ Token obtained:", token.slice(0, 20) + "...");

    // ── Step 6: Save token to server ──────────────────────────────────────
    const saveRes = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fcmToken: token }),
    });
    const saveData = await saveRes.json();
    if (saveData.success) {
      console.log("[FCM] ✅ Token saved to server successfully");
    } else {
      console.error("[FCM] Failed to save token to server:", saveData.error);
    }

    // ── Step 7: Foreground message handler ────────────────────────────────
    if (onForegroundMessage) {
      onMessage(messaging, (payload) => {
        console.log("[FCM] Foreground message received:", payload);
        onForegroundMessage(payload);
      });
      console.log("[FCM] Foreground message handler registered");
    }

    return token;
  } catch (e) {
    console.error("[FCM] registerFCMToken error:", e);
    return null;
  }
}

/**
 * React hook: automatically registers for FCM when component mounts.
 * Shows an in-app toast banner for foreground messages.
 */
export function useFCMToken() {
  const registered = useRef(false);

  useEffect(() => {
    if (registered.current) return;
    registered.current = true;

    registerFCMToken((payload) => {
      const title = payload.notification?.title ?? "Tiffin Tracker 🍱";
      const body  = payload.notification?.body  ?? "";
      const url   = (payload.data?.url as string) ?? "/";

      console.log("[FCM] Showing foreground toast:", title);

      const el = document.createElement("div");
      el.style.cssText = [
        "position:fixed","top:16px","left:50%","transform:translateX(-50%)",
        "z-index:9999","background:#f97316","color:#fff","padding:12px 20px",
        "border-radius:12px","box-shadow:0 4px 20px rgba(0,0,0,0.2)",
        "cursor:pointer","max-width:320px","font-family:sans-serif","font-size:14px",
      ].join(";");
      el.innerHTML = `<strong>${title}</strong>${body ? `<br>${body}` : ""}`;
      el.onclick = () => { window.location.href = url; el.remove(); };
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 5000);
    });
  }, []);
}
