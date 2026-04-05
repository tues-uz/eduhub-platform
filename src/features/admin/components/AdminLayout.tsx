import type { PropsWithChildren } from "react";
import DashboardSidebar from "@/components/DashboardSidebar";
import { useLayoutContext } from "@/features/layout/context";

export function AdminLayout({ children }: PropsWithChildren) {
  const { isSidebarCollapsed } = useLayoutContext();

  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>
      <DashboardSidebar />
      <main
        className={`pt-16 lg:pt-8 pb-20 transition-all duration-300 ${isSidebarCollapsed ? "lg:pl-20" : "lg:pl-64"}`}
      >
        {children}
      </main>
    </div>
  );
}
