import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireAuth } from "@/lib/apiAuth";
import Payment from "@/models/Payment";
import Meal from "@/models/Meal";
import { getErrorMessage } from "@/lib/utils";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { userId } = auth;

  try {
    await connectToDatabase();
    const { amount, date, note } = await req.json();

    if (!amount || !date) {
      return NextResponse.json({ success: false, error: "Amount and date are required." }, { status: 400 });
    }
    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ success: false, error: "Amount must be a positive number." }, { status: 400 });
    }

    const existing = await Payment.findOne({ _id: params.id, userId }).lean();
    if (!existing) {
      return NextResponse.json({ success: false, error: "Payment not found." }, { status: 404 });
    }

    const totalBill = await calcTotalBill(userId);
    const totalPaid = await calcTotalPaid(userId);
    const remainingWithoutThis = totalBill - (totalPaid - existing.amount);

    if (parsedAmount > remainingWithoutThis) {
      return NextResponse.json(
        { success: false, error: `Payment cannot be greater than the remaining bill of ₹${remainingWithoutThis}.` },
        { status: 400 }
      );
    }

    const payment = await Payment.findOneAndUpdate(
      { _id: params.id, userId },
      { amount: parsedAmount, date, note: note?.trim() || undefined },
      { returnDocument: "after", runValidators: true }
    ).lean();

    return NextResponse.json({ success: true, data: payment });
  } catch (error) {
    console.error("PUT /api/payments/[id] error:", error);
    return NextResponse.json({ success: false, error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { userId } = auth;

  try {
    await connectToDatabase();
    const payment = await Payment.findOneAndDelete({ _id: params.id, userId }).lean();
    if (!payment) {
      return NextResponse.json({ success: false, error: "Payment not found." }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (error) {
    console.error("DELETE /api/payments/[id] error:", error);
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
