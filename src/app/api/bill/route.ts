import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireAuth } from "@/lib/apiAuth";
import Meal from "@/models/Meal";
import Payment from "@/models/Payment";
import { getErrorMessage } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { userId } = auth;

  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const month = searchParams.get("month");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mealQuery: Record<string, any> = { userId };

    if (month) {
      const [y, m] = month.split("-").map(Number);
      mealQuery.date = {
        $gte: `${y}-${String(m).padStart(2, "0")}-01`,
        $lte: `${y}-${String(m).padStart(2, "0")}-${new Date(y, m, 0).getDate()}`,
      };
    } else if (startDate || endDate) {
      mealQuery.date = {};
      if (startDate) mealQuery.date.$gte = startDate;
      if (endDate) mealQuery.date.$lte = endDate;
    }

    const mealStats = await Meal.aggregate([
      { $match: mealQuery },
      {
        $group: {
          _id: "$mealType",
          receivedCount: { $sum: { $cond: [{ $eq: ["$status", "received"] }, 1, 0] } },
          totalAmount: { $sum: { $cond: [{ $eq: ["$status", "received"] }, "$price", 0] } },
        },
      },
    ]);

    let lunchCount = 0, dinnerCount = 0, totalBill = 0;
    for (const s of mealStats) {
      if (s._id === "lunch") { lunchCount = s.receivedCount; totalBill += s.totalAmount; }
      else if (s._id === "dinner") { dinnerCount = s.receivedCount; totalBill += s.totalAmount; }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payQuery: Record<string, any> = { userId };
    const isFiltered = month || startDate || endDate;
    if (isFiltered) {
      if (month) {
        const [y, m] = month.split("-").map(Number);
        payQuery.date = {
          $gte: `${y}-${String(m).padStart(2, "0")}-01`,
          $lte: `${y}-${String(m).padStart(2, "0")}-${new Date(y, m, 0).getDate()}`,
        };
      } else if (startDate || endDate) {
        payQuery.date = {};
        if (startDate) payQuery.date.$gte = startDate;
        if (endDate) payQuery.date.$lte = endDate;
      }
    }

    const payResult = await Payment.aggregate([
      { $match: payQuery },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    // For dashboard (no filter), always use all-time payments vs all-time bill
    let totalPaid: number;
    if (!isFiltered) {
      const allPay = await Payment.aggregate([
        { $match: { userId } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]);
      totalPaid = allPay[0]?.total ?? 0;
    } else {
      totalPaid = payResult[0]?.total ?? 0;
    }

    return NextResponse.json({
      success: true,
      data: {
        totalMeals: lunchCount + dinnerCount,
        lunchCount,
        dinnerCount,
        totalBill,
        totalPaid,
        remaining: Math.max(0, totalBill - totalPaid),
      },
    });
  } catch (error) {
    console.error("GET /api/bill error:", error);
    return NextResponse.json({ success: false, error: getErrorMessage(error) }, { status: 500 });
  }
}
