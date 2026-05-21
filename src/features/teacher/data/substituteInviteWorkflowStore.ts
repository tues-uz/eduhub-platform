/** Client-side substitute-cover workflow until API exists (same pattern as other demo stores). */

export type SubstituteInviteStatus =
  | "pending_substitute_response"
  | "pending_primary_approval"
  /** Primary instructor approved; waiting for admin final sign-off. */
  | "pending_admin_approval"
  | "approved"
  | "declined_by_substitute"
  | "rejected_by_primary"
  | "rejected_by_admin";

export type SubstituteInviteRecord = {
  id: string;
  courseId: string;
  courseTitle: string;
  /** Display label for the scheduled session (e.g. "Session 2 · 2026-05-20 10:00"). */
  sessionNote: string;
  /** Stable key from class schedule (`slot-0`, `slot-1`, …) when a specific session was requested. */
  sessionSlotKey?: string;
  message: string;
  primaryInstructorName: string;
  primaryInstructorEmailNorm: string;
  substituteEmailNorm: string;
  status: SubstituteInviteStatus;
  createdAt: string;
  updatedAt: string;
};

const STORAGE_KEY = "eduhub.substituteInviteWorkflow.v1";

function loadAll(): SubstituteInviteRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is SubstituteInviteRecord => !!x && typeof x === "object");
  } catch {
    return [];
  }
}

function notifyWorkflowChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("eduhub.substituteInviteWorkflow.changed"));
}

function saveAll(rows: SubstituteInviteRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows.slice(0, 200)));
  notifyWorkflowChanged();
}

function inviteHasAssignedSession(invite: SubstituteInviteRecord): boolean {
  return Boolean(invite.sessionSlotKey?.trim() || invite.sessionNote?.trim());
}

function lookupApprovedSubstituteInvite(
  courseId: string,
  substituteEmailNorm: string,
): SubstituteInviteRecord | undefined {
  const norm = substituteEmailNorm.trim().toLowerCase();
  if (!norm || !courseId) return undefined;
  const approved = loadAll().filter(
    (r) => r.courseId === courseId && r.status === "approved" && r.substituteEmailNorm === norm,
  );
  if (!approved.length) return undefined;
  const withSession = approved.find((r) => inviteHasAssignedSession(r));
  return withSession ?? approved[0];
}

function lookupApprovedPrimaryInvite(
  courseId: string,
  primaryEmailNorm: string,
): SubstituteInviteRecord | undefined {
  const norm = primaryEmailNorm.trim().toLowerCase();
  if (!norm || !courseId) return undefined;
  return loadAll().find(
    (r) => r.courseId === courseId && r.status === "approved" && r.primaryInstructorEmailNorm === norm,
  );
}

export const substituteInviteWorkflowStore = {
  listAll(): SubstituteInviteRecord[] {
    return [...loadAll()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  findApprovedInviteAsSubstitute(
    courseId: string,
    substituteEmailNorm: string,
  ): SubstituteInviteRecord | undefined {
    return lookupApprovedSubstituteInvite(courseId, substituteEmailNorm);
  },

  findApprovedInviteAsPrimary(
    courseId: string,
    primaryEmailNorm: string,
  ): SubstituteInviteRecord | undefined {
    return lookupApprovedPrimaryInvite(courseId, primaryEmailNorm);
  },

  /** True when this viewer is the invited substitute and the workflow reached `approved` for this `courseId`. */
  isApprovedSubstituteForCourse(courseId: string, viewerEmailNorm: string): boolean {
    return lookupApprovedSubstituteInvite(courseId, viewerEmailNorm) != null;
  },

  get(id: string): SubstituteInviteRecord | undefined {
    return loadAll().find((r) => r.id === id);
  },

  create(payload: Omit<SubstituteInviteRecord, "id" | "createdAt" | "updatedAt" | "status">): SubstituteInviteRecord {
    const now = new Date().toISOString();
    const record: SubstituteInviteRecord = {
      ...payload,
      id: crypto.randomUUID(),
      status: "pending_substitute_response",
      createdAt: now,
      updatedAt: now,
    };
    const all = loadAll();
    all.unshift(record);
    saveAll(all);
    return record;
  },

  acceptBySubstitute(
    inviteId: string,
    actorEmailNorm: string,
  ): { ok: true; record: SubstituteInviteRecord } | { ok: false; reason: string } {
    const norm = actorEmailNorm.trim().toLowerCase();
    const all = loadAll();
    const i = all.findIndex((r) => r.id === inviteId);
    if (i === -1) return { ok: false, reason: "Invite not found." };
    const row = all[i];
    if (row.substituteEmailNorm !== norm) return { ok: false, reason: "Not your invite." };
    if (row.status !== "pending_substitute_response") {
      return { ok: false, reason: "This invite is no longer open for response." };
    }
    const now = new Date().toISOString();
    const next = { ...row, status: "pending_primary_approval" as const, updatedAt: now };
    all[i] = next;
    saveAll(all);
    return { ok: true, record: next };
  },

  declineBySubstitute(inviteId: string, actorEmailNorm: string): { ok: true; record: SubstituteInviteRecord } | { ok: false; reason: string } {
    const norm = actorEmailNorm.trim().toLowerCase();
    const all = loadAll();
    const i = all.findIndex((r) => r.id === inviteId);
    if (i === -1) return { ok: false, reason: "Invite not found." };
    const row = all[i];
    if (row.substituteEmailNorm !== norm) return { ok: false, reason: "Not your invite." };
    if (row.status !== "pending_substitute_response") {
      return { ok: false, reason: "This invite is no longer open for response." };
    }
    const now = new Date().toISOString();
    const next = { ...row, status: "declined_by_substitute" as const, updatedAt: now };
    all[i] = next;
    saveAll(all);
    return { ok: true, record: next };
  },

  approveByPrimary(
    inviteId: string,
    actorEmailNorm: string,
  ): { ok: true; record: SubstituteInviteRecord } | { ok: false; reason: string } {
    const norm = actorEmailNorm.trim().toLowerCase();
    const all = loadAll();
    const i = all.findIndex((r) => r.id === inviteId);
    if (i === -1) return { ok: false, reason: "Invite not found." };
    const row = all[i];
    if (row.primaryInstructorEmailNorm !== norm) return { ok: false, reason: "Only the inviting instructor can approve." };
    if (row.status !== "pending_primary_approval") {
      return { ok: false, reason: "Nothing to approve at this step." };
    }
    const now = new Date().toISOString();
    const next = { ...row, status: "pending_admin_approval" as const, updatedAt: now };
    all[i] = next;
    saveAll(all);
    return { ok: true, record: next };
  },

  rejectByPrimary(
    inviteId: string,
    actorEmailNorm: string,
  ): { ok: true; record: SubstituteInviteRecord } | { ok: false; reason: string } {
    const norm = actorEmailNorm.trim().toLowerCase();
    const all = loadAll();
    const i = all.findIndex((r) => r.id === inviteId);
    if (i === -1) return { ok: false, reason: "Invite not found." };
    const row = all[i];
    if (row.primaryInstructorEmailNorm !== norm) return { ok: false, reason: "Only the inviting instructor can reject." };
    if (row.status !== "pending_primary_approval") {
      return { ok: false, reason: "Nothing to reject at this step." };
    }
    const now = new Date().toISOString();
    const next = { ...row, status: "rejected_by_primary" as const, updatedAt: now };
    all[i] = next;
    saveAll(all);
    return { ok: true, record: next };
  },

  approveByAdmin(inviteId: string): { ok: true; record: SubstituteInviteRecord } | { ok: false; reason: string } {
    const all = loadAll();
    const i = all.findIndex((r) => r.id === inviteId);
    if (i === -1) return { ok: false, reason: "Invite not found." };
    const row = all[i];
    const canApproveNow =
      row.status === "pending_admin_approval" ||
      row.status === "pending_substitute_response" ||
      row.status === "pending_primary_approval";
    if (!canApproveNow) {
      return {
        ok: false,
        reason: "This request cannot be approved by admin at its current step.",
      };
    }
    const now = new Date().toISOString();
    const next = { ...row, status: "approved" as const, updatedAt: now };
    all[i] = next;
    saveAll(all);
    return { ok: true, record: next };
  },

  rejectByAdmin(inviteId: string): { ok: true; record: SubstituteInviteRecord } | { ok: false; reason: string } {
    const all = loadAll();
    const i = all.findIndex((r) => r.id === inviteId);
    if (i === -1) return { ok: false, reason: "Invite not found." };
    const row = all[i];
    const canRejectNow =
      row.status === "pending_admin_approval" ||
      row.status === "pending_substitute_response" ||
      row.status === "pending_primary_approval";
    if (!canRejectNow) {
      return {
        ok: false,
        reason: "This request cannot be rejected by admin at its current step.",
      };
    }
    const now = new Date().toISOString();
    const next = { ...row, status: "rejected_by_admin" as const, updatedAt: now };
    all[i] = next;
    saveAll(all);
    return { ok: true, record: next };
  },
};
