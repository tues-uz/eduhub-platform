import { useSyncExternalStore } from "react";
import { useEffect } from "react";
import { eduhubPayroll, eduhubUploadFile } from "@/api/eduhubClient";
import type { InstructorPayrollRequestRecord } from "@/features/teacher/data/instructorPayrollRequestStore";

export type PayrollProofRecord = {
  requestId?: string;
  informationNotes?: string;
  fileName?: string;
  mimeType?: string;
  uploadedAt?: string;
  dataUrl?: string;
  approvedAt?: string;
};

type Listener = () => void;

export const PAYROLL_INFORMATION_MAX_CHARS = 2000;
export const PAYROLL_PROOF_MAX_FILE_BYTES = 8 * 1024 * 1024; // 8 MB

export function payrollProofKey(className: string, course: string): string {
  return `${encodeURIComponent(className.trim())}__${encodeURIComponent(course.trim())}`;
}

export function hasPayrollProofFile(record?: PayrollProofRecord | null): boolean {
  return Boolean(record?.fileName?.trim() || record?.dataUrl?.trim());
}

export function looksLikeCourseCertificateFileName(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.includes("certificate") || lower.includes("sertifikat");
}

const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((fn) => fn());
}

/** Page path for the proof/payout detail page for a given instructor request. */
export function buildPayrollProofPagePath(requestId: string): string {
  return `/dashboard/admin/payroll/requests/${requestId}`;
}

/**
 * Whether an instructor is allowed to see the transfer proof for a given request.
 * Visible once approved or if the proof has a released dataUrl.
 */
export function canInstructorViewTransferProof(
  request: InstructorPayrollRequestRecord,
  proof?: PayrollProofRecord | null,
): boolean {
  if (request.status === "approved") return true;
  return isReleasedInstructorTransferProof(request, proof);
}

export function isReleasedInstructorTransferProof(
  request: InstructorPayrollRequestRecord,
  proof?: PayrollProofRecord | null,
): boolean {
  return request.status === "approved" && hasPayrollProofFile(proof);
}

/** Resolve the PayrollProofRecord for a given class+course from the snapshot map. */
export function resolvePayrollProofBundle(
  proofMap: Record<string, PayrollProofRecord>,
  className: string,
  course: string,
): PayrollProofRecord | undefined {
  return proofMap[payrollProofKey(className, course)];
}

let snapshot: Record<string, PayrollProofRecord> = {};
let loadingPromise: Promise<void> | null = null;


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

  load(): Promise<void> {
    if (loadingPromise) return loadingPromise;
    loadingPromise = eduhubPayroll
      .listRequests()
      .then((rows) => {
        const next: Record<string, PayrollProofRecord> = {};
        for (const row of rows ?? []) {
          if (!row.proof) continue;
          next[payrollProofKey(row.classSection, row.course)] = {
            requestId: row.id,
            informationNotes: row.proof.informationNotes,
            fileName: row.proof.fileName,
            mimeType: row.proof.mimeType,
            uploadedAt: row.proof.uploadedAt,
            dataUrl: row.proof.proofUrl,
            approvedAt: row.proof.approvedAt,
          };
        }
        snapshot = next;
        emit();
      })
      .finally(() => {
        loadingPromise = null;
      });
    return loadingPromise;
  },

  async setInformationNotes(className: string, course: string, text: string, requestId?: string): Promise<void> {
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

    emit();
    const id = requestId ?? next.requestId ?? prev.requestId;
    if (id) {
      await eduhubPayroll.updateProof(id, {
        informationNotes: next.informationNotes,
        fileName: next.fileName,
        mimeType: next.mimeType,
        proofUrl: next.dataUrl,
        uploadedAt: next.uploadedAt,
      });
      void adminPayrollProofStore.load();
    }
  },

  async upload(className: string, course: string, file: File, requestId?: string): Promise<{ ok: true } | { ok: false; reason: string }> {
    if (looksLikeCourseCertificateFileName(file.name)) {
      return {
        ok: false,
        reason:
          "This looks like a student course certificate. Upload a bank transfer receipt (screenshot or PDF) instead.",
      };
    }
    if (!isAllowedFile(file)) {
      return { ok: false, reason: "Use a PDF or image (JPG, PNG, WebP)." };
    }
    if (file.size > PAYROLL_PROOF_MAX_FILE_BYTES) {
      return { ok: false, reason: `File must be under ${Math.round(PAYROLL_PROOF_MAX_FILE_BYTES / (1024 * 1024))} MB.` };
    }

    let publicUrl = "";
    try {
      const uploadRes = await eduhubUploadFile(file, "payroll-proofs");
      publicUrl = uploadRes.url;
    } catch {
      // If presigned URL upload is offline in local dev, fall back to dataUrl
      publicUrl = await readFileAsDataUrl(file);
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
        dataUrl: publicUrl,
        approvedAt: undefined,
      },
    };

    emit();
    const id = requestId ?? prev.requestId;
    if (id) {
      try {
        await eduhubPayroll.updateProof(id, {
          informationNotes: snapshot[key]?.informationNotes,
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          proofUrl: publicUrl,
          uploadedAt: snapshot[key]?.uploadedAt,
        });
        void adminPayrollProofStore.load();
      } catch (e) {
        return { ok: false, reason: e instanceof Error ? e.message : "Please try again." };
      }
    }
    return { ok: true };
  },

  async approve(className: string, course: string, requestId?: string): Promise<boolean> {
    const key = payrollProofKey(className, course);
    const prev = snapshot[key];
    if (!hasPayrollProofFile(prev)) return false;
    snapshot = {
      ...snapshot,
      [key]: { ...prev!, approvedAt: new Date().toISOString() },
    };

    emit();
    const id = requestId ?? prev.requestId;
    if (id) {
      try {
        await eduhubPayroll.approveProof(id);
        void adminPayrollProofStore.load();
      } catch {
        return false;
      }
    }
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

    emit();
  },
};

export function usePayrollProofMap(): Record<string, PayrollProofRecord> {
  useEffect(() => {
    void adminPayrollProofStore.load();
  }, []);
  return useSyncExternalStore(
    adminPayrollProofStore.subscribe,
    adminPayrollProofStore.getSnapshot,
    adminPayrollProofStore.getSnapshot,
  );
}
