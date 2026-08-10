import { writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const dir = dirname(fileURLToPath(import.meta.url));

const pages = [
  { file: "student-dashboard", title: "Student Dashboard", route: "/dashboard", role: "#2563eb" },
  { file: "available-classes", title: "Available Classes", route: "/dashboard/available-courses", role: "#2563eb" },
  { file: "enrollment-form", title: "Join Class", route: "/dashboard/available-courses/enroll/…", role: "#2563eb" },
  { file: "student-payment", title: "Payment History", route: "/dashboard/payment", role: "#2563eb" },
  { file: "student-course", title: "My Class", route: "/dashboard/courses/:id", role: "#2563eb" },
  { file: "student-certificates", title: "Certificates", route: "/dashboard/certificates", role: "#2563eb" },
  { file: "teacher-dashboard", title: "Teacher Dashboard", route: "/dashboard/teacher", role: "#059669" },
  { file: "teacher-course-new", title: "Add New Class", route: "/dashboard/teacher/courses/new", role: "#059669" },
  { file: "teacher-attendance", title: "Attendance QR", route: "/dashboard/teacher/attendance", role: "#059669" },
  { file: "teacher-payroll", title: "Teacher Payroll", route: "/dashboard/teacher/payroll", role: "#059669" },
  { file: "admin-dashboard", title: "Admin Dashboard", route: "/dashboard/admin", role: "#d97706" },
  { file: "admin-add-user", title: "Add User", route: "/dashboard/admin/add-user", role: "#d97706" },
  { file: "admin-course-schedule", title: "Approve Schedule", route: "/dashboard/admin/courses/…/schedule", role: "#d97706" },
  { file: "admin-enrollment", title: "Enrollment Applications", route: "/dashboard/admin/enrollment-applications", role: "#d97706" },
  { file: "admin-payments", title: "Payments", route: "/dashboard/admin/payments", role: "#d97706" },
  { file: "admin-payroll", title: "Admin Payroll", route: "/dashboard/admin/payroll", role: "#d97706" },
];

mkdirSync(dir, { recursive: true });

for (const p of pages) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="300" viewBox="0 0 480 300">
  <rect width="480" height="300" fill="#f8fafc"/>
  <rect width="480" height="40" fill="${p.role}"/>
  <text x="16" y="26" fill="#fff" font-family="system-ui,sans-serif" font-size="14" font-weight="600">${p.title}</text>
  <rect x="12" y="52" width="72" height="236" rx="8" fill="#e2e8f0"/>
  <rect x="96" y="52" width="372" height="48" rx="8" fill="#fff" stroke="#e2e8f0"/>
  <rect x="96" y="112" width="180" height="80" rx="8" fill="#fff" stroke="#e2e8f0"/>
  <rect x="288" y="112" width="180" height="80" rx="8" fill="#fff" stroke="#e2e8f0"/>
  <rect x="96" y="204" width="372" height="84" rx="8" fill="#fff" stroke="#e2e8f0"/>
  <text x="96" y="292" fill="#64748b" font-family="system-ui,sans-serif" font-size="11">${p.route}</text>
</svg>`;
  writeFileSync(join(dir, `${p.file}.svg`), svg);
}

console.log(`Wrote ${pages.length} wireframes to ${dir}`);
