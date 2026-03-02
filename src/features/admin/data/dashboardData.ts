import {
  Users,
  GraduationCap,
  BookOpen,
  TrendingUp,
} from "lucide-react";

export const adminStats = [
  { icon: Users, label: "Total Users", value: "2,847", change: "+142", trend: "up", color: "text-slate-600", bgColor: "bg-slate-50", borderColor: "border-slate-200" },
  { icon: GraduationCap, label: "Students", value: "2,521", change: "+89", trend: "up", color: "text-slate-600", bgColor: "bg-slate-50", borderColor: "border-slate-200" },
  { icon: BookOpen, label: "Courses", value: "48", change: "+5", trend: "up", color: "text-slate-600", bgColor: "bg-slate-50", borderColor: "border-slate-200" },
  { icon: TrendingUp, label: "Active Sessions", value: "312", change: "+23", trend: "up", color: "text-slate-600", bgColor: "bg-slate-50", borderColor: "border-slate-200" },
];

export const adminRecentUsers = [
  { id: 1, name: "Sevinch", email: "Sevinch@eduhub.com", role: "Student", joined: "2024-01-10", status: "Active" },
  { id: 2, name: "Dr. Karimov", email: "karimov@eduhub.com", role: "Teacher", joined: "2024-01-09", status: "Active" },
  { id: 3, name: "Sarah Johnson", email: "sarah.j@eduhub.com", role: "Teacher", joined: "2024-01-08", status: "Active" },
  { id: 4, name: "Ahmed Hassan", email: "ahmed@eduhub.com", role: "Student", joined: "2024-01-07", status: "Inactive" },
];

export const adminSystemActivity = [
  { action: "New user registered", detail: "Sevinch (Student)", time: "10 min ago" },
  { action: "Course published", detail: "Introduction to Economics", time: "1 hour ago" },
  { action: "Teacher account created", detail: "Dr. Karimov", time: "2 hours ago" },
  { action: "Certificate issued", detail: "Business Fundamentals — 12 students", time: "3 hours ago" },
];
