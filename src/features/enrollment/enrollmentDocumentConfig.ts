/** Org block printed on enrollment invoice/receipt PDFs. */
export const ENROLLMENT_DOCUMENT_ORG = {
  name: "EDU HUB",
  institutionLine: "TERMEZ IQTISODIYOT VA SERVIS UNIVERSITETI",
  tagline: "LEARN TODAY, LEAD TOMORROW",
  addressLine: "38B, IBN SINO, TERMEZ",
  phone: "+ 998 77 222 32 33",
  telegram: "@EDUHUB_TISU_ADMIN",
  signatoryName: "RIYADI MAULAYA T.",
  signatoryTitle: "FINANCE",
  cancellationLines: [
    "1. Payment is not refundable.",
    "2. Related agreements shall be governed by the laws of Uzbekistan country.",
  ],
  helpLine: "FOR ANY QUESTIONS, PLEASE CONTACT OUR ADMIN STAFF.",
} as const;

export const DEFAULT_ENROLLMENT_PAYMENT_METHOD = "BANK_TRANSFER";

/** How the student pays at enrollment (submitted with the application). */
export type EnrollmentPaymentMethod = "CASH" | "BANK_TRANSFER";

export function isCashEnrollmentPayment(method: string | undefined): boolean {
  return (method ?? "").toUpperCase() === "CASH";
}

/** Transfer requires ID + payment proof uploads; cash does not. */
export function enrollmentRequiresVerificationUploads(method: string | undefined): boolean {
  return !isCashEnrollmentPayment(method);
}

export function formatPaymentMethodLabel(code: string | undefined): string {
  const c = (code ?? DEFAULT_ENROLLMENT_PAYMENT_METHOD).toUpperCase();
  if (c === "BANK_TRANSFER" || c === "TRANSFER") return "Transfer";
  if (c === "CASH") return "Cash";
  return c.replace(/_/g, " ");
}
