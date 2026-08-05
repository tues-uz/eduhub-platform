import type { EnrollmentApplicationResponse } from "@/api/eduhubTypes";
import type { SessionSlotLike } from "@/features/courses/classSchedulePreview";
import {
  downloadEduHubReceiptPdf,
  formatReceiptAmount,
  tuitionLineDescription,
  type EduHubReceiptPdfInput,
} from "@/features/enrollment/eduHubReceiptPdfLayout";
import { enrichEnrollmentApplication, isDemoEnrollmentDocuments } from "@/features/enrollment/enrollmentDocuments";
import {
  buildReceiptDescriptionLines,
  computeReceiptAmountPaid,
  resolveEnrollmentTuitionQuote,
} from "@/features/enrollment/enrollmentReceiptTuition";
import {
  getReceiptPdfCopy,
  type ReceiptPdfLocale,
} from "@/features/enrollment/enrollmentReceiptPdfI18n";

export type EnrollmentReceiptPdfData = EduHubReceiptPdfInput;

export { formatReceiptAmount, tuitionLineDescription };

export { computeReceiptAmountPaid } from "@/features/enrollment/enrollmentReceiptTuition";

export type BuildEnrollmentReceiptOpts = {
  teacherName?: string;
  listedTuition?: number;
  scheduleSlots?: SessionSlotLike[];
  locale?: ReceiptPdfLocale;
};

function buildReceiptPdfData(
  app: EnrollmentApplicationResponse,
  opts: BuildEnrollmentReceiptOpts,
  variant: "official" | "submission",
): EnrollmentReceiptPdfData | null {
  const locale = opts.locale ?? "en";
  const copy = getReceiptPdfCopy(locale);
  const enriched = enrichEnrollmentApplication(app);
  const listed = opts.listedTuition;
  const quote =
    listed != null && listed > 0 ? resolveEnrollmentTuitionQuote(enriched, listed, opts.scheduleSlots) : null;
  const amount = computeReceiptAmountPaid(enriched, listed, opts.scheduleSlots);
  if (amount <= 0) return null;

  const issuedAtIso =
    variant === "official"
      ? enriched.receiptIssuedAt ?? enriched.reviewedAt ?? enriched.submittedAt
      : enriched.submittedAt;

  const hasOfficial = Boolean(enriched.invoiceNumber && enriched.receiptNumber);

  return {
    variant: variant === "official" && hasOfficial ? "official" : "submission",
    issuedAtIso,
    invoiceNumber: enriched.invoiceNumber ?? copy.pendingApproval,
    receiptNumber: enriched.receiptNumber ?? copy.pendingApproval,
    paymentMethod: enriched.paymentMethod ?? "BANK_TRANSFER",
    isDemo: isDemoEnrollmentDocuments(enriched),
    fullName: enriched.fullName,
    courseTitle: enriched.courseTitle ?? enriched.courseId,
    phone: enriched.phone,
    teacherName: opts.teacherName?.trim() || "—",
    descriptionLines: buildReceiptDescriptionLines({
      issuedAtIso,
      courseTitle: enriched.courseTitle ?? enriched.courseId,
      quote,
      paymentPlan: enriched.paymentPlan,
      paymentMethod: enriched.paymentMethod ?? "BANK_TRANSFER",
      amountPaid: amount,
      currency: enriched.priceCurrency ?? "UZS",
      locale,
    }),
    currency: enriched.priceCurrency ?? "UZS",
    amount,
    locale,
  };
}

export function buildEnrollmentReceiptPdfData(
  app: EnrollmentApplicationResponse,
  opts: BuildEnrollmentReceiptOpts = {},
): EnrollmentReceiptPdfData | null {
  const enriched = enrichEnrollmentApplication(app);
  if (!enriched.invoiceNumber || !enriched.receiptNumber) return null;
  return buildReceiptPdfData(enriched, opts, "official");
}

export function buildEnrollmentSubmissionReceiptPdfData(
  app: EnrollmentApplicationResponse,
  opts: BuildEnrollmentReceiptOpts = {},
): EnrollmentReceiptPdfData | null {
  return buildReceiptPdfData(enrichEnrollmentApplication(app), opts, "submission");
}

export async function downloadEnrollmentReceiptPdf(data: EnrollmentReceiptPdfData): Promise<void> {
  await downloadEduHubReceiptPdf(data, "eduhub-receipt");
}

export async function downloadEnrollmentSubmissionReceiptPdf(
  data: EnrollmentReceiptPdfData,
): Promise<void> {
  await downloadEduHubReceiptPdf(data, "eduhub-enrollment-submission");
}
