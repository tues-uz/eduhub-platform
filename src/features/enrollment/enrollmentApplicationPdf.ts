import type { EnrollmentApplicationRecord } from "@/features/enrollment/enrollmentApplicationStore";
import type { EduHubReceiptPdfInput } from "@/features/enrollment/eduHubReceiptPdfLayout";
import { downloadEnrollmentSubmissionReceiptPdf } from "@/features/enrollment/enrollmentReceiptPdf";
import {
  buildReceiptDescriptionLines,
  resolveEnrollmentTuitionQuote,
} from "@/features/enrollment/enrollmentReceiptTuition";
import { enrollmentMonthsPaidLabel } from "@/features/enrollment/enrollmentTuitionThirds";

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
  /** For receipt-style PDF */
  amount?: number;
  currency?: string;
  paymentMethod?: string;
  teacherName?: string;
  paymentPlan?: "FULL" | "DOWN_PAYMENT";
  joinFromSessionNumber?: number;
  scheduleSessionCount?: number;
};

function formatMoneyLine(price: number | undefined, currency: string): string {
  if (price == null || price <= 0) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(price);
}

function parseAmountFromTuitionLabel(label: string): number {
  const digits = label.replace(/[^\d]/g, "");
  const n = Number(digits);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function applicationPdfDataToReceiptInput(data: EnrollmentApplicationPdfData): EduHubReceiptPdfInput | null {
  const amount =
    data.amount != null && data.amount > 0 ? data.amount : parseAmountFromTuitionLabel(data.tuitionLabel);
  if (amount <= 0) return null;

  const listedGuess = parseAmountFromTuitionLabel(data.tuitionLabel);
  const quote =
    data.scheduleSessionCount != null &&
    data.scheduleSessionCount > 0 &&
    listedGuess > 0
      ? resolveEnrollmentTuitionQuote(
          {
            id: "",
            courseId: data.courseId,
            courseTitle: data.courseTitle,
            applicantEmailNorm: "",
            fullName: data.fullName,
            email: data.email,
            phone: data.phone,
            address: data.address,
            paymentPlan: data.paymentPlan ?? "FULL",
            downPaymentAmount: amount,
            priceCurrency: data.currency,
            joinFromSessionNumber: data.joinFromSessionNumber,
            scheduleSessionCount: data.scheduleSessionCount,
            status: "PENDING",
            submittedAt: data.submittedAtIso,
          },
          listedGuess,
        )
      : null;

  return {
    variant: "submission",
    issuedAtIso: data.submittedAtIso,
    invoiceNumber: "Pending approval",
    receiptNumber: "Pending approval",
    paymentMethod: data.paymentMethod ?? "BANK_TRANSFER",
    fullName: data.fullName,
    courseTitle: data.courseTitle,
    phone: data.phone,
    teacherName: data.teacherName?.trim() || "—",
    descriptionLines: buildReceiptDescriptionLines({
      issuedAtIso: data.submittedAtIso,
      courseTitle: data.courseTitle,
      quote,
      paymentPlan: data.paymentPlan,
      paymentMethod: data.paymentMethod ?? "BANK_TRANSFER",
      amountPaid: amount,
      currency: data.currency ?? "UZS",
    }),
    currency: data.currency ?? "UZS",
    amount,
  };
}

/** Rebuild PDF payload from a stored application (e.g. pending review). */
export function enrollmentRecordToPdfData(record: EnrollmentApplicationRecord): EnrollmentApplicationPdfData {
  const cur = record.priceCurrency ?? "UZS";
  const lines: string[] = [];
  lines.push(`Months paid: ${enrollmentMonthsPaidLabel(record)}`);
  if (record.paymentPlan === "DOWN_PAYMENT") {
    if (record.installmentCount != null) {
      lines.push(`Further instalments: ${record.installmentCount}`);
    }
    if (record.downPaymentAmount != null && record.downPaymentAmount > 0) {
      lines.push(`Amount on transfer: ${formatMoneyLine(record.downPaymentAmount, cur)}`);
    }
    lines.push("Remaining balance follows school policy after verification.");
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
    amount: record.downPaymentAmount,
    currency: cur,
    paymentMethod: record.paymentMethod,
  };
}

/** Same layout as official school receipt; marked as submission until INV/REC are issued. */
export async function downloadEnrollmentApplicationPdf(
  data: EnrollmentApplicationPdfData,
): Promise<void> {
  const receipt = applicationPdfDataToReceiptInput(data);
  if (!receipt) {
    return;
  }
  await downloadEnrollmentSubmissionReceiptPdf(receipt);
}
