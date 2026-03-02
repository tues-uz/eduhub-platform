import { createContext, useContext, type PropsWithChildren } from "react";
import { useSidebarState } from "@/features/layout/hooks/useSidebarState";

type LayoutContextValue = {
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (value: boolean) => void;
};

const LayoutContext = createContext<LayoutContextValue | null>(null);

export function LayoutProvider({ children }: PropsWithChildren) {
  const { isCollapsed, setCollapsed, toggle } = useSidebarState();

  return (
    <LayoutContext.Provider
      value={{
        isSidebarCollapsed: isCollapsed,
        toggleSidebar: toggle,
        setSidebarCollapsed: setCollapsed,
      }}
    >
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayoutContext() {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error("useLayoutContext must be used within LayoutProvider");
  }

  return context;
}
