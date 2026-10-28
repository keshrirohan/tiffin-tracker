import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireAuth } from "@/lib/apiAuth";
import Meal from "@/models/Meal";
import Payment from "@/models/Payment";
import User from "@/models/User";
import { getErrorMessage } from "@/lib/utils";

// GET /api/export?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&format=csv|pdf
export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { userId } = auth;

  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const format = searchParams.get("format") ?? "csv";

    if (!startDate || !endDate) {
      return NextResponse.json({ success: false, error: "startDate and endDate are required." }, { status: 400 });
    }

    const meals = await Meal.find({ userId, date: { $gte: startDate, $lte: endDate } })
      .sort({ date: 1, mealType: 1 }).lean();
    const payments = await Payment.find({ userId, date: { $gte: startDate, $lte: endDate } })
      .sort({ date: 1 }).lean();
    const user = await User.findById(userId).lean();

    // Build data
    const mealsByDate: Record<string, { lunch?: typeof meals[0]; dinner?: typeof meals[0] }> = {};
    for (const meal of meals) {
      if (!mealsByDate[meal.date]) mealsByDate[meal.date] = {};
      if (meal.mealType === "lunch") mealsByDate[meal.date].lunch = meal;
      else mealsByDate[meal.date].dinner = meal;
    }

    const allDates = Object.keys(mealsByDate).sort();
    let totalBill = 0, totalLunch = 0, totalDinner = 0;

    const rows = allDates.map((date) => {
      const dm = mealsByDate[date];
      const ls = dm.lunch?.status ?? "not_recorded";
      const ds = dm.dinner?.status ?? "not_recorded";
      const la = ls === "received" ? (dm.lunch?.price ?? 0) : 0;
      const da = ds === "received" ? (dm.dinner?.price ?? 0) : 0;
      const daily = la + da;
      totalBill += daily;
      if (ls === "received") totalLunch++;
      if (ds === "received") totalDinner++;
      return { date: formatDateShort(date), lunchStatus: cap(ls), lunchAmt: la, dinnerStatus: cap(ds), dinnerAmt: da, daily };
    });

    let totalPaid = 0;
    payments.forEach((p) => (totalPaid += p.amount));
    const remaining = Math.max(0, totalBill - totalPaid);

    const filename = buildFilename(startDate, endDate);
    const userName = user?.name ?? "User";

    if (format === "pdf") {
      const pdfBuffer = await generatePDF({ rows, payments, totalBill, totalPaid, remaining, totalLunch, totalDinner, startDate, endDate, userName });
      return new NextResponse(new Uint8Array(pdfBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}.pdf"`,
        },
      });
    }

    // CSV fallback
    const csvRows: string[][] = [
      ["Date", "Lunch Status", "Lunch (₹)", "Dinner Status", "Dinner (₹)", "Daily Total (₹)"],
      ...rows.map((r) => [r.date, r.lunchStatus, String(r.lunchAmt), r.dinnerStatus, String(r.dinnerAmt), String(r.daily)]),
      [],
      ["SUMMARY"],
      ["Total Lunches", String(totalLunch)],
      ["Total Dinners", String(totalDinner)],
      ["Total Meals", String(totalLunch + totalDinner)],
      ["Total Bill (₹)", String(totalBill)],
      [],
      ["PAYMENTS"],
      ["Date", "Amount (₹)", "Note"],
      ...payments.map((p) => [formatDateShort(p.date), String(p.amount), p.note ?? ""]),
      ["Total Paid (₹)", String(totalPaid)],
      ["Remaining (₹)", String(remaining)],
    ];

    const csv = csvRows.map((r) => r.map((c) => (c.includes(",") ? `"${c}"` : c)).join(",")).join("\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}.csv"`,
      },
    });
  } catch (error) {
    console.error("GET /api/export error:", error);
    return NextResponse.json({ success: false, error: getErrorMessage(error) }, { status: 500 });
  }
}

function cap(s: string) {
  return s === "received" ? "Received" : s === "not_received" ? "Not Received" : "Not Recorded";
}

function buildFilename(start: string, end: string) {
  const months = ["january","february","march","april","may","june","july","august","september","october","november","december"];
  const sm = start.substring(0, 7);
  const em = end.substring(0, 7);
  if (sm === em) {
    const [y, m] = sm.split("-");
    return `tiffin-bill-${months[parseInt(m) - 1]}-${y}`;
  }
  return `tiffin-bill-${start}-to-${end}`;
}

interface PdfRow { date: string; lunchStatus: string; lunchAmt: number; dinnerStatus: string; dinnerAmt: number; daily: number }
interface PdfPayment { date: string; amount: number; note?: string }

async function generatePDF(data: {
  rows: PdfRow[];
  payments: PdfPayment[];
  totalBill: number;
  totalPaid: number;
  remaining: number;
  totalLunch: number;
  totalDinner: number;
  startDate: string;
  endDate: string;
  userName: string;
}): Promise<Uint8Array> {
  // Use jsPDF server-side via dynamic import
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();

  // ─── Header ─────────────────────────────────────────────────────────────
  doc.setFillColor(249, 115, 22); // orange-500
  doc.rect(0, 0, pageW, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("🍱 Tiffin Tracker", 14, 12);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Bill Report for ${data.userName}`, 14, 20);
  doc.text(`Period: ${formatDateShort(data.startDate)} – ${formatDateShort(data.endDate)}`, 14, 26);

  // ─── Summary Cards ───────────────────────────────────────────────────────
  let y = 36;
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Bill Summary", 14, y);
  y += 6;

  const cards = [
    { label: "Total Bill", value: `Rs.${data.totalBill}`, bg: [219, 234, 254] as [number, number, number], fg: [30, 64, 175] as [number, number, number] },
    { label: "Total Paid", value: `Rs.${data.totalPaid}`, bg: [220, 252, 231] as [number, number, number], fg: [22, 101, 52] as [number, number, number] },
    { label: data.remaining === 0 ? "Status" : "Remaining", value: data.remaining === 0 ? "FULLY PAID" : `Rs.${data.remaining}`, bg: data.remaining === 0 ? [220, 252, 231] as [number, number, number] : [254, 226, 226] as [number, number, number], fg: data.remaining === 0 ? [22, 101, 52] as [number, number, number] : [185, 28, 28] as [number, number, number] },
  ];

  const cardW = (pageW - 28 - 8) / 3;
  cards.forEach((card, i) => {
    const x = 14 + i * (cardW + 4);
    doc.setFillColor(...card.bg);
    doc.roundedRect(x, y, cardW, 18, 3, 3, "F");
    doc.setTextColor(...card.fg);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(card.label, x + cardW / 2, y + 6, { align: "center" });
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(card.value, x + cardW / 2, y + 14, { align: "center" });
  });
  y += 26;

  // Meal stats row
  const statsCards = [
    { label: "Total Meals", value: String(data.totalLunch + data.totalDinner) },
    { label: "Lunches", value: String(data.totalLunch) },
    { label: "Dinners", value: String(data.totalDinner) },
  ];
  statsCards.forEach((c, i) => {
    const x = 14 + i * (cardW + 4);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, y, cardW, 14, 2, 2, "F");
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(c.label, x + cardW / 2, y + 5, { align: "center" });
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(c.value, x + cardW / 2, y + 12, { align: "center" });
  });
  y += 22;

  // ─── Meal Table ──────────────────────────────────────────────────────────
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Meal Details", 14, y);
  y += 4;

  if (data.rows.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [["Date", "Lunch", "Lunch (₹)", "Dinner", "Dinner (₹)", "Daily Total"]],
      body: data.rows.map((r) => [r.date, r.lunchStatus, r.lunchAmt > 0 ? `Rs.${r.lunchAmt}` : "—", r.dinnerStatus, r.dinnerAmt > 0 ? `Rs.${r.dinnerAmt}` : "—", `Rs.${r.daily}`]),
      headStyles: { fillColor: [249, 115, 22], textColor: 255, fontStyle: "bold", fontSize: 8 },
      bodyStyles: { fontSize: 8, textColor: [30, 30, 30] },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      columnStyles: {
        0: { cellWidth: 28 },
        1: { cellWidth: 28 },
        2: { cellWidth: 22, halign: "right" },
        3: { cellWidth: 28 },
        4: { cellWidth: 22, halign: "right" },
        5: { cellWidth: 28, halign: "right", fontStyle: "bold" },
      },
      margin: { left: 14, right: 14 },
      theme: "grid",
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 8;
  } else {
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text("No meal records for this period.", 14, y + 6);
    y += 14;
  }

  // ─── Payments Table ──────────────────────────────────────────────────────
  if (data.payments.length > 0) {
    if (y > 230) { doc.addPage(); y = 14; }
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("Payments", 14, y);
    y += 4;

    autoTable(doc, {
      startY: y,
      head: [["Date", "Amount", "Note"]],
      body: data.payments.map((p) => [formatDateShort(p.date), `Rs.${p.amount}`, p.note ?? "—"]),
      foot: [["Total Paid", `Rs.${data.totalPaid}`, ""]],
      headStyles: { fillColor: [34, 197, 94], textColor: 255, fontStyle: "bold", fontSize: 8 },
      bodyStyles: { fontSize: 8, textColor: [30, 30, 30] },
      footStyles: { fillColor: [220, 252, 231], textColor: [22, 101, 52], fontStyle: "bold", fontSize: 9 },
      alternateRowStyles: { fillColor: [240, 253, 244] },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 35, halign: "right" },
        2: { cellWidth: "auto" },
      },
      margin: { left: 14, right: 14 },
      theme: "grid",
    });
  }

  // ─── Footer ──────────────────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(`Generated by Tiffin Tracker • Page ${i} of ${pageCount}`, pageW / 2, 290, { align: "center" });
  }

  return new Uint8Array(Buffer.from(doc.output("arraybuffer")));
}

function formatDateShort(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split("-");
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
  } catch { return dateStr; }
}
