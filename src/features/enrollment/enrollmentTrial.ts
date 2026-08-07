import type { EnrollmentApplicationResponse } from "@/api/eduhubTypes";

export function enrollmentHasTrialCode(
  app: Pick<EnrollmentApplicationResponse, "trialCode"> | null | undefined,
): boolean {
  return Boolean(app?.trialCode?.trim());
}

export function formatEnrollmentTrialCode(
  app: Pick<EnrollmentApplicationResponse, "trialCode"> | null | undefined,
): string | null {
  const code = app?.trialCode?.trim();
  return code || null;
}

/** Approved trial enrollment still needs tuition before full continued access. */
export function trialEnrollmentNeedsContinuePayment(opts: {
  paidMonthCount: number;
  totalMonths: number;
  hasOutstandingTuition: boolean;
}): boolean {
  if (!opts.hasOutstandingTuition && opts.totalMonths > 0 && opts.paidMonthCount >= opts.totalMonths) {
    return false;
  }
  if (opts.hasOutstandingTuition) return true;
  return opts.paidMonthCount === 0;
}
