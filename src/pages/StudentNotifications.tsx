import { useState, useEffect } from "react";
import {
  Bell,
  FileText,
  BookOpen,
  Award,
  AlertCircle,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import DashboardSidebar from "@/components/DashboardSidebar";

const NOTIFICATIONS = [
  {
    id: 1,
    type: "assignment",
    title: "New Assignment Posted",
    message: "Economic Analysis Essay due in 3 days",
    time: "2 hours ago",
    unread: true,
  },
  {
    id: 2,
    type: "course",
    title: "Course Update",
    message: "New lesson available: Market Structures",
    time: "5 hours ago",
    unread: true,
  },
  {
    id: 3,
    type: "certificate",
    title: "Certificate Earned",
    message: "You've earned a certificate for Business Fundamentals",
    time: "1 day ago",
    unread: false,
  },
  {
    id: 4,
    type: "announcement",
    title: "System Maintenance",
    message: "Scheduled maintenance on Jan 20, 2:00 AM",
    time: "2 days ago",
    unread: false,
  },
  {
    id: 5,
    type: "assignment",
    title: "Assignment Reminder",
    message: "Marketing Campaign Proposal due in 2 days",
    time: "3 days ago",
    unread: false,
  },
];

const StudentNotifications = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => localStorage.getItem("sidebarCollapsed") === "true");
  useEffect(() => {
    const check = () => setIsSidebarCollapsed(localStorage.getItem("sidebarCollapsed") === "true");
    const id = setInterval(check, 100);
    return () => clearInterval(id);
  }, []);

  const unreadCount = NOTIFICATIONS.filter((n) => n.unread).length;

  const getIcon = (type: string) => {
    switch (type) {
      case "assignment":
        return <FileText className="h-5 w-5 text-purple-500" />;
      case "course":
        return <BookOpen className="h-5 w-5 text-blue-500" />;
      case "certificate":
        return <Award className="h-5 w-5 text-orange-500" />;
      case "announcement":
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
      default:
        return <Bell className="h-5 w-5 text-foreground/60" />;
    }
  };

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Comfortaa', cursive" }}>
      <DashboardSidebar />
      <main className={`pt-16 lg:pt-6 pb-20 transition-all duration-300 ${isSidebarCollapsed ? "lg:pl-20" : "lg:pl-64"}`}>
        <div className="container mx-auto px-6 max-w-3xl">
          <div className="mb-8">
            <h1 className="mb-2 font-bold text-foreground" style={{ fontFamily: "'Fredoka One', cursive", fontWeight: 400, letterSpacing: "0.5px", fontSize: "32px" }}>
              Notifications
            </h1>
            <p className="text-foreground/70 text-sm">Your recent activity and updates.</p>
            <div className="mt-4">
              <span className="rounded-full bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700">
                {unreadCount} unread
              </span>
            </div>
          </div>

          <div className="space-y-2">
            {NOTIFICATIONS.map((notification) => (
              <div
                key={notification.id}
                className={`rounded-xl border p-5 transition-colors ${
                  notification.unread
                    ? "border-blue-200/50 bg-blue-50/50 hover:bg-blue-50"
                    : "border-gray-200/50 bg-white/80 hover:bg-gray-50/50"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
                    {getIcon(notification.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-semibold ${notification.unread ? "text-foreground" : "text-foreground/80"}`}>
                        {notification.title}
                      </p>
                      {notification.unread && (
                        <span className="h-2 w-2 flex-shrink-0 rounded-full bg-blue-500 mt-1.5" />
                      )}
                    </div>
                    <p className="mt-1 text-sm text-foreground/60">{notification.message}</p>
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-foreground/50">
                      <Clock className="h-3.5 w-3.5" />
                      {notification.time}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {NOTIFICATIONS.length === 0 && (
            <div className="rounded-xl border border-gray-200/50 bg-white/50 py-16 text-center">
              <Bell className="mx-auto mb-4 h-12 w-12 text-foreground/30" />
              <p className="font-medium text-foreground/70">No notifications yet.</p>
              <p className="mt-1 text-sm text-foreground/50">Updates will appear here.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default StudentNotifications;
