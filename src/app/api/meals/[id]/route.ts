import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireAuth } from "@/lib/apiAuth";
import Meal from "@/models/Meal";
import { getErrorMessage } from "@/lib/utils";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { userId } = auth;

  try {
    await connectToDatabase();
    const { status } = await req.json();

    if (!status || !["received", "not_received"].includes(status)) {
      return NextResponse.json({ success: false, error: "Status must be received or not_received." }, { status: 400 });
    }

    const meal = await Meal.findOneAndUpdate(
      { _id: params.id, userId },
      { status },
      { returnDocument: "after", runValidators: true }
    ).lean();

    if (!meal) {
      return NextResponse.json({ success: false, error: "Meal record not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: meal });
  } catch (error) {
    console.error("PUT /api/meals/[id] error:", error);
    return NextResponse.json({ success: false, error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { userId } = auth;

  try {
    await connectToDatabase();
    const meal = await Meal.findOneAndDelete({ _id: params.id, userId }).lean();

    if (!meal) {
      return NextResponse.json({ success: false, error: "Meal record not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (error) {
    console.error("DELETE /api/meals/[id] error:", error);
    return NextResponse.json({ success: false, error: getErrorMessage(error) }, { status: 500 });
  }
}
