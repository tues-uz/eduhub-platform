import {
  LayoutDashboard,
  BookOpen,
  Award,
  BarChart3,
  Calendar,
  Settings,
  Bell,
  ClipboardList,
  ListChecks,
  GraduationCap,
  Library,
  Users,
  Link2,
  QrCode,
} from "lucide-react";

type MenuItemBase = {
  icon: typeof LayoutDashboard;
  label: string;
};

export type FlatMenuItem = MenuItemBase & {
  path: string;
};

export type NestedMenuItem = MenuItemBase & {
  children: { label: string; path: string }[];
};

export const studentMenuItems: FlatMenuItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: BookOpen, label: "My Class", path: "/dashboard/courses" },
  { icon: Library, label: "Available Classes", path: "/dashboard/available-courses" },
  { icon: ListChecks, label: "Placement Test", path: "/dashboard/placement-tests" },
  { icon: ClipboardList, label: "Quiz", path: "/dashboard/quiz" },
  { icon: Award, label: "Certificates", path: "/dashboard/certificates" },
  { icon: Bell, label: "Notifications", path: "/dashboard/notifications" },
  { icon: Settings, label: "Settings", path: "/dashboard/settings" },
];

/** Admin: nested groups for LMS + booking + payments operations */
export const adminMenuItems: Array<FlatMenuItem | NestedMenuItem> = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard/admin" },
  {
    icon: Users,
    label: "People",
    children: [
      { label: "Students & registrations", path: "/dashboard/admin/students" },
      { label: "Teachers", path: "/dashboard/admin/teachers" },
      { label: "Staff", path: "/dashboard/admin/staff" },
      { label: "Users", path: "/dashboard/admin/users" },
      { label: "Add user role", path: "/dashboard/admin/add-user-role" },
    ],
  },
  {
    icon: BookOpen,
    label: "Classes",
    children: [
      { label: "All classes", path: "/dashboard/admin/courses" },
      { label: "Enrollments & waitlist", path: "/dashboard/admin/enrollments" },
      { label: "Classes & rosters", path: "/dashboard/admin/classes" },
    ],
  },
  {
    icon: ClipboardList,
    label: "Operations",
    children: [
      { label: "Payments & reminders", path: "/dashboard/admin/payments" },
      { label: "Transactions", path: "/dashboard/admin/transactions" },
      { label: "Attendance & progress", path: "/dashboard/admin/attendance" },
      { label: "Placement tests", path: "/dashboard/admin/placement-tests" },
      { label: "Certifications", path: "/dashboard/admin/certifications" },
      { label: "Calendar", path: "/dashboard/admin/calendar" },
      { label: "Support sessions", path: "/dashboard/admin/support-sessions" },
    ],
  },
  { icon: Link2, label: "Integrations", path: "/dashboard/admin/integrations" },
  { icon: BarChart3, label: "Reports", path: "/dashboard/admin/reports" },
  { icon: Settings, label: "Settings", path: "/dashboard/admin/settings" },
];

export const teacherMenuItems: Array<FlatMenuItem | NestedMenuItem> = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard/teacher" },
  { icon: GraduationCap, label: "All Student", path: "/dashboard/teacher/students" },
  { icon: QrCode, label: "Attendance QR", path: "/dashboard/teacher/attendance" },
  {
    icon: BookOpen,
    label: "Class",
    children: [
      { label: "My Class", path: "/dashboard/teacher/courses" },
      { label: "Add new class", path: "/dashboard/teacher/courses/new" },
      { label: "Placement Test/Quiz", path: "/dashboard/teacher/placement-test" },
    ],
  },
  { icon: Calendar, label: "Schedule", path: "/dashboard/teacher/schedule" },
  { icon: Settings, label: "Settings", path: "/dashboard/teacher/settings" },
];
