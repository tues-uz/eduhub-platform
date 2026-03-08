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
  UserPlus,
  Receipt,
  Briefcase,
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
  { icon: BookOpen, label: "My Courses", path: "/dashboard/courses" },
  { icon: ListChecks, label: "Placement Test", path: "/dashboard/assignments" },
  { icon: ClipboardList, label: "Quiz", path: "/dashboard/quiz" },
  { icon: Award, label: "Certificates", path: "/dashboard/certificates" },
  { icon: Bell, label: "Notifications", path: "/dashboard/notifications" },
  { icon: Settings, label: "Settings", path: "/dashboard/settings" },
];

export const adminMenuItems: FlatMenuItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard/admin" },
  { icon: GraduationCap, label: "All Student", path: "/dashboard/admin/students" },
  { icon: GraduationCap, label: "All Teacher", path: "/dashboard/admin/teachers" },
  { icon: Briefcase, label: "All Staff", path: "/dashboard/admin/staff" },
  { icon: BookOpen, label: "All Course", path: "/dashboard/admin/courses" },
  { icon: UserPlus, label: "Add User Role", path: "/dashboard/admin/add-user-role" },
  { icon: Receipt, label: "Transaction", path: "/dashboard/admin/transactions" },
  { icon: BarChart3, label: "Report", path: "/dashboard/admin/reports" },
  { icon: Settings, label: "Settings", path: "/dashboard/admin/settings" },
];

export const teacherMenuItems: Array<FlatMenuItem | NestedMenuItem> = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard/teacher" },
  { icon: GraduationCap, label: "All Student", path: "/dashboard/teacher/students" },
  {
    icon: BookOpen,
    label: "Course",
    children: [
      { label: "My courses", path: "/dashboard/teacher/courses" },
      { label: "Add new course", path: "/dashboard/teacher/courses/new" },
      { label: "Add placement test", path: "/dashboard/teacher/placement-test" },
    ],
  },
  { icon: Calendar, label: "Schedule", path: "/dashboard/teacher/schedule" },
  { icon: Settings, label: "Settings", path: "/dashboard/teacher/settings" },
];
