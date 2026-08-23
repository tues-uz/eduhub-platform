import type { EnrollmentApplicationResponse } from "@/api/eduhubTypes";
import { eduhubAdminEnrollmentApplications } from "@/api/eduhubClient";
import { enrollmentDocumentStore } from "@/features/enrollment/enrollmentDocumentStore";
import { enrichEnrollmentApplication } from "@/features/enrollment/enrollmentDocuments";
import type { SessionSlotLike } from "@/features/courses/classSchedulePreview";
import { computeReceiptAmountPaid } from "@/features/enrollment/enrollmentReceiptTuition";

/**
 * Fill in the receipt amount for an approved application. The backend always issues real
 * invoice/receipt numbers on approve — if they're ever missing, downstream PDF builders
 * already fall back to a "pending approval" receipt rather than fabricating a fake number.
 */
export function ensureEnrollmentDocuments(
  app: EnrollmentApplicationResponse,
  listedTuition?: number,
  scheduleSlots?: SessionSlotLike[],
): EnrollmentApplicationResponse {
  let enriched = enrichEnrollmentApplication(app);
  if (enriched.invoiceNumber && enriched.receiptNumber) {
    enrollmentDocumentStore.syncFromApi(enriched.id, enriched);
  }
  const amountPaid = computeReceiptAmountPaid(enriched, listedTuition, scheduleSlots);
  if (amountPaid > 0 && enriched.amountPaid !== amountPaid) {
    enriched = { ...enriched, amountPaid };
  }
  return enriched;
}

export async function approveEnrollmentApplication(
  applicationId: string,
  opts: {
    listedTuition?: number;
    adminActionCode: string;
  },
): Promise<EnrollmentApplicationResponse> {
  const approved = await eduhubAdminEnrollmentApplications.approve(applicationId, {
    adminActionCode: opts.adminActionCode,
  });
  // The backend creates the student/admin "enrollment approved" notifications as part of approve().
  return ensureEnrollmentDocuments(approved, opts.listedTuition);
}
