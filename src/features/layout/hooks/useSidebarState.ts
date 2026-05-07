import { useCallback, useEffect, useState } from "react";

const SIDEBAR_KEY = "sidebarCollapsed";

/** Set to `true` to show the sidebar collapse toggle and allow narrow rail. */
export const SIDEBAR_COLLAPSE_ENABLED = false;

function readSidebarState() {
  return localStorage.getItem(SIDEBAR_KEY) === "true";
}

export function useSidebarState() {
  const [isCollapsed, setIsCollapsed] = useState(() =>
    SIDEBAR_COLLAPSE_ENABLED ? readSidebarState() : false,
  );

  useEffect(() => {
    if (!SIDEBAR_COLLAPSE_ENABLED) {
      localStorage.setItem(SIDEBAR_KEY, "false");
      document.documentElement.style.setProperty("--sidebar-width", "256px");
      setIsCollapsed(false);
    }
  }, []);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== SIDEBAR_KEY) return;
      if (!SIDEBAR_COLLAPSE_ENABLED) {
        setIsCollapsed(false);
        return;
      }
      setIsCollapsed(event.newValue === "true");
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setCollapsed = useCallback((value: boolean) => {
    if (!SIDEBAR_COLLAPSE_ENABLED) {
      setIsCollapsed(false);
      localStorage.setItem(SIDEBAR_KEY, "false");
      document.documentElement.style.setProperty("--sidebar-width", "256px");
      return;
    }
    setIsCollapsed(value);
    localStorage.setItem(SIDEBAR_KEY, String(value));
    document.documentElement.style.setProperty("--sidebar-width", value ? "80px" : "256px");
  }, []);

  const toggle = useCallback(() => {
    if (!SIDEBAR_COLLAPSE_ENABLED) return;
    setCollapsed(!isCollapsed);
  }, [isCollapsed, setCollapsed]);

  return { isCollapsed, setCollapsed, toggle };
}
