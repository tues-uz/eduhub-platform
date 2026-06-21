/**
 * Replace hardcoded English strings in admin TSX files with t() calls.
 * Run after patch-admin-i18n.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const replacements = [
  // Back links
  ['>Back to dashboard<', '>{t("admin.shared.backToDashboard")}<'],
  ['>Back to payments<', '>{t("admin.shared.backToPayments")}<'],
  ['>Back to payroll<', '>{t("admin.shared.backToPayroll")}<'],
  ['>Back to payroll overview<', '>{t("admin.shared.backToPayrollOverview")}<'],
  ['>Back to enrollment applications<', '>{t("admin.shared.backToEnrollmentApplications")}<'],
  ['>Back to notifications<', '>{t("admin.shared.backToNotifications")}<'],
  // Common filters
  ['placeholder="Search name, email, role…"', 'placeholder={t("admin.shared.searchNameEmailRole")}'],
  ['placeholder="Search name or email…"', 'placeholder={t("admin.shared.searchNameEmail")}'],
  ['placeholder="Search student, class…"', 'placeholder={t("admin.shared.searchStudentClass")}'],
  ['placeholder="Search student, class, lecturer…"', 'placeholder={t("admin.shared.searchStudentClassLecturer")}'],
  ['>Clear filters<', '>{t("admin.shared.clearFilters")}<'],
  ['>All roles<', '>{t("admin.shared.allRoles")}<'],
  ['>All statuses<', '>{t("admin.shared.allStatuses")}<'],
  ['>All types<', '>{t("admin.shared.allTypes")}<'],
  ['>All methods<', '>{t("admin.shared.allMethods")}<'],
  ['>All classes<', '>{t("admin.shared.allClasses")}<'],
  ['>All lecturers<', '>{t("admin.shared.allLecturers")}<'],
  ['>All categories<', '>{t("admin.shared.allCategories")}<'],
  ['>All payments<', '>{t("admin.shared.allPayments")}<'],
  ['>All enrollments<', '>{t("admin.shared.allEnrollments")}<'],
  ['>All class statuses<', '>{t("admin.shared.allClassStatuses")}<'],
  ['>All risk levels<', '>{t("admin.shared.allRiskLevels")}<'],
  ['>All results<', '>{t("admin.shared.allResults")}<'],
  ['>All eligibility<', '>{t("admin.shared.allEligibility")}<'],
  ['>Any course load<', '>{t("admin.shared.anyCourseLoad")}<'],
  ['>Active<', '>{t("admin.shared.active")}<'],
  ['>Inactive<', '>{t("admin.shared.inactive")}<'],
  ['placeholder="Role"', 'placeholder={t("admin.shared.role")}'],
  ['placeholder="Status"', 'placeholder={t("common.status")}'],
  ['>Name<', '>{t("common.name")}<'],
  ['>Email<', '>{t("admin.shared.email")}<'],
  ['>Role<', '>{t("admin.shared.role")}<'],
  ['>Status<', '>{t("common.status")}<'],
  ['>Actions<', '>{t("common.actions")}<'],
  ['>Student<', '>{t("admin.shared.student")}<'],
  ['>Class<', '>{t("admin.shared.class")}<'],
  ['>Course<', '>{t("admin.shared.course")}<'],
  ['>Lecturer<', '>{t("admin.shared.lecturer")}<'],
  ['>Amount<', '>{t("admin.shared.amount")}<'],
  ['>Date<', '>{t("admin.shared.date")}<'],
  ['>Title<', '>{t("admin.shared.title")}<'],
  ['>Details<', '>{t("admin.shared.details")}<'],
  ['>Review<', '>{t("admin.shared.review")}<'],
  ['>Approve<', '>{t("admin.shared.approve")}<'],
  ['>Reject<', '>{t("admin.shared.reject")}<'],
  ['>Cancel<', '>{t("common.cancel")}<'],
  ['>Close<', '>{t("common.close")}<'],
  ['>Save<', '>{t("common.save")}<'],
  ['>View<', '>{t("common.view")}<'],
  ['>Edit<', '>{t("common.edit")}<'],
  ['>Deactivate<', '>{t("admin.shared.deactivate")}<'],
  ['>Activate<', '>{t("admin.shared.activate")}<'],
  ['>Loading...<', '>{t("common.loading")}<'],
  ['>Loading…<', '>{t("common.loading")}<'],
  ['>Loading users…<', '>{t("admin.shared.loadingUsers")}<'],
  // Page titles via AdminPageHeader
  ['title="Students & registrations"', 'title={t("adminNav.studentsRegistrations")}'],
  ['title="Teachers"', 'title={t("adminNav.teachers")}'],
  ['title="Staff"', 'title={t("adminNav.staff")}'],
  ['title="Users"', 'title={t("adminNav.users")}'],
  ['title="Settings"', 'title={t("common.settings")}'],
  ['title="Notifications"', 'title={t("adminNav.notifications")}'],
  ['title="Calendar"', 'title={t("adminNav.calendar")}'],
  ['title="Transactions"', 'title={t("adminNav.transactions")}'],
  ['title="Attendance & progress"', 'title={t("adminNav.attendanceProgress")}'],
  ['title="Placement tests"', 'title={t("adminNav.placementTests")}'],
  ['title="Certifications"', 'title={t("adminNav.certifications")}'],
  ['title="Enrollments & waitlist"', 'title={t("adminNav.enrollmentsWaitlist")}'],
  ['title="Enrollment applications"', 'title={t("adminNav.enrollmentApplications")}'],
  ['title="Classes & rosters"', 'title={t("adminNav.classesRosters")}'],
  ['title="Student promos"', 'title={t("adminNav.studentPromos")}'],
  ['title="Referral & discount codes"', 'title={t("adminNav.referralCodes")}'],
  ['title="Special tuition grants"', 'title={t("adminNav.specialTuition")}'],
  ['title="Payments & reminders"', 'title={t("adminNav.paymentsReminders")}'],
  ['title="Schedule month payments"', 'title={t("adminNav.scheduleMonthPayments")}'],
  ['title="Payroll"', 'title={t("adminNav.payroll")}'],
  ['title="All classes"', 'title={t("admin.shared.allClasses")}'],
  ['title="Class schedule"', 'title={t("admin.courses.schedule.title")}'],
  ['title="Integrations & LMS"', 'title={t("adminNav.integrations")}'],
  ['title="Reports & analytics"', 'title={t("adminNav.reports")}'],
  ['title="Add user role"', 'title={t("adminNav.addUserRole")}'],
  ['title="Instructor payroll requests"', 'title={t("admin.instructorPayrollRequests.title")}'],
  ['title="Substitute cover requests"', 'title={t("adminNav.substituteRequests")}'],
  // Descriptions
  ['description="Directory and status of enrolled students."', 'description={t("admin.students.description")}'],
  ['description="Cross-role user list."', 'description={t("admin.users.description")}'],
  ['description="Lecturer accounts and class load."', 'description={t("admin.teachers.description")}'],
  ['description="Non-teaching staff accounts (demo data)."', 'description={t("admin.staff.description")}'],
  ['description="Admin activity alerts and updates."', 'description={t("admin.notifications.description")}'],
  ['description="Recorded movements (demo). Pair with Payments for reconciliation when the ledger API is live."', 'description={t("admin.transactions.description")}'],
  ['description="Monitor partial attendance and completion. Use filters for at-risk learners once the API exposes thresholds."', 'description={t("admin.attendance.description")}'],
  ['description="Monitor placement results and tie outcomes to enrollments and class placement."', 'description={t("admin.placementTests.description")}'],
  ['description="Eligibility requires survey completion and class completion. Issue actions call the API when available."', 'description={t("admin.certifications.description")}'],
  ['description="Class enrollment, roster assignment, and waitlist promotion. Server validates capacity and payment rules."', 'description={t("admin.enrollments.description")}'],
  ['description="Assign students to classes, track session quota, and handle class switching from the student or enrollment record."', 'description={t("admin.classesRosters.description")}'],
  ['description="Class schedules, placement or mock tests, and review sessions. Drill through to the class or student when wired to routes."', 'description={t("admin.calendar.description")}'],
  ['description="Additional classes or support blocks requested by students. Approve and schedule when integrations are ready."', 'description={t("admin.supportSessions.description")}'],
  ['description="Open a request to see full details. When both instructors agree, you can give final approval on the request page."', 'description={t("admin.substituteCover.list.description")}'],
  // Empty states
  ['No users match your search or filters.', '{t("admin.users.empty")}'],
  ['No staff match your search or filters.', '{t("admin.staff.empty")}'],
  ['No students match your search or filters.', '{t("admin.students.empty")}'],
  ['No transactions match your search or filters.', '{t("admin.transactions.empty")}'],
  ['No events match your search or filters.', '{t("admin.calendar.empty")}'],
  ['No enrollments match your search or filters.', '{t("admin.enrollments.empty")}'],
  ['No classes match your search or filters.', '{t("admin.classesRosters.empty")}'],
  ['No sessions match your search or filters.', '{t("admin.supportSessions.empty")}'],
  // Dashboard
  ['Admin Dashboard', '{t("admin.dashboard.subtitle")}'],
  ['Recent Users', '{t("admin.dashboard.recentUsers.title")}'],
  ['Add User', '{t("admin.dashboard.recentUsers.addUser")}'],
  ['System Activity', '{t("admin.dashboard.systemActivity.title")}'],
  ['Quick Actions', '{t("admin.dashboard.quickActions.title")}'],
  ['Admin Access', '{t("admin.dashboard.adminAccess.title")}'],
  ['You have full access to users, classes, and platform configuration.', '{t("admin.dashboard.adminAccess.description")}'],
  ['No users yet.', '{t("admin.dashboard.recentUsers.empty.none")}'],
  ['Could not load users.', '{t("admin.dashboard.recentUsers.loadError")}'],
  ['>View enrollments<', '>{t("admin.students.actions.viewEnrollments")}<'],
  ['>Remind selected<', '>{t("admin.students.remindSelected")}<'],
  ['placeholder="Student status"', 'placeholder={t("admin.students.statusPlaceholder")}'],
  ['>Classes<', '>{t("admin.students.table.classes")}<'],
  ['>Registered<', '>{t("admin.students.table.registered")}<'],
  ['placeholder="Search title, type, time…"', 'placeholder={t("admin.calendar.searchPlaceholder")}'],
  ['placeholder="Event type"', 'placeholder={t("admin.calendar.eventTypePlaceholder")}'],
  ['placeholder="Search reference, student, amount, method…"', 'placeholder={t("admin.transactions.searchPlaceholder")}'],
  ['placeholder="Type"', 'placeholder={t("admin.transactions.typePlaceholder")}'],
  ['placeholder="Method"', 'placeholder={t("admin.transactions.methodPlaceholder")}'],
  ['>Reference<', '>{t("admin.transactions.table.reference")}<'],
  ['>Type<', '>{t("admin.transactions.table.type")}<'],
  ['>Method<', '>{t("admin.transactions.table.method")}<'],
  ['>Recorded<', '>{t("admin.transactions.table.recorded")}<'],
  ['>Total Users<', '>{t("admin.dashboard.stats.totalUsers")}<'],
  ['>Students<', '>{t("admin.dashboard.stats.students")}<'],
  ['>Classes<', '>{t("admin.dashboard.stats.classes")}<'],
];

const files = [
  "src/pages/AdminDashboard.tsx",
  ...fs.readdirSync(path.join(root, "src/features/admin/pages"))
    .filter((f) => f.endsWith(".tsx") && !f.endsWith(".test.tsx"))
    .map((f) => `src/features/admin/pages/${f}`),
  ...fs.readdirSync(path.join(root, "src/features/admin/components"))
    .filter((f) => f.endsWith(".tsx") && !["AdminPageHeader.tsx", "AdminLayout.tsx"].includes(f))
    .map((f) => `src/features/admin/components/${f}`),
];

for (const rel of files) {
  const file = path.join(root, rel);
  let src = fs.readFileSync(file, "utf8");
  let count = 0;
  for (const [from, to] of replacements) {
    if (src.includes(from)) {
      src = src.split(from).join(to);
      count++;
    }
  }
  if (count > 0) {
    fs.writeFileSync(file, src);
    console.log(`${rel}: ${count} replacements`);
  }
}
