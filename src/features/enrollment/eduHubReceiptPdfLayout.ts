import { jsPDF } from "jspdf";
import { ENROLLMENT_DOCUMENT_ORG } from "@/features/enrollment/enrollmentDocumentConfig";
import {
  EDUHUB_RECEIPT_HEADER_LOGO_ASPECT,
  EDUHUB_RECEIPT_STAMP_ASPECT,
  loadEduHubReceiptPdfLogos,
  type EduHubReceiptPdfLogos,
} from "@/features/enrollment/enrollmentReceiptLogo";
import {
  formatPaymentMethodLabelLocalized,
  getReceiptPdfCopy,
  type ReceiptPdfLocale,
} from "@/features/enrollment/enrollmentReceiptPdfI18n";

const BRAND = { r: 57, g: 84, b: 208 } as const;
const INK = { r: 9, g: 9, b: 11 } as const;
const MUTED = { r: 113, g: 113, b: 122 } as const;
const LINE = { r: 228, g: 228, b: 231 } as const;

/** Typography scale (pt) — tuned for print readability. */
const FONT = {
  docTitle: 24,
  amountHero: 15,
  orgName: 14,
  orgBody: 8,
  orgSmall: 7.5,
  metaLabel: 8.5,
  metaValue: 9.5,
  section: 7.5,
  studentName: 11.5,
  studentCourse: 10.5,
  studentPhone: 9,
  lineItem: 9.5,
  lineItemWrap: 9,
  teacher: 8.5,
  lineAmount: 11,
  totalLabel: 9.5,
  totalAmount: 14,
  notice: 8,
  legalTitle: 8,
  legalBody: 7.5,
  signName: 7.5,
  signTitle: 7,
} as const;

const M = 20;
const LOGO_W = 28;
const STAMP_W = 40;
/** 16px at 96dpi → mm for jsPDF */
const STAMP_FOOTER_GAP_MM = (16 * 25.4) / 96;

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
  descriptionLines: string[];
  currency: string;
  amount: number;
  isDemo?: boolean;
  /** Receipt UI language (defaults to English). */
  locale?: ReceiptPdfLocale;
};

export function formatReceiptAmount(amount: number, currency: string): string {
  if (!Number.isFinite(amount) || amount <= 0) return "—";
  const cur = currency.toUpperCase();
  if (cur === "UZS" || cur === "SUM") {
    const n = Math.round(amount);
    return `${n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")} SO'M`;
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

export function tuitionLineDescription(iso: string, locale: ReceiptPdfLocale = "en"): string {
  const copy = getReceiptPdfCopy(locale);
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return copy.tuitionFee;
  const month = copy.months[d.getMonth()] ?? "";
  const year = d.getFullYear();
  return `${copy.tuitionFee} ${month} ${year}`;
}

function safeFilenamePart(s: string): string {
  return s
    .trim()
    .replace(/[^\w\s.-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 40) || "document";
}

function formatReceiptDate(iso: string, locale: ReceiptPdfLocale = "en"): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  if (locale === "uz") {
    const copy = getReceiptPdfCopy("uz");
    const month = copy.months[d.getMonth()] ?? "";
    return `${d.getDate()} ${month.toLowerCase()} ${d.getFullYear()}`;
  }
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

type RGB = { r: number; g: number; b: number };

function ink(doc: jsPDF, c: RGB) {
  doc.setTextColor(c.r, c.g, c.b);
}

function rule(doc: jsPDF, y: number, x1: number, x2: number, weight = 0.2) {
  doc.setDrawColor(LINE.r, LINE.g, LINE.b);
  doc.setLineWidth(weight);
  doc.line(x1, y, x2, y);
}

function sectionTitle(doc: jsPDF, label: string, x: number, y: number) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(FONT.section);
  ink(doc, MUTED);
  doc.text(label, x, y);
}

function metaLine(doc: jsPDF, label: string, value: string, y: number, rightX: number, labelX: number) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(FONT.metaLabel);
  ink(doc, MUTED);
  doc.text(label, labelX, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(FONT.metaValue);
  ink(doc, INK);
  doc.text(value, rightX, y, { align: "right" });
}

function wrapDescription(doc: jsPDF, lines: string[], maxW: number): string[] {
  const out: string[] = [];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(FONT.lineItemWrap);
  for (const block of lines) {
    const t = block.trim();
    if (!t) continue;
    out.push(...doc.splitTextToSize(t, maxW));
  }
  return out.length > 0 ? out : ["TUITION FEE"];
}

export function renderEduHubReceiptPdf(
  doc: jsPDF,
  data: EduHubReceiptPdfInput,
  logos?: EduHubReceiptPdfLogos | null,
): void {
  const copy = getReceiptPdfCopy(data.locale ?? "en");
  const headerLogo = logos?.header ?? null;
  const stampAsset = logos?.stamp ?? null;

  const pageW = doc.internal.pageSize.getWidth();
  const rightX = pageW - M;
  const contentW = pageW - M * 2;
  const metaLabelX = pageW * 0.52;

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageW, doc.internal.pageSize.getHeight(), "F");

  const amountStr = formatReceiptAmount(data.amount, data.currency);
  const dateLabel = formatReceiptDate(data.issuedAtIso, data.locale ?? "en");
  const paymentLabel = formatPaymentMethodLabelLocalized(
    data.paymentMethod,
    data.locale ?? "en",
  ).toUpperCase();

  let y = M;

  // Header: issuer (left) + document summary (right)
  let leftY = y;
  if (headerLogo) {
    const logoH = LOGO_W * EDUHUB_RECEIPT_HEADER_LOGO_ASPECT;
    doc.addImage(headerLogo, "PNG", M, leftY, LOGO_W, logoH);
    leftY += logoH + 5;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(FONT.orgName);
  ink(doc, INK);
  doc.text(ENROLLMENT_DOCUMENT_ORG.name, M, leftY);
  leftY += 5.5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(FONT.orgBody);
  ink(doc, MUTED);
  const instLines = doc.splitTextToSize(ENROLLMENT_DOCUMENT_ORG.institutionLine, contentW * 0.46);
  doc.text(instLines, M, leftY);
  leftY += instLines.length * 3.8 + 1.5;

  doc.setFontSize(FONT.orgSmall);
  doc.text(ENROLLMENT_DOCUMENT_ORG.tagline, M, leftY);
  leftY += 5;
  doc.text(ENROLLMENT_DOCUMENT_ORG.addressLine, M, leftY);
  leftY += 4;
  doc.text(`${copy.phonePrefix} ${ENROLLMENT_DOCUMENT_ORG.phone}`, M, leftY);
  leftY += 4;
  doc.text(`${copy.telegramPrefix} ${ENROLLMENT_DOCUMENT_ORG.telegram}`, M, leftY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(FONT.docTitle);
  ink(doc, INK);
  doc.text(copy.receiptTitle, rightX, y + 6, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(FONT.amountHero);
  ink(doc, BRAND);
  doc.text(amountStr, rightX, y + 15, { align: "right" });

  let metaY = y + 24;
  metaLine(doc, copy.invoiceNo, data.invoiceNumber, metaY, rightX, metaLabelX);
  metaY += 6;
  metaLine(doc, copy.receiptNo, data.receiptNumber, metaY, rightX, metaLabelX);
  metaY += 6;
  metaLine(doc, copy.date, dateLabel, metaY, rightX, metaLabelX);
  metaY += 6;
  metaLine(doc, copy.paymentMethod, paymentLabel, metaY, rightX, metaLabelX);

  y = Math.max(leftY, metaY) + 11;
  rule(doc, y, M, rightX);
  y += 10;

  if (data.variant === "submission") {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(FONT.notice);
    ink(doc, MUTED);
    doc.text(copy.submissionNotice, M, y, { maxWidth: contentW });
    y += 9;
    rule(doc, y, M, rightX, 0.15);
    y += 10;
  }

  sectionTitle(doc, copy.receivedFrom, M, y);
  y += 7;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(FONT.studentName);
  ink(doc, INK);
  doc.text(data.fullName.toUpperCase(), M, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(FONT.studentCourse);
  ink(doc, INK);
  const courseLines = doc.splitTextToSize(data.courseTitle.toUpperCase(), contentW * 0.72);
  doc.text(courseLines, M, y);
  y += courseLines.length * 4.4 + 1.5;

  doc.setFontSize(FONT.studentPhone);
  ink(doc, MUTED);
  doc.text(data.phone.replace(/\s/g, ""), M, y);
  y += 13;

  rule(doc, y, M, rightX);
  y += 10;

  sectionTitle(doc, copy.description, M, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(FONT.section);
  ink(doc, MUTED);
  doc.text(copy.amount, rightX, y, { align: "right" });
  y += 8;

  const descW = contentW * 0.62;
  const wrappedDesc = wrapDescription(doc, data.descriptionLines, descW);
  const itemTop = y;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(FONT.lineItem);
  ink(doc, INK);
  doc.text(wrappedDesc, M, y);
  const descH = wrappedDesc.length * 4.3;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(FONT.teacher);
  ink(doc, MUTED);
  const teacherLabel = `${copy.teacher} · ${data.teacherName.toUpperCase()}`;
  const teacherLines = doc.splitTextToSize(teacherLabel, descW);
  doc.text(teacherLines, M, itemTop + descH + 2.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(FONT.lineAmount);
  ink(doc, INK);
  doc.text(amountStr, rightX, itemTop + 3.5, { align: "right" });

  y = itemTop + descH + teacherLines.length * 4 + 13;
  rule(doc, y, M, rightX);
  y += 9;

  const totalsLabelX = rightX - 62;
  metaLine(doc, copy.tax, "—", y, rightX, totalsLabelX);
  y += 8;
  rule(doc, y, totalsLabelX, rightX, 0.35);
  y += 7;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(FONT.totalLabel);
  ink(doc, INK);
  doc.text(copy.grandTotal, totalsLabelX, y);
  doc.setFontSize(FONT.totalAmount);
  ink(doc, BRAND);
  doc.text(amountStr, rightX, y + 0.5, { align: "right" });

  y += 17;
  rule(doc, y, M, rightX, 0.15);
  y += 9;
  const legalTopY = y;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(FONT.legalTitle);
  ink(doc, INK);
  doc.text(copy.cancellationsTitle, M, y);

  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(FONT.legalBody);
  ink(doc, MUTED);
  for (const line of copy.cancellationLines) {
    doc.text(line, M, y, { maxWidth: contentW * 0.58 });
    y += 4;
  }
  y += 2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(FONT.legalBody);
  ink(doc, INK);
  doc.text(copy.helpLine, M, y, { maxWidth: contentW * 0.58 });

  const stampX = rightX - STAMP_W;
  const sigX = stampX + STAMP_W / 2;
  const signatoryTopY = legalTopY;
  const stampToNameGap = STAMP_FOOTER_GAP_MM;
  const titleOffset = 2;

  let nameY = signatoryTopY + stampToNameGap;
  if (stampAsset) {
    const stampAspect = stampAsset.aspect > 0 ? stampAsset.aspect : EDUHUB_RECEIPT_STAMP_ASPECT;
    const stampH = STAMP_W * stampAspect;
    doc.addImage(stampAsset.dataUrl, "PNG", stampX, signatoryTopY, STAMP_W, stampH);
    nameY = signatoryTopY + stampH + stampToNameGap;
  } else {
    doc.setDrawColor(BRAND.r, BRAND.g, BRAND.b);
    doc.setLineWidth(0.25);
    doc.circle(sigX, signatoryTopY + 9, 9, "S");
    nameY = signatoryTopY + 18 + stampToNameGap;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(FONT.signName);
  ink(doc, INK);
  doc.text(ENROLLMENT_DOCUMENT_ORG.signatoryName, sigX, nameY, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(FONT.signTitle);
  ink(doc, MUTED);
  doc.text(ENROLLMENT_DOCUMENT_ORG.signatoryTitle, sigX, nameY + titleOffset, { align: "center" });
}

export async function downloadEduHubReceiptPdf(
  data: EduHubReceiptPdfInput,
  filenameBase: string,
): Promise<void> {
  const logos = await loadEduHubReceiptPdfLogos();
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  renderEduHubReceiptPdf(doc, data, logos);
  const locale = data.locale ?? "en";
  const slug = safeFilenamePart(
    data.variant === "official" ? data.receiptNumber : filenameBase,
  );
  doc.save(`${filenameBase}-${locale}-${slug}.pdf`);
}
