import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useLayoutContext } from "@/features/layout/context";
import { SIDEBAR_COLLAPSE_ENABLED } from "@/features/layout/hooks/useSidebarState";

/** Fixed bottom bar aligned with TeacherCourseFormLayout page padding (`px-4 lg:px-6`). */
export function TeacherCourseFormStickyFooter({ children }: { children: ReactNode }) {
  const { isSidebarCollapsed } = useLayoutContext();
  const collapsed = SIDEBAR_COLLAPSE_ENABLED && isSidebarCollapsed;

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur transition-[left] duration-300 supports-[backdrop-filter]:bg-background/80",
        collapsed ? "lg:left-20" : "lg:left-64",
      )}
    >
      <div className="flex w-full items-center justify-between gap-3 px-4 py-3 lg:px-6">
        {children}
      </div>
    </div>
  );
}
