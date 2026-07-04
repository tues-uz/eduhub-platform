import { eduhubAdminInstallmentPayments } from "@/api/eduhubClient";
import type { InstallmentPaymentManualRequest } from "@/api/eduhubTypes";
import {
  ENROLLMENT_INSTALLMENT_PAYMENTS_CHANGED,
  enrollmentInstallmentPaymentStore,
} from "@/features/enrollment/enrollmentInstallmentPaymentStore";
import type { TuitionPlanMonths } from "@/features/enrollment/enrollmentTuitionThirds";

/** Paid-months overrides are now derived from real, backend-approved installment payments. */
export const ADMIN_ENROLLMENT_PAID_MONTHS_CHANGED = ENROLLMENT_INSTALLMENT_PAYMENTS_CHANGED;

export const adminEnrollmentPaidMonthsStore = {
  /** Schedule months with an approved (real, reviewed) payment on file for this application. */
  get(applicationId: string): ReadonlySet<TuitionPlanMonths> | null {
    const approvedMonths = enrollmentInstallmentPaymentStore
      .listForApplication(applicationId)
      .filter((p) => p.status === "APPROVED")
      .map((p) => p.scheduleMonth);
    if (!approvedMonths.length) return null;
    return new Set(approvedMonths);
  },

  /** Admin records a payment collected outside the app (e.g. cash verified in person). Creates an already-approved record. */
  async recordManual(applicationId: string, body: InstallmentPaymentManualRequest): Promise<void> {
    await eduhubAdminInstallmentPayments.manualRecord(applicationId, body);
    await enrollmentInstallmentPaymentStore.refreshApplication(applicationId);
  },
};
