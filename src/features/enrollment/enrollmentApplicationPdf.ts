import { jsPDF } from "jspdf";
import type { EnrollmentApplicationRecord } from "@/features/enrollment/enrollmentApplicationStore";

export type EnrollmentApplicationPdfData = {
  submittedAtIso: string;
  courseTitle: string;
  courseId: string;
  tuitionLabel: string;
  fullName: string;
  email: string;
  phone: string;
  phoneSecondary?: string;
  address: string;
  paymentDetailLines: string[];
  proofFileName: string;
  idFileName: string;
};

const MM_LINE = 6;
const MM_MARGIN = 14;
const PAGE_H = 297;
const PAGE_BOTTOM_Y = PAGE_H - 12;

function formatMoneyLine(price: number | undefined, currency: string): string {
  if (price == null || price <= 0) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(price);
}

/** Rebuild PDF payload from a stored application (e.g. pending review). */
export function enrollmentRecordToPdfData(record: EnrollmentApplicationRecord): EnrollmentApplicationPdfData {
  const cur = record.priceCurrency ?? "USD";
  const plan = record.paymentPlan ?? "FULL";
  const lines: string[] = [];
  if (plan === "FULL") {
    lines.push("Payment plan: Full payment");
  } else {
    lines.push("Payment plan: Down payment");
    if (record.installmentCount != null) {
      lines.push(`Instalment count selected: ${record.installmentCount}`);
    }
    if (record.downPaymentAmount != null && record.downPaymentAmount > 0) {
      lines.push(`Down payment amount: ${formatMoneyLine(record.downPaymentAmount, cur)}`);
    }
    lines.push("Remaining balance and instalment dates follow school policy after verification.");
  }
  lines.push("Submitted for administrator review.");

  return {
    submittedAtIso: record.submittedAt,
    courseTitle: record.courseTitle ?? record.courseId,
    courseId: record.courseId,
    tuitionLabel: "As listed in the catalog when you applied",
    fullName: record.fullName,
    email: record.email,
    phone: record.phone,
    phoneSecondary: record.phoneSecondary,
    address: record.address,
    paymentDetailLines: lines,
    proofFileName: "Uploaded with application",
    idFileName: record.idCardUrl ? "Uploaded with application" : "—",
  };
}

function safeFilenamePart(s: string): string {
  return s
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 48) || "course";
}

export function downloadEnrollmentApplicationPdf(data: EnrollmentApplicationPdfData): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const maxW = pageW - MM_MARGIN * 2;
  let y = MM_MARGIN;

  const ensureSpace = (needed: number) => {
    if (y + needed > PAGE_BOTTOM_Y) {
      doc.addPage();
      y = MM_MARGIN;
    }
  };

  const setText = (r: number, g: number, b: number) => doc.setTextColor(r, g, b);
  const setDraw = (r: number, g: number, b: number) => doc.setDrawColor(r, g, b);
  const setFill = (r: number, g: number, b: number) => doc.setFillColor(r, g, b);

  const writeHeader = (title: string, subtitle: string) => {
    // Minimal header (clean + modern)
    ensureSpace(18);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    setText(71, 85, 105); // slate-600
    doc.text("EduHub", MM_MARGIN, y);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    setText(15, 23, 42); // slate-900-ish
    y += 8;
    doc.text(title, MM_MARGIN, y);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    setText(100, 116, 139); // slate-500
    const sub = doc.splitTextToSize(subtitle, maxW);
    doc.text(sub, MM_MARGIN, y + 6);

    y += 18;
  };

  const writeSectionTitle = (text: string) => {
    ensureSpace(9);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    setText(15, 23, 42);
    doc.text(text, MM_MARGIN, y);
    y += 4.5;
    y += 6;
  };

  const writeKeyValueRows = (rows: Array<{ label: string; value: string }>) => {
    const labelW = 42;
    const gap = 8;
    const valueW = maxW - labelW - gap;
    const lineH = 5.2;

    for (const r of rows) {
      const labelLines = doc.splitTextToSize(r.label, labelW);
      const valueLines = doc.splitTextToSize(r.value || "—", valueW);
      const lines = Math.max(labelLines.length, valueLines.length);
      const rowH = Math.max(1, lines) * lineH;

      ensureSpace(rowH + 5);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      setText(71, 85, 105);
      doc.text(labelLines, MM_MARGIN, y);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10.5);
      setText(15, 23, 42);
      doc.text(valueLines, MM_MARGIN + labelW + gap, y);

      y += rowH + 3.2;
    }

    y += 6;
  };

  const writeBulletList = (bullets: string[]) => {
    const indent = 4;
    const contentW = maxW - indent;
    const clean = bullets.map((b) => b.trim()).filter(Boolean);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    setText(15, 23, 42);

    for (const b of clean) {
      const wrapped = doc.splitTextToSize(b, contentW);
      const rowH = Math.max(1, wrapped.length) * 5.2;
      ensureSpace(rowH + 3);
      doc.text("•", MM_MARGIN, y);
      doc.text(wrapped, MM_MARGIN + indent, y);
      y += rowH + 2.2;
    }
    y += 4;
  };

  const submitted = new Date(data.submittedAtIso);
  const submittedStr = Number.isNaN(submitted.getTime())
    ? data.submittedAtIso
    : submitted.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

  writeHeader("Enrollment application", `Submitted ${submittedStr}`);

  writeSectionTitle("Course");
  writeKeyValueRows([
    { label: "Title", value: data.courseTitle },
    { label: "Class reference", value: data.courseId },
    { label: "Tuition (at submission)", value: data.tuitionLabel },
  ]);

  writeSectionTitle("Student");
  writeKeyValueRows([
    { label: "Full name", value: data.fullName },
    { label: "Email", value: data.email },
    { label: "Phone", value: data.phone },
    ...(data.phoneSecondary?.trim() ? [{ label: "Alt phone", value: data.phoneSecondary.trim() }] : []),
    { label: "Address", value: data.address.trim() || "—" },
  ]);

  writeSectionTitle("Payment");
  writeBulletList(data.paymentDetailLines);

  writeSectionTitle("Uploads");
  writeKeyValueRows([
    { label: "Payment proof", value: data.proofFileName },
    { label: "ID document", value: data.idFileName },
  ]);

  // Footer note
  ensureSpace(14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setText(100, 116, 139);
  const footer = doc.splitTextToSize(
    "Store this PDF for your records. It summarizes your submission and does not replace official receipts from your school.",
    maxW,
  );
  doc.text(footer, MM_MARGIN, PAGE_BOTTOM_Y - 6);
  setText(15, 23, 42);

  const slug = safeFilenamePart(data.courseTitle);
  const day = new Date().toISOString().slice(0, 10);
  doc.save(`eduhub-enrollment-${slug}-${day}.pdf`);
}
