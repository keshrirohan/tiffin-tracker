import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireAuth } from "@/lib/apiAuth";
import Settings from "@/models/Settings";
import { getErrorMessage } from "@/lib/utils";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { userId } = auth;

  try {
    await connectToDatabase();
    let settings = await Settings.findOne({ userId }).lean();

    if (!settings) {
      const def = new Settings({
        userId,
        mealPrice: 60,
        lunchReminderEnabled: false,
        lunchReminderTime: "14:00",
        dinnerReminderEnabled: false,
        dinnerReminderTime: "21:00",
      });
      const saved = await def.save();
      settings = saved.toObject();
    }

    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    console.error("GET /api/settings error:", error);
    return NextResponse.json({ success: false, error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { userId } = auth;

  try {
    await connectToDatabase();
    const body = await req.json();
    const { mealPrice, lunchReminderEnabled, lunchReminderTime, dinnerReminderEnabled, dinnerReminderTime } = body;

    if (mealPrice !== undefined) {
      const price = Number(mealPrice);
      if (isNaN(price) || price < 1) {
        return NextResponse.json({ success: false, error: "Meal price must be at least ₹1." }, { status: 400 });
      }
    }

    const updateData: Record<string, unknown> = {};
    if (mealPrice !== undefined) updateData.mealPrice = Number(mealPrice);
    if (lunchReminderEnabled !== undefined) updateData.lunchReminderEnabled = Boolean(lunchReminderEnabled);
    if (lunchReminderTime !== undefined) updateData.lunchReminderTime = lunchReminderTime;
    if (dinnerReminderEnabled !== undefined) updateData.dinnerReminderEnabled = Boolean(dinnerReminderEnabled);
    if (dinnerReminderTime !== undefined) updateData.dinnerReminderTime = dinnerReminderTime;

    const settings = await Settings.findOneAndUpdate(
      { userId },
      { $set: updateData },
      { upsert: true, returnDocument: "after", runValidators: true }
    ).lean();

    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    console.error("PUT /api/settings error:", error);
    return NextResponse.json({ success: false, error: getErrorMessage(error) }, { status: 500 });
  }
}
