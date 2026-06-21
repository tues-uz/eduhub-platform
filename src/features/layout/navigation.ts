import {
  LayoutDashboard,
  BookOpen,
  Award,
  BarChart3,
  Calendar,
  Settings,
  Bell,
  ClipboardList,
  GraduationCap,
  Library,
  Users,
  Link2,
  QrCode,
  CreditCard,
} from "@/lib/icons";

type MenuItemBase = {
  icon: typeof LayoutDashboard;
  labelKey: string;
};

export type FlatMenuItem = MenuItemBase & {
  path: string;
};

export type NestedMenuItem = MenuItemBase & {
  children: { labelKey: string; path: string }[];
};

export const studentMenuItems: FlatMenuItem[] = [
  { icon: LayoutDashboard, labelKey: "studentNav.dashboard", path: "/dashboard" },
  { icon: BookOpen, labelKey: "studentNav.myClass", path: "/dashboard/courses" },
  { icon: Library, labelKey: "studentNav.availableClasses", path: "/dashboard/available-courses" },
  { icon: CreditCard, labelKey: "studentNav.paymentHistory", path: "/dashboard/payment" },
  { icon: ClipboardList, labelKey: "studentNav.quiz", path: "/dashboard/quiz" },
  { icon: Award, labelKey: "studentNav.certificates", path: "/dashboard/certificates" },
  { icon: Settings, labelKey: "studentNav.settings", path: "/dashboard/settings" },
];

/** Admin: nested groups for LMS + booking + payments operations */
export const adminMenuItems: Array<FlatMenuItem | NestedMenuItem> = [
  { icon: LayoutDashboard, labelKey: "adminNav.dashboard", path: "/dashboard/admin" },
  { icon: Bell, labelKey: "adminNav.notifications", path: "/dashboard/admin/notifications" },
  {
    icon: Users,
    labelKey: "adminNav.people",
    children: [
      { labelKey: "adminNav.studentsRegistrations", path: "/dashboard/admin/students" },
      { labelKey: "adminNav.teachers", path: "/dashboard/admin/teachers" },
      { labelKey: "adminNav.staff", path: "/dashboard/admin/staff" },
      { labelKey: "adminNav.users", path: "/dashboard/admin/users" },
      { labelKey: "adminNav.addUserRole", path: "/dashboard/admin/add-user-role" },
    ],
  },
  {
    icon: BookOpen,
    labelKey: "adminNav.classes",
    children: [
      { labelKey: "adminNav.allClassesSchedules", path: "/dashboard/admin/courses" },
      { labelKey: "adminNav.enrollmentsWaitlist", path: "/dashboard/admin/enrollments" },
      { labelKey: "adminNav.enrollmentApplications", path: "/dashboard/admin/enrollment-applications" },
      { labelKey: "adminNav.classesRosters", path: "/dashboard/admin/classes" },
      { labelKey: "adminNav.studentPromos", path: "/dashboard/admin/promos" },
      { labelKey: "adminNav.referralCodes", path: "/dashboard/admin/referral-codes" },
      { labelKey: "adminNav.specialTuition", path: "/dashboard/admin/special-tuition" },
    ],
  },
  {
    icon: ClipboardList,
    labelKey: "adminNav.operations",
    children: [
      { labelKey: "adminNav.paymentsReminders", path: "/dashboard/admin/payments" },
      { labelKey: "adminNav.scheduleMonthPayments", path: "/dashboard/admin/installment-payments" },
      { labelKey: "adminNav.payroll", path: "/dashboard/admin/payroll" },
      { labelKey: "adminNav.transactions", path: "/dashboard/admin/transactions" },
      { labelKey: "adminNav.attendanceProgress", path: "/dashboard/admin/attendance" },
      { labelKey: "adminNav.placementTests", path: "/dashboard/admin/placement-tests" },
      { labelKey: "adminNav.certifications", path: "/dashboard/admin/certifications" },
      { labelKey: "adminNav.calendar", path: "/dashboard/admin/calendar" },
      { labelKey: "adminNav.supportSessions", path: "/dashboard/admin/support-sessions" },
      { labelKey: "adminNav.substituteRequests", path: "/dashboard/admin/substitute-requests" },
    ],
  },
  { icon: Link2, labelKey: "adminNav.integrations", path: "/dashboard/admin/integrations" },
  { icon: BarChart3, labelKey: "adminNav.reports", path: "/dashboard/admin/reports" },
  { icon: Settings, labelKey: "adminNav.settings", path: "/dashboard/admin/settings" },
];

export const teacherMenuItems: Array<FlatMenuItem | NestedMenuItem> = [
  { icon: LayoutDashboard, labelKey: "teacherNav.dashboard", path: "/dashboard/teacher" },
  { icon: GraduationCap, labelKey: "teacherNav.allStudent", path: "/dashboard/teacher/students" },
  { icon: QrCode, labelKey: "teacherNav.attendanceQr", path: "/dashboard/teacher/attendance" },
  {
    icon: BookOpen,
    labelKey: "teacherNav.class",
    children: [
      { labelKey: "teacherNav.myClass", path: "/dashboard/teacher/courses" },
      { labelKey: "teacherNav.addNewClass", path: "/dashboard/teacher/courses/new" },
    ],
  },
  { icon: Calendar, labelKey: "teacherNav.scheduleApprovals", path: "/dashboard/teacher/schedule" },
  { icon: Bell, labelKey: "teacherNav.notifications", path: "/dashboard/teacher/notifications" },
  { icon: CreditCard, labelKey: "teacherNav.payroll", path: "/dashboard/teacher/payroll" },
  { icon: Settings, labelKey: "teacherNav.settings", path: "/dashboard/teacher/settings" },
];

export type TranslatedFlatMenuItem = FlatMenuItem & { label: string };
export type TranslatedNestedMenuItem = Omit<NestedMenuItem, "children"> & {
  label: string;
  children: { label: string; path: string }[];
};
export type TranslatedMenuItem = TranslatedFlatMenuItem | TranslatedNestedMenuItem;

export function translateMenuItems(
  items: Array<FlatMenuItem | NestedMenuItem>,
  t: (key: string) => string,
): TranslatedMenuItem[] {
  return items.map((item) => {
    if ("path" in item) {
      return { ...item, label: t(item.labelKey) };
    }
    return {
      ...item,
      label: t(item.labelKey),
      children: item.children.map((child) => ({
        ...child,
        label: t(child.labelKey),
      })),
    };
  });
}
