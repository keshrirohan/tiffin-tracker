import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireAuth } from "@/lib/apiAuth";
import Payment from "@/models/Payment";
import Meal from "@/models/Meal";
import { getErrorMessage } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { userId } = auth;

  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: Record<string, any> = { userId };
    if (month) {
      const [y, m] = month.split("-").map(Number);
      query.date = {
        $gte: `${y}-${String(m).padStart(2, "0")}-01`,
        $lte: `${y}-${String(m).padStart(2, "0")}-${new Date(y, m, 0).getDate()}`,
      };
    }
    const payments = await Payment.find(query).sort({ date: -1, createdAt: -1 }).lean();
    return NextResponse.json({ success: true, data: payments });
  } catch (error) {
    console.error("GET /api/payments error:", error);
    return NextResponse.json({ success: false, error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { userId } = auth;

  try {
    await connectToDatabase();
    const body = await req.json();
    const { amount, date, note } = body;

    if (!amount || !date) {
      return NextResponse.json({ success: false, error: "Amount and date are required." }, { status: 400 });
    }
    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ success: false, error: "Amount must be a positive number." }, { status: 400 });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ success: false, error: "Date must be in YYYY-MM-DD format." }, { status: 400 });
    }

    const totalBill = await calcTotalBill(userId);
    const totalPaid = await calcTotalPaid(userId);
    const remaining = totalBill - totalPaid;

    if (parsedAmount > remaining) {
      return NextResponse.json(
        { success: false, error: `Payment cannot be greater than the remaining bill of ₹${remaining}.` },
        { status: 400 }
      );
    }

    const payment = new Payment({ userId, amount: parsedAmount, date, note: note?.trim() || undefined });
    const saved = await payment.save();
    return NextResponse.json({ success: true, data: saved.toObject() }, { status: 201 });
  } catch (error) {
    console.error("POST /api/payments error:", error);
    return NextResponse.json({ success: false, error: getErrorMessage(error) }, { status: 500 });
  }
}

async function calcTotalBill(userId: string): Promise<number> {
  const result = await Meal.aggregate([
    { $match: { userId, status: "received" } },
    { $group: { _id: null, total: { $sum: "$price" } } },
  ]);
  return result[0]?.total ?? 0;
}

async function calcTotalPaid(userId: string): Promise<number> {
  const result = await Payment.aggregate([
    { $match: { userId } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  return result[0]?.total ?? 0;
}
