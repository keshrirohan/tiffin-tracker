import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireAuth } from "@/lib/apiAuth";
import PushSubscriptionModel from "@/models/PushSubscription";

/**
 * POST /api/push/subscribe
 * Accepts either an FCM token or a VAPID Web Push subscription (or both).
 * Body: { fcmToken?: string, subscription?: PushSubscription }
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { userId } = auth;

  try {
    await connectToDatabase();
    const body = await req.json();
    const { fcmToken, subscription } = body;

    if (!fcmToken && !subscription?.endpoint) {
      return NextResponse.json(
        { success: false, error: "Provide an fcmToken or a valid subscription object." },
        { status: 400 }
      );
    }

    const ua = req.headers.get("user-agent") ?? "";

    if (fcmToken) {
      // Upsert FCM token — keyed on (userId, fcmToken)
      await PushSubscriptionModel.findOneAndUpdate(
        { userId, fcmToken },
        { userId, fcmToken, userAgent: ua },
        { upsert: true, returnDocument: "after" }
      );
    }

    if (subscription?.endpoint) {
      // Upsert VAPID subscription — keyed on (userId, endpoint)
      await PushSubscriptionModel.findOneAndUpdate(
        { userId, "subscription.endpoint": subscription.endpoint },
        { userId, subscription, userAgent: ua },
        { upsert: true, returnDocument: "after" }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/push/subscribe error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save subscription." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/push/subscribe
 * Body: { fcmToken?: string, endpoint?: string }
 */
export async function DELETE(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { userId } = auth;

  try {
    await connectToDatabase();
    const { fcmToken, endpoint } = await req.json();

    if (fcmToken) {
      await PushSubscriptionModel.deleteOne({ userId, fcmToken });
    }
    if (endpoint) {
      await PushSubscriptionModel.deleteOne({
        userId,
        "subscription.endpoint": endpoint,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/push/subscribe error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to remove subscription." },
      { status: 500 }
    );
  }
}
