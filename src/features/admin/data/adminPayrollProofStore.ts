import { useSyncExternalStore } from "react";

const STORAGE_KEY = "eduhub.adminPayrollProofs.v1";
/** Base64 data URLs — demo/local only; replace with API upload. */
export const PAYROLL_PROOF_MAX_FILE_BYTES = 4 * 1024 * 1024;
export const PAYROLL_INFORMATION_MAX_CHARS = 2000;

export type PayrollProofRecord = {
  /** Admin context: bank ref, period, rate notes, cautions for finance. */
  informationNotes?: string;
  fileName?: string;
  mimeType?: string;
  uploadedAt?: string;
  dataUrl?: string;
  approvedAt?: string;
};

type Listener = () => void;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((l) => l());
}

export function payrollProofKey(className: string, course: string): string {
  return `${className}\t${course}`;
}

export function hasPayrollProofFile(r: PayrollProofRecord | undefined): boolean {
  return !!(
    r &&
    typeof r.dataUrl === "string" &&
    r.dataUrl.length > 0 &&
    typeof r.fileName === "string" &&
    typeof r.uploadedAt === "string"
  );
}

/** Path + query for the dedicated payout proof page. */
export function buildPayrollProofPagePath(
  section: string,
  course: string,
  instructor?: string,
  instructorEmail?: string,
): string {
  const sp = new URLSearchParams();
  sp.set("section", section);
  sp.set("course", course);
  if (instructor?.trim()) sp.set("instructor", instructor.trim());
  if (instructorEmail?.trim()) sp.set("instructorEmail", instructorEmail.trim());
  return `/dashboard/admin/payroll/proof?${sp.toString()}`;
}

let snapshot: Record<string, PayrollProofRecord> = {};

function normalizeRecord(r: Record<string, unknown>): PayrollProofRecord | null {
  const informationNotes =
    typeof r.informationNotes === "string" ? r.informationNotes.slice(0, PAYROLL_INFORMATION_MAX_CHARS) : undefined;
  const hasFile =
    typeof r.dataUrl === "string" &&
    r.dataUrl.length > 0 &&
    typeof r.fileName === "string" &&
    typeof r.uploadedAt === "string" &&
    typeof r.mimeType === "string";
  if (!hasFile && !(informationNotes?.trim())) return null;
  const base: PayrollProofRecord = {};
  if (informationNotes?.trim()) base.informationNotes = informationNotes.trim();
  if (hasFile) {
    base.fileName = r.fileName as string;
    base.mimeType = r.mimeType as string;
    base.uploadedAt = r.uploadedAt as string;
    base.dataUrl = r.dataUrl as string;
    if (typeof r.approvedAt === "string") base.approvedAt = r.approvedAt;
  }
  return base;
}

function parseStored(raw: string | null): Record<string, PayrollProofRecord> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const out: Record<string, PayrollProofRecord> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (!v || typeof v !== "object") continue;
      const rec = normalizeRecord(v as Record<string, unknown>);
      if (rec) out[k] = rec;
    }
    return out;
  } catch {
    return {};
  }
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // quota
  }
}

function hydrate() {
  snapshot = parseStored(
    typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null,
  );
}

hydrate();

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(fr.error ?? new Error("Read failed"));
    fr.readAsDataURL(file);
  });
}

function isAllowedFile(file: File): boolean {
  const mt = file.type.toLowerCase();
  if (mt === "application/pdf") return true;
  if (mt === "image/jpeg" || mt === "image/png" || mt === "image/webp") return true;
  const name = file.name.toLowerCase();
  return /\.(pdf|jpe?g|png|webp)$/i.test(name);
}

export const adminPayrollProofStore = {
  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  getSnapshot(): Record<string, PayrollProofRecord> {
    return snapshot;
  },

  get(className: string, course: string): PayrollProofRecord | undefined {
    return snapshot[payrollProofKey(className, course)];
  },

  setInformationNotes(className: string, course: string, text: string): void {
    const key = payrollProofKey(className, course);
    const prev = snapshot[key] ?? {};
    const trimmed = text.trim();
    const next: PayrollProofRecord = { ...prev };
    if (trimmed) {
      next.informationNotes = trimmed.slice(0, PAYROLL_INFORMATION_MAX_CHARS);
    } else {
      delete next.informationNotes;
    }
    if (!hasPayrollProofFile(next) && !next.informationNotes?.trim()) {
      const { [key]: _, ...rest } = snapshot;
      snapshot = rest;
    } else {
      snapshot = { ...snapshot, [key]: next };
    }
    persist();
    emit();
  },

  async upload(className: string, course: string, file: File): Promise<{ ok: true } | { ok: false; reason: string }> {
    if (!isAllowedFile(file)) {
      return { ok: false, reason: "Use a PDF or image (JPG, PNG, WebP)." };
    }
    if (file.size > PAYROLL_PROOF_MAX_FILE_BYTES) {
      return { ok: false, reason: `File must be under ${Math.round(PAYROLL_PROOF_MAX_FILE_BYTES / (1024 * 1024))} MB.` };
    }
    const dataUrl = await readFileAsDataUrl(file);
    if (dataUrl.length > PAYROLL_PROOF_MAX_FILE_BYTES * 2) {
      return { ok: false, reason: "File is too large after encoding. Try a smaller scan." };
    }
    const key = payrollProofKey(className, course);
    const prev = snapshot[key] ?? {};
    snapshot = {
      ...snapshot,
      [key]: {
        ...prev,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        uploadedAt: new Date().toISOString(),
        dataUrl,
        approvedAt: undefined,
      },
    };
    persist();
    emit();
    return { ok: true };
  },

  approve(className: string, course: string): boolean {
    const key = payrollProofKey(className, course);
    const prev = snapshot[key];
    if (!hasPayrollProofFile(prev)) return false;
    snapshot = {
      ...snapshot,
      [key]: { ...prev!, approvedAt: new Date().toISOString() },
    };
    persist();
    emit();
    return true;
  },

  remove(className: string, course: string): void {
    const key = payrollProofKey(className, course);
    const prev = snapshot[key];
    if (!prev) return;
    const { fileName: _fn, mimeType: _mt, uploadedAt: _ua, dataUrl: _du, approvedAt: _aa, ...kept } = prev;
    if (kept.informationNotes?.trim()) {
      snapshot = { ...snapshot, [key]: { informationNotes: kept.informationNotes } };
    } else {
      const { [key]: _, ...rest } = snapshot;
      snapshot = rest;
    }
    persist();
    emit();
  },
};

export function usePayrollProofMap(): Record<string, PayrollProofRecord> {
  return useSyncExternalStore(
    adminPayrollProofStore.subscribe,
    adminPayrollProofStore.getSnapshot,
    adminPayrollProofStore.getSnapshot,
  );
}
