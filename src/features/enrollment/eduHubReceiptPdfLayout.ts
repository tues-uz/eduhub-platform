import { jsPDF } from "jspdf";
import {
  ENROLLMENT_DOCUMENT_ORG,
  formatPaymentMethodLabel,
} from "@/features/enrollment/enrollmentDocumentConfig";
import {
  EDUHUB_RECEIPT_HEADER_LOGO_ASPECT,
  EDUHUB_RECEIPT_STAMP_ASPECT,
  loadEduHubReceiptPdfLogos,
  type EduHubReceiptPdfLogos,
} from "@/features/enrollment/enrollmentReceiptLogo";

/** Cream page background from school receipt sample. */
const PAGE_BG = { r: 242, g: 237, b: 228 } as const;
const TITLE_BLUE = { r: 37, g: 84, b: 208 } as const;
const MM_MARGIN = 14;
const PAGE_BOTTOM = 285;
const TABLE_BODY_ROWS = 11;

export type EduHubReceiptPdfInput = {
  variant: "official" | "submission";
  issuedAtIso: string;
  invoiceNumber: string;
  receiptNumber: string;
  paymentMethod: string;
  fullName: string;
  courseTitle: string;
  phone: string;
  teacherName: string;
  /** Detailed line items for the DESCRIPTION column (multi-line). */
  descriptionLines: string[];
  currency: string;
  amount: number;
  isDemo?: boolean;
};

export function formatReceiptAmount(amount: number, currency: string): string {
  if (!Number.isFinite(amount) || amount <= 0) return "—";
  const cur = currency.toUpperCase();
  if (cur === "UZS" || cur === "SUM") {
    const n = Math.round(amount);
    const grouped = n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return `${grouped} SO'M`;
  }
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: cur === "SUM" ? "UZS" : cur,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount} ${cur}`;
  }
}

export function tuitionLineDescription(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "TUITION FEE";
  const month = d.toLocaleString("en-US", { month: "long" }).toUpperCase();
  const year = d.getFullYear();
  return `TUITION FEE ${month} ${year}`;
}

function safeFilenamePart(s: string): string {
  return s
    .trim()
    .replace(/[^\w\s.-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 40) || "document";
}

function formatReceiptDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.toUpperCase();
  return d
    .toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    .toUpperCase();
}

function paintPageBackground(doc: jsPDF) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  doc.setFillColor(PAGE_BG.r, PAGE_BG.g, PAGE_BG.b);
  doc.rect(0, 0, w, h, "F");
}

const STAMP_WIDTH_MM = 40;
/** Top-right header logo — ~same visual height as “RECEIPT” title (reference receipt). */
const HEADER_LOGO_WIDTH_MM = 22;

function drawLabelValue(
  doc: jsPDF,
  label: string,
  value: string,
  x: number,
  y: number,
  labelW: number,
) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(55, 55, 55);
  doc.text(label, x, y);

  doc.setFont("courier", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(20, 20, 20);
  const valueLines = doc.splitTextToSize(value, 120);
  doc.text(valueLines, x + labelW, y);
}

export function renderEduHubReceiptPdf(
  doc: jsPDF,
  data: EduHubReceiptPdfInput,
  logos?: EduHubReceiptPdfLogos | null,
): void {
  const headerLogo = logos?.header ?? null;
  const stampLogo = logos?.stamp ?? null;
  paintPageBackground(doc);

  const pageW = doc.internal.pageSize.getWidth();
  const rightX = pageW - MM_MARGIN;
  let y = MM_MARGIN;

  const amountStr = formatReceiptAmount(data.amount, data.currency);
  const dateLabel = formatReceiptDate(data.issuedAtIso);
  const paymentLabel = formatPaymentMethodLabel(data.paymentMethod).toUpperCase();

  // Title — large blue header (reference receipt)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(52);
  doc.setTextColor(TITLE_BLUE.r, TITLE_BLUE.g, TITLE_BLUE.b);
  doc.text("RECEIPT", MM_MARGIN, y + 16);

  /** Logo + contact align with the main table right edge (`rightX`). */
  const orgBlockRight = rightX;
  const logoX = orgBlockRight - HEADER_LOGO_WIDTH_MM;
  let orgTextY = y;
  if (headerLogo) {
    const logoH = HEADER_LOGO_WIDTH_MM * EDUHUB_RECEIPT_HEADER_LOGO_ASPECT;
    doc.addImage(headerLogo, "PNG", logoX, y, HEADER_LOGO_WIDTH_MM, logoH);
    orgTextY = y + logoH + 3;
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(70, 70, 70);
  doc.text(ENROLLMENT_DOCUMENT_ORG.addressLine, orgBlockRight, orgTextY, { align: "right" });
  doc.text(`Phone: ${ENROLLMENT_DOCUMENT_ORG.phone}`, orgBlockRight, orgTextY + 4, { align: "right" });
  doc.text(`Telegram: ${ENROLLMENT_DOCUMENT_ORG.telegram}`, orgBlockRight, orgTextY + 8, {
    align: "right",
  });

  y = Math.max(y + 38, orgTextY + 14);

  if (data.variant === "submission") {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(120, 90, 40);
    doc.text(
      "SUBMISSION COPY — Official INV/REC numbers are issued after the school approves your enrollment.",
      MM_MARGIN,
      y,
    );
    y += 6;
  } else if (data.isDemo && import.meta.env.DEV) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(160, 90, 0);
    doc.text("DEMO DOCUMENT — numbers not issued by server", MM_MARGIN, y);
    y += 6;
  }

  const labelW = 38;
  const metaRows: [string, string][] = [
    ["DATE:", dateLabel],
    ["RECEIPT NUMBER:", data.receiptNumber],
    ["INVOICE NUMBER:", data.invoiceNumber],
    ["PAYMENT METHOD:", paymentLabel],
  ];
  for (const [label, value] of metaRows) {
    drawLabelValue(doc, label, value, MM_MARGIN, y, labelW);
    y += 6;
  }

  y += 3;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(55, 55, 55);
  doc.text("RECEIVED FROM:", MM_MARGIN, y);
  y += 5.5;
  doc.setFont("courier", "normal");
  doc.setFontSize(9);
  doc.setTextColor(20, 20, 20);
  doc.text(data.fullName.toUpperCase(), MM_MARGIN, y);
  y += 5;
  const courseLines = doc.splitTextToSize(data.courseTitle.toUpperCase(), pageW - MM_MARGIN * 2);
  doc.text(courseLines, MM_MARGIN, y);
  y += courseLines.length * 4.8;
  doc.text(data.phone.replace(/\s/g, ""), MM_MARGIN, y);
  y += 10;

  // Table
  const colDesc = MM_MARGIN;
  const colTeacher = 72;
  const colPrice = 132;
  const colSub = 162;
  const tableW = rightX - MM_MARGIN;
  const rowH = 7.2;
  const headerH = 7;
  const bodyRows = TABLE_BODY_ROWS;
  const descColW = colTeacher - colDesc - 6;
  const descPadTop = 2.5;
  const descLineH = 3.6;

  doc.setFont("courier", "normal");
  doc.setFontSize(6.5);
  const wrappedDesc: string[] = [];
  for (const block of data.descriptionLines) {
    const t = block.trim();
    if (!t) continue;
    wrappedDesc.push(...doc.splitTextToSize(t, descColW));
  }
  if (wrappedDesc.length === 0) {
    wrappedDesc.push("TUITION FEE");
  }
  const firstRowH = Math.max(rowH, descPadTop + wrappedDesc.length * descLineH + 2);
  const tableH = headerH + firstRowH + rowH * bodyRows;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.35);
  doc.rect(MM_MARGIN, y, tableW, tableH);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(45, 45, 45);
  const hy = y + 4.8;
  doc.text("DESCRIPTION", colDesc + 2, hy, { align: "left" });
  doc.text("TEACHER", colTeacher + 2, hy);
  doc.text("PRICE", colPrice + 2, hy);
  doc.text("SUBTOTAL", colSub + 2, hy);

  doc.line(MM_MARGIN, y + headerH, rightX, y + headerH);
  doc.line(colTeacher, y, colTeacher, y + tableH);
  doc.line(colPrice, y, colPrice, y + tableH);
  doc.line(colSub, y, colSub, y + tableH);

  const firstRowTop = y + headerH;
  const firstRowBottom = firstRowTop + firstRowH;
  doc.line(MM_MARGIN, firstRowBottom, rightX, firstRowBottom);
  let emptyRowTop = firstRowBottom;
  for (let i = 0; i < bodyRows; i++) {
    emptyRowTop += rowH;
    doc.line(MM_MARGIN, emptyRowTop, rightX, emptyRowTop);
  }

  doc.setFont("courier", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(20, 20, 20);
  doc.text(wrappedDesc, colDesc + 3, firstRowTop + descPadTop + 2.5);

  const amountRowY = firstRowTop + firstRowH / 2 + 1;
  doc.setFontSize(7.5);
  const teacherLines = doc.splitTextToSize(data.teacherName.toUpperCase(), colPrice - colTeacher - 4);
  doc.text(teacherLines, colTeacher + 2, amountRowY);
  doc.text(amountStr, colPrice + 2, amountRowY);
  doc.text(amountStr, colSub + 2, amountRowY);

  for (let i = 0; i < bodyRows; i++) {
    const ry = firstRowBottom + rowH * i + 4.8;
    doc.text("—", colTeacher + 2, ry);
    doc.text("—", colPrice + 2, ry);
    doc.text("—", colSub + 2, ry);
  }

  y += tableH + 5;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(45, 45, 45);
  doc.text("TAX:", colPrice, y);
  doc.setFont("courier", "normal");
  doc.text("—", colSub, y);
  y += 7;
  doc.setLineWidth(0.6);
  doc.line(colPrice - 2, y - 4, rightX, y - 4);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("GRAND TOTAL:", colPrice, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.text(amountStr, colSub, y);

  y += 14;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(50, 50, 50);
  doc.text("CANCELLATIONS & REFUNDS:", MM_MARGIN, y);
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(40, 40, 40);
  for (const line of ENROLLMENT_DOCUMENT_ORG.cancellationLines) {
    doc.text(line, MM_MARGIN, y);
    y += 3.5;
  }
  y += 3;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text(ENROLLMENT_DOCUMENT_ORG.helpLine, MM_MARGIN, y);

  const nameY = PAGE_BOTTOM - 12;
  const titleY = nameY + 4;
  const stampX = rightX - STAMP_WIDTH_MM;
  const sigCenterX = stampX + STAMP_WIDTH_MM / 2;
  if (stampLogo) {
    const stampH = STAMP_WIDTH_MM * EDUHUB_RECEIPT_STAMP_ASPECT;
    const stampY = nameY - stampH - 2;
    doc.addImage(stampLogo, "PNG", stampX, stampY, STAMP_WIDTH_MM, stampH);
  } else {
    doc.setDrawColor(TITLE_BLUE.r, TITLE_BLUE.g, TITLE_BLUE.b);
    doc.setLineWidth(0.35);
    doc.circle(sigCenterX, nameY - 8, 11, "S");
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(20, 20, 20);
  doc.text(ENROLLMENT_DOCUMENT_ORG.signatoryName, sigCenterX, nameY, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(80, 80, 80);
  doc.text(ENROLLMENT_DOCUMENT_ORG.signatoryTitle, sigCenterX, titleY, { align: "center" });
}

export async function downloadEduHubReceiptPdf(
  data: EduHubReceiptPdfInput,
  filenameBase: string,
): Promise<void> {
  const logos = await loadEduHubReceiptPdfLogos();
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  renderEduHubReceiptPdf(doc, data, logos);
  const slug = safeFilenamePart(
    data.variant === "official" ? data.receiptNumber : filenameBase,
  );
  doc.save(`${filenameBase}-${slug}.pdf`);
}
