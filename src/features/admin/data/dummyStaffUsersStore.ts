import type { AdminStaffRole } from "@/features/admin/adminStaffRoles";
import { mapApiRoleToStaffRole } from "@/features/admin/adminStaffRoles";

const STORAGE_KEY = "eduhub.dummyStaffUsers.v1";

export type DummyStaffUser = {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  apiRole: AdminStaffRole;
  adminCode?: string;
  password: string;
  passwordChanged: boolean;
  createdAt: string;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function safeParse(json: string | null): unknown {
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function newId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return `dummy-${crypto.randomUUID()}`;
  return `dummy-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function generateDummyTemporaryPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789*#@";
  let pwd = "";
  for (let i = 0; i < 18; i++) {
    pwd += chars[Math.floor(Math.random() * chars.length)];
  }
  return pwd;
}

function parseUser(raw: unknown): DummyStaffUser | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const apiRole = mapApiRoleToStaffRole(String(o.apiRole ?? ""));
  if (!apiRole || apiRole === "ADMIN") return null;
  const email = typeof o.email === "string" ? o.email : "";
  if (!normalizeEmail(email)) return null;
  return {
    id: typeof o.id === "string" ? o.id : newId(),
    fullName: typeof o.fullName === "string" ? o.fullName : "—",
    email,
    phoneNumber: typeof o.phoneNumber === "string" ? o.phoneNumber : "",
    apiRole,
    adminCode: typeof o.adminCode === "string" ? o.adminCode : undefined,
    password: typeof o.password === "string" ? o.password : "",
    passwordChanged: o.passwordChanged === true,
    createdAt: typeof o.createdAt === "string" ? o.createdAt : new Date().toISOString(),
  };
}

export const dummyStaffUsersStore = {
  getAll(): DummyStaffUser[] {
    const raw = safeParse(localStorage.getItem(STORAGE_KEY));
    if (!Array.isArray(raw)) return [];
    return raw.map(parseUser).filter((u): u is DummyStaffUser => u !== null);
  },

  findByEmail(email: string): DummyStaffUser | undefined {
    const key = normalizeEmail(email);
    return this.getAll().find((u) => normalizeEmail(u.email) === key);
  },

  create(input: {
    fullName: string;
    email: string;
    phoneNumber: string;
    apiRole: string;
    adminCode?: string;
  }): { user: DummyStaffUser; temporaryPassword: string } {
    const staffRole = mapApiRoleToStaffRole(input.apiRole);
    if (!staffRole || staffRole === "ADMIN") {
      throw new Error("This role must be created through the API.");
    }
    if (this.findByEmail(input.email)) {
      throw new Error("A demo account with this email already exists in this browser.");
    }

    const temporaryPassword = generateDummyTemporaryPassword();
    const user: DummyStaffUser = {
      id: newId(),
      fullName: input.fullName.trim(),
      email: input.email.trim(),
      phoneNumber: input.phoneNumber.trim(),
      apiRole: staffRole,
      adminCode: input.adminCode?.trim() || undefined,
      password: temporaryPassword,
      passwordChanged: false,
      createdAt: new Date().toISOString(),
    };

    const all = this.getAll();
    all.unshift(user);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    return { user, temporaryPassword };
  },

  authenticate(identifier: string, password: string): DummyStaffUser | null {
    const trimmedId = identifier.trim();
    const user = this.getAll().find(
      (u) =>
        normalizeEmail(u.email) === normalizeEmail(trimmedId) ||
        u.phoneNumber.replace(/\s+/g, "") === trimmedId.replace(/\s+/g, ""),
    );
    if (!user || user.password !== password) return null;
    return user;
  },

  updatePassword(email: string, currentPassword: string, newPassword: string): boolean {
    const user = this.findByEmail(email);
    if (!user || user.password !== currentPassword) return false;

    const all = this.getAll().map((u) =>
      normalizeEmail(u.email) === normalizeEmail(email)
        ? { ...u, password: newPassword, passwordChanged: true }
        : u,
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    return true;
  },
};
