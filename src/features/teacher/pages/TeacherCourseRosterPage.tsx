import { useCallback, useEffect, useMemo, useState } from "react";
import type { ClassMeetingSlot, TeacherCourse } from "@/features/teacher/types";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  BarChart2,
  CalendarDays,
  ClipboardList,
  FileText,
  Loader2,
  Pencil,
  Plus,
  GraduationCap,
  ListChecks,
  Trash2,
  UserPlus,
  Users,
} from "@/lib/icons";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  eduhubAdminEnrollmentApplications,
  eduhubAttendance,
  eduhubCourseQuizzes,
  eduhubCourses,
  eduhubClassResumes,
  eduhubPlacementTestsAdmin,
  eduhubSchedule,
  eduhubSubstituteInvites,
  ApiError,
  type QuizResponse,
  type QuizQuestionResponse,
} from "@/api/eduhubClient";
import type {
  ClassResumeResponse,
  CourseResponse,
  CourseStatus,
  EnrollmentApplicationResponse,
  PayrollClassStudentResponse,
  SubstituteInviteResponse,
  SubstituteInviteStatus,
} from "@/api/eduhubTypes";
import { isUuid } from "@/api/utils";
import { useAuthSession } from "@/features/auth/context";
import { PaymentStatusBadge } from "@/features/admin/components/AdminStatusBadges";
import { TeacherAttendanceSessionPanel } from "@/features/teacher/components/TeacherAttendanceSessionPanel";
import { TeacherAttendanceMatrixPanel } from "@/features/teacher/components/TeacherAttendanceMatrixPanel";
import { TeacherCourseGradesPanel } from "@/features/teacher/components/TeacherCourseGradesPanel";
import { TeacherCourseSchedulePanel } from "@/features/teacher/components/TeacherCourseSchedulePanel";
import { TeacherManualQuizScoresPanel } from "@/features/teacher/components/TeacherManualQuizScoresPanel";
import { TeacherClassPhotosPanel } from "@/features/teacher/components/TeacherClassPhotosPanel";
import { usePayrollClassesQuery } from "@/features/teacher/hooks/useTeacherQueries";
import { formatMoney } from "@/features/payroll/classPayrollAggregate";
import {
  formatContractShareLabel,
  resolveInstructorShare,
} from "@/features/payroll/revenueShare";
import {
  buildScheduleMonthTabs,
  orderSessionSlotsChronologically,
  type SessionSlotLike,
} from "@/features/courses/classSchedulePreview";
import {
  ADMIN_ENROLLMENT_PAID_MONTHS_CHANGED,
  adminEnrollmentPaidMonthsStore,
} from "@/features/admin/data/adminEnrollmentPaidMonthsStore";
import {
  ENROLLMENT_INSTALLMENT_PAYMENTS_CHANGED,
  useEnrollmentInstallmentPayments,
} from "@/features/enrollment/enrollmentInstallmentPaymentStore";
import {
  resolvedMonthsPaidCoverageKey,
  type MonthsPaidCoverageKey,
} from "@/features/enrollment/enrollmentPaymentHistory";
import {
  paidTuitionMonthsFromPaymentFields,
  tuitionThirds,
  type TuitionPlanMonths,
} from "@/features/enrollment/enrollmentTuitionThirds";
import { formatDisplayPersonName, profileInitials } from "@/lib/formatPersonName";
import {
  buildCourseScheduleSlotsForPicker,
  padMeetingSlotsForCourse,
  parseOptionalPositiveInt,
  resolveClassScheduleFormState,
} from "@/features/teacher/pages/teacherCourseFormHelpers";
import {
  ATTENDANCE_MEETINGS_CHANGED,
  fetchAttendanceMeetings,
} from "@/features/teacher/attendance/attendanceMeetingsStorage";
import { useTeacherClassChecklist } from "@/features/teacher/hooks/useTeacherClassChecklist";
import { useTranslation } from "react-i18next";

type RosterStudentPaymentStatus = PayrollClassStudentResponse["status"];

type RosterStudentPaymentInfo = {
  status: RosterStudentPaymentStatus;
  amount?: number;
  currency: string;
};

function mergeRosterPaidMonths(
  enrollment: EnrollmentApplicationResponse,
  scheduleSlots: SessionSlotLike[],
): Set<TuitionPlanMonths> {
  const monthCount =
    buildScheduleMonthTabs(orderSessionSlotsChronologically(scheduleSlots)).length || 3;
  const fromPlan = paidTuitionMonthsFromPaymentFields(enrollment, monthCount) ?? new Set<TuitionPlanMonths>();
  const fromInstallments = adminEnrollmentPaidMonthsStore.get(enrollment.id);
  if (!fromInstallments?.size) return fromPlan;
  return new Set<TuitionPlanMonths>([...fromPlan, ...fromInstallments]);
}

/** Infer month coverage from how much was paid vs listed class tuition. */
function inferCoverageFromPaidAmount(
  amount: number | undefined,
  tuitionPerStudent: number | undefined,
): MonthsPaidCoverageKey | null {
  if (amount == null || amount <= 0 || tuitionPerStudent == null || tuitionPerStudent <= 0) {
    return null;
  }
  const thirds = tuitionThirds(Math.round(tuitionPerStudent));
  const tol = Math.max(1, Math.round(tuitionPerStudent * 0.03));
  if (!thirds) {
    if (amount + tol >= tuitionPerStudent) return "full";
    if (amount + tol >= tuitionPerStudent * (2 / 3)) return "second";
    if (amount + tol >= tuitionPerStudent / 3) return "first";
    return "partial";
  }
  const [m1, m2] = thirds;
  const throughSecond = m1 + m2;
  if (amount + tol >= tuitionPerStudent) return "full";
  if (amount + tol >= throughSecond) return "second";
  if (amount + tol >= m1) return "first";
  return "partial";
}

function RosterStudentStatusBadge({
  status,
  coverageKey,
}: {
  status: RosterStudentPaymentStatus;
  coverageKey?: MonthsPaidCoverageKey | null;
}) {
  const { t } = useTranslation();
  if (status === "enrolled") {
    return (
      <span className="inline-flex rounded-md border border-border bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
        {t("teacher.payroll.status.enrolled")}
      </span>
    );
  }
  if (status === "paid") {
    const key: MonthsPaidCoverageKey =
      coverageKey && coverageKey !== "unpaid" ? coverageKey : "full";
    return (
      <Badge variant="default" className="whitespace-nowrap font-medium">
        {t("teacher.roster.enrolled.paymentCoverage.paidWithDetail", {
          detail: t(`teacher.roster.enrolled.paymentCoverage.${key}`),
        })}
      </Badge>
    );
  }
  return <PaymentStatusBadge status={status} />;
}

function formatClassMeetingSlotLabel(slot: ClassMeetingSlot, index: number): string {
  const title = slot.title?.trim() || `Session ${index + 1}`;
  const date = slot.sessionDate?.trim();
  const time = slot.sessionTime?.trim();
  const tail = [date, time].filter(Boolean).join(" ");
  return tail ? `${title} · ${tail}` : title;
}

const ACTIVE_SUBSTITUTE_INVITE_STATUSES: SubstituteInviteStatus[] = [
  "APPROVED",
  "PENDING_ADMIN_APPROVAL",
  "PENDING_PRIMARY_APPROVAL",
  "PENDING_SUBSTITUTE_RESPONSE",
];

function isActiveSubstituteInviteStatus(s: SubstituteInviteStatus): boolean {
  return ACTIVE_SUBSTITUTE_INVITE_STATUSES.includes(s);
}

function pickHighestSubstituteInvite(invites: SubstituteInviteResponse[]): SubstituteInviteResponse | undefined {
  const order: SubstituteInviteStatus[] = [
    "APPROVED",
    "PENDING_ADMIN_APPROVAL",
    "PENDING_PRIMARY_APPROVAL",
    "PENDING_SUBSTITUTE_RESPONSE",
  ];
  for (const st of order) {
    const hit = invites.find((r) => r.status === st);
    if (hit) return hit;
  }
  return invites[0];
}

function substituteCoverChipLabel(status: SubstituteInviteStatus): string {
  switch (status) {
    case "APPROVED":
      return "Substitute cover";
    case "PENDING_ADMIN_APPROVAL":
      return "Cover · admin";
    case "PENDING_PRIMARY_APPROVAL":
      return "Cover · instructor";
    case "PENDING_SUBSTITUTE_RESPONSE":
      return "Cover · substitute";
    default:
      return "Substitute cover";
  }
}

function substituteCoverChipClass(status: SubstituteInviteStatus): string {
  if (status === "APPROVED") {
    return "border-violet-200 bg-violet-50 text-violet-950 ring-1 ring-violet-500/15";
  }
  return "border-amber-200 bg-amber-50 text-amber-950 ring-1 ring-amber-500/15";
}

function formatCourseDateLabel(iso?: string): string {
  const raw = iso?.trim();
  if (!raw) return "";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString(undefined, { dateStyle: "medium" });
}

function scheduleStatusPill(status: CourseStatus | undefined): { label: string; className: string } | null {
  switch (status) {
    case "SCHEDULE_PENDING":
      return {
        label: "Schedule pending your approval",
        className: "border-amber-200 bg-amber-50 text-amber-900",
      };
    case "SCHEDULE_APPROVED":
      return {
        label: "Schedule approved",
        className: "border-emerald-200 bg-emerald-50 text-emerald-900",
      };
    case "DRAFT":
      return { label: "Draft", className: "border-slate-200 bg-slate-50 text-slate-700" };
    case "PUBLISHED":
      return { label: "Published", className: "border-emerald-200 bg-emerald-50 text-emerald-900" };
    default:
      return null;
  }
}

const TEACHER_COURSE_TABS = [
  "roster",
  "schedule",
  "resume",
  "quiz",
  "quiz-scores",
  "attendance",
  "grades",
  "photos",
] as const;
type TeacherCourseTab = (typeof TEACHER_COURSE_TABS)[number];

function isTeacherCourseTab(t: string | null): t is TeacherCourseTab {
  return (
    t === "roster" ||
    t === "schedule" ||
    t === "resume" ||
    t === "quiz" ||
    t === "quiz-scores" ||
    t === "attendance" ||
    t === "grades" ||
    t === "photos"
  );
}

function isCourseQuizListPermissionError(message: string): boolean {
  return /access denied|don'?t have permission|permission/i.test(message);
}

export default function TeacherCourseRosterPage() {
  const { t } = useTranslation();
  const { courseId = "" } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const queryClient = useQueryClient();
  const { user } = useAuthSession();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [substituteOpen, setSubstituteOpen] = useState(false);
  const [substituteEmail, setSubstituteEmail] = useState("");
  const [substituteSessionSlotKey, setSubstituteSessionSlotKey] = useState("");
  const [substituteMessage, setSubstituteMessage] = useState("");

  const apiCourseQuery = useQuery({
    queryKey: ["teacher", "roster", "course", courseId],
    queryFn: () => eduhubCourses.getById(courseId),
    enabled: Boolean(courseId) && isUuid(courseId),
  });

  const scheduleProposalQuery = useQuery({
    queryKey: ["teacher", "roster", "scheduleProposal", courseId],
    queryFn: async () => {
      try {
        return await eduhubSchedule.getProposal(courseId);
      } catch {
        return null;
      }
    },
    enabled: Boolean(courseId) && isUuid(courseId),
  });

  const userEmailNorm = (user?.email ?? "").trim().toLowerCase();

  const substituteInvitesQuery = useQuery({
    queryKey: ["teacher", "substituteInvites", "mine"],
    queryFn: () => eduhubSubstituteInvites.listMine(),
    enabled: Boolean(courseId) && isUuid(courseId),
  });

  const courseSubstituteInvites = useMemo(
    () => (substituteInvitesQuery.data ?? []).filter((r) => r.courseId === courseId),
    [substituteInvitesQuery.data, courseId],
  );

  const invalidateSubstituteInvites = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["teacher", "substituteInvites", "mine"] });
  }, [queryClient]);

  const substituteCanAccess = useMemo(() => {
    return courseSubstituteInvites.some((r) => r.substituteId === user.id && r.status === "APPROVED");
  }, [courseSubstituteInvites, user.id]);

  const isApiCourseLecturer = Boolean(
    apiCourseQuery.data && apiCourseQuery.data.lecturer?.id === user.id,
  );

  const isSubstituteViewer = Boolean(
    apiCourseQuery.data && substituteCanAccess && !isApiCourseLecturer,
  );

  const approvedSubstituteInviteRow = useMemo(() => {
    return courseSubstituteInvites.find((r) => r.substituteId === user.id && r.status === "APPROVED");
  }, [courseSubstituteInvites, user.id]);

  const approvedCoverAsPrimaryRow = useMemo(() => {
    if (!isApiCourseLecturer) return undefined;
    return courseSubstituteInvites.find((r) => r.primaryInstructorId === user.id && r.status === "APPROVED");
  }, [courseSubstituteInvites, user.id, isApiCourseLecturer]);

  const courseLeadDisplayName = useMemo(() => {
    const apiName = apiCourseQuery.data?.lecturer?.fullName?.trim();
    if (apiName) return apiName;
    return approvedSubstituteInviteRow?.primaryInstructorName?.trim() || "Course lead";
  }, [apiCourseQuery.data?.lecturer?.fullName, approvedSubstituteInviteRow?.primaryInstructorName]);

  const courseLeadEmail = apiCourseQuery.data?.lecturer?.email?.trim();

  const instructorRevenueShare = resolveInstructorShare(apiCourseQuery.data?.lecturer?.instructorRevenueShare);
  const instructorSharePct = Math.round(instructorRevenueShare * 100);
  const contractShareLabel = formatContractShareLabel(instructorRevenueShare);

  const courseMeta =
    apiCourseQuery.data != null
      ? {
          id: apiCourseQuery.data.id,
          title: apiCourseQuery.data.title,
          status: apiCourseQuery.data.status,
          allowed: isApiCourseLecturer || substituteCanAccess,
        }
      : null;

  const teacherChecklist = useTeacherClassChecklist(courseMeta?.id ?? courseId);

  /** Backend allows both the primary lecturer and an approved substitute to fetch the roster. */
  const studentsQuery = useQuery({
    queryKey: ["teacher", "roster", "students", courseId],
    queryFn: () => eduhubCourses.getEnrolledStudents(courseId, 0, 100),
    enabled:
      Boolean(courseId) &&
      isUuid(courseId) &&
      apiCourseQuery.isSuccess &&
      (isApiCourseLecturer || substituteCanAccess),
  });

  const payrollClassesQuery = usePayrollClassesQuery(
    isApiCourseLecturer || substituteCanAccess ? user.id : undefined,
  );

  const payrollClassForCourse = useMemo(
    () => (payrollClassesQuery.data ?? []).find((cls) => cls.courseId === courseId),
    [courseId, payrollClassesQuery.data],
  );

  const studentPaymentByKey = useMemo(() => {
    const map = new Map<string, RosterStudentPaymentInfo>();
    for (const student of payrollClassForCourse?.students ?? []) {
      const info: RosterStudentPaymentInfo = {
        status: student.status,
        amount: student.amount,
        currency: student.currency || payrollClassForCourse?.currency || "USD",
      };
      map.set(student.id, info);
      const email = student.email?.trim().toLowerCase();
      if (email) map.set(`email:${email}`, info);
    }
    return map;
  }, [payrollClassForCourse]);

  const isAdminUser = user?.role === "admin" || Boolean(user?.staffRole);

  const courseEnrollmentsQuery = useQuery({
    queryKey: ["teacher", "roster", "enrollments", courseId],
    queryFn: async (): Promise<EnrollmentApplicationResponse[]> => {
      if (!isAdminUser) return [];
      const byId = new Map<string, EnrollmentApplicationResponse>();
      try {
        const all = await eduhubAdminEnrollmentApplications.listAll();
        for (const a of all) {
          if (a.courseId === courseId && a.status === "APPROVED") byId.set(a.id, a);
        }
      } catch {
        // Teacher may not have admin enrollment access.
      }
      return [...byId.values()];
    },
    enabled: Boolean(courseId) && isUuid(courseId) && (isApiCourseLecturer || substituteCanAccess) && isAdminUser,
  });

  const installmentPaymentsTick = useEnrollmentInstallmentPayments();
  const [paidMonthsTick, setPaidMonthsTick] = useState(0);
  useEffect(() => {
    const bump = () => setPaidMonthsTick((n) => n + 1);
    window.addEventListener(ADMIN_ENROLLMENT_PAID_MONTHS_CHANGED, bump);
    window.addEventListener(ENROLLMENT_INSTALLMENT_PAYMENTS_CHANGED, bump);
    return () => {
      window.removeEventListener(ADMIN_ENROLLMENT_PAID_MONTHS_CHANGED, bump);
      window.removeEventListener(ENROLLMENT_INSTALLMENT_PAYMENTS_CHANGED, bump);
    };
  }, []);

  const courseQuizzesQuery = useQuery({
    queryKey: ["teacher", "roster", "courseQuizzes", courseId],
    queryFn: async (): Promise<{ quizzes: QuizResponse[]; fetchNote?: string }> => {
      try {
        const quizzes = await eduhubCourseQuizzes.list(courseId);
        return { quizzes: quizzes || [] };
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        if (isCourseQuizListPermissionError(msg)) throw e;
        console.warn("[TeacherCourseRoster] course quizzes list failed:", courseId, e);
        return {
          quizzes: [],
          fetchNote: msg.trim() ? `Quiz list could not be loaded: ${msg}` : "Quiz list could not be loaded.",
        };
      }
    },
    enabled: Boolean(courseId) && isUuid(courseId) && isApiCourseLecturer && tabFromUrl === "quiz",
    retry: 1,
  });

  const placementQuizId = apiCourseQuery.data?.placementQuizId?.trim() ?? "";

  /** Placement tests are institution-wide (no courseId), so the one gating this class is fetched by id directly. */
  const coursePlacementTestQuery = useQuery({
    queryKey: ["teacher", "roster", "coursePlacementTest", placementQuizId],
    queryFn: () => eduhubPlacementTestsAdmin.get(placementQuizId),
    enabled:
      Boolean(courseId) && isUuid(courseId) && isApiCourseLecturer && tabFromUrl === "quiz" && Boolean(placementQuizId),
    retry: 1,
  });

  const displayedQuizzes = useMemo((): QuizResponse[] => {
    const regular = courseQuizzesQuery.data?.quizzes ?? [];
    const p = coursePlacementTestQuery.data;
    if (!p) return regular;
    const placementAsQuiz: QuizResponse = {
      id: p.id,
      courseId,
      title: p.title,
      quizType: "PLACEMENT_TEST",
      releaseDate: p.releaseDate,
      releaseTime: p.releaseTime,
      timeLimitMinutes: p.timeLimitMinutes ?? 0,
      passingScore: p.passingScore ?? 0,
      isPublished: p.isPublished,
      questions: p.questions as unknown as QuizQuestionResponse[],
    };
    return [...regular, placementAsQuiz];
  }, [courseQuizzesQuery.data, coursePlacementTestQuery.data, courseId]);

  const [quizPublishingId, setQuizPublishingId] = useState<string | null>(null);
  const handlePublishQuiz = useCallback(
    async (quizId: string, isPlacementTest: boolean) => {
      if (!isPlacementTest && !isUuid(courseId)) return;
      setQuizPublishingId(quizId);
      try {
        if (isPlacementTest) {
          await eduhubPlacementTestsAdmin.setPublished(quizId, true);
          await queryClient.invalidateQueries({ queryKey: ["teacher", "roster", "coursePlacementTest"] });
        } else {
          await eduhubCourseQuizzes.publish(courseId, quizId);
          await queryClient.invalidateQueries({ queryKey: ["teacher", "roster", "courseQuizzes", courseId] });
        }
        toast.success("Quiz published");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not publish quiz.");
      } finally {
        setQuizPublishingId(null);
      }
    },
    [courseId, queryClient],
  );

  const loadingCourse = isUuid(courseId) && apiCourseQuery.isLoading;
  const forbidden =
    apiCourseQuery.data != null && !isApiCourseLecturer && !substituteCanAccess;

  const scheduleSourceCourse = useMemo(() => {
    if (!courseId) return undefined;
    if (apiCourseQuery.data) return apiCourseQuery.data;
    return undefined;
  }, [courseId, apiCourseQuery.data]);

  const substituteScheduleSlotOptions = useMemo(() => {
    if (!courseId) return [];
    const slots = buildCourseScheduleSlotsForPicker(
      courseId,
      scheduleSourceCourse ?? {},
      scheduleProposalQuery.data,
    );
    return slots.map((slot, index) => ({
      value: `slot-${index}`,
      label: formatClassMeetingSlotLabel(slot, index),
    }));
  }, [courseId, scheduleSourceCourse, scheduleProposalQuery.data]);

  const rosterScheduleView = useMemo(() => {
    const proposal = scheduleProposalQuery.data;
    const course = (scheduleSourceCourse ?? {}) as Partial<CourseResponse> & Partial<TeacherCourse>;

    if (proposal?.sessions?.length) {
      const rawSlots = proposal.sessions.map((s) => ({
        title: s.title ?? "",
        sessionDate: s.sessionDate ?? "",
        sessionTime: s.sessionTime ?? "",
      }));
      const n = Math.max(proposal.sessionCount, rawSlots.length);
      const slots = padMeetingSlotsForCourse(n, rawSlots);
      return {
        mode: "proposal" as const,
        proposedByName: proposal.proposedByName,
        sessionsCount: n,
        slots,
      };
    }

    const resolved = resolveClassScheduleFormState(course, courseId);
    const fromStr = parseOptionalPositiveInt(resolved.meetingsSixMonthsStr);
    const fromCourse = typeof course.classMeetingsInSixMonths === "number" ? course.classMeetingsInSixMonths : 0;
    const n = Math.max(fromStr ?? 0, fromCourse, resolved.slots.length);
    const slots = padMeetingSlotsForCourse(n, resolved.slots);
    return {
      mode: "course" as const,
      proposedByName: undefined as string | undefined,
      sessionsCount: n,
      slots,
    };
  }, [scheduleProposalQuery.data, scheduleSourceCourse, courseId]);

  const studentPaymentCoverageByEmail = useMemo(() => {
    void installmentPaymentsTick;
    void paidMonthsTick;
    const map = new Map<string, MonthsPaidCoverageKey>();
    const slots = rosterScheduleView.slots;
    const scheduleMonthCount =
      buildScheduleMonthTabs(orderSessionSlotsChronologically(slots)).length || 3;
    const tuition = payrollClassForCourse?.tuitionPerStudent;

    for (const enrollment of courseEnrollmentsQuery.data ?? []) {
      const email =
        enrollment.applicantEmailNorm?.trim().toLowerCase() || enrollment.email?.trim().toLowerCase();
      if (!email) continue;
      const paidMonths = mergeRosterPaidMonths(enrollment, slots);
      map.set(email, resolvedMonthsPaidCoverageKey(paidMonths, scheduleMonthCount));
    }

    // Payroll amount fallback when enrollment plan isn't available for this browser/role.
    for (const student of payrollClassForCourse?.students ?? []) {
      const email = student.email?.trim().toLowerCase();
      if (!email || map.has(email)) continue;
      if (student.status !== "paid") continue;
      map.set(email, inferCoverageFromPaidAmount(student.amount, tuition) ?? "full");
    }

    return map;
  }, [
    courseEnrollmentsQuery.data,
    rosterScheduleView.slots,
    installmentPaymentsTick,
    paidMonthsTick,
    payrollClassForCourse,
  ]);

  const scheduleSubstituteCoverage = useMemo(() => {
    const empty = {
      wholeClass: [] as SubstituteInviteResponse[],
      bySlotIndex: new Map<number, SubstituteInviteResponse[]>(),
    };
    if (!courseId) return empty;

    const rows = courseSubstituteInvites.filter((r) => isActiveSubstituteInviteStatus(r.status));

    const wholeClass = rows.filter((r) => !r.sessionNote?.trim());
    const keyed = rows.filter((r) => r.sessionNote?.trim());
    const bySlotIndex = new Map<number, SubstituteInviteResponse[]>();
    const slots = rosterScheduleView.slots;
    for (const inv of keyed) {
      const note = inv.sessionNote!.trim();
      slots.forEach((slot, i) => {
        if (formatClassMeetingSlotLabel(slot, i).trim() === note) {
          const arr = bySlotIndex.get(i) ?? [];
          arr.push(inv);
          bySlotIndex.set(i, arr);
        }
      });
    }
    return { wholeClass, bySlotIndex };
  }, [courseId, courseSubstituteInvites, rosterScheduleView.slots]);

  const substituteInviteForScheduleRow = useCallback(
    (rowIndex: number) => {
      const merged = [
        ...scheduleSubstituteCoverage.wholeClass,
        ...(scheduleSubstituteCoverage.bySlotIndex.get(rowIndex) ?? []),
      ];
      const uniq = Array.from(new Map(merged.map((x) => [x.id, x])).values());
      return pickHighestSubstituteInvite(uniq);
    },
    [scheduleSubstituteCoverage],
  );

  /** Substitute viewers only see their own cover row(s), not the full catalog term. */
  const substituteViewerSchedule = useMemo((): null | { kind: "empty" } | { kind: "whole"; invite: SubstituteInviteResponse } | { kind: "rows"; rows: { index: number; slot: ClassMeetingSlot }[] } => {
    if (!isSubstituteViewer) return null;
    if (!courseId || !userEmailNorm) return { kind: "empty" };
    const invites = courseSubstituteInvites.filter(
      (r) => r.substituteId === user.id && isActiveSubstituteInviteStatus(r.status),
    );
    if (!invites.length) return { kind: "empty" };

    const sessionInvites = invites.filter(
      (i) => i.sessionSlotKey?.trim() || i.sessionNote?.trim(),
    );
    const slots = rosterScheduleView.slots;
    const rowMap = new Map<number, ClassMeetingSlot>();
    for (const inv of sessionInvites) {
      const slotKey = inv.sessionSlotKey?.trim();
      if (slotKey?.startsWith("slot-")) {
        const idx = Number.parseInt(slotKey.slice("slot-".length), 10);
        if (!Number.isNaN(idx) && slots[idx]) {
          rowMap.set(idx, slots[idx]);
          continue;
        }
      }
      const note = inv.sessionNote?.trim();
      if (!note) continue;
      slots.forEach((slot, idx) => {
        if (formatClassMeetingSlotLabel(slot, idx).trim() === note) {
          rowMap.set(idx, slot);
        }
      });
    }
    if (!rowMap.size) {
      const whole = invites.filter((i) => !i.sessionSlotKey?.trim() && !i.sessionNote?.trim());
      if (whole.length) {
        const inv = pickHighestSubstituteInvite(whole);
        return inv ? { kind: "whole", invite: inv } : { kind: "empty" };
      }
    }
    const rows = [...rowMap.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([index, slot]) => ({ index, slot }));
    if (!rows.length) return { kind: "empty" };
    return { kind: "rows", rows };
  }, [isSubstituteViewer, courseId, userEmailNorm, courseSubstituteInvites, user.id, rosterScheduleView.slots]);

  /** Prefill attendance QR meeting name for substitutes from their cover row on the schedule tab. */
  const attendanceSuggestedMeetingName = useMemo(() => {
    if (!isSubstituteViewer || substituteViewerSchedule == null) return undefined;
    if (substituteViewerSchedule.kind === "rows" && substituteViewerSchedule.rows.length > 0) {
      const { index, slot } = substituteViewerSchedule.rows[0];
      return formatClassMeetingSlotLabel(slot, index);
    }
    if (substituteViewerSchedule.kind === "whole") {
      const t = courseMeta?.title?.trim() || "Class";
      return `Substitute cover · ${t}`;
    }
    return undefined;
  }, [isSubstituteViewer, substituteViewerSchedule, courseMeta?.title]);

  /** Substitutes invited to cover specific session(s) should only see those rows in the QR meeting picker, not the whole term. */
  const attendanceScheduleSlots = useMemo(() => {
    const all = rosterScheduleView.slots.map((slot, index) => ({ slot, index }));
    if (!isSubstituteViewer || substituteViewerSchedule == null) return all;
    if (substituteViewerSchedule.kind === "rows") {
      const allowedIndexes = new Set(substituteViewerSchedule.rows.map((r) => r.index));
      return all.filter(({ index }) => allowedIndexes.has(index));
    }
    if (substituteViewerSchedule.kind === "empty") return [];
    return all;
  }, [isSubstituteViewer, substituteViewerSchedule, rosterScheduleView.slots]);

  const courseThumbnailUrl = useMemo(() => {
    const raw = scheduleSourceCourse?.thumbnailUrl;
    const t = typeof raw === "string" ? raw.trim() : "";
    return t || undefined;
  }, [scheduleSourceCourse]);

  const [overviewSessionId, setOverviewSessionId] = useState<string | null>(null);
  const [attendanceUiKey, setAttendanceUiKey] = useState(0);
  const [activeTab, setActiveTab] = useState<TeacherCourseTab>(() =>
    isTeacherCourseTab(tabFromUrl) ? tabFromUrl : "roster",
  );
  const [resumeDeleteId, setResumeDeleteId] = useState<string | null>(null);

  const deleteResumeMutation = useMutation({
    mutationFn: ({ resumeId }: { resumeId: string }) => eduhubClassResumes.delete(courseId, resumeId),
    onSuccess: () => {
      setResumeDeleteId(null);
      void queryClient.invalidateQueries({ queryKey: ["teacher", "roster", "resumes", courseId] });
      toast.message("Resume deleted");
    },
    onError: () => toast.error("Could not delete resume."),
  });
  const onOverviewSessionChange = useCallback((id: string | null) => {
    setOverviewSessionId(id);
  }, []);

  useEffect(() => {
    const bump = () => setAttendanceUiKey((k) => k + 1);
    const onFocus = () => bump();
    const onVis = () => {
      if (document.visibilityState === "visible") bump();
    };
    window.addEventListener(ATTENDANCE_MEETINGS_CHANGED, bump);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener(ATTENDANCE_MEETINGS_CHANGED, bump);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [courseMeta?.id]);

  useEffect(() => {
    if (!courseMeta?.id) return;
    const bump = () => {
      if (document.visibilityState === "visible") {
        setAttendanceUiKey((k) => k + 1);
      }
    };
    const id = window.setInterval(bump, 4000);
    return () => clearInterval(id);
  }, [courseMeta?.id]);

  useEffect(() => {
    if (isTeacherCourseTab(tabFromUrl)) setActiveTab(tabFromUrl);
  }, [tabFromUrl]);

  const classResumesQuery = useQuery({
    queryKey: ["teacher", "roster", "resumes", courseId],
    queryFn: () => eduhubClassResumes.list(courseId),
    enabled: Boolean(courseId) && isUuid(courseId),
  });

  const classResumes = classResumesQuery.data ?? [];

  const attendanceMeetingsQuery = useQuery({
    queryKey: ["teacher", "attendance-meetings", courseMeta?.id, attendanceUiKey],
    queryFn: () => fetchAttendanceMeetings(courseMeta!.id),
    enabled: Boolean(courseMeta?.id) && isUuid(courseMeta.id),
  });

  const attendanceMeetings = useMemo(
    () => attendanceMeetingsQuery.data ?? [],
    [attendanceMeetingsQuery.data],
  );

  const attendanceSummaryQuery = useQuery({
    queryKey: ["teacher", "attendance-summary", courseMeta?.id, attendanceUiKey],
    queryFn: () => eduhubAttendance.summary(courseMeta!.id),
    enabled: Boolean(courseMeta?.id) && isUuid(courseMeta.id),
  });

  useEffect(() => {
    if (!courseMeta?.id) return;
    const latest = attendanceMeetings[0];
    if (!latest) return;
    setOverviewSessionId((prev) => prev ?? latest.sessionId);
  }, [courseMeta?.id, attendanceMeetings]);

  const handleDelete = async (id: string) => {
    if (!isUuid(id)) return;
    try {
      await eduhubCourses.delete(id);
    } catch {
      return;
    }
    setDeleteId(null);
    navigate("/dashboard/teacher/courses");
  };

  const handleArchive = async (id: string) => {
    if (!isUuid(id)) return;
    setPublishingId(id);
    try {
      await eduhubCourses.archive(id);
      await queryClient.invalidateQueries({ queryKey: ["teacher", "roster", "course", courseId] });
    } catch {
      // ignore
    }
    setPublishingId(null);
  };

  const inviterEmailNorm = user?.email?.trim().toLowerCase() ?? "";
  const [submittingSubstituteInvite, setSubmittingSubstituteInvite] = useState(false);

  const handleSubmitSubstituteInvite = async () => {
    if (!courseMeta || !isUuid(courseMeta.id)) return;
    const email = substituteEmail.trim();
    if (!email) {
      toast.error("Enter the substitute lecturer's email.");
      return;
    }
    if (email.toLowerCase() === inviterEmailNorm) {
      toast.error("Use another instructor's email — not your own.");
      return;
    }

    if (substituteScheduleSlotOptions.length > 0 && !substituteSessionSlotKey.trim()) {
      toast.error("Select the scheduled session this substitute will cover.");
      return;
    }

    const scheduleSlots = buildCourseScheduleSlotsForPicker(
      courseId,
      scheduleSourceCourse ?? {},
      scheduleProposalQuery.data,
    );

    let sessionNoteFromSchedule = "";
    let sessionSlotKeyToSave: string | undefined;
    let coverageDateToSave: string | undefined;
    if (substituteSessionSlotKey.startsWith("slot-")) {
      const idx = Number.parseInt(substituteSessionSlotKey.slice("slot-".length), 10);
      if (!Number.isNaN(idx) && scheduleSlots[idx]) {
        sessionNoteFromSchedule = formatClassMeetingSlotLabel(scheduleSlots[idx], idx);
        sessionSlotKeyToSave = substituteSessionSlotKey;
        coverageDateToSave = scheduleSlots[idx].sessionDate?.trim() || undefined;
      }
    }

    setSubmittingSubstituteInvite(true);
    try {
      await eduhubSubstituteInvites.create(courseMeta.id, {
        substituteEmail: email,
        sessionNote: sessionNoteFromSchedule || undefined,
        sessionSlotKey: sessionSlotKeyToSave,
        coverageDate: coverageDateToSave,
        message: substituteMessage.trim() || undefined,
      });
      invalidateSubstituteInvites();
      toast.success("Substitute invite sent", {
        description: "The substitute must accept, then you confirm, then admin gives final approval.",
      });
      setSubstituteOpen(false);
      setSubstituteEmail("");
      setSubstituteSessionSlotKey("");
      setSubstituteMessage("");
    } catch (err: unknown) {
      toast.error(err instanceof ApiError || err instanceof Error ? err.message : "Could not send invite");
    } finally {
      setSubmittingSubstituteInvite(false);
    }
  };

  const enrolledCount =
    studentsQuery.data?.length ??
    apiCourseQuery.data?.enrollmentCount ??
    null;
  const courseCategory = apiCourseQuery.data?.category?.trim() || "—";
  const sessionsCount = apiCourseQuery.data?.classMeetingsInSixMonths;
  const courseInitials = profileInitials(courseMeta?.title || "Class");

  const rosterTabTriggerClass =
    "rounded-none border-b-2 border-transparent px-3 py-2.5 text-muted-foreground shadow-none data-[state=active]:border-teal-700 data-[state=active]:bg-transparent data-[state=active]:text-teal-800 data-[state=active]:shadow-none";

  return (
    <div className="min-w-0 max-w-full">
        <div className="min-w-0 max-w-full">
          {!courseId ? (
            <div className="px-4 py-6 lg:px-6">
              <p className="text-sm text-red-600">{t("teacher.roster.errors.missingClass")}</p>
            </div>
          ) : loadingCourse ? (
            <div className="px-4 py-6 lg:px-6">
              <p className="text-sm text-muted-foreground">{t("teacher.roster.errors.loading")}</p>
            </div>
          ) : forbidden ? (
            <div className="px-4 py-6 lg:px-6">
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-6 text-sm text-amber-900">
                {t("teacher.roster.errors.forbidden")}
              </div>
            </div>
          ) : apiCourseQuery.isError && isUuid(courseId) ? (
            <div className="px-4 py-6 lg:px-6">
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-800">
                {t("teacher.roster.errors.loadFailed")}
              </div>
            </div>
          ) : !courseMeta ? (
            <div className="px-4 py-6 lg:px-6">
              <div className="rounded-xl border border-border bg-muted/30 px-4 py-6 text-sm text-muted-foreground">
                {t("teacher.courseForm.errors.classNotFound")}
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-5 px-4 py-5 lg:px-6">
                  <Link
                    to="/dashboard/teacher/courses"
                    className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <ArrowLeft className="h-4 w-4 shrink-0" />
                    {t("teacher.roster.backToMyClass")}
                  </Link>

                  {isSubstituteViewer ? (
                    <div className="rounded-lg border border-sky-200 bg-sky-50/80 px-3.5 py-2.5 text-sm text-sky-950">
                      <span className="font-medium">{t("teacher.roster.banners.substitute.viewingAs")}</span>{" "}
                      <span className="text-sky-950/80">
                        {t("teacher.roster.banners.substitute.courseLead")}{" "}
                        <span className="font-medium text-sky-950">{courseLeadDisplayName}</span>
                        {courseLeadEmail ? ` (${courseLeadEmail})` : null}
                      </span>
                    </div>
                  ) : null}
                  {!isSubstituteViewer && approvedCoverAsPrimaryRow ? (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 px-3.5 py-2.5 text-sm text-emerald-950">
                      <span className="font-medium">{t("teacher.roster.banners.primary.title")}</span>{" "}
                      <span className="font-mono text-xs font-medium">
                        {approvedCoverAsPrimaryRow.substituteEmail}
                      </span>
                    </div>
                  ) : null}

                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex min-w-0 items-start gap-3.5">
                      <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted/50">
                        {courseThumbnailUrl ? (
                          <img
                            src={courseThumbnailUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-lg font-semibold text-teal-800">{courseInitials}</span>
                        )}
                      </div>
                      <div className="min-w-0 pt-0.5">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          {courseMeta.status ? (
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                courseMeta.status === "PUBLISHED"
                                  ? "bg-emerald-50 text-emerald-800"
                                  : "bg-amber-50 text-amber-900"
                              }`}
                            >
                              {courseMeta.status}
                            </span>
                          ) : null}
                          {isUuid(courseId) && courseMeta.status === "DRAFT" ? (
                            <span className="text-xs text-muted-foreground">
                              {t("teacher.roster.awaitingAdminApproval")}
                            </span>
                          ) : null}
                        </div>
                        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                          {courseMeta.title}
                        </h1>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                      {!isSubstituteViewer && isUuid(courseId) ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => setSubstituteOpen(true)}
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                          {t("teacher.roster.inviteSubstitute")}
                        </Button>
                      ) : null}
                      {!isSubstituteViewer ? (
                        <Button asChild variant="outline" size="sm" className="gap-1.5">
                          <Link to={`/dashboard/teacher/courses/${courseMeta.id}/edit`}>
                            <Pencil className="h-3.5 w-3.5" />
                            {t("teacher.roster.actions.editClassContent")}
                          </Link>
                        </Button>
                      ) : null}
                      {!isSubstituteViewer && isUuid(courseId) && courseMeta.status !== "DRAFT" ? (
                        <Button
                          variant="outline"
                          size="icon"
                          type="button"
                          className="size-8"
                          disabled={publishingId === courseMeta.id}
                          title={
                            courseMeta.status === "ARCHIVED"
                              ? t("teacher.roster.actions.unarchive")
                              : t("teacher.roster.actions.archive")
                          }
                          onClick={() => handleArchive(courseMeta.id)}
                        >
                          {courseMeta.status === "ARCHIVED" ? (
                            <ArchiveRestore className="h-3.5 w-3.5" />
                          ) : (
                            <Archive className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      ) : null}
                      {!isSubstituteViewer ? (
                        <Button
                          variant="outline"
                          size="icon"
                          type="button"
                          className="size-8 text-muted-foreground hover:text-red-600"
                          title={t("teacher.roster.actions.deleteClass")}
                          onClick={() => setDeleteId(courseMeta.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        {t("teacher.roster.meta.category")}
                      </p>
                      <p className="mt-1 truncate text-sm font-semibold text-foreground">{courseCategory}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        {t("teacher.roster.meta.students")}
                      </p>
                      <p className="mt-1 truncate text-sm font-semibold text-foreground">
                        {enrolledCount != null
                          ? t("teacher.roster.meta.studentCount", { count: enrolledCount })
                          : "—"}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        {t("teacher.roster.meta.sessions")}
                      </p>
                      <p className="mt-1 truncate text-sm font-semibold text-foreground">
                        {sessionsCount != null
                          ? t("teacher.roster.meta.sessionsCount", { count: sessionsCount })
                          : t("teacher.roster.meta.sessionsNotSet")}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        {t("teacher.roster.meta.instructor")}
                      </p>
                      <p className="mt-1 truncate text-sm font-semibold text-foreground" title={courseLeadDisplayName}>
                        {courseLeadDisplayName}
                      </p>
                    </div>
                  </div>
              </div>

              <Tabs
                value={activeTab}
                onValueChange={(v) => {
                  const next = v as TeacherCourseTab;
                  setActiveTab(next);
                  if (next === "roster") {
                    setSearchParams({}, { replace: true });
                  } else {
                    setSearchParams({ tab: next }, { replace: true });
                  }
                }}
                className="min-w-0 w-full"
              >
                <div className="min-w-0 px-4 lg:px-6">
                  <TabsList className="mb-0 h-auto w-full justify-start gap-1 overflow-x-auto rounded-none border-b border-border bg-transparent p-0">
                    <TabsTrigger value="roster" className={rosterTabTriggerClass}>
                      {t("teacher.roster.tabs.enrolled")}
                    </TabsTrigger>
                    <TabsTrigger value="schedule" className={rosterTabTriggerClass}>
                      {t("teacher.roster.tabs.schedule")}
                    </TabsTrigger>
                    <TabsTrigger value="resume" className={rosterTabTriggerClass}>
                      {t("teacher.roster.tabs.resume")}
                    </TabsTrigger>
                    <TabsTrigger value="quiz" className={rosterTabTriggerClass}>
                      {t("teacher.roster.tabs.quiz")}
                    </TabsTrigger>
                    <TabsTrigger value="quiz-scores" className={rosterTabTriggerClass}>
                      {t("teacher.roster.tabs.quizScores")}
                    </TabsTrigger>
                    <TabsTrigger value="attendance" className={rosterTabTriggerClass}>
                      {t("teacher.roster.tabs.attendance")}
                    </TabsTrigger>
                    <TabsTrigger value="grades" className={rosterTabTriggerClass}>
                      {t("teacher.roster.tabs.grades")}
                    </TabsTrigger>
                    <TabsTrigger value="photos" className={rosterTabTriggerClass}>
                      {t("teacher.roster.tabs.photos")}
                    </TabsTrigger>
                  </TabsList>
                </div>

                <div className="min-w-0 px-4 py-6 lg:px-6">

                <TabsContent value="roster" className="mt-0 min-w-0 focus-visible:outline-none focus-visible:ring-0">
                  <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                    <div className="space-y-1">
                      <h2 className="text-lg font-semibold tracking-tight text-foreground">
                        {t("teacher.roster.enrolled.title")}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {t("teacher.roster.enrolled.intro")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("teacher.roster.enrolled.shareHint", {
                          split: contractShareLabel,
                          instructorPct: instructorSharePct,
                        })}
                      </p>
                    </div>
                    {studentsQuery.data?.length ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground">
                        <Users className="h-3.5 w-3.5" />
                        {t("teacher.roster.meta.studentCount", { count: studentsQuery.data.length })}
                      </span>
                    ) : null}
                  </div>

                  {!isUuid(courseId) ? (
                    <p className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                      {t("teacher.roster.enrolled.localOnly")}
                    </p>
                  ) : studentsQuery.isLoading ? (
                    <p className="text-sm text-muted-foreground">{t("teacher.roster.enrolled.loading")}</p>
                  ) : studentsQuery.isError ? (
                    <p className="text-sm text-red-600">{t("teacher.roster.enrolled.loadError")}</p>
                  ) : !studentsQuery.data?.length ? (
                    <p className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                      {t("teacher.roster.enrolled.empty")}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      <div className="overflow-hidden rounded-xl border border-border bg-card">
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent">
                              <TableHead className="min-w-[16rem]">
                                {t("teacher.roster.enrolled.table.name")}
                              </TableHead>
                              <TableHead className="whitespace-nowrap">
                                {t("teacher.roster.enrolled.table.status")}
                              </TableHead>
                              <TableHead className="whitespace-nowrap text-right">
                                {t("teacher.roster.enrolled.table.amountPaid")}
                              </TableHead>
                              <TableHead
                                className="whitespace-nowrap text-right"
                                title={t("teacher.roster.enrolled.table.yourShareTitle", {
                                  pct: instructorSharePct,
                                })}
                              >
                                {t("teacher.roster.enrolled.table.yourShare", {
                                  pct: instructorSharePct,
                                })}
                              </TableHead>
                              <TableHead
                                className="whitespace-nowrap text-right"
                                title={t("teacher.roster.enrolled.table.sessionsTitle")}
                              >
                                {t("teacher.roster.enrolled.table.sessionsInSixMonths")}
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {studentsQuery.data.map((s) => {
                              const displayName = formatDisplayPersonName(s.fullName);
                              const planned = apiCourseQuery.data?.classMeetingsInSixMonths;
                              const attended = attendanceSummaryQuery.data?.attendedByStudentId[s.id] ?? 0;
                              const emailKey = s.email?.trim().toLowerCase();
                              const paymentInfo =
                                studentPaymentByKey.get(s.id) ??
                                (emailKey ? studentPaymentByKey.get(`email:${emailKey}`) : undefined);
                              const paymentStatus: RosterStudentPaymentStatus =
                                paymentInfo?.status ?? "enrolled";
                              const coverageKey = emailKey
                                ? studentPaymentCoverageByEmail.get(emailKey)
                                : undefined;
                              const paidAmount =
                                paymentStatus === "paid" &&
                                paymentInfo?.amount != null &&
                                paymentInfo.amount > 0
                                  ? paymentInfo.amount
                                  : null;
                              const currency = paymentInfo?.currency || "USD";
                              const amountPaidLabel =
                                paidAmount != null ? formatMoney(paidAmount, currency) : "—";
                              const yourShareLabel =
                                paidAmount != null
                                  ? formatMoney(Math.round(paidAmount * instructorRevenueShare), currency)
                                  : "—";
                              const sessionsCell =
                                planned != null ? (
                                  <span className="tabular-nums">
                                    <span className="font-medium text-foreground">{attended}</span>
                                    <span className="text-muted-foreground"> / {planned}</span>
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                );
                              return (
                                <TableRow key={s.id}>
                                  <TableCell>
                                    <div className="flex min-w-0 items-center gap-3">
                                      <Avatar className="h-9 w-9 shrink-0 border border-border">
                                        {s.avatarUrl ? (
                                          <AvatarImage src={s.avatarUrl} alt="" />
                                        ) : null}
                                        <AvatarFallback className="bg-teal-50 text-xs font-semibold text-teal-800">
                                          {profileInitials(displayName)}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="min-w-0">
                                        <p className="truncate text-sm font-medium text-foreground">
                                          {displayName}
                                        </p>
                                        <p className="truncate text-xs text-muted-foreground">{s.email}</p>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <RosterStudentStatusBadge
                                      status={paymentStatus}
                                      coverageKey={coverageKey}
                                    />
                                  </TableCell>
                                  <TableCell className="text-right text-sm tabular-nums whitespace-nowrap">
                                    {amountPaidLabel}
                                  </TableCell>
                                  <TableCell className="text-right text-sm tabular-nums whitespace-nowrap font-medium text-teal-800">
                                    {yourShareLabel}
                                  </TableCell>
                                  <TableCell className="text-right text-sm">{sessionsCell}</TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                      <p className="px-0.5 text-xs leading-relaxed text-muted-foreground">
                        {t("teacher.roster.enrolled.footnote")}
                      </p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="schedule" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
                  {(() => {
                    const schedulePill = !isSubstituteViewer
                      ? scheduleStatusPill(apiCourseQuery.data?.status as CourseStatus | undefined)
                      : null;
                    const windowStart = formatCourseDateLabel(apiCourseQuery.data?.classStartDate);
                    const windowEnd = formatCourseDateLabel(apiCourseQuery.data?.classEndDate);
                    const plannedCount = Math.max(
                      rosterScheduleView.sessionsCount,
                      rosterScheduleView.slots.length,
                    ) || rosterScheduleView.slots.length;

                    const openAttendanceTab = () => {
                      setActiveTab("attendance");
                      setSearchParams({ tab: "attendance" }, { replace: true });
                    };

                    return (
                      <>
                        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                          <div className="space-y-1">
                            <h2 className="text-lg font-semibold tracking-tight text-foreground">
                              {isSubstituteViewer
                                ? t("teacher.roster.schedule.yourCover")
                                : t("teacher.roster.schedule.classSchedule")}
                            </h2>
                            <p className="max-w-2xl text-sm text-muted-foreground">
                              {isSubstituteViewer
                                ? t("teacher.roster.schedule.substituteIntro")
                                : t("teacher.roster.schedule.primaryIntro")}
                            </p>
                          </div>
                          {!isSubstituteViewer ? (
                            <div className="flex flex-wrap items-center gap-2">
                              {isUuid(courseId) &&
                              isApiCourseLecturer &&
                              apiCourseQuery.data?.status === "SCHEDULE_PENDING" ? (
                                <Button asChild size="sm" className="bg-teal-700 hover:bg-teal-800">
                                  <Link to={`/dashboard/teacher/courses/${courseId}/edit/schedule`}>
                                    {t("teacher.roster.schedule.approveOrRequest")}
                                  </Link>
                                </Button>
                              ) : null}
                              <Button asChild size="sm" variant="ghost">
                                <Link to="/dashboard/teacher/schedule">
                                  {t("teacher.roster.schedule.scheduleApprovalsLink")}
                                </Link>
                              </Button>
                            </div>
                          ) : null}
                        </div>

                        {!isSubstituteViewer && apiCourseQuery.data?.scheduleRejectionNote ? (
                          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
                            <p className="font-medium">{t("teacher.roster.schedule.feedbackTitle")}</p>
                            <p className="mt-1 whitespace-pre-wrap text-red-900/90">
                              {apiCourseQuery.data.scheduleRejectionNote}
                            </p>
                          </div>
                        ) : null}

                        {!isSubstituteViewer && (schedulePill || windowStart || windowEnd || plannedCount > 0) ? (
                          <div className="mb-4 flex flex-wrap items-center gap-2">
                            {schedulePill ? (
                              <span
                                className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${schedulePill.className}`}
                              >
                                {schedulePill.label}
                              </span>
                            ) : null}
                            {windowStart || windowEnd ? (
                              <span className="inline-flex items-center rounded-full border border-border bg-card px-2.5 py-0.5 text-xs text-muted-foreground">
                                {[windowStart, windowEnd].filter(Boolean).join(" → ")}
                              </span>
                            ) : null}
                            {rosterScheduleView.slots.length > 0 ? (
                              <span className="inline-flex items-center rounded-full border border-border bg-card px-2.5 py-0.5 text-xs text-muted-foreground">
                                {t("teacher.roster.schedule.plannedSessions")}{" "}
                                <span className="ml-1 font-medium tabular-nums text-foreground">{plannedCount}</span>
                              </span>
                            ) : null}
                            {rosterScheduleView.mode === "proposal" && rosterScheduleView.proposedByName ? (
                              <span className="text-xs text-muted-foreground">
                                {t("teacher.roster.schedule.adminProposal", {
                                  name: rosterScheduleView.proposedByName,
                                })}
                              </span>
                            ) : null}
                          </div>
                        ) : null}

                        {isSubstituteViewer ? (
                          <p className="mb-4 text-xs text-muted-foreground">
                            {t("teacher.roster.schedule.courseLead")}{" "}
                            <span className="font-medium text-foreground">{courseLeadDisplayName}</span>
                            {courseLeadEmail ? ` · ${courseLeadEmail}` : null}
                          </p>
                        ) : null}

                        {!isSubstituteViewer && isUuid(courseId) && scheduleProposalQuery.isLoading ? (
                          <p className="mb-4 text-sm text-muted-foreground">
                            {t("teacher.roster.schedule.loadingProposal")}
                          </p>
                        ) : null}

                        {isSubstituteViewer && substituteViewerSchedule ? (
                          substituteViewerSchedule.kind === "empty" ? (
                            <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center">
                              <p className="text-sm font-medium text-foreground">
                                {t("teacher.roster.schedule.substituteNoMatch")}
                              </p>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {t("teacher.roster.schedule.substituteNoMatchHint")}
                              </p>
                            </div>
                          ) : substituteViewerSchedule.kind === "whole" ? (
                            <div className="rounded-xl border border-border bg-card px-5 py-4">
                              <p className="text-sm font-semibold text-foreground">
                                {t("teacher.roster.schedule.wholeClassCover")}
                              </p>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {t("teacher.roster.schedule.wholeClassCoverDescription")}
                              </p>
                              <div className="mt-3 flex flex-wrap items-center gap-2">
                                <span className="truncate text-xs font-medium text-foreground">
                                  {substituteViewerSchedule.invite.substituteEmail}
                                </span>
                                <span
                                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${substituteCoverChipClass(substituteViewerSchedule.invite.status)}`}
                                >
                                  {substituteCoverChipLabel(substituteViewerSchedule.invite.status)}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <TeacherCourseSchedulePanel
                              courseId={courseMeta.id}
                              rows={substituteViewerSchedule.rows}
                              instructorName={courseLeadDisplayName}
                              getSubstituteInvite={substituteInviteForScheduleRow}
                              onOpenAttendance={openAttendanceTab}
                              isSubstituteViewer
                            />
                          )
                        ) : rosterScheduleView.slots.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center">
                            <CalendarDays className="mx-auto h-8 w-8 text-muted-foreground/50" aria-hidden />
                            <p className="mt-3 text-sm font-medium text-foreground">
                              {t("teacher.roster.schedule.noSessions")}
                            </p>
                          </div>
                        ) : (
                          <TeacherCourseSchedulePanel
                            courseId={courseMeta.id}
                            rows={rosterScheduleView.slots.map((slot, index) => ({ index, slot }))}
                            instructorName={courseLeadDisplayName}
                            getSubstituteInvite={substituteInviteForScheduleRow}
                            editScheduleHref={`/dashboard/teacher/courses/${courseMeta.id}/edit/schedule`}
                            onInviteSubstitute={
                              !isSubstituteViewer && isUuid(courseId)
                                ? () => setSubstituteOpen(true)
                                : undefined
                            }
                            onOpenAttendance={openAttendanceTab}
                          />
                        )}
                      </>
                    );
                  })()}
                </TabsContent>

                <TabsContent value="resume" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
                  <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                    <div className="space-y-1">
                      <h2 className="text-lg font-semibold tracking-tight text-foreground">
                        {t("teacher.roster.resume.title")}
                      </h2>
                      <p className="max-w-xl text-sm text-muted-foreground">
                        {t("teacher.roster.resume.intro")}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {classResumes.length > 0 ? (
                        <span className="inline-flex items-center rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                          {t("teacher.roster.resume.count", { count: classResumes.length })}
                        </span>
                      ) : null}
                      <Button
                        type="button"
                        size="sm"
                        className="gap-1.5 bg-teal-700 hover:bg-teal-800"
                        onClick={() => {
                          void navigate(`/dashboard/teacher/courses/${courseMeta.id}/resume/new`);
                        }}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        {t("teacher.roster.resume.newResume")}
                      </Button>
                    </div>
                  </div>

                  {classResumesQuery.isLoading ? (
                    <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
                  ) : classResumes.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center">
                      <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-full border border-border bg-background">
                        <FileText className="h-5 w-5 text-muted-foreground" aria-hidden />
                      </div>
                      <p className="text-sm font-semibold text-foreground">
                        {t("teacher.roster.resume.emptyTitle")}
                      </p>
                      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                        {t("teacher.roster.resume.emptyDescription")}
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        className="mt-4 gap-1.5 bg-teal-700 hover:bg-teal-800"
                        onClick={() => {
                          void navigate(`/dashboard/teacher/courses/${courseMeta.id}/resume/new`);
                        }}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        {t("teacher.roster.resume.createResume")}
                      </Button>
                    </div>
                  ) : (
                    <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                      {classResumes.map((r) => {
                        const updatedLabel = new Date(r.updatedAt).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        });
                        return (
                          <li key={r.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
                            {r.thumbnailUrl ? (
                              <img
                                src={r.thumbnailUrl}
                                alt=""
                                className="h-16 w-24 shrink-0 rounded-lg border border-border object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-lg border border-dashed border-border bg-muted/30">
                                <FileText className="h-5 w-5 text-muted-foreground/60" aria-hidden />
                              </div>
                            )}
                            <div className="min-w-0 flex-1 space-y-1">
                              <p className="text-xs font-medium text-teal-800">
                                {r.sessionLabel?.trim() || t("teacher.roster.resume.wholeClassRecap")}
                              </p>
                              <p className="line-clamp-2 text-sm text-foreground whitespace-pre-wrap">
                                {r.body}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {t("teacher.roster.resume.updated", { datetime: updatedLabel })}
                              </p>
                            </div>
                            <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="gap-1.5"
                                onClick={() => {
                                  void navigate(`/dashboard/teacher/courses/${courseMeta.id}/resume/${r.id}`);
                                }}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                {t("common.edit")}
                              </Button>
                              {!isSubstituteViewer ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                                  onClick={() => setResumeDeleteId(r.id)}
                                >
                                  {t("common.delete")}
                                </Button>
                              ) : null}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </TabsContent>

                <TabsContent value="quiz" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
                  <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                    <div className="space-y-1">
                      <h2 className="text-lg font-semibold tracking-tight text-foreground">
                        {t("teacher.roster.quiz.title")}
                      </h2>
                      <p className="max-w-xl text-sm text-muted-foreground">
                        {t("teacher.roster.quiz.intro")}
                      </p>
                    </div>
                    {!isSubstituteViewer ? (
                      <div className="flex flex-wrap items-center gap-2">
                        {displayedQuizzes.length ? (
                          <span className="inline-flex items-center rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                            {t("teacher.roster.quiz.count", {
                              count: displayedQuizzes.length,
                            })}
                          </span>
                        ) : null}
                        <Button
                          type="button"
                          size="sm"
                          className="gap-1.5 bg-teal-700 hover:bg-teal-800"
                          asChild
                        >
                          <Link
                            to={
                              isUuid(courseId)
                                ? `/dashboard/teacher/placement-test?courseId=${encodeURIComponent(courseId)}&new=1`
                                : "/dashboard/teacher/placement-test?new=1"
                            }
                          >
                            <Plus className="h-3.5 w-3.5" />
                            {t("teacher.roster.quiz.createQuiz")}
                          </Link>
                        </Button>
                      </div>
                    ) : null}
                  </div>

                  {isSubstituteViewer ? (
                    <div className="rounded-xl border border-border bg-muted/30 px-4 py-4 text-sm">
                      <p className="font-medium text-foreground">
                        {t("teacher.roster.quiz.substituteRestriction")}
                      </p>
                      <p className="mt-1 text-muted-foreground">
                        {t("teacher.roster.quiz.substituteRestrictionDescription")}
                      </p>
                    </div>
                  ) : !isUuid(courseId) ? (
                    <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center text-sm text-muted-foreground">
                      {t("teacher.roster.quiz.localOnly")}
                    </div>
                  ) : (
                    <section aria-labelledby="class-quiz-list-heading">
                      <h3 id="class-quiz-list-heading" className="sr-only">
                        {t("teacher.roster.quiz.yourQuizzes")}
                      </h3>

                      {courseQuizzesQuery.data?.fetchNote ? (
                        <div className="mb-4 rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm text-muted-foreground">
                          {courseQuizzesQuery.data.fetchNote}
                        </div>
                      ) : null}

                      {courseQuizzesQuery.isLoading ? (
                        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                          {[0, 1, 2].map((i) => (
                            <li key={i} className="h-20 animate-pulse bg-muted/40" aria-hidden />
                          ))}
                        </ul>
                      ) : courseQuizzesQuery.isError ? (
                        <p className="text-sm text-red-600">
                          {courseQuizzesQuery.error instanceof Error
                            ? courseQuizzesQuery.error.message
                            : t("teacher.roster.quiz.loadError")}
                        </p>
                      ) : !displayedQuizzes.length ? (
                        <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center">
                          <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-full border border-border bg-background">
                            <ClipboardList className="h-5 w-5 text-muted-foreground" aria-hidden />
                          </div>
                          <p className="text-sm font-semibold text-foreground">
                            {t("teacher.roster.quiz.emptyTitle")}
                          </p>
                          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                            {t("teacher.roster.quiz.emptyDescription")}
                          </p>
                          <Button
                            type="button"
                            size="sm"
                            className="mt-4 gap-1.5 bg-teal-700 hover:bg-teal-800"
                            asChild
                          >
                            <Link
                              to={`/dashboard/teacher/placement-test?courseId=${encodeURIComponent(courseId)}&new=1`}
                            >
                              <Plus className="h-3.5 w-3.5" />
                              {t("teacher.roster.quiz.createQuiz")}
                            </Link>
                          </Button>
                        </div>
                      ) : (
                        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                          {displayedQuizzes.map((q) => {
                            const isPlacement = (q.quizType ?? "QUIZ") === "PLACEMENT_TEST";
                            return (
                              <li
                                key={q.id}
                                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4"
                              >
                                {q.thumbnailUrl?.trim() ? (
                                  <img
                                    src={q.thumbnailUrl}
                                    alt=""
                                    className="h-14 w-20 shrink-0 rounded-lg border border-border object-cover"
                                    loading="lazy"
                                  />
                                ) : (
                                  <div className="flex h-14 w-20 shrink-0 items-center justify-center rounded-lg border border-dashed border-border bg-muted/30">
                                    <ClipboardList className="h-4 w-4 text-muted-foreground/60" aria-hidden />
                                  </div>
                                )}
                                <div className="min-w-0 flex-1 space-y-1.5">
                                  <p className="truncate text-sm font-semibold text-foreground">
                                    {q.title}
                                  </p>
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span
                                      className={
                                        isPlacement
                                          ? "inline-flex rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-900"
                                          : "inline-flex rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                                      }
                                    >
                                      {isPlacement
                                        ? t("teacher.roster.quiz.placement")
                                        : t("teacher.roster.quiz.quiz")}
                                    </span>
                                    <span
                                      className={
                                        q.isPublished
                                          ? "inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800"
                                          : "inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-900"
                                      }
                                    >
                                      {q.isPublished
                                        ? t("teacher.roster.quiz.published")
                                        : t("teacher.roster.quiz.draft")}
                                    </span>
                                    <span className="text-xs tabular-nums text-muted-foreground">
                                      {t("teacher.roster.quiz.questionCount", {
                                        count: q.questions.length,
                                      })}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                                  {!q.isPublished ? (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="gap-1.5"
                                      disabled={quizPublishingId === q.id}
                                      onClick={() => void handlePublishQuiz(q.id, isPlacement)}
                                    >
                                      {quizPublishingId === q.id ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : null}
                                      {t("teacher.roster.quiz.publish")}
                                    </Button>
                                  ) : null}
                                  <Button type="button" variant="outline" size="sm" className="gap-1.5" asChild>
                                    <Link to={`/dashboard/teacher/placement-test/${courseId}/${q.id}/results`}>
                                      <BarChart2 className="h-3.5 w-3.5" />
                                      {t("teacher.roster.quiz.results")}
                                    </Link>
                                  </Button>
                                  <Button type="button" variant="outline" size="sm" className="gap-1.5" asChild>
                                    <Link
                                      to={`/dashboard/teacher/placement-test?courseId=${encodeURIComponent(courseId)}&edit=${encodeURIComponent(q.id)}`}
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                      {t("common.edit")}
                                    </Link>
                                  </Button>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </section>
                  )}
                </TabsContent>

                <TabsContent value="grades" className="mt-0 min-w-0 max-w-full focus-visible:outline-none focus-visible:ring-0">
                  <TeacherCourseGradesPanel
                    courseId={courseMeta.id}
                    courseTitle={courseMeta.title}
                    students={studentsQuery.data ?? []}
                    instructorEmail={user.email}
                    instructorName={courseLeadDisplayName}
                    isApiCourse={isUuid(courseId)}
                    isLoading={studentsQuery.isLoading}
                    isError={studentsQuery.isError}
                    plannedSessions={apiCourseQuery.data?.classMeetingsInSixMonths ?? null}
                  />
                </TabsContent>

                <TabsContent value="quiz-scores" className="mt-0 min-w-0 max-w-full focus-visible:outline-none focus-visible:ring-0">
                  <TeacherManualQuizScoresPanel
                    courseId={courseMeta.id}
                    students={studentsQuery.data ?? []}
                    scheduleSlots={rosterScheduleView.slots}
                    isApiCourse={isUuid(courseId)}
                    isLoading={studentsQuery.isLoading}
                    isError={studentsQuery.isError}
                  />
                </TabsContent>

                <TabsContent value="attendance" className="mt-0 min-w-0 space-y-8 focus-visible:outline-none focus-visible:ring-0">
                  <section className="space-y-4">
                    <div className="space-y-1">
                      <h2 className="text-lg font-semibold tracking-tight text-foreground">
                        {t("teacher.roster.attendance.qrTitle")}
                      </h2>
                      <p className="max-w-xl text-sm text-muted-foreground">
                        {t("teacher.roster.attendance.qrIntro")}
                      </p>
                    </div>
                    <TeacherAttendanceSessionPanel
                      embedded
                      fixedCourse={{
                        id: courseMeta.id,
                        title: courseMeta.title,
                        classMeetingsInSixMonths: apiCourseQuery.data?.classMeetingsInSixMonths,
                      }}
                      suggestedMeetingName={attendanceSuggestedMeetingName}
                      rosterAttendanceOverviewPicker={{
                        onSelectionChange: onOverviewSessionChange,
                        approvedScheduleSlots: attendanceScheduleSlots.map(({ slot, index }) => ({
                          index,
                          label: formatClassMeetingSlotLabel(slot, index),
                          sessionDate: slot.sessionDate?.trim() || undefined,
                          sessionTime: slot.sessionTime?.trim() || undefined,
                          title: slot.title?.trim() || undefined,
                        })),
                      }}
                    />
                  </section>

                  <TeacherAttendanceMatrixPanel
                    courseId={courseMeta.id}
                    students={studentsQuery.data ?? []}
                    scheduleSlotRows={attendanceScheduleSlots}
                    attendanceMeetings={attendanceMeetings}
                    attendanceUiKey={attendanceUiKey}
                    teacherChecklist={teacherChecklist}
                    isApiCourse={isUuid(courseId)}
                    isLoading={studentsQuery.isLoading}
                    isError={studentsQuery.isError}
                  />
                </TabsContent>

                <TabsContent value="photos" className="mt-0 min-w-0 focus-visible:outline-none focus-visible:ring-0">
                  <TeacherClassPhotosPanel
                    courseId={courseMeta.id}
                    apiPhotoUrls={apiCourseQuery.data?.classPhotoUrls}
                  />
                </TabsContent>
                </div>
              </Tabs>
            </>
          )}
        </div>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this class?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this class and all its lessons. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteId(null)}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) void handleDelete(deleteId);
              }}
              className="bg-red-600 hover:bg-red-700"
            >{t("common.delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!resumeDeleteId} onOpenChange={(open) => !open && setResumeDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this resume?</AlertDialogTitle>
            <AlertDialogDescription>
              Students will no longer see this recap on their class page. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setResumeDeleteId(null)}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (resumeDeleteId && courseId) {
                  deleteResumeMutation.mutate({ resumeId: resumeDeleteId });
                }
              }}
            >{t("common.delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={substituteOpen}
        onOpenChange={(open) => {
          setSubstituteOpen(open);
          if (!open) {
            setSubstituteEmail("");
            setSubstituteSessionSlotKey("");
            setSubstituteMessage("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite a substitute instructor</DialogTitle>
            <DialogDescription>
              Use the <span className="font-medium text-foreground">work email</span> of a lecturer your admin created.
              They receive an in-app notification here; your admin is notified too (browser demo until the API exists).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="substitute-email">Substitute email</Label>
              <Input
                id="substitute-email"
                type="email"
                autoComplete="off"
                placeholder="colleague@school.org"
                value={substituteEmail}
                onChange={(e) => setSubstituteEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="substitute-session">
                Scheduled session{substituteScheduleSlotOptions.length > 0 ? "" : " (optional)"}
              </Label>
              {substituteScheduleSlotOptions.length > 0 ? (
                <Select value={substituteSessionSlotKey || undefined} onValueChange={setSubstituteSessionSlotKey}>
                  <SelectTrigger id="substitute-session" className="bg-white">
                    <SelectValue placeholder="Select from admin schedule…" />
                  </SelectTrigger>
                  <SelectContent>
                    {substituteScheduleSlotOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground rounded-md border border-dashed border-amber-200/90 bg-amber-50/60 px-3 py-2.5 leading-relaxed">
                  No sessions are listed for this class yet. Ask your admin to add the class schedule (dates/times in the
                  course schedule). If the API hides slots, the schedule saved in this browser from Admin / your schedule
                  editor will appear here.
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Uses the same schedule rows as your class setup—filled by admin or synced from the course API when
                available.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="substitute-msg">Note to substitute &amp; admin (optional)</Label>
              <Textarea
                id="substitute-msg"
                placeholder="Materials are in module 3; QR check-in as usual…"
                rows={3}
                value={substituteMessage}
                onChange={(e) => setSubstituteMessage(e.target.value)}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setSubstituteOpen(false)}>{t("common.cancel")}</Button>
            <Button type="button" className="bg-[#3954d0] hover:bg-[#2f46b3]" onClick={handleSubmitSubstituteInvite}>{t("teacher.roster.substituteDialog.sendInvite")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
