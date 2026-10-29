import { initializeApp, getApps, getApp, cert, App } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

/**
 * Returns an initialised Firebase Admin App singleton.
 * Safe to call on every request — returns the existing app if already initialised.
 */
export function getAdminApp(): App {
  if (getApps().length) return getApp();

  const projectId   = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // Vercel stores literal \n — replace to get real newlines in the PEM key
  const privateKey  = (process.env.FIREBASE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase Admin env vars: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY"
    );
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

/**
 * Sends an FCM message to a single FCM registration token.
 * Returns { success: true } or { success: false, stale: true } if the token
 * is invalid/expired and should be deleted from the database.
 */
export async function sendFCMNotification(
  token: string,
  notification: { title: string; body: string },
  data?: Record<string, string>
): Promise<{ success: boolean; stale?: boolean }> {
  try {
    const messaging = getMessaging(getAdminApp());

    await messaging.send({
      token,
      notification: {
        title: notification.title,
        body:  notification.body,
      },
      webpush: {
        notification: {
          title:        notification.title,
          body:         notification.body,
          icon:         "/icons/icon-192x192.png",
          badge:        "/icons/icon-72x72.png",
          // click_action is a standard Web Notification field
        },
        fcmOptions: {
          link: data?.url ?? "/",
        },
      },
      data,
    });

    return { success: true };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code ?? "";
    const isStale =
      code === "messaging/invalid-registration-token" ||
      code === "messaging/registration-token-not-registered" ||
      code === "messaging/invalid-argument";

    console.error(`FCM send failed (token …${token.slice(-8)}): ${code}`);
    return { success: false, stale: isStale };
  }
}
