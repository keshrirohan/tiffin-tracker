import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireAuth } from "@/lib/apiAuth";
import Meal from "@/models/Meal";
import Payment from "@/models/Payment";
import { getErrorMessage } from "@/lib/utils";

export async function DELETE() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { userId } = auth;

  try {
    await connectToDatabase();
    await Promise.all([
      Meal.deleteMany({ userId }),
      Payment.deleteMany({ userId }),
    ]);
    return NextResponse.json({ success: true, data: { message: "All data cleared." } });
  } catch (error) {
    console.error("DELETE /api/clear-data error:", error);
    return NextResponse.json({ success: false, error: getErrorMessage(error) }, { status: 500 });
  }
}
