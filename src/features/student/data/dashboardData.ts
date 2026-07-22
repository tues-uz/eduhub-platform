import {
  Award,
  BookOpen,
  TrendingUp,
} from "@/lib/icons";

/**
 * Overview stat tiles — `value` is the pre-auth/offline placeholder only; `dashboardApi.getStudentOverview`
 * overrides these with live counts whenever a session is available.
 */
export const studentStats = [
  {
    icon: BookOpen,
    label: "Classes enrolled",
    value: "0",
    color: "text-blue-500",
    bgColor: "bg-blue-50",
    href: "/dashboard/courses",
  },
  {
    icon: Award,
    label: "Certificates",
    value: "0",
    color: "text-orange-500",
    bgColor: "bg-orange-50",
    href: "/dashboard/certificates",
  },
  {
    icon: TrendingUp,
    label: "Progress",
    value: "0%",
    color: "text-green-500",
    bgColor: "bg-green-50",
    href: "/dashboard/progress",
  },
] as const;

/** Pre-auth/offline fallback only — `dashboardApi.getStudentOverview` replaces this with real activity. */
export const studentRecentActivity: { type: "completed" | "certificate" | "enrolled"; text: string; time: string }[] = [];

export const enrolledCourses = [
  {
    id: 1,
    title: "Introduction to Economics",
    instructor: "Dr. Dilshod Karimov",
    progress: 75,
    status: "In Progress",
    nextLesson: "Market Structures",
    category: "Business",
    duration: "8 weeks",
    modules: 12,
    enrolledDate: "2024-09-01",
  },
  {
    id: 2,
    title: "Business Management Fundamentals",
    instructor: "Prof. Sarah Johnson",
    progress: 45,
    status: "In Progress",
    nextLesson: "Strategic Planning",
    category: "Management",
    duration: "10 weeks",
    modules: 14,
    enrolledDate: "2024-10-15",
  },
  {
    id: 3,
    title: "Digital Marketing Essentials",
    instructor: "Dr. Ahmed Hassan",
    progress: 90,
    status: "Almost Complete",
    nextLesson: "Final Project",
    category: "Marketing",
    duration: "6 weeks",
    modules: 8,
    enrolledDate: "2024-08-20",
  },
  {
    id: 4,
    title: "Financial Accounting",
    instructor: "Prof. Maria Garcia",
    progress: 30,
    status: "In Progress",
    nextLesson: "Balance Sheets",
    category: "Finance",
    duration: "12 weeks",
    modules: 16,
    enrolledDate: "2024-11-01",
  },
  {
    id: 5,
    title: "English for Business",
    instructor: "Ms. Elena Petrova",
    progress: 60,
    status: "In Progress",
    nextLesson: "Writing Reports",
    category: "Language",
    duration: "8 weeks",
    modules: 10,
    enrolledDate: "2024-09-15",
  },
  {
    id: 6,
    title: "Data Analysis with Excel",
    instructor: "Dr. James Wilson",
    progress: 100,
    status: "Completed",
    nextLesson: "—",
    category: "Analytics",
    duration: "6 weeks",
    modules: 8,
    enrolledDate: "2024-07-01",
  },
];
