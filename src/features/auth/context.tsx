import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import type { SessionUser, UserRole } from "./types";

const USER_ID_KEY = "userId";

function readSessionUser(): SessionUser {
  const role = (localStorage.getItem("userRole") || "student") as UserRole;
  const name = localStorage.getItem("userName") || (role === "admin" ? "Admin" : "Demo User");
  const email = localStorage.getItem("userEmail") || "demo@eduhub.com";
  const id = localStorage.getItem(USER_ID_KEY) || undefined;
  return { id, name, email, role };
}

export function setSessionUser(user: SessionUser): void {
  if (user.id) localStorage.setItem(USER_ID_KEY, user.id);
  localStorage.setItem("userName", user.name);
  localStorage.setItem("userEmail", user.email);
  localStorage.setItem("userRole", user.role);
}

export function clearSessionUser(): void {
  localStorage.removeItem(USER_ID_KEY);
  localStorage.removeItem("userName");
  localStorage.removeItem("userEmail");
  localStorage.removeItem("userRole");
}

type AuthSessionValue = {
  user: SessionUser;
  setRole: (role: UserRole) => void;
};

const AuthSessionContext = createContext<AuthSessionValue | null>(null);

export function AuthSessionProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<SessionUser>(readSessionUser);

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
    }),
    [user]
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
