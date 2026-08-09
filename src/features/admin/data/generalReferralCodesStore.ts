/**
 * General referral / discount / trial codes — server-side source of truth.
 *
 * The single settings row lives in `general_referral_code` (Flyway V32), managed
 * by admins via `PATCH /admin/referral-codes/general` and read by students via
 * `GET /referral-codes/general` to preview discounts at enrollment.
 * Shared per-tab cache keeps repeated reads off the API while staying fresh
 * within a session; there is intentionally NO local-storage write path anymore.
 */
import { eduhubReferralCodes } from "@/api/eduhubClient";
import type { GeneralReferralCodeResponse } from "@/api/eduhubTypes";

let cachedPromise: Promise<GeneralReferralCodeResponse | null> | null = null;

export function loadGeneralReferralCodes(): Promise<GeneralReferralCodeResponse | null> {
  if (!cachedPromise) {
    cachedPromise = eduhubReferralCodes
      .getGeneral()
      .catch(() => null);
  }
  return cachedPromise;
}

export function invalidateGeneralReferralCodes() {
  cachedPromise = null;
}

/** Match a student-entered code against the general referral code (case-insensitive). */
export function matchGeneralReferralCode(
  entered: string,
  config: GeneralReferralCodeResponse | null | undefined,
): GeneralReferralCodeResponse | null {
  const code = config?.referralCode?.trim();
  if (!code || !entered.trim()) return null;
  if (entered.trim().toLowerCase() !== code.toLowerCase()) return null;
  return config ?? null;
}

/** Match a student-entered code against the general trial class code (case-insensitive). */
export function matchGeneralTrialCode(
  entered: string,
  config: GeneralReferralCodeResponse | null | undefined,
): boolean {
  const code = config?.trialCode?.trim();
  if (!code || !entered.trim()) return false;
  return entered.trim().toLowerCase() === code.toLowerCase();
}