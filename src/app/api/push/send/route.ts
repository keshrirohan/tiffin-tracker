import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireAuth } from "@/lib/apiAuth";
import PushSubscriptionModel from "@/models/PushSubscription";
import Settings from "@/models/Settings";
import webpush from "web-push";

webpush.setVapidDetails(
  process.env.VAPID_EMAIL ?? "mailto:keshrirohan214@gmail.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "",
  process.env.VAPID_PRIVATE_KEY ?? ""
);

// POST — send a push notification to all devices of this user
// Body: { title, body, url? }
// Also called automatically when settings save reminderEnabled = true
export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { userId } = auth;

  try {
    await connectToDatabase();
    const { title, body, url } = await req.json();

    const subs = await PushSubscriptionModel.find({ userId }).lean();
    if (subs.length === 0) {
      return NextResponse.json({ success: false, error: "No push subscriptions found." }, { status: 404 });
    }

    const payload = JSON.stringify({ title, body, url: url ?? "/" });
    const results = await Promise.allSettled(
      subs.map((s) => webpush.sendNotification(s.subscription as webpush.PushSubscription, payload))
    );

    // Clean up expired subscriptions
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.status === "rejected") {
        const err = r.reason as { statusCode?: number };
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          // Subscription expired — delete it
          await PushSubscriptionModel.deleteOne({ _id: subs[i]._id });
        }
      }
    }

    const sent = results.filter((r) => r.status === "fulfilled").length;
    return NextResponse.json({ success: true, sent });
  } catch (error) {
    console.error("POST /api/push/send error:", error);
    return NextResponse.json({ success: false, error: "Failed to send notification." }, { status: 500 });
  }
}

// GET — send scheduled reminders for this user (called by Vercel cron or settings trigger)
export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { userId } = auth;

  try {
    await connectToDatabase();
    const settings = await Settings.findOne({ userId }).lean();
    if (!settings) return NextResponse.json({ success: false, error: "No settings found." }, { status: 404 });

    const messages: { title: string; body: string }[] = [];
    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    if (settings.lunchReminderEnabled && settings.lunchReminderTime === hhmm) {
      messages.push({ title: "Lunch reminder 🍱", body: "Did your lunch arrive today?" });
    }
    if (settings.dinnerReminderEnabled && settings.dinnerReminderTime === hhmm) {
      messages.push({ title: "Dinner reminder 🌙", body: "Did your dinner arrive today?" });
    }

    if (messages.length === 0) return NextResponse.json({ success: true, sent: 0 });

    const subs = await PushSubscriptionModel.find({ userId }).lean();
    let sent = 0;
    for (const msg of messages) {
      const payload = JSON.stringify({ ...msg, url: "/" });
      await Promise.allSettled(
        subs.map((s) => webpush.sendNotification(s.subscription as webpush.PushSubscription, payload))
      );
      sent += subs.length;
    }

    return NextResponse.json({ success: true, sent });
  } catch (error) {
    console.error("GET /api/push/send error:", error);
    return NextResponse.json({ success: false, error: "Failed to send." }, { status: 500 });
  }
}
