#!/usr/bin/env node
/**
 * Applies i18n to teacher pages/components:
 * - Adds useTranslation import + hook
 * - Replaces known UI strings with t("key") calls
 */
import fs from "fs";
import path from "path";

const ROOT = path.resolve(import.meta.dirname, "..");

const FILES = [
  "src/pages/TeacherDashboard.tsx",
  "src/pages/TeacherNotifications.tsx",
  "src/pages/TeacherPlaceholder.tsx",
  "src/features/teacher/pages/TeacherCoursesPage.tsx",
  "src/features/teacher/pages/TeacherStudentsPage.tsx",
  "src/features/teacher/pages/TeacherAssignmentsPage.tsx",
  "src/features/teacher/pages/TeacherAttendanceQrPage.tsx",
  "src/features/teacher/pages/TeacherScheduleApprovalsPage.tsx",
  "src/features/teacher/pages/TeacherSubstituteInviteReviewPage.tsx",
  "src/features/teacher/pages/TeacherCourseResumeEditPage.tsx",
  "src/features/teacher/pages/TeacherQuizResultsPage.tsx",
  "src/features/teacher/pages/TeacherCourseFormDetailsPage.tsx",
  "src/features/teacher/pages/TeacherCourseFormSchedulePage.tsx",
  "src/features/teacher/pages/TeacherCourseFormLessonsPage.tsx",
  "src/features/teacher/pages/TeacherCourseFormLayout.tsx",
  "src/features/teacher/pages/TeacherQuizPage.tsx",
  "src/features/teacher/pages/TeacherPayrollPage.tsx",
  "src/features/teacher/pages/TeacherCourseRosterPage.tsx",
  "src/features/teacher/components/TeacherAttendanceSessionPanel.tsx",
  "src/features/teacher/components/AttendanceOverviewQrPicker.tsx",
  "src/features/teacher/components/AttendanceSessionLogsSection.tsx",
  "src/features/teacher/components/TeacherCourseGradesPanel.tsx",
  "src/features/teacher/components/TeacherPayrollPayoutDetailsDialog.tsx",
  "src/features/teacher/components/TeacherPayrollSubmitDialog.tsx",
];

/** Ordered replacements: [find, replace]. Longer/more specific first. */
const REPLACEMENTS = [
  ['Back to Teacher Dashboard', '{t("teacherSettings.backToDashboard")}'],
  ['Back to My Class', '{t("teacher.roster.backToMyClass")}'],
  ['Back to class quizzes', '{t("teacher.quiz.backToQuizzes")}'],
  ['Back to notifications', '{t("teacher.substituteReview.backToNotifications")}'],
  ['Back to My Classes', '{t("teacher.resumeEdit.backToClasses")}'],
  ['Back to resumes', '{t("teacher.resumeEdit.backToResumes")}'],
  ['Back to Dashboard', '{t("teacher.placeholder.backToDashboard")}'],
  ['Loading notifications…', '{t("teacher.notifications.loading")}'],
  ['Loading classes…', '{t("teacher.courses.loading")}'],
  ['Loading schedules…', '{t("teacher.courses.scheduleTab.loading")}'],
  ['Loading your classes…', '{t("teacher.scheduleApprovals.loading")}'],
  ['Loading class…', '{t("teacher.roster.errors.loading")}'],
  ['Loading students…', '{t("teacher.roster.enrolled.loading")}'],
  ['Loading quiz…', '{t("teacher.quiz.loading")}'],
  ['Loading quiz results...', '{t("teacher.quizResults.loading")}'],
  ['Mark all as read', '{t("teacher.notifications.markAllRead")}'],
  ['Mark read', '{t("teacher.notifications.markRead")}'],
  ['No notifications yet.', '{t("teacher.notifications.empty.title")}'],
  ['Instructor Dashboard', '{t("teacher.dashboard.subtitle")}'],
  ['Active classes', '{t("teacher.dashboard.stats.activeClasses")}'],
  ['Total students', '{t("teacher.dashboard.stats.totalStudents")}'],
  ['Pending grading', '{t("teacher.dashboard.stats.pendingGrading")}'],
  ['Collected payments', '{t("teacher.dashboard.stats.collectedPayments")}'],
  ['Upcoming Sessions', '{t("teacher.dashboard.upcomingSessions.title")}'],
  ['Teaching classes', '{t("teacher.dashboard.classesTable.title")}'],
  ['Pending Grading', '{t("teacher.dashboard.pendingGrading.title")}'],
  ['Review and grade student submissions', '{t("teacher.dashboard.pendingGrading.subtitle")}'],
  ['Attendance QR (projector)', '{t("teacher.dashboard.attendanceQr.title")}'],
  ['Edit class', '{t("teacher.dashboard.classesTable.action.editClass")}'],
  ['Manage Students', '{t("teacher.dashboard.classesTable.action.manageStudents")}'],
  ['Create your first class', '{t("teacher.dashboard.classesTable.createFirstClass")}'],
  ['No classes yet.', '{t("teacher.dashboard.classesTable.emptyPrefix")}'],
  ['Grade', '{t("teacher.dashboard.pendingGrading.gradeButton")}'],
  ['My Class', '{t("teacherNav.myClass")}'],
  ['Add class', '{t("teacher.courses.addClass")}'],
  ['Add your first class', '{t("teacher.courses.empty.cta")}'],
  ['No classes yet', '{t("teacher.courses.empty.title")}'],
  ['Student attendance', '{t("teacher.courses.tabs.attendance")}'],
  ['Substitute instructor', '{t("teacher.courses.tabs.substitute")}'],
  ['Edit schedule', '{t("teacher.courses.scheduleTab.editSchedule")}'],
  ['Schedule approvals', '{t("teacherNav.scheduleApprovals")}'],
  ['Attendance QR', '{t("teacherNav.attendanceQr")}'],
  ['Assignments', '{t("teacher.assignments.title")}'],
  ['My Assignments', '{t("teacher.assignments.tabs.assignments")}'],
  ['Pending Submissions', '{t("teacher.assignments.tabs.submissions")}'],
  ['No assignments yet', '{t("teacher.assignments.empty.title")}'],
  ['No pending submissions', '{t("teacher.assignments.submissions.empty.title")}'],
  ['Delete this assignment?', '{t("teacher.assignments.deleteDialog.title")}'],
  ['Needs your approval', '{t("teacher.scheduleApprovals.pendingSectionTitle")}'],
  ['All your classes', '{t("teacher.scheduleApprovals.allSectionTitle")}'],
  ['Action needed', '{t("teacher.scheduleApprovals.status.actionNeeded")}'],
  ['Payroll', '{t("teacherNav.payroll")}'],
  ['Notifications', '{t("common.notifications")}'],
  ['View All', '{t("common.viewAll")}'],
  ['Cancel', '{t("common.cancel")}'],
  ['Delete', '{t("common.delete")}'],
  ['Edit', '{t("common.edit")}'],
  ['Save', '{t("common.save")}'],
  ['Submit', '{t("common.submit")}'],
  ['Back', '{t("common.back")}'],
  ['Continue', '{t("common.continue")}'],
  ['Remove', '{t("teacherSettings.remove")}'],
  ['Uploading…', '{t("teacherSettings.uploading")}'],
  ['Loading…', '{t("common.loading")}'],
  ['Publish', '{t("teacher.roster.quiz.publish")}'],
  ['Results', '{t("teacher.roster.quiz.results")}'],
  ['Create quiz', '{t("teacher.roster.quiz.createQuiz")}'],
  ['Invite Substitute', '{t("teacher.roster.inviteSubstitute")}'],
  ['Enrolled students', '{t("teacher.roster.enrolled.title")}'],
  ['Class resumes', '{t("teacher.roster.resume.title")}'],
  ['New resume', '{t("teacher.roster.resume.newResume")}'],
  ['Create resume', '{t("teacher.roster.resume.createResume")}'],
  ['No resumes yet', '{t("teacher.roster.resume.emptyTitle")}'],
  ['Whole class recap', '{t("teacher.roster.resume.wholeClassRecap")}'],
  ['Class not found.', '{t("teacher.courseForm.errors.classNotFound")}'],
  ['Class meeting check-in', '{t("teacher.attendancePanel.title")}'],
  ['Final scores', '{t("teacher.grades.title")}'],
  ['Publish all certificates', '{t("teacher.grades.publishAll")}'],
  ['Submit payroll for approval', '{t("teacher.payrollSubmit.title")}'],
  ['Payout information', '{t("teacher.payrollPayout.title")}'],
  ['Cover request', '{t("teacher.substituteReview.title")}'],
  ['Accept invite', '{t("teacher.substituteReview.acceptInvite")}'],
  ['Decline invite', '{t("teacher.substituteReview.declineInvite")}'],
  ['Approve cover', '{t("teacher.substituteReview.approveCover")}'],
  ['Reject', '{t("teacher.substituteReview.reject")}'],
  ['Export to Excel', '{t("teacher.quizResults.exportButton")}'],
  ['Continue to schedule', '{t("teacher.courseForm.details.continueToSchedule")}'],
  ['Continue to lessons', '{t("teacher.courseForm.schedule.continueToLessons")}'],
  ['Add lesson', '{t("teacher.courseForm.lessons.addLesson")}'],
  ['Create class', '{t("teacher.courseForm.lessons.createClass")}'],
  ['Save changes', '{t("teacher.courseForm.lessons.saveChanges")}'],
  ['Approve schedule', '{t("teacher.courseForm.schedule.approveSchedule")}'],
  ['Request changes', '{t("teacher.courseForm.schedule.requestChanges")}'],
  ['Send invite', '{t("teacher.roster.substituteDialog.sendInvite")}'],
  ['Open', '{t("teacher.scheduleApprovals.openButton")}'],
  ['Review', '{t("teacher.assignments.actions.review")}'],
  ['View', '{t("teacher.assignments.actions.view")}'],
  ['Students', '{t("teacher.dashboard.classesTable.header.students")}'],
  ['Actions', '{t("common.actions")}'],
  ['Status', '{t("common.status")}'],
  ['Name', '{t("common.name")}'],
  ['Email', '{t("teacherSettings.email")}'],
  ['Class', '{t("teacher.dashboard.classesTable.header.class")}'],
  ['Progress', '{t("teacher.dashboard.classesTable.header.progress")}'],
  ['Completion', '{t("teacher.dashboard.classesTable.header.completion")}'],
  ['Title', '{t("teacher.assignments.table.title")}'],
  ['Due Date', '{t("teacher.assignments.table.dueDate")}'],
  ['Priority', '{t("teacher.assignments.table.priority")}'],
  ['Submitted', '{t("teacher.assignments.submissions.table.submitted")}'],
  ['Student', '{t("teacher.assignments.submissions.table.student")}'],
  ['Assignment', '{t("teacher.assignments.submissions.table.assignment")}'],
  ['Enrolled', '{t("teacher.roster.tabs.enrolled")}'],
  ['Schedule', '{t("teacher.roster.tabs.schedule")}'],
  ['Resume', '{t("teacher.roster.tabs.resume")}'],
  ['Quiz', '{t("teacher.roster.tabs.quiz")}'],
  ['Attendance', '{t("teacher.roster.tabs.attendance")}'],
  ['Grades', '{t("teacher.roster.tabs.grades")}'],
  ['Present', '{t("teacher.roster.attendance.presentBadge")}'],
  ['Checked in', '{t("teacher.roster.attendance.table.checkedIn")}'],
  ['Instructor Check', '{t("teacher.roster.attendance.table.instructorCheck")}'],
  ['Awaiting admin approval', '{t("teacher.roster.awaitingAdminApproval")}'],
  ['Edit class content', '{t("teacher.roster.actions.editClassContent")}'],
  ['Missing class.', '{t("teacher.roster.errors.missingClass")}'],
  ['Class not found.', '{t("teacher.roster.errors.notFound")}'],
  ['No students enrolled yet.', '{t("teacher.roster.enrolled.empty")}'],
  ['No classes yet. Create a class first.', '{t("teacher.scheduleApprovals.empty")}'],
  ['Add New Class', '{t("teacherNav.addNewClass")}'],
  ['Edit Class', '{t("teacher.courseForm.title.edit")}'],
];

function addUseTranslation(content) {
  if (content.includes('useTranslation')) return content;

  // Insert import after last import line
  const importEnd = content.lastIndexOf('\nimport ');
  const nextNewline = content.indexOf('\n', importEnd + 1);
  const insertAt = nextNewline === -1 ? content.length : nextNewline;
  content =
    content.slice(0, insertAt) +
    '\nimport { useTranslation } from "react-i18next";' +
    content.slice(insertAt);

  // Add hook in first function component body
  const patterns = [
    /export default function \w+\([^)]*\) \{/,
    /export function \w+\([^)]*\) \{/,
    /const \w+ = \(\) => \{/,
    /function \w+\([^)]*\) \{/,
  ];
  for (const re of patterns) {
    const m = content.match(re);
    if (m) {
      const idx = m.index + m[0].length;
      content = content.slice(0, idx) + '\n  const { t } = useTranslation();' + content.slice(idx);
      break;
    }
  }
  return content;
}

function applyReplacements(content) {
  for (const [from, to] of REPLACEMENTS) {
    // JSX text: >text<
    content = content.replace(
      new RegExp(`>\\s*${escapeRe(from)}\\s*<`, 'g'),
      `>${to}<`,
    );
    // JSX text with trailing space before closing tag on same line
    content = content.replace(
      new RegExp(`>\\s*${escapeRe(from)}\\s*(\\{|<)`, 'g'),
      `>${to}$1`,
    );
    // String literals in JSX props title="", placeholder=""
    content = content.replace(
      new RegExp(`(title|placeholder|aria-label)="${escapeRe(from)}"`, 'g'),
      `$1={${to.replace(/^\{|\}$/g, '')}}`.replace('t(', 't(').replace(/=\{t\(/, '={t('),
    );
    // Fix title={t(...)} format
    content = content.replace(
      new RegExp(`(title|placeholder|aria-label)=\\{${escapeRe(to.slice(1, -1))}\\}`, 'g'),
      `$1={${to.slice(1, -1)}}`,
    );
  }
  return content;
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

for (const rel of FILES) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) {
    console.warn('skip missing', rel);
    continue;
  }
  let content = fs.readFileSync(file, 'utf8');
  if (rel.includes('TeacherSettingsPage') || rel.includes('TeacherPlaceholder') || rel.includes('TeacherStudentsPage') || rel.includes('SubstituteInviteRequestSummary') || rel.includes('TeacherSubstituteCoverPanel')) {
    console.log('skip already done', rel);
    continue;
  }
  content = addUseTranslation(content);
  content = applyReplacements(content);
  fs.writeFileSync(file, content);
  console.log('updated', rel);
}
