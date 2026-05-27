import { DashboardClassSearch } from "@/components/DashboardClassSearch";
import { studentHeaderIconButtonClass } from "@/components/studentDashboardHeaderStyles";
import { StudentNotificationDropdown } from "@/features/notifications/StudentNotificationDropdown";
import { cn } from "@/lib/utils";

/** Top padding for main content below the fixed student mobile header. */
export const MOBILE_STUDENT_HEADER_OFFSET = "pt-16";

export { studentHeaderIconButtonClass };

type DashboardPageHeaderProps = {
  title?: string;
};

export function StudentDashboardHeaderToolbar({ className }: { className?: string }) {
  return (
    <div className={cn("flex shrink-0 items-center gap-0.5 sm:gap-1", className)}>
      <StudentNotificationDropdown triggerClassName={studentHeaderIconButtonClass} />
    </div>
  );
}

export function DashboardPageHeader(_props: DashboardPageHeaderProps) {
  return (
    <header className="sticky top-0 z-30 hidden h-[4.5625rem] shrink-0 items-center border-b border-gray-200 bg-white px-6 sm:px-8 lg:flex">
      <div className="flex w-full items-center gap-4">
        <div className="flex min-w-0 flex-1 items-center">
          <div className="hidden w-full max-w-md lg:block xl:max-w-xl">
            <DashboardClassSearch variant="header" />
          </div>
        </div>

        <StudentDashboardHeaderToolbar />
      </div>
    </header>
  );
}
