const STAFF_CODES_KEY = "eduhub.adminStaffCodes.v1";
const LAST_USED_CODE_KEY = "eduhub.adminLastActionCode";

function loadStaffCodes(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STAFF_CODES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Record<string, string>;
  } catch {
    return {};
  }
}

function saveStaffCodes(codes: Record<string, string>) {
  localStorage.setItem(STAFF_CODES_KEY, JSON.stringify(codes));
}

export function normalizeAdminCode(raw: string): string {
  return raw.trim().toUpperCase().slice(0, 16);
}

export function isValidAdminActionCode(code: string): boolean {
  const normalized = normalizeAdminCode(code);
  return normalized.length >= 2 && /^[A-Z0-9_-]+$/.test(normalized);
}

export function getAdminStaffCode(email: string): string | undefined {
  const key = email.trim().toLowerCase();
  if (!key) return undefined;
  return loadStaffCodes()[key];
}

export function registerAdminStaffCode(email: string, code: string): void {
  const key = email.trim().toLowerCase();
  const normalized = normalizeAdminCode(code);
  if (!key || !isValidAdminActionCode(normalized)) return;
  const all = loadStaffCodes();
  all[key] = normalized;
  saveStaffCodes(all);
}

export function rememberLastAdminActionCode(code: string): void {
  const normalized = normalizeAdminCode(code);
  if (!isValidAdminActionCode(normalized)) return;
  localStorage.setItem(LAST_USED_CODE_KEY, normalized);
}

export function getDefaultAdminActionCode(email?: string): string {
  if (email) {
    const registered = getAdminStaffCode(email);
    if (registered) return registered;
  }
  return localStorage.getItem(LAST_USED_CODE_KEY) ?? "";
}

export function validateAdminActionCodeOrThrow(code: string): string {
  const normalized = normalizeAdminCode(code);
  if (!isValidAdminActionCode(normalized)) {
    throw new Error("Enter your admin code (2–16 letters or numbers, e.g. AF01).");
  }
  rememberLastAdminActionCode(normalized);
  return normalized;
}

export function formatReviewedByLabel(name?: string, code?: string): string {
  if (code && name) return `${code} · ${name}`;
  if (code) return code;
  if (name) return name;
  return "";
}
