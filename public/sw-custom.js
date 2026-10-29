// sw-custom.js — imported by the Workbox SW (next-pwa) for VAPID Web Push fallback.
// FCM background messages are handled by firebase-messaging-sw.js (separate registration).
// This file handles VAPID push events only.

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data = {};
  try { data = event.data.json(); } catch { return; }

  const title = data.title ?? "Tiffin Tracker 🍱";
  const body  = data.body  ?? "Time to record your meal!";
  const url   = data.url   ?? "/";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon:     "/icons/icon-192x192.png",
      badge:    "/icons/icon-72x72.png",
      tag:      "tiffin-reminder",
      renotify: true,
      data:     { url },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
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
