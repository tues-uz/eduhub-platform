import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import type { SessionUser, UserRole } from "./types";

function readSessionUser(): SessionUser {
  const role = (localStorage.getItem("userRole") || "student") as UserRole;
  const name = localStorage.getItem("userName") || (role === "admin" ? "Admin" : "Demo User");
  const email = localStorage.getItem("userEmail") || "demo@eduhub.com";
  return { name, email, role };
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
