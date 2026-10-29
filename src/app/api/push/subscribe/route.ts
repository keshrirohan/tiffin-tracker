import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireAuth } from "@/lib/apiAuth";
import PushSubscriptionModel from "@/models/PushSubscription";

// POST — save push subscription for this user/device
export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { userId } = auth;

  try {
    await connectToDatabase();
    const { subscription } = await req.json();
    if (!subscription?.endpoint) {
      return NextResponse.json({ success: false, error: "Invalid subscription." }, { status: 400 });
    }

    await PushSubscriptionModel.findOneAndUpdate(
      { userId, "subscription.endpoint": subscription.endpoint },
      { userId, subscription, userAgent: req.headers.get("user-agent") ?? "" },
      { upsert: true, returnDocument: "after" }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/push/subscribe error:", error);
    return NextResponse.json({ success: false, error: "Failed to save subscription." }, { status: 500 });
  }
}

// DELETE — remove push subscription (user unsubscribed)
export async function DELETE(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { userId } = auth;

  try {
    await connectToDatabase();
    const { endpoint } = await req.json();
    await PushSubscriptionModel.deleteOne({ userId, "subscription.endpoint": endpoint });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/push/subscribe error:", error);
    return NextResponse.json({ success: false, error: "Failed to remove subscription." }, { status: 500 });
  }
}
