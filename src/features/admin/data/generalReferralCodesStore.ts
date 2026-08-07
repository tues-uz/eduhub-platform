const STORAGE_KEY = "eduhub_general_referral_codes";

export type GeneralReferralCodes = {
  referralCode: string;
  discountPercent: number;
  trialCode: string;
  updatedAt: string;
};

const EMPTY: GeneralReferralCodes = {
  referralCode: "",
  discountPercent: 0,
  trialCode: "",
  updatedAt: "",
};

function clampDiscount(n: unknown): number {
  if (typeof n !== "number" || !Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function readGeneralReferralCodes(): GeneralReferralCodes {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw) as Partial<GeneralReferralCodes>;
    return {
      referralCode: typeof parsed.referralCode === "string" ? parsed.referralCode.trim().slice(0, 64) : "",
      discountPercent: clampDiscount(parsed.discountPercent),
      trialCode: typeof parsed.trialCode === "string" ? parsed.trialCode.trim().slice(0, 64) : "",
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : "",
    };
  } catch {
    return { ...EMPTY };
  }
}

export function writeGeneralReferralCodes(input: {
  referralCode: string;
  discountPercent: number;
  trialCode: string;
}): GeneralReferralCodes {
  const next: GeneralReferralCodes = {
    referralCode: input.referralCode.trim().slice(0, 64),
    discountPercent: clampDiscount(input.discountPercent),
    trialCode: input.trialCode.trim().slice(0, 64),
    updatedAt: new Date().toISOString(),
  };
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

/** Match a student-entered code against the general referral code (case-insensitive). */
export function matchGeneralReferralCode(entered: string): GeneralReferralCodes | null {
  const general = readGeneralReferralCodes();
  const code = general.referralCode.trim();
  if (!code || !entered.trim()) return null;
  if (entered.trim().toLowerCase() !== code.toLowerCase()) return null;
  return general;
}

/** Match a student-entered code against the general trial class code (case-insensitive). */
export function matchGeneralTrialCode(entered: string): string | null {
  const general = readGeneralReferralCodes();
  const code = general.trialCode.trim();
  if (!code || !entered.trim()) return null;
  if (entered.trim().toLowerCase() !== code.toLowerCase()) return null;
  return code;
}
