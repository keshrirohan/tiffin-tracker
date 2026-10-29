import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Meal from "@/models/Meal";
import Payment from "@/models/Payment";
import Settings from "@/models/Settings";

/**
 * GET /api/migrate
 * One-time migration:
 * 1. Drop old indexes that didn't include userId (created before multi-user)
 * 2. Delete orphan documents (no userId) that block new upserts
 * Safe to call multiple times — all operations are idempotent.
 */
export async function GET() {
  try {
    await connectToDatabase();
    const results: string[] = [];

    // ── 1. Drop legacy Meal index { date, mealType } ─────────────────────
    try {
      await Meal.collection.dropIndex("date_1_mealType_1");
      results.push("✅ Dropped old Meal index: date_1_mealType_1");
    } catch {
      results.push("ℹ️  Meal index date_1_mealType_1 not found (already gone)");
    }

    // ── 2. Drop legacy Settings index { } single-doc (no userId) ─────────
    try {
      await Settings.collection.dropIndex("userId_1");
      results.push("✅ Dropped old Settings userId index (will be recreated)");
    } catch {
      results.push("ℹ️  Settings userId index not found");
    }

    // ── 3. Delete orphan meals (no userId field) ──────────────────────────
    const orphanMeals = await Meal.deleteMany({
      $or: [{ userId: { $exists: false } }, { userId: null }, { userId: "" }],
    });
    results.push(`✅ Deleted ${orphanMeals.deletedCount} orphan meal(s) with no userId`);

    // ── 4. Delete orphan payments (no userId field) ───────────────────────
    const orphanPayments = await Payment.deleteMany({
      $or: [{ userId: { $exists: false } }, { userId: null }, { userId: "" }],
    });
    results.push(`✅ Deleted ${orphanPayments.deletedCount} orphan payment(s) with no userId`);

    // ── 5. Delete orphan settings (no userId field) ───────────────────────
    const orphanSettings = await Settings.deleteMany({
      $or: [{ userId: { $exists: false } }, { userId: null }, { userId: "" }],
    });
    results.push(`✅ Deleted ${orphanSettings.deletedCount} orphan settings with no userId`);

    // ── 6. Recreate correct indexes via Mongoose sync ─────────────────────
    await Meal.syncIndexes();
    results.push("✅ Meal indexes synced");
    await Payment.syncIndexes();
    results.push("✅ Payment indexes synced");
    await Settings.syncIndexes();
    results.push("✅ Settings indexes synced");

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error("Migration error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
