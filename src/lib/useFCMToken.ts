"use client";

import { useEffect, useRef } from "react";
import { getToken, onMessage, MessagePayload } from "firebase/messaging";
import { getFirebaseMessaging } from "./firebase";

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ?? "";

/**
 * Injects the Firebase config into the service worker scope so
 * sw-custom.js can initialise Firebase Messaging for background messages.
 */
async function injectConfigIntoSW() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    reg.active?.postMessage({
      type: "FCM_CONFIG",
      config: {
        apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      },
    });
  } catch (e) {
    console.error("[FCM] Failed to inject config into SW:", e);
  }
}

/**
 * Registers the device for FCM, saves the token to the server,
 * and sets up the foreground message handler.
 *
 * @param onForegroundMessage Called when a message arrives while the app is open.
 */
export async function registerFCMToken(
  onForegroundMessage?: (payload: MessagePayload) => void
): Promise<string | null> {
  if (typeof window === "undefined") return null;

  try {
    const messaging = getFirebaseMessaging();
    if (!messaging) return null;

    // Ensure notification permission is granted
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;

    // Inject Firebase config into SW for background messaging
    await injectConfigIntoSW();

    // Get FCM registration token
    const reg = "serviceWorker" in navigator
      ? await navigator.serviceWorker.ready
      : undefined;

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: reg,
    });

    if (!token) return null;

    // Save to server
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fcmToken: token }),
    });

    // Foreground message handler (app is open)
    if (onForegroundMessage) {
      onMessage(messaging, onForegroundMessage);
    }

    return token;
  } catch (e) {
    console.error("[FCM] registerFCMToken error:", e);
    return null;
  }
}

/**
 * React hook: registers for FCM on mount, handles foreground messages
 * with a toast-style in-app notification.
 */
export function useFCMToken() {
  const registered = useRef(false);

  useEffect(() => {
    if (registered.current) return;
    registered.current = true;

    registerFCMToken((payload) => {
      // Foreground: show a simple in-app notification banner
      const title = payload.notification?.title ?? "Tiffin Tracker 🍱";
      const body  = payload.notification?.body  ?? "";
      const url   = (payload.data?.url as string) ?? "/";

      // Create a temporary notification element
      const el = document.createElement("div");
      el.style.cssText = [
        "position:fixed","top:16px","left:50%","transform:translateX(-50%)",
        "z-index:9999","background:#f97316","color:#fff","padding:12px 20px",
        "border-radius:12px","box-shadow:0 4px 20px rgba(0,0,0,0.2)",
        "cursor:pointer","max-width:320px","font-family:sans-serif",
        "font-size:14px","animation:slideDown 0.3s ease",
      ].join(";");
      el.innerHTML = `<strong>${title}</strong>${body ? `<br>${body}` : ""}`;
      el.onclick = () => { window.location.href = url; el.remove(); };
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 5000);
    });
  }, []);
}
