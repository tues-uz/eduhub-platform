import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { CourseCertificateRecord } from "@/features/courses/courseCertificatesStorage";
import { formatDisplayPersonName } from "@/lib/formatPersonName";

/** Official template (A4 portrait). Served from `/certificate-template.pdf`. */
export const CERTIFICATE_TEMPLATE_URL = "/certificate-template.pdf";

const FONT_URLS = {
  savoye: "/fonts/SavoyeLet-Regular.ttf",
  outfitRegular: "/fonts/outfit/Outfit-Regular.ttf",
  outfitSemiBold: "/fonts/outfit/Outfit-SemiBold.ttf",
} as const;

/** Left edge — aligns with “This certificate is awarded to” and the details block. */
const CONTENT_X = 126;

/**
 * Baselines (PDF bottom-left origin). Calibrated to `certificate-template.pdf`:
 * “This certificate is awarded to” ≈ y 415; signatures ≈ y 53–81.
 */
const TEXT_Y = {
  /** Baseline on the template rule (below “awarded to” at y≈415). */
  studentName: 356,
  completing: 296,
  courseTitle: 274,
  instructor: 252,
  examScore: 230,
  date: 208,
} as const;

const TEXT = {
  studentName: 64,
  body: 16,
  courseTitle: 16,
} as const;

const INK = rgb(0.1, 0.1, 0.12);
const INK_MUTED = rgb(0.22, 0.22, 0.24);

export type CourseCertificatePdfInput = {
  studentName: string;
  courseTitle: string;
  examScorePercent: number;
  instructorName: string;
  issuedAtIso: string;
};

type CertificateFonts = {
  savoye: PDFFont;
  outfit: PDFFont;
  outfitBold: PDFFont;
};

let fontBytesCache: {
  savoye: Uint8Array;
  outfit: Uint8Array;
  outfitBold: Uint8Array;
} | null = null;

function formatCertificateDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

function formatScore(percent: number): string {
  const n = Math.round(percent);
  return `${Number.isFinite(n) ? n : 0}%`;
}

function slugFilenamePart(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

async function loadFontBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Certificate font could not be loaded: ${url}`);
  }
  return new Uint8Array(await res.arrayBuffer());
}

async function loadCertificateFonts(doc: PDFDocument): Promise<CertificateFonts> {
  doc.registerFontkit(fontkit);
  if (!fontBytesCache) {
    const [savoye, outfit, outfitBold] = await Promise.all([
      loadFontBytes(FONT_URLS.savoye),
      loadFontBytes(FONT_URLS.outfitRegular),
      loadFontBytes(FONT_URLS.outfitSemiBold),
    ]);
    fontBytesCache = { savoye, outfit, outfitBold };
  }

  const [savoye, outfit, outfitBold] = await Promise.all([
    doc.embedFont(fontBytesCache.savoye),
    doc.embedFont(fontBytesCache.outfit),
    doc.embedFont(fontBytesCache.outfitBold),
  ]);

  return { savoye, outfit, outfitBold };
}

function drawLeft(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  size: number,
  font: PDFFont,
  color = INK,
) {
  page.drawText(text, { x, y, size, font, color });
}

function drawLabelValue(
  page: PDFPage,
  label: string,
  value: string,
  y: number,
  fonts: CertificateFonts,
) {
  const labelText = `${label} `;
  const labelW = fonts.outfit.widthOfTextAtSize(labelText, TEXT.body);
  drawLeft(page, labelText, CONTENT_X, y, TEXT.body, fonts.outfit, INK_MUTED);
  drawLeft(page, value, CONTENT_X + labelW, y, TEXT.body, fonts.outfitBold);
}

export function certificateRecordToPdfInput(
  record: CourseCertificateRecord,
  instructorNameFallback = "Instructor",
): CourseCertificatePdfInput {
  return {
    studentName: formatDisplayPersonName(record.studentName),
    courseTitle: record.courseTitle,
    examScorePercent: record.totalFinalScore,
    instructorName: formatDisplayPersonName(
      record.instructorName?.trim() || instructorNameFallback,
    ),
    issuedAtIso: record.issuedAt,
  };
}

export async function generateCourseCertificatePdfBytes(
  input: CourseCertificatePdfInput,
): Promise<Uint8Array> {
  const res = await fetch(CERTIFICATE_TEMPLATE_URL);
  if (!res.ok) {
    throw new Error("Certificate template could not be loaded.");
  }
  const templateBytes = new Uint8Array(await res.arrayBuffer());
  const doc = await PDFDocument.load(templateBytes);
  const page = doc.getPage(0);
  const fonts = await loadCertificateFonts(doc);

  const studentName = formatDisplayPersonName(input.studentName.trim() || "Student");
  const courseTitle = input.courseTitle.trim() || "Course";
  const instructorName = formatDisplayPersonName(input.instructorName.trim() || "Instructor");
  const scoreLabel = formatScore(input.examScorePercent);
  const dateLabel = formatCertificateDate(input.issuedAtIso);

  drawLeft(page, studentName, CONTENT_X, TEXT_Y.studentName, TEXT.studentName, fonts.savoye);

  drawLeft(
    page,
    "for successfully completing",
    CONTENT_X,
    TEXT_Y.completing,
    TEXT.body,
    fonts.outfit,
    INK_MUTED,
  );
  drawLeft(page, courseTitle, CONTENT_X, TEXT_Y.courseTitle, TEXT.courseTitle, fonts.outfitBold);
  drawLabelValue(page, "Instructor:", instructorName, TEXT_Y.instructor, fonts);
  drawLabelValue(page, "Exam Score:", scoreLabel, TEXT_Y.examScore, fonts);
  drawLeft(page, dateLabel, CONTENT_X, TEXT_Y.date, TEXT.body, fonts.outfit);

  return doc.save();
}

export async function downloadCourseCertificatePdf(
  record: CourseCertificateRecord,
  instructorNameFallback?: string,
): Promise<void> {
  const bytes = await generateCourseCertificatePdfBytes(
    certificateRecordToPdfInput(record, instructorNameFallback),
  );
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  const blob = new Blob([buffer], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const studentSlug = slugFilenamePart(record.studentName) || "student";
  const courseSlug = slugFilenamePart(record.courseTitle) || "course";
  a.href = url;
  a.download = `certificate-${courseSlug}-${studentSlug}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
