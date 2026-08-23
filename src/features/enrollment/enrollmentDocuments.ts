import type { EnrollmentApplicationResponse } from "@/api/eduhubTypes";
import { enrollmentDocumentStore } from "@/features/enrollment/enrollmentDocumentStore";

/** Merge API document fields with local demo store (API wins when present). */
export function enrichEnrollmentApplication(
  app: EnrollmentApplicationResponse,
): EnrollmentApplicationResponse {
  const local = enrollmentDocumentStore.get(app.id);
  if (app.invoiceNumber && app.receiptNumber) {
    enrollmentDocumentStore.syncFromApi(app.id, app);
    return app;
  }
  if (!local) return app;
  return {
    ...app,
    invoiceNumber: app.invoiceNumber ?? local.invoiceNumber,
    receiptNumber: app.receiptNumber ?? local.receiptNumber,
    paymentMethod: app.paymentMethod ?? local.paymentMethod,
    invoiceIssuedAt: app.invoiceIssuedAt ?? local.invoiceIssuedAt,
    receiptIssuedAt: app.receiptIssuedAt ?? local.receiptIssuedAt,
    amountPaid: app.amountPaid ?? local.amountPaid,
  };
}

export function enrichEnrollmentApplications(
  apps: EnrollmentApplicationResponse[],
): EnrollmentApplicationResponse[] {
  return apps.map(enrichEnrollmentApplication);
}

export function hasOfficialEnrollmentDocuments(app: EnrollmentApplicationResponse): boolean {
  const e = enrichEnrollmentApplication(app);
  return Boolean(e.invoiceNumber && e.receiptNumber && e.status === "APPROVED");
}
