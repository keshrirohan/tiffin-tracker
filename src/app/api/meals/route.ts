import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireAuth } from "@/lib/apiAuth";
import Meal from "@/models/Meal";
import Settings from "@/models/Settings";
import { getErrorMessage } from "@/lib/utils";

/** Drop the old index created before multi-user support was added. Safe no-op if gone. */
async function dropLegacyIndex() {
  try {
    await Meal.collection.dropIndex("date_1_mealType_1");
    console.log("[migration] Dropped legacy index date_1_mealType_1");
  } catch {
    // Already dropped or never existed — that's fine
  }
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { userId } = auth;

  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const mealType = searchParams.get("mealType");
    const status = searchParams.get("status");
    const month = searchParams.get("month");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: Record<string, any> = { userId };

    if (date) {
      query.date = date;
    } else if (month) {
      const [year, mon] = month.split("-");
      const y = parseInt(year), m = parseInt(mon);
      query.date = {
        $gte: `${y}-${String(m).padStart(2, "0")}-01`,
        $lte: `${y}-${String(m).padStart(2, "0")}-${new Date(y, m, 0).getDate()}`,
      };
    } else if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = startDate;
      if (endDate) query.date.$lte = endDate;
    }

    if (mealType && ["lunch", "dinner"].includes(mealType)) query.mealType = mealType;
    if (status && ["received", "not_received"].includes(status)) query.status = status;

    const meals = await Meal.find(query).sort({ date: -1, mealType: 1 }).lean();
    return NextResponse.json({ success: true, data: meals });
  } catch (error) {
    console.error("GET /api/meals error:", error);
    return NextResponse.json({ success: false, error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { userId } = auth;

  try {
    await connectToDatabase();

    // One-time migration: remove old unique index that didn't include userId
    await dropLegacyIndex();

    const body = await req.json();
    const { date, mealType, status } = body;

    if (!date || !mealType || !status) {
      return NextResponse.json({ success: false, error: "Date, meal type, and status are required." }, { status: 400 });
    }
    if (!["lunch", "dinner"].includes(mealType)) {
      return NextResponse.json({ success: false, error: "Meal type must be lunch or dinner." }, { status: 400 });
    }
    if (!["received", "not_received"].includes(status)) {
      return NextResponse.json({ success: false, error: "Status must be received or not_received." }, { status: 400 });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ success: false, error: "Date must be in YYYY-MM-DD format." }, { status: 400 });
    }

    let mealPrice = 60;
    const settings = await Settings.findOne({ userId }).lean();
    if (settings) mealPrice = settings.mealPrice;

    const meal = await Meal.findOneAndUpdate(
      { userId, date, mealType },
      { $set: { status, price: mealPrice } },
      { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true }
    ).lean();

    return NextResponse.json({ success: true, data: meal }, { status: 201 });
  } catch (error) {
    console.error("POST /api/meals error:", error);
    return NextResponse.json({ success: false, error: getErrorMessage(error) }, { status: 500 });
  }
}
