import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireAuth } from "@/lib/apiAuth";
import PushSubscriptionModel from "@/models/PushSubscription";
import Settings from "@/models/Settings";
import webpush from "web-push";
import { sendFCMNotification } from "@/lib/firebaseAdmin";

// Initialise VAPID for fallback Web Push
webpush.setVapidDetails(
  process.env.VAPID_EMAIL ?? "mailto:keshrirohan214@gmail.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "",
  process.env.VAPID_PRIVATE_KEY ?? ""
);

interface NotificationPayload {
  title: string;
  body: string;
  url?: string;
}

/**
 * Sends a notification to all devices of a user.
 * FCM tokens use Firebase Admin SDK; VAPID subscriptions use web-push.
 * Stale tokens/subscriptions are automatically removed.
 */
async function sendToAllDevices(
  userId: string,
  payload: NotificationPayload
): Promise<number> {
  const subs = await PushSubscriptionModel.find({ userId }).lean();
  if (subs.length === 0) return 0;

  let sent = 0;
  const staleIds: string[] = [];

  await Promise.all(
    subs.map(async (sub) => {
      // ── FCM path ──────────────────────────────────────────────────────
      if (sub.fcmToken) {
        const result = await sendFCMNotification(
          sub.fcmToken,
          { title: payload.title, body: payload.body },
          { url: payload.url ?? "/" }
        );
        if (result.success) {
          sent++;
        } else if (result.stale) {
          staleIds.push(sub._id.toString());
        }
        return;
      }

      // ── VAPID fallback ────────────────────────────────────────────────
      if (sub.subscription) {
        try {
          await webpush.sendNotification(
            sub.subscription as webpush.PushSubscription,
            JSON.stringify({ title: payload.title, body: payload.body, url: payload.url ?? "/" })
          );
          sent++;
        } catch (err) {
          const e = err as { statusCode?: number };
          if (e?.statusCode === 410 || e?.statusCode === 404) {
            staleIds.push(sub._id.toString());
          }
        }
      }
    })
  );

  // Clean up stale registrations in bulk
  if (staleIds.length > 0) {
    await PushSubscriptionModel.deleteMany({ _id: { $in: staleIds } });
  }

  return sent;
}

// ── POST /api/push/send ─────────────────────────────────────────────────────
// Body: { title, body, url? }
export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { userId } = auth;

  try {
    await connectToDatabase();
    const { title, body, url } = await req.json();

    if (!title || !body) {
      return NextResponse.json(
        { success: false, error: "title and body are required." },
        { status: 400 }
      );
    }

    const sent = await sendToAllDevices(userId, { title, body, url });
    if (sent === 0) {
      return NextResponse.json(
        { success: false, error: "No active subscriptions found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, sent });
  } catch (error) {
    console.error("POST /api/push/send error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to send notification." },
      { status: 500 }
    );
  }
}

// ── GET /api/push/send ──────────────────────────────────────────────────────
// Sends scheduled reminders (lunch/dinner) if current time matches settings.
// Call from Vercel Cron: { "crons": [{ "path": "/api/push/send", "schedule": "* * * * *" }] }
export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { userId } = auth;

  try {
    await connectToDatabase();
    const settings = await Settings.findOne({ userId }).lean();
    if (!settings) {
      return NextResponse.json({ success: false, error: "No settings." }, { status: 404 });
    }

    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    let totalSent = 0;

    if (settings.lunchReminderEnabled && settings.lunchReminderTime === hhmm) {
      totalSent += await sendToAllDevices(userId, {
        title: "Lunch reminder 🍱",
        body: "Did your lunch arrive today?",
        url: "/",
      });
    }
    if (settings.dinnerReminderEnabled && settings.dinnerReminderTime === hhmm) {
      totalSent += await sendToAllDevices(userId, {
        title: "Dinner reminder 🌙",
        body: "Did your dinner arrive today?",
        url: "/",
      });
    }

    return NextResponse.json({ success: true, sent: totalSent });
  } catch (error) {
    console.error("GET /api/push/send error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to send reminders." },
      { status: 500 }
    );
  }
}
