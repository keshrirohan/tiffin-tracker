// Firebase Messaging Service Worker
// Must be at the root scope: /firebase-messaging-sw.js
// Handles FCM background and closed-app notifications.
// This coexists with next-pwa's sw.js (which handles caching).

// ── Import Firebase compat SDKs at TOP LEVEL (required — cannot be in event handler) ──
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

// ── Firebase config is injected by the client via postMessage ─────────────────
// We store it and initialise Firebase once received.
let messaging = null;

self.addEventListener("message", (event) => {
  if (event.data?.type !== "FIREBASE_CONFIG") return;

  const config = event.data.config;
  if (!config?.projectId || messaging) return;

  try {
    if (!self.firebase.apps.length) {
      self.firebase.initializeApp(config);
    }
    messaging = self.firebase.messaging();
    console.log("[FCM-SW] Firebase initialised for project:", config.projectId);
  } catch (e) {
    console.error("[FCM-SW] Firebase init error:", e.message);
  }
});

// ── Background / closed-app message handler ───────────────────────────────────
// This fires when a notification arrives and the app is NOT in the foreground.
self.addEventListener("push", (event) => {
  console.log("[FCM-SW] Push event received");

  if (!event.data) return;

  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    return;
  }

  // FCM sends data in payload.notification and/or payload.data
  const notification = payload.notification ?? {};
  const data = payload.data ?? {};

  const title = notification.title ?? data.title ?? "Tiffin Tracker 🍱";
  const body  = notification.body  ?? data.body  ?? "You have a new update.";
  const url   = data.url ?? "/";

  console.log("[FCM-SW] Showing notification:", title);

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon:     "/icons/icon-192x192.png",
      badge:    "/icons/icon-72x72.png",
      tag:      "tiffin-fcm",
      renotify: true,
      data:     { url },
    })
  );
});

// ── Notification click handler ────────────────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  console.log("[FCM-SW] Notification clicked");
  event.notification.close();

  const url = event.notification.data?.url ?? "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        if (clients.openWindow) return clients.openWindow(url);
      })
  );
});
