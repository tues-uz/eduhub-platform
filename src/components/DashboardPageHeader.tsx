import { Link } from "react-router-dom";
import { MoreVertical } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StudentNotificationDropdown } from "@/features/notifications/StudentNotificationDropdown";

export function DashboardPageHeader() {
  return (
    <header className="sticky top-16 z-30 flex min-h-[4.5625rem] shrink-0 items-center border-b border-gray-200 bg-white/95 px-6 backdrop-blur-md sm:px-8 lg:top-0">
      <div className="container mx-auto flex w-full max-w-6xl items-center justify-end gap-2 px-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 shrink-0 rounded-full border border-zinc-200 bg-white/80 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900"
              aria-label="Page menu"
            >
              <MoreVertical className="h-5 w-5" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[11rem]">
            <DropdownMenuItem asChild>
              <Link to="/dashboard/available-courses" className="cursor-pointer">
                Available classes
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/dashboard" className="cursor-pointer">
                Dashboard
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <StudentNotificationDropdown />
      </div>
    </header>
  );
}
