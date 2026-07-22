import type { EnrollmentApplicationResponse, EnrollmentPaymentMethod } from "@/api/eduhubTypes";
import { eduhubAdminEnrollmentApplications } from "@/api/eduhubClient";
import {
  allocateDemoEnrollmentDocuments,
  enrollmentDocumentStore,
} from "@/features/enrollment/enrollmentDocumentStore";
import { enrichEnrollmentApplication } from "@/features/enrollment/enrollmentDocuments";
import type { SessionSlotLike } from "@/features/courses/classSchedulePreview";
import { computeReceiptAmountPaid } from "@/features/enrollment/enrollmentReceiptTuition";

function mergeDocumentFields(
  app: EnrollmentApplicationResponse,
  doc: {
    invoiceNumber: string;
    receiptNumber: string;
    paymentMethod: EnrollmentPaymentMethod;
    invoiceIssuedAt: string;
    receiptIssuedAt: string;
    amountPaid?: number;
  },
): EnrollmentApplicationResponse {
  return {
    ...app,
    invoiceNumber: doc.invoiceNumber,
    receiptNumber: doc.receiptNumber,
    paymentMethod: doc.paymentMethod,
    invoiceIssuedAt: doc.invoiceIssuedAt,
    receiptIssuedAt: doc.receiptIssuedAt,
    amountPaid: doc.amountPaid,
  };
}

/** Ensure approved application has INV/REC (API or demo store). */
export function ensureEnrollmentDocuments(
  app: EnrollmentApplicationResponse,
  listedTuition?: number,
  scheduleSlots?: SessionSlotLike[],
): EnrollmentApplicationResponse {
  let enriched = enrichEnrollmentApplication(app);
  if (enriched.invoiceNumber && enriched.receiptNumber) {
    enrollmentDocumentStore.syncFromApi(enriched.id, enriched);
    const amountPaid = computeReceiptAmountPaid(enriched, listedTuition, scheduleSlots);
    if (amountPaid > 0 && enriched.amountPaid !== amountPaid) {
      enriched = { ...enriched, amountPaid };
    }
    return enriched;
  }
  if (enriched.status !== "APPROVED") return enriched;

  const issuedAt = enriched.reviewedAt ?? new Date().toISOString();
  const amountPaid = computeReceiptAmountPaid(enriched, listedTuition, scheduleSlots);
  const doc = allocateDemoEnrollmentDocuments(
    enriched.id,
    issuedAt,
    amountPaid,
    enriched.paymentMethod ?? undefined,
  );
  enriched = mergeDocumentFields(enriched, doc);
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
