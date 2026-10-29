import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Manually load .env.local
const envPath = resolve(__dirname, "../.env.local");
const envContent = readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  const [key, ...rest] = line.split("=");
  if (key && !key.startsWith("#") && rest.length) {
    process.env[key.trim()] = rest.join("=").trim().replace(/^"|"$/g, "");
  }
}

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

const privateKey = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");

try {
  const app = !getApps().length
    ? initializeApp({
        credential: cert({
          projectId:   process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey,
        }),
      })
    : getApps()[0];

  const messaging = getMessaging(app);
  console.log("✅ Firebase Admin initialised — project:", process.env.FIREBASE_PROJECT_ID);
  console.log("✅ Messaging ready:", typeof messaging.send === "function");
  console.log("✅ VAPID key present:", !!process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY);
  console.log("✅ All Firebase env vars set:", [
    "NEXT_PUBLIC_FIREBASE_API_KEY",
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
    "NEXT_PUBLIC_FIREBASE_APP_ID",
    "NEXT_PUBLIC_FIREBASE_VAPID_KEY",
    "FIREBASE_PROJECT_ID",
    "FIREBASE_CLIENT_EMAIL",
    "FIREBASE_PRIVATE_KEY",
  ].every((k) => !!process.env[k]));
} catch (e) {
  console.error("❌ Firebase Admin init failed:", e.message);
  process.exit(1);
}
