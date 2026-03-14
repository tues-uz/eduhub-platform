/**
 * Builds docs/PROGRESS-REPORT.xlsx from the progress report content.
 * Run: node scripts/build-progress-report-excel.mjs
 */
import * as XLSX from "xlsx";
import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
// Write to public/ so the app can serve it for download; also keep a copy in docs/
const publicPath = join(__dirname, "..", "public", "PROGRESS-REPORT.xlsx");
const docsPath = join(__dirname, "..", "docs", "PROGRESS-REPORT.xlsx");

const wb = XLSX.utils.book_new();

// ---- Sheet: Summary ----
const summaryData = [
  ["Area", "Status"],
  ["Public site & auth", "Done: landing, sign-in, sign-up, verify-email, session, role-based redirect"],
  ["Student flows", "Done: dashboard, my courses, available courses, course detail, lessons, assignments, quiz, certificates, progress, schedule, notifications, settings"],
  ["Teacher flows", "Done: dashboard, course CRUD + publish, add/edit course form, placement test/quiz, quiz results, students list; schedule/settings are placeholders"],
  ["Admin", "Done: admin dashboard with stats and activity; other admin pages are placeholders"],
  ["API integration", "Done: auth, courses (published catalog + my-courses), modules, lessons, enrollment, lesson progress; token refresh in place"],
  ["Architecture", "Done: feature-first layout, central routes and providers, shared auth and layout state"],
];
const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

// ---- Sheet: Tech Stack ----
const techStackData = [
  ["Area", "Technology"],
  ["Framework", "React 18, TypeScript"],
  ["Build", "Vite"],
  ["Routing", "React Router v6"],
  ["Data / API", "TanStack Query (React Query), REST client with token refresh"],
  ["UI", "Tailwind CSS, Radix UI primitives, Lucide icons, shadcn-style components"],
  ["Forms", "React Hook Form, Zod"],
  ["Testing", "Vitest, Testing Library"],
  ["Other", "Recharts, date-fns, GSAP (landing), PDF.js (lessons), Sonner toasts"],
];
const wsTech = XLSX.utils.aoa_to_sheet(techStackData);
XLSX.utils.book_append_sheet(wb, wsTech, "Tech Stack");

// ---- Sheet: Delivered Features ----
const deliveredData = [
  ["Section", "Feature", "Description"],
  ["Public & auth", "Landing page", "Marketing-style landing with hero, features, testimonials, CTA; GSAP animations."],
  ["Public & auth", "Sign in", "Login form wired to backend auth API; token refresh."],
  ["Public & auth", "Sign up", "Registration flow integrated with backend."],
  ["Public & auth", "Email verification", "Verify-email page and routes."],
  ["Public & auth", "Session & role", "Central auth context; role-based dashboard redirect."],
  ["Student", "Dashboard", "Welcome, stats, enrolled courses, assignments, activity, notifications."],
  ["Student", "My Courses", "List of enrolled courses with progress and quick actions."],
  ["Student", "Available Courses", "Catalog: API published + my-courses + local teacher courses; search, enroll."],
  ["Student", "Course detail", "Single course view; modules/lessons; enroll/resume."],
  ["Student", "Lesson page", "Lesson content (PDF/video/text), progress, next/previous."],
  ["Student", "Assignments", "Assignments list and status."],
  ["Student", "Quiz", "Student quiz/placement test flow."],
  ["Student", "Certificates", "Certificates view."],
  ["Student", "Progress", "Student progress overview."],
  ["Student", "Schedule", "Schedule view."],
  ["Student", "Notifications", "Notifications list and unread indicator."],
  ["Student", "Settings", "Student settings page."],
  ["Teacher", "Dashboard", "Teacher home (placeholder or summary)."],
  ["Teacher", "My courses", "List, create, edit, delete, publish; backend + local store."],
  ["Teacher", "Add / Edit course", "Course form; create and edit by courseId."],
  ["Teacher", "Placement test / Quiz", "Teacher quiz creation and management."],
  ["Teacher", "Quiz results", "View results per quiz."],
  ["Teacher", "Students", "List of students."],
  ["Teacher", "Schedule, Settings", "Routes present; placeholder pages."],
  ["Admin", "Dashboard", "Stats, recent users, system activity, quick actions."],
  ["Admin", "Other sections", "Routes exist; placeholder (All Students, Teachers, Staff, Courses, etc.)."],
];
const wsDelivered = XLSX.utils.aoa_to_sheet(deliveredData);
XLSX.utils.book_append_sheet(wb, wsDelivered, "Delivered Features");

// ---- Sheet: Upcoming Tasks ----
const upcomingData = [
  ["Category", "Task", "Details / Route", "Done"],
  ["Admin", "All Students", "List, search, filter, manage students. /dashboard/admin/students", ""],
  ["Admin", "All Teachers", "List and manage teachers. /dashboard/admin/teachers", ""],
  ["Admin", "All Staff", "List and manage staff. /dashboard/admin/staff", ""],
  ["Admin", "All Courses", "Admin view of all courses; approve/unpublish. /dashboard/admin/courses", ""],
  ["Admin", "Add User Role", "Assign or change user roles. /dashboard/admin/add-user-role", ""],
  ["Admin", "Transactions", "View payments/transactions. /dashboard/admin/transactions", ""],
  ["Admin", "Reports", "Reports and exports. /dashboard/admin/reports", ""],
  ["Admin", "Users", "User management (list, edit, disable). /dashboard/admin/users", ""],
  ["Admin", "Analytics", "Analytics dashboard and metrics. /dashboard/admin/analytics", ""],
  ["Admin", "Admin Settings", "Platform or admin-specific settings. /dashboard/admin/settings", ""],
  ["Teacher", "Teacher Dashboard", "Replace placeholder with real summary (stats, activity, quick links).", ""],
  ["Teacher", "Teacher Assignments", "Assignments management. /dashboard/teacher/assignments", ""],
  ["Teacher", "Teacher Schedule", "Schedule/calendar view. /dashboard/teacher/schedule", ""],
  ["Teacher", "Teacher Settings", "Profile or teaching preferences. /dashboard/teacher/settings", ""],
  ["Student", "Assignments", "Full backend integration if assignment APIs available.", ""],
  ["Student", "Certificates", "Backend integration for issuing and displaying certificates.", ""],
  ["Student", "Progress", "Align fully with backend progress APIs if needed.", ""],
  ["Student", "Schedule", "Backend-driven schedule if applicable.", ""],
  ["API", "GET /api/v1/courses", "Ensure returns all published courses for student catalog.", ""],
  ["API", "Publish course", "Ensure lecturers can publish (e.g. PATCH .../publish).", ""],
  ["API", "Admin APIs", "Define/implement APIs for users, transactions, reports, analytics.", ""],
  ["API", "Teacher APIs", "Add or align APIs for teacher assignments and schedule.", ""],
  ["Technical", "Tests for new pages", "Add tests when replacing admin/teacher placeholders.", ""],
  ["Technical", "Migrate legacy pages", "Move src/pages/* into src/features/* where it adds clarity.", ""],
  ["Technical", "Error handling", "Document or standardize error handling and empty states.", ""],
  ["Technical", "E2E tests", "Playwright/Cypress for login, course enroll, lesson view.", ""],
  ["Technical", "Accessibility", "A11y audit and fixes (keyboard nav, ARIA, focus order).", ""],
  ["Technical", "Mobile responsiveness", "Review and tweaks for dashboard and course pages.", ""],
  ["Auth & account", "Forgot password", "Request reset link and reset-password flow.", ""],
  ["Auth & account", "Password change", "Change password from Settings.", ""],
  ["Auth & account", "Profile edit", "Edit name, email, or avatar from Settings/dashboard.", ""],
  ["Other", "Notifications", "Backend integration for real or push notifications.", ""],
  ["Other", "Search", "Global or course-level search (if in scope).", ""],
  ["Other", "Localization (i18n)", "Multi-language support (if required).", ""],
  ["Other", "Deployment docs", "Staging vs production, env vars.", ""],
];
const wsUpcoming = XLSX.utils.aoa_to_sheet(upcomingData);
XLSX.utils.book_append_sheet(wb, wsUpcoming, "Upcoming Tasks");

// ---- Sheet: Overview ----
const overviewData = [
  ["EduHub Platform — Progress Report"],
  [""],
  ["Document purpose", "Client-facing summary of delivered features and current state."],
  ["Last updated", "March 2026."],
  [""],
  ["Project overview", "EduHub is a learning management platform with three main user roles: Student, Teacher, and Admin. The frontend is a single-page application (SPA) that provides role-based dashboards, course discovery, enrollment, lessons, quizzes, and administrative surfaces. The app integrates with a backend API for auth, courses, modules, lessons, enrollment, and progress."],
];
const wsOverview = XLSX.utils.aoa_to_sheet(overviewData);
XLSX.utils.book_append_sheet(wb, wsOverview, "Overview");

// ---- Write ----
XLSX.writeFile(wb, publicPath);
XLSX.writeFile(wb, docsPath);
console.log("Written:", publicPath);
console.log("Written:", docsPath);
