import { useCallback, useEffect, useState } from "react";

const SIDEBAR_KEY = "sidebarCollapsed";

function readSidebarState() {
  return localStorage.getItem(SIDEBAR_KEY) === "true";
}

export function useSidebarState() {
  const [isCollapsed, setIsCollapsed] = useState(readSidebarState);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === SIDEBAR_KEY) {
        setIsCollapsed(event.newValue === "true");
      }
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setCollapsed = useCallback((value: boolean) => {
    setIsCollapsed(value);
    localStorage.setItem(SIDEBAR_KEY, String(value));
    document.documentElement.style.setProperty("--sidebar-width", value ? "80px" : "256px");
  }, []);

  const toggle = useCallback(() => {
    setCollapsed(!isCollapsed);
  }, [isCollapsed, setCollapsed]);

  return { isCollapsed, setCollapsed, toggle };
}
