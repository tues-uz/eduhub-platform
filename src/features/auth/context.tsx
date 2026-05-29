import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import type { SessionUser, UserRole } from "./types";
import { getAccessToken } from "@/api/eduhubClient";
import { eduhubAuth } from "@/api/eduhubClient";
import { resolveInstructorCategory } from "@/features/teacher/resolveInstructorCategory";
import { instructorProfileAvatarsStore } from "@/features/teacher/data/instructorProfileAvatarsStore";
import { syncInstructorProfileAvatar } from "@/features/teacher/syncInstructorProfileAvatar";

const USER_ID_KEY = "userId";
const USER_AVATAR_URL_KEY = "userAvatarUrl";
const USER_PHONE_KEY = "userPhone";
const USER_CATEGORY_KEY = "userCategory";

function mapApiRoleToApp(apiRole: string): UserRole {
  if (apiRole === "LECTURER") return "teacher";
  if (apiRole === "ADMIN") return "admin";
  return "student";
}

function coalesceAvatarUrl(...candidates: (string | null | undefined)[]): string | undefined {
  for (const candidate of candidates) {
    const trimmed = candidate?.trim();
    if (trimmed) return trimmed;
  }
  return undefined;
}

function mergeSessionAvatarUrl(
  apiAvatarUrl: string | null | undefined,
  previous: SessionUser,
  nextEmail: string,
): string | undefined {
  const sameUser = previous.email.trim().toLowerCase() === nextEmail.trim().toLowerCase();
  return coalesceAvatarUrl(apiAvatarUrl, sameUser ? previous.avatarUrl : undefined);
}

export function resolveAvatarFromAuthResponse(
  apiAvatarUrl: string | null | undefined,
  email: string,
): string | undefined {
  return mergeSessionAvatarUrl(apiAvatarUrl, readSessionUser(), email);
}

function readSessionUser(): SessionUser {
  const role = (localStorage.getItem("userRole") || "student") as UserRole;
  const name = localStorage.getItem("userName") || (role === "admin" ? "Admin" : "Demo User");
  const email = localStorage.getItem("userEmail") || "demo@eduhub.com";
  const id = localStorage.getItem(USER_ID_KEY) || undefined;
  const avatarUrl = localStorage.getItem(USER_AVATAR_URL_KEY) || undefined;
  const phoneNumber = localStorage.getItem(USER_PHONE_KEY) || undefined;
  const category = localStorage.getItem(USER_CATEGORY_KEY) || undefined;
  return { id, name, email, role, avatarUrl, phoneNumber, category };
}

export function setSessionUser(user: SessionUser): void {
  if (user.id) localStorage.setItem(USER_ID_KEY, user.id);
  localStorage.setItem("userName", user.name);
  localStorage.setItem("userEmail", user.email);
  localStorage.setItem("userRole", user.role);
  if (user.avatarUrl) localStorage.setItem(USER_AVATAR_URL_KEY, user.avatarUrl);
  else localStorage.removeItem(USER_AVATAR_URL_KEY);
  if (user.phoneNumber) localStorage.setItem(USER_PHONE_KEY, user.phoneNumber);
  else localStorage.removeItem(USER_PHONE_KEY);
  if (user.role === "teacher" && user.category?.trim()) {
    localStorage.setItem(USER_CATEGORY_KEY, user.category.trim());
  } else {
    localStorage.removeItem(USER_CATEGORY_KEY);
  }
}

export function clearSessionUser(): void {
  localStorage.removeItem(USER_ID_KEY);
  localStorage.removeItem("userName");
  localStorage.removeItem("userEmail");
  localStorage.removeItem("userRole");
  localStorage.removeItem(USER_AVATAR_URL_KEY);
  localStorage.removeItem(USER_PHONE_KEY);
  localStorage.removeItem(USER_CATEGORY_KEY);
}

type AuthSessionValue = {
  user: SessionUser;
  setRole: (role: UserRole) => void;
  /** Sync context from localStorage (e.g. after login). Call after setSessionUser to update UI without refresh. */
  refreshUser: () => void;
};

const AuthSessionContext = createContext<AuthSessionValue | null>(null);

export function AuthSessionProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<SessionUser>(readSessionUser);

  const refreshUser = useMemo(() => () => setUser(readSessionUser()), []);

  // On mount: if we have a token, fetch current user from API so role/profile are correct without hard refresh
  useEffect(() => {
    const session = readSessionUser();
    if (session.avatarUrl?.trim()) {
      instructorProfileAvatarsStore.set(session.email, session.name, session.avatarUrl);
      if (session.role === "teacher") {
        syncInstructorProfileAvatar(session.email, session.name, session.avatarUrl);
      }
    }

    if (!getAccessToken()) return;
    eduhubAuth
      .me()
      .then((me) => {
        const role = mapApiRoleToApp(me.role);
        const prev = readSessionUser();
        const category =
          role === "teacher" ? resolveInstructorCategory(me.email, me.category ?? prev.category) : undefined;
        const avatarUrl = mergeSessionAvatarUrl(me.avatarUrl, prev, me.email);
        setSessionUser({
          id: me.id,
          name: me.fullName,
          email: me.email,
          role,
          avatarUrl,
          phoneNumber: me.phoneNumber ?? prev.phoneNumber,
          category,
        });
        if (role === "teacher") {
          syncInstructorProfileAvatar(me.email, me.fullName, avatarUrl);
        }
        setUser(readSessionUser());
      })
      .catch(() => {
        // Token invalid or API error; leave existing session as-is
      });
  }, []);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key?.startsWith("user")) {
        setUser(readSessionUser());
      }
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const value = useMemo<AuthSessionValue>(
    () => ({
      user,
      setRole: (role) => {
        localStorage.setItem("userRole", role);
        setUser(readSessionUser());
      },
      refreshUser,
    }),
    [user, refreshUser]
  );

  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
}

export function useAuthSession() {
  const context = useContext(AuthSessionContext);
  if (!context) {
    throw new Error("useAuthSession must be used within AuthSessionProvider");
  }
  return context;
}
