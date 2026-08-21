import { useState, useEffect, useRef, useMemo, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Link, Navigate, useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  PlayCircle,
  Clock,
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Camera,
  QrCode,
  CalendarDays,
  CalendarRange,
  Users,
  FileText,
  Images,
  Loader2,
} from "@/lib/icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { CircularProgress } from "@/components/ui/circular-progress";
import { Tabs, TabsContent, TabsTrigger } from "@/components/ui/tabs";
import {
  SlidingPillTabsList,
  slidingPillTabTriggerClassName,
} from "@/components/ui/sliding-pill-tabs-list";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  fetchAttendanceMeetings,
  type StoredAttendanceMeeting,
} from "@/features/teacher/attendance/attendanceMeetingsStorage";
import { lessonProgressStore } from "@/features/student/data/lessonProgressStore";
import {
  eduhubCourses,
  eduhubSchedule,
  eduhubCourseQuizzes,
  eduhubClassResumes,
  eduhubAttendance,
  eduhubLessonProgress,
  type QuizResponseForStudent,
} from "@/api/eduhubClient";
import type { CourseResponse, ScheduleProposalResponse } from "@/api/eduhubTypes";
import { isUuid } from "@/api/utils";
import {
  boundsFromMeetingSlots,
  mergeScheduleDisplayForAdminReview,
  resolvedAdminScheduleSessionTotal,
  useAdminCourseLocalDataVersion,
} from "@/features/admin/utils/adminCourseScheduleDisplay";
import { courseScheduleProposalStore } from "@/features/courses/courseScheduleProposalStore";
import { deriveScheduleWorkflow } from "@/features/courses/courseScheduleWorkflow";
import {
  classScheduleStatusHint,
  formatSessionTimeLabel,
  buildScheduleMonthTabs,
  resolveEnrollmentSessionTimingStatus,
} from "@/features/courses/classSchedulePreview";
import { useScheduleAttendanceState } from "@/features/courses/useScheduleAttendanceState";
import { SessionTimingChip } from "@/features/courses/SessionTimingChip";
import {
  StudentCourseScheduleMonthSelect,
  type ScheduleMonthSelectAccess,
} from "@/features/courses/StudentCourseScheduleMonthSelect";
import { useMyEnrollmentApplicationsByCourse } from "@/features/enrollment/useMyEnrollmentApplicationsByCourse";
import {
  attendanceTuitionBlockMessage,
  isAttendanceMonthPaid,
  paymentMonthForMeetingName,
  paymentMonthForScheduleSlotKey,
  resolvePaidTuitionMonths,
} from "@/features/enrollment/enrollmentPaidMonths";
import { installmentPaymentPath } from "@/features/enrollment/enrollmentInstallmentPayments";
import type { EnrollmentPaymentFields, TuitionPlanMonths } from "@/features/enrollment/enrollmentTuitionThirds";
import { ADMIN_ENROLLMENT_PAID_MONTHS_CHANGED } from "@/features/admin/data/adminEnrollmentPaidMonthsStore";
import { useStudentCoursesQuery } from "@/features/student/hooks/useStudentQueries";
import { formatDisplayPersonName, formatDisplayTitle } from "@/lib/formatPersonName";
import { cn } from "@/lib/utils";
import { useAuthSession } from "@/features/auth/context";
import { enrollmentApplicationStore } from "@/features/enrollment/enrollmentApplicationStore";
import { EnrollmentStatusBadge } from "@/features/enrollment/EnrollmentStatusBadge";
import { isCourseScheduleFinished } from "@/features/courses/courseScheduleCompletion";
import { hasSeenCourseCongrats } from "@/features/student/courseCongratsSeenStorage";
import { MAX_CLASS_PHOTOS } from "@/features/courses/classPhotos";

function nameInitials(name: string, max = 2): string {
  const t = name.trim();
  if (!t) return "—";
  return t
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, max)
    .toUpperCase();
}

function formatPrice(price: number | undefined, currency = "USD"): string {
  if (price == null || price <= 0) return "Free";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(price);
}

const ENROLLED_COURSES: Record<
  number,
  {
    id: number;
    title: string;
    instructor: string;
    progress: number;
    status: string;
    nextLesson: string;
    category: string;
    duration: string;
    modules: number;
    enrolledDate: string;
  }
> = {
  1: {
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
  2: {
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
  3: {
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
  4: {
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
  5: {
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
  6: {
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
};



const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

function formatClassDateLabel(iso: string | undefined): string | null {
  if (!iso?.trim()) return null;
  const d = new Date(iso.trim());
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

type SessionSlotLike = { title?: string; sessionDate?: string; sessionTime?: string };

/** Use the lecturer-provided title when set; otherwise show the session number only. */
function sessionSlotStudentLabel(slot: SessionSlotLike, indexZeroBased: number): string {
  const t = slot.title?.trim();
  if (t) return formatDisplayTitle(t);
  return String(indexZeroBased + 1);
}

function statCountValue(count: number, singular: string, plural = `${singular}s`): ReactNode {
  return (
    <>
      {count}{" "}
      <span className="text-base font-medium normal-case text-zinc-500">
        {count === 1 ? singular : plural}
      </span>
    </>
  );
}

function ClassStatItem({
  icon: Icon,
  label,
  value,
  iconWrapperClassName,
  iconClassName,
  valueClassName,
}: {
  icon: typeof BookOpen;
  label: string;
  value: ReactNode;
  iconWrapperClassName: string;
  iconClassName: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex min-w-[9.5rem] items-center gap-3">
      <div
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
          iconWrapperClassName,
        )}
      >
        <Icon className={cn("h-5 w-5", iconClassName)} aria-hidden />
      </div>
      <div className="min-w-0">
        <p className={cn("text-lg font-semibold tabular-nums tracking-tight text-zinc-900", valueClassName)}>
          {value}
        </p>
        <p className="mt-0.5 text-xs uppercase tracking-wide leading-snug text-zinc-500">{label}</p>
      </div>
    </div>
  );
}

function StudentSessionScheduleCard({
  slot,
  indexZeroBased,
  heldSlotKeys,
  activeSlotKeys,
}: {
  slot: SessionSlotLike;
  indexZeroBased: number;
  heldSlotKeys?: ReadonlySet<string>;
  activeSlotKeys?: ReadonlySet<string>;
}) {
  const rawDate = slot.sessionDate?.trim();
  const timeRaw = slot.sessionTime?.trim();
  const label = sessionSlotStudentLabel(slot, indexZeroBased);
  const slotWhen = {
    sessionDate: slot.sessionDate ?? "",
    sessionTime: slot.sessionTime ?? "",
  };
  const timingStatus = resolveEnrollmentSessionTimingStatus(
    { ...slotWhen, title: slot.title ?? label },
    heldSlotKeys ?? new Set(),
    activeSlotKeys ?? new Set(),
  );

  let weekdayLong: string | null = null;
  let dateValue: string | null = null;
  const timeValue = formatSessionTimeLabel(timeRaw ?? undefined);

  if (rawDate) {
    const d = new Date(rawDate);
    if (!Number.isNaN(d.getTime())) {
      weekdayLong = d.toLocaleDateString(undefined, { weekday: "long" });
      dateValue = d.toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } else {
      dateValue = formatClassDateLabel(rawDate) ?? rawDate;
    }
  }

  const hasAnyWhen = Boolean(dateValue || timeValue);

  return (
    <div
      className={cn(
        "rounded-xl border border-zinc-100/90 bg-zinc-50/80 px-3 py-2.5",
        timingStatus === "finished" && "opacity-75",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 text-sm font-semibold leading-snug text-zinc-900">{label}</p>
        <SessionTimingChip status={timingStatus} />
      </div>

      {hasAnyWhen ? (
        <div className="mt-2.5 space-y-2 border-t border-zinc-200/70 pt-2.5">
          {weekdayLong ? (
            <p className="text-xs font-medium capitalize leading-snug text-zinc-500">{weekdayLong}</p>
          ) : null}
          <dl className="space-y-2.5">
            <div className="flex items-start justify-between gap-4">
              <dt className="shrink-0 pt-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-400">
                Date
              </dt>
              <dd className="min-w-0 max-w-[70%] text-right text-xs font-bold leading-snug text-zinc-600">
                {dateValue ?? <span className="text-zinc-400">Not set</span>}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="shrink-0 pt-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-400">
                Time
              </dt>
              <dd className="text-right text-xs font-bold tabular-nums leading-snug text-zinc-700">
                {timeValue ?? <span className="font-normal text-zinc-400">Not set</span>}
              </dd>
            </div>
          </dl>
        </div>
      ) : (
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">Date and time to be announced</p>
      )}
    </div>
  );
}

function resolveStudentSessionSlots(
  courseId: string | undefined,
  apiDetail: CourseResponse | null,
  scheduleProposal: ScheduleProposalResponse | null,
  isApiCourse: boolean,
): SessionSlotLike[] {
  if (isApiCourse && courseId && apiDetail) {
    if (scheduleProposal?.sessions.length) {
      return scheduleProposal.sessions.map((s) => ({
        title: s.title,
        sessionDate: s.sessionDate ?? "",
        sessionTime: s.sessionTime ?? "",
      }));
    }
    const wf = deriveScheduleWorkflow(apiDetail);
    const useProposal = wf?.status === "approved";
    if (useProposal) {
      const p = courseScheduleProposalStore.get(courseId);
      if (p?.classMeetingSlots?.length) return p.classMeetingSlots;
    }
    if (apiDetail.classMeetingSlots?.length) return apiDetail.classMeetingSlots;
    return [];
  }
  return [];
}

function sessionDateMs(iso: string | undefined): number {
  if (!iso?.trim()) return NaN;
  const t = new Date(iso.trim()).getTime();
  return Number.isNaN(t) ? NaN : t;
}

function parseSessionIdFromAttendanceKey(key: string, courseIdStr: string): string | null {
  const prefix = `attendance-checkin:${courseIdStr}:`;
  if (!key.startsWith(prefix)) return null;
  const sessionId = key.slice(prefix.length);
  return sessionId.length > 0 ? sessionId : null;
}

/** Instructor-named meeting for a session, looked up from an already-fetched meetings list. */
function meetingNameForSession(meetings: StoredAttendanceMeeting[], sessionId: string): string {
  const m = meetings.find((x) => x.sessionId === sessionId);
  if (m?.name?.trim()) return m.name.trim();
  return "Class meeting";
}

/** e.g. "1. Basket · 2026-06-10 10:00:00" → "1. Basket · Jun 10, 2026 · 10:00 AM" */
function formatStudentAttendanceMeetingLabel(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "Class meeting";

  const segments = trimmed.split(" · ").map((s) => s.trim()).filter(Boolean);
  if (segments.length < 2) return trimmed;

  const last = segments[segments.length - 1];
  if (last === "Online" || last === "In person") return trimmed;

  const datetimeMatch = last.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2}(?::\d{2})?)$/);
  if (datetimeMatch) {
    const [, datePart, timePart] = datetimeMatch;
    const dateLabel = formatClassDateLabel(datePart) ?? datePart;
    const timeLabel = formatSessionTimeLabel(timePart) ?? timePart;
    return [...segments.slice(0, -1), `${dateLabel} · ${timeLabel}`].join(" · ");
  }

  return trimmed;
}

function isScannerCameraBlocked(error: string | null): boolean {
  if (!error) return false;
  return (
    error.includes("Camera") ||
    error.includes("permission") ||
    error.includes("unsupported") ||
    error.includes("not supported")
  );
}

type LessonRow = { id: string; title: string; duration: string; completed: boolean; moduleId?: string };
type QrBarcode = { rawValue?: string };
type BarcodeDetectorLike = {
  detect: (source: ImageBitmapSource) => Promise<QrBarcode[]>;
};
type BarcodeDetectorCtor = new (options?: { formats?: string[] }) => BarcodeDetectorLike;

const StudentCourseDetail = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuthSession();
  const [apiCourse, setApiCourse] = useState<{
    id: string;
    title: string;
    instructor: string;
    category: string;
    duration: string;
    modules: number;
    enrolledDate: string;
    instructorAvatarUrl?: string;
    thumbnailUrl?: string;
    price?: number;
    currency?: string;
    enrollmentCount?: number;
    classMeetingsInSixMonths?: number;
    classStartDate?: string;
    classEndDate?: string;
  } | null>(null);
  const [apiLessons, setApiLessons] = useState<LessonRow[]>([]);
  /** Full GET /courses/{id} payload — used to merge admin-approved schedule + proposal like admin UI. */
  const [apiCourseDetail, setApiCourseDetail] = useState<CourseResponse | null>(null);
  const [apiScheduleProposal, setApiScheduleProposal] = useState<ScheduleProposalResponse | null>(null);
  const [apiLoading, setApiLoading] = useState(false);
  const scheduleLocalTick = useAdminCourseLocalDataVersion();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [scannerStatus, setScannerStatus] = useState("Align the QR code in the frame");
  const scannerVideoRef = useRef<HTMLVideoElement | null>(null);
  const scannerStreamRef = useRef<MediaStream | null>(null);
  const scannerRafRef = useRef<number | null>(null);

  const [studentQuizzes, setStudentQuizzes] = useState<QuizResponseForStudent[]>([]);
  const [studentQuizzesLoading, setStudentQuizzesLoading] = useState(false);
  const [studentQuizzesError, setStudentQuizzesError] = useState<string | null>(null);
  const [completedStudentQuizIds, setCompletedStudentQuizIds] = useState<Set<string>>(() => new Set());

  const { data: enrolledCourses = [] } = useStudentCoursesQuery();
  const emailNorm = user.email.trim().toLowerCase();
  const { byCourse: enrollmentAppsByCourse } = useMyEnrollmentApplicationsByCourse(emailNorm);
  const [enrollmentStoreTick, setEnrollmentStoreTick] = useState(0);

  const id = courseId && !isUuid(courseId ?? "") ? parseInt(courseId, 10) : NaN;

  const isEnrolled = courseId ? enrolledCourses.some((c) => c.id === courseId || c.id === courseId) : false;

  const myAttendanceQuery = useQuery({
    queryKey: ["student", "attendance", courseId],
    queryFn: () => eduhubAttendance.myAttendance(courseId!),
    enabled: Boolean(courseId && isUuid(courseId) && isEnrolled),
  });

  const attendanceSessionsQuery = useQuery({
    queryKey: ["student", "attendance-sessions", courseId],
    queryFn: () => eduhubAttendance.listSessions(courseId!),
    enabled: Boolean(courseId && isUuid(courseId) && isEnrolled),
    refetchInterval: 30_000,
  });

  const attendanceMeetingNamesQuery = useQuery({
    queryKey: ["student", "attendance-meeting-names", courseId],
    queryFn: () => fetchAttendanceMeetings(courseId!),
    enabled: Boolean(courseId && isUuid(courseId) && isEnrolled),
  });

  useEffect(() => {
    const bump = () => setEnrollmentStoreTick((n) => n + 1);
    window.addEventListener("eduhub-enrollment-applications-changed", bump);
    window.addEventListener(ADMIN_ENROLLMENT_PAID_MONTHS_CHANGED, bump);
    window.addEventListener("storage", bump);
    return () => {
      window.removeEventListener("eduhub-enrollment-applications-changed", bump);
      window.removeEventListener(ADMIN_ENROLLMENT_PAID_MONTHS_CHANGED, bump);
      window.removeEventListener("storage", bump);
    };
  }, []);

  const scheduleMonthAccess = useMemo((): ScheduleMonthSelectAccess => {
    void enrollmentStoreTick;
    if (!courseId) return "enrollment_required";
    if (
      isEnrolled ||
      (emailNorm && enrollmentApplicationStore.isApprovedForCourse(courseId, emailNorm))
    ) {
      return "full";
    }
    const apiApp = enrollmentAppsByCourse.get(courseId);
    if (
      apiApp?.status === "PENDING" ||
      (emailNorm && enrollmentApplicationStore.findPendingForCourseAndEmail(courseId, emailNorm))
    ) {
      return "pending_review";
    }
    if (
      apiApp?.status === "REJECTED" ||
      (emailNorm &&
        enrollmentApplicationStore.findLatestForCourseAndEmail(courseId, emailNorm)?.status ===
          "REJECTED")
    ) {
      return "rejected";
    }
    return "enrollment_required";
  }, [courseId, emailNorm, isEnrolled, enrollmentAppsByCourse, enrollmentStoreTick]);

  const enrollApplicationHref = courseId
    ? `/dashboard/available-courses/enroll/${encodeURIComponent(courseId)}`
    : undefined;

  const tabRaw = searchParams.get("tab");
  const activeCourseTab =
    tabRaw === "resume" || tabRaw === "attendance" || tabRaw === "quiz" || tabRaw === "photos"
      ? tabRaw
      : "content";

  const classPhotoUrls = apiCourseDetail?.classPhotoUrls ?? [];

  const onCourseTabChange = (value: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value === "content") next.delete("tab");
        else next.set("tab", value);
        return next;
      },
      { replace: true },
    );
  };

  const canLoadStudentQuizzes = Boolean(courseId) && isUuid(courseId ?? "") && isEnrolled;

  useEffect(() => {
    if (activeCourseTab !== "quiz" || !canLoadStudentQuizzes) return;
    let cancelled = false;
    setStudentQuizzesLoading(true);
    setStudentQuizzesError(null);
    void (async () => {
      try {
        const [list, results] = await Promise.all([
          eduhubCourseQuizzes.listForStudent(courseId!),
          eduhubCourseQuizzes.getAllMyResults().catch(() => []),
        ]);
        if (cancelled) return;
        setStudentQuizzes(list);
        setCompletedStudentQuizIds(new Set(results.map((r) => r.quizId || "")));
      } catch {
        if (!cancelled) {
          setStudentQuizzes([]);
          setStudentQuizzesError("Could not load quizzes for this class.");
        }
      } finally {
        if (!cancelled) setStudentQuizzesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeCourseTab, canLoadStudentQuizzes, courseId]);

  const classResumesQuery = useQuery({
    queryKey: ["student", "resumes", courseId],
    queryFn: () => eduhubClassResumes.list(courseId!),
    enabled: Boolean(courseId) && isUuid(courseId) && isEnrolled,
  });

  const classResumeList = classResumesQuery.data ?? [];

  const lessonProgressQuery = useQuery({
    queryKey: ["student", "lesson-progress", courseId],
    queryFn: () => eduhubLessonProgress.listForCourse(courseId!),
    enabled: Boolean(courseId) && isUuid(courseId) && isEnrolled,
  });

  const completedApiLessonIds = useMemo(
    () => new Set((lessonProgressQuery.data ?? []).filter((p) => p.isCompleted).map((p) => p.lessonId)),
    [lessonProgressQuery.data],
  );

  useEffect(() => {
    if (courseId && isUuid(courseId)) {
      setApiLoading(true);
      setApiCourseDetail(null);
      setApiScheduleProposal(null);

      Promise.all([
        eduhubCourses.getById(courseId),
        eduhubCourses.getAllLessons(courseId).catch(() => []),
        eduhubSchedule.getProposal(courseId).catch(() => null),
      ]).then(([c, allLessons, scheduleProposal]) => {
        setApiCourseDetail(c);
        setApiScheduleProposal(scheduleProposal);
        const amount = c.pricing?.discountedAmount ?? c.pricing?.amount;
        setApiCourse({
          id: c.id,
          title: c.title,
          instructor: c.lecturer?.fullName ?? "—",
          category: c.category ?? "Class",
          duration: "—",
          modules: 0,
          enrolledDate: c.createdAt.slice(0, 10),
          instructorAvatarUrl: c.lecturer?.avatarUrl,
          thumbnailUrl: c.thumbnailUrl?.trim() || undefined,
          price: amount,
          currency: c.pricing?.currency,
          enrollmentCount: c.enrollmentCount,
          classMeetingsInSixMonths: c.classMeetingsInSixMonths,
          classStartDate: c.classStartDate,
          classEndDate: c.classEndDate,
        });
        const flat = allLessons.map((l) => ({
          id: l.id,
          title: l.title,
          duration: l.durationMinutes ? `${l.durationMinutes} min` : "—",
          completed: false,
          moduleId: l.moduleId,
        }));
        setApiLessons(flat);
        setApiCourse((prev) => prev ? { ...prev, modules: flat.length } : null);
      }).catch(() => {
        setApiCourse(null);
        setApiCourseDetail(null);
      }).finally(() => setApiLoading(false));
    } else {
      setApiCourseDetail(null);
      setApiScheduleProposal(null);
    }
  }, [courseId]);

  const resolvedSchedule = useMemo(() => {
    void scheduleLocalTick;
    if (!courseId) return null;
    if (apiCourseDetail && isUuid(courseId)) {
      if (apiScheduleProposal) {
        const slots = apiScheduleProposal.sessions.map((s) => ({
          title: s.title,
          sessionDate: s.sessionDate ?? "",
          sessionTime: s.sessionTime ?? "",
        }));
        const bounds = boundsFromMeetingSlots(slots);
        return {
          sessionsSixMo: Math.max(apiScheduleProposal.sessionCount, slots.length),
          classStartDate: bounds.start,
          classEndDate: bounds.end,
        };
      }
      const wf = deriveScheduleWorkflow(apiCourseDetail);
      const useProposal = wf?.status === "approved";
      return mergeScheduleDisplayForAdminReview(courseId, apiCourseDetail, {
        useLocalProposalSnapshot: useProposal,
      });
    }
    return null;
  }, [courseId, apiCourseDetail, apiScheduleProposal, scheduleLocalTick]);

  const allSessionSlots = useMemo(() => {
    void scheduleLocalTick;
    const isApi = Boolean(apiCourseDetail && courseId && isUuid(courseId));
    const raw = resolveStudentSessionSlots(courseId, apiCourseDetail, apiScheduleProposal, isApi);
    const decorated = raw.map((slot, i) => ({ slot, i, ms: sessionDateMs(slot.sessionDate) }));
    decorated.sort((a, b) => {
      const na = Number.isNaN(a.ms) ? Infinity : a.ms;
      const nb = Number.isNaN(b.ms) ? Infinity : b.ms;
      if (na !== nb) return na - nb;
      return a.i - b.i;
    });
    return decorated.map((x) => x.slot);
  }, [courseId, apiCourseDetail, apiScheduleProposal, scheduleLocalTick]);

  const scheduleAttendance = useScheduleAttendanceState(courseId);

  const scheduleStatusHint = useMemo(() => {
    const isApi = Boolean(apiCourseDetail && courseId && isUuid(courseId));
    return classScheduleStatusHint(courseId, isApi, apiScheduleProposal, allSessionSlots.length > 0, apiCourseDetail);
  }, [courseId, apiCourseDetail, apiScheduleProposal, allSessionSlots.length]);

  /** Sum of sessions across admin month plans (`sessionCount` on propose). */
  const adminScheduleSessionTotal = useMemo(() => {
    void scheduleLocalTick;
    if (!courseId || !apiCourseDetail || !isUuid(courseId)) return undefined;
    return resolvedAdminScheduleSessionTotal(courseId, apiCourseDetail, apiScheduleProposal);
  }, [courseId, apiCourseDetail, apiScheduleProposal, scheduleLocalTick]);

  const adminScheduleMonthCount = useMemo(() => {
    if (allSessionSlots.length === 0) return 0;
    return buildScheduleMonthTabs(allSessionSlots).length;
  }, [allSessionSlots]);

  const approvedEnrollment = useMemo(() => {
    void enrollmentStoreTick;
    if (!courseId) return undefined;
    const apiApp = enrollmentAppsByCourse.get(courseId);
    const localLatest = emailNorm
      ? enrollmentApplicationStore.findLatestForCourseAndEmail(courseId, emailNorm)
      : undefined;
    if (apiApp?.status === "APPROVED") return apiApp;
    if (localLatest?.status === "APPROVED") return localLatest;
    return undefined;
  }, [courseId, emailNorm, enrollmentAppsByCourse, enrollmentStoreTick]);

  const paidTuitionMonths = useMemo((): ReadonlySet<TuitionPlanMonths> | null => {
    void enrollmentStoreTick;
    if (scheduleMonthAccess !== "full" || !courseId) return null;
    if (approvedEnrollment) {
      return resolvePaidTuitionMonths(approvedEnrollment as EnrollmentPaymentFields, allSessionSlots, approvedEnrollment.id);
    }
    if (
      isEnrolled ||
      (emailNorm && enrollmentApplicationStore.isApprovedForCourse(courseId, emailNorm))
    ) {
      return new Set<TuitionPlanMonths>([1, 2, 3]);
    }
    return null;
  }, [
    scheduleMonthAccess,
    courseId,
    emailNorm,
    isEnrolled,
    approvedEnrollment,
    allSessionSlots,
    enrollmentStoreTick,
  ]);

  const attendanceTuitionBlock = useMemo(() => {
    if (!paidTuitionMonths || !allSessionSlots.length || !attendanceSessionsQuery.data?.length) {
      return null;
    }
    const openSessions = attendanceSessionsQuery.data.filter((s) => s.status !== "CLOSED");
    const tabs = buildScheduleMonthTabs(allSessionSlots);
    for (const session of openSessions) {
      const paymentMonth = session.scheduleSlotKey
        ? paymentMonthForScheduleSlotKey(allSessionSlots, session.scheduleSlotKey)
        : paymentMonthForMeetingName(allSessionSlots, session.meetingName);
      if (!isAttendanceMonthPaid(paidTuitionMonths, paymentMonth) && paymentMonth) {
        return attendanceTuitionBlockMessage(paymentMonth, tabs);
      }
    }
    return null;
  }, [allSessionSlots, attendanceSessionsQuery.data, paidTuitionMonths]);

  const openScanner = () => {
    if (attendanceTuitionBlock) return;
    setScannerOpen(true);
  };

  const installmentPaymentHref = approvedEnrollment
    ? installmentPaymentPath(approvedEnrollment.id)
    : "/dashboard/payment";

  const lessons: LessonRow[] = apiLessons.map((l) => ({
    ...l,
    completed: completedApiLessonIds.has(l.id),
  }));

  const completedCount = lessons.filter((l) => l.completed).length;
  const progressPercent = lessons.length ? Math.round((completedCount / lessons.length) * 100) : 0;
  const statusFromProgress =
    progressPercent >= 100 ? "Completed" : progressPercent >= 75 ? "Almost Complete" : "In Progress";

  const course = apiCourse
    ? {
        id: courseId!,
        ...apiCourse,
        progress: progressPercent,
        status: statusFromProgress,
        nextLesson: lessons.find((l) => !l.completed)?.title ?? apiLessons[0]?.title ?? "—",
      }
    : id
      ? {
          ...ENROLLED_COURSES[id],
          progress: progressPercent,
          status: statusFromProgress,
          nextLesson: lessons.find((l) => !l.completed)?.title ?? ENROLLED_COURSES[id].nextLesson ?? "—",
          instructorAvatarUrl: undefined,
          price: undefined,
          currency: undefined,
          enrollmentCount: undefined,
          classMeetingsInSixMonths: undefined,
          classStartDate: undefined,
          classEndDate: undefined,
        }
      : undefined;

  const stopScanner = () => {
    if (scannerRafRef.current != null) {
      cancelAnimationFrame(scannerRafRef.current);
      scannerRafRef.current = null;
    }
    if (scannerStreamRef.current) {
      scannerStreamRef.current.getTracks().forEach((t) => t.stop());
      scannerStreamRef.current = null;
    }
    if (scannerVideoRef.current) {
      scannerVideoRef.current.srcObject = null;
    }
  };

  const onScanResult = (raw: string) => {
    try {
      const url = new URL(raw, window.location.origin);
      if (url.pathname !== "/dashboard/attendance/join") {
        setScannerError("This QR is not an attendance check-in link.");
        setScannerStatus("Try scanning the class attendance QR.");
        return;
      }
      setScannerStatus("Attendance QR detected. Opening check-in…");
      setScannerOpen(false);
      stopScanner();
      navigate(`${url.pathname}${url.search}`);
    } catch {
      setScannerError("Could not read this QR link.");
      setScannerStatus("Try again with a clearer QR image.");
    }
  };

  useEffect(() => {
    if (!scannerOpen) {
      stopScanner();
      return;
    }

    let cancelled = false;
    const start = async () => {
      setScannerError(null);
      setScannerStatus("Requesting camera permission…");
      const media = navigator.mediaDevices;
      if (!media?.getUserMedia) {
        setScannerError("Camera is not supported on this browser.");
        return;
      }

      try {
        const stream = await media.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        scannerStreamRef.current = stream;
        if (scannerVideoRef.current) {
          scannerVideoRef.current.srcObject = stream;
          await scannerVideoRef.current.play();
        }
        setScannerStatus("Align the QR code in the frame");

        const Detector = (
          window as Window & { BarcodeDetector?: BarcodeDetectorCtor }
        ).BarcodeDetector;

        if (!Detector) {
          setScannerError("QR detection is unsupported on this browser. Use Chrome/Edge on mobile or open attendance link manually.");
          return;
        }

        const detector = new Detector({ formats: ["qr_code"] });
        const scanLoop = async () => {
          if (cancelled || !scannerVideoRef.current) return;
          try {
            const barcodes = await detector.detect(scannerVideoRef.current);
            const value = barcodes[0]?.rawValue?.trim();
            if (value) {
              onScanResult(value);
              return;
            }
          } catch {
            // ignore transient frame decode errors
          }
          scannerRafRef.current = requestAnimationFrame(scanLoop);
        };
        scannerRafRef.current = requestAnimationFrame(scanLoop);
      } catch {
        setScannerError("Camera permission denied or unavailable. Allow camera access in browser settings.");
        setScannerStatus("Unable to start camera");
      }
    };

    start();
    return () => {
      cancelled = true;
      stopScanner();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scannerOpen]);

  if (apiLoading) {
    return (
      <div className="flex items-center justify-center py-24" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <p className="text-foreground/60">Loading class…</p>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="py-16 text-center" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <p className="mb-4 text-foreground/70">Class not found.</p>
        <Link to="/dashboard/courses">
          <Button variant="outline" className="rounded-full">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to My Class
          </Button>
        </Link>
      </div>
    );
  }

  const nextLesson = lessons.find((l) => !l.completed) ?? lessons[0];
  const courseIdStr = String(course.id);
  const attendanceEntries =
    typeof window !== "undefined"
      ? Object.entries(sessionStorage)
          .filter(([k]) => k.startsWith("attendance-checkin:"))
          .map(([k, raw]) => {
            let checkedAt = raw;
            let storedMeetingName: string | undefined;
            try {
              const p = JSON.parse(raw) as { checkedAt?: string; meetingName?: string };
              if (p && typeof p.checkedAt === "string") {
                checkedAt = p.checkedAt;
                if (typeof p.meetingName === "string" && p.meetingName.trim()) {
                  storedMeetingName = p.meetingName.trim();
                }
              }
            } catch {
              /* legacy: plain ISO timestamp string */
            }
            return { key: k, checkedAt, storedMeetingName };
          })
          .filter(({ key }) => key.includes(`:${courseIdStr}:`))
          .sort((a, b) => new Date(b.checkedAt).getTime() - new Date(a.checkedAt).getTime())
      : [];
  const attendanceMeetingsForNames = attendanceMeetingNamesQuery.data ?? [];
  const localAttendanceTableRows = attendanceEntries.map((entry) => {
    const sessionId = parseSessionIdFromAttendanceKey(entry.key, courseIdStr);
    const resolved =
      entry.storedMeetingName ??
      (sessionId ? meetingNameForSession(attendanceMeetingsForNames, sessionId) : null);
    return {
      ...entry,
      meetingName: resolved ?? "Class meeting",
    };
  });
  const attendanceTableRows = myAttendanceQuery.data
    ? myAttendanceQuery.data.sessions
        .filter((session) => session.present && session.checkedAt)
        .map((session) => ({
          key: session.sessionId,
          checkedAt: session.checkedAt!,
          meetingName: session.meetingName || "Class meeting",
        }))
    : localAttendanceTableRows;

  const classStartLabel = formatClassDateLabel(
    resolvedSchedule?.classStartDate ?? course.classStartDate,
  );
  const classEndLabel = formatClassDateLabel(resolvedSchedule?.classEndDate ?? course.classEndDate);
  const hasClassDateRange = Boolean(classStartLabel || classEndLabel);
  const meetings = resolvedSchedule?.sessionsSixMo ?? course.classMeetingsInSixMonths;
  const totalSessionsCount =
    adminScheduleSessionTotal ??
    (allSessionSlots.length > 0 ? allSessionSlots.length : null) ??
    (meetings != null && meetings > 0 ? meetings : null);
  const hasScheduleSummary =
    hasClassDateRange ||
    totalSessionsCount != null ||
    allSessionSlots.length > 0;

  const coverThumbnailUrl = apiCourse?.thumbnailUrl?.trim() || undefined;

  const classEndForCompletion = resolvedSchedule?.classEndDate ?? course.classEndDate;
  const shouldRedirectToCongrats =
    scheduleMonthAccess === "full" &&
    Boolean(courseId) &&
    Boolean(emailNorm) &&
    !hasSeenCourseCongrats(courseId!, emailNorm) &&
    isCourseScheduleFinished({
      slots: allSessionSlots,
      heldSlotKeys: scheduleAttendance.heldSlotKeys,
      activeSlotKeys: scheduleAttendance.activeSlotKeys,
      classEndDate: classEndForCompletion,
    });

  if (shouldRedirectToCongrats) {
    return (
      <Navigate
        to={`/dashboard/courses/${encodeURIComponent(courseId!)}/congrats`}
        replace
        state={{
          courseTitle: course.title,
          instructor: course.instructor,
        }}
      />
    );
  }

  const scannerCameraBlocked = isScannerCameraBlocked(scannerError);

  return (
    <>
      <div className="w-full min-w-0 pb-24 lg:pb-0" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          <header className="mb-10">
            <div className="-mx-6 box-border min-w-0 w-[calc(100%+3rem)] max-w-[calc(100%+3rem)]">
              <div className="overflow-hidden rounded-none border-0 bg-white shadow-none">
                <div className="relative h-52 w-full bg-gray-200 sm:h-64">
                  {coverThumbnailUrl ? (
                    <img
                      src={coverThumbnailUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center" aria-hidden>
                      <BookOpen className="h-14 w-14 text-gray-400/90" />
                    </div>
                  )}
                  <div
                    className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"
                    aria-hidden
                  />
                  {isEnrolled ? (
                    <EnrollmentStatusBadge status="enrolled" className="absolute right-3 top-3" />
                  ) : null}
                </div>
              </div>
              <div className="rounded-none border-0 bg-white shadow-none">
                <div className="grid gap-6 px-6 py-4 sm:px-8 sm:py-5 lg:grid-cols-12 lg:items-start">
                  <div className="min-w-0 lg:col-span-8">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    {formatDisplayTitle(course.category)}
                  </p>
                  {isEnrolled ? (
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-tight",
                        course.status === "Completed"
                          ? "bg-emerald-100/90 text-emerald-900"
                          : course.status === "Almost Complete"
                            ? "bg-blue-100/90 text-blue-900"
                            : "bg-amber-100/90 text-amber-950",
                      )}
                    >
                      {course.status}
                    </span>
                  ) : null}
                </div>

                <div className="mt-1.5 flex flex-col items-start gap-1.5 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
                  <h1 className="min-w-0 max-w-3xl text-[1.375rem] font-bold leading-snug tracking-tight text-zinc-950 sm:text-[1.75rem] sm:leading-tight">
                    {course.title}
                  </h1>
                  {isEnrolled ? (
                    <p className="shrink-0 text-sm leading-snug text-zinc-500 sm:max-w-[13rem] sm:text-right">
                      Joined {formatDate(course.enrolledDate)}
                    </p>
                  ) : course.duration !== "—" || course.modules > 0 ? (
                    <p className="shrink-0 text-sm leading-snug text-zinc-500 sm:max-w-[13rem] sm:text-right">
                      {course.duration !== "—" ? <span>{course.duration}</span> : null}
                      {course.duration !== "—" && course.modules > 0 ? (
                        <span className="text-zinc-300" aria-hidden>
                          {" "}
                          ·{" "}
                        </span>
                      ) : null}
                      {course.modules > 0 ? <span>{course.modules} modules</span> : null}
                    </p>
                  ) : null}
                </div>

                <div className="mt-6 rounded-2xl bg-white p-5 shadow-[0_2px_12px_-2px_rgba(24,24,27,0.08),0_8px_24px_-6px_rgba(24,24,27,0.06)]">
                  <div className="flex items-center justify-between gap-4 sm:gap-10">
                    <div className="flex min-w-0 flex-1 items-center gap-4">
                      {course.instructorAvatarUrl ? (
                        <img
                          src={course.instructorAvatarUrl}
                          alt=""
                          className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-zinc-100"
                        />
                      ) : (
                        <span
                          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold uppercase tracking-wide text-zinc-600 ring-2 ring-zinc-100"
                          aria-hidden
                        >
                          {nameInitials(course.instructor)}
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                          Taught by
                        </p>
                        <p className="mt-1 truncate text-base font-semibold leading-snug text-zinc-900">
                          {formatDisplayPersonName(course.instructor)}
                        </p>
                      </div>
                    </div>
                    {isEnrolled ? (
                      <div className="flex shrink-0 flex-col items-end sm:border-l sm:border-zinc-100 sm:pl-10 sm:text-right">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                          Your progress
                        </p>
                        <div className="mt-2">
                          <CircularProgress value={course.progress} size={48} strokeWidth={3.5} />
                        </div>
                      </div>
                    ) : (
                      <div className="flex shrink-0 flex-col items-end sm:border-l sm:border-zinc-100 sm:pl-10 sm:text-right">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                          Tuition
                        </p>
                        <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-[#3954d0]">
                          {formatPrice(course.price, course.currency)}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 border-t border-zinc-100 pt-6">
                    <h3 className="text-base font-semibold tracking-tight text-zinc-900">Class statistics</h3>
                    <div className="mt-4 grid grid-cols-2 gap-6">
                      <ClassStatItem
                        icon={BookOpen}
                        label="Lessons"
                        value={statCountValue(lessons.length, "lesson")}
                        iconWrapperClassName="bg-sky-50"
                        iconClassName="text-sky-500"
                      />
                      <ClassStatItem
                        icon={Users}
                        label="Students joined"
                        value={
                          course.enrollmentCount != null ? (
                            statCountValue(course.enrollmentCount, "student")
                          ) : (
                            <span className="font-normal text-zinc-400">—</span>
                          )
                        }
                        iconWrapperClassName="bg-rose-50"
                        iconClassName="text-rose-500"
                      />
                      <ClassStatItem
                        icon={CalendarDays}
                        label="Total sessions"
                        value={
                          totalSessionsCount != null ? (
                            statCountValue(totalSessionsCount, "session")
                          ) : (
                            <span className="font-normal text-zinc-400">—</span>
                          )
                        }
                        iconWrapperClassName="bg-[#3954d0]/10"
                        iconClassName="text-[#3954d0]"
                      />
                      {hasClassDateRange ? (
                        <ClassStatItem
                          icon={CalendarRange}
                          label="Schedule"
                          value={
                            classStartLabel && classEndLabel ? (
                              <>
                                {classStartLabel}
                                <span className="font-normal text-zinc-400"> → </span>
                                {classEndLabel}
                              </>
                            ) : classStartLabel ? (
                              <>Starts {classStartLabel}</>
                            ) : classEndLabel ? (
                              <>Ends {classEndLabel}</>
                            ) : (
                              "—"
                            )
                          }
                          iconWrapperClassName="bg-violet-50"
                          iconClassName="text-violet-600"
                          valueClassName="text-sm font-semibold leading-snug"
                        />
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="mt-8 w-full min-w-0">
          <Tabs value={activeCourseTab} onValueChange={onCourseTabChange} className="w-full">
            <div className="mb-5 sm:flex sm:items-center sm:justify-between sm:gap-2">
              <div className="min-w-0 w-full overflow-x-auto sm:w-auto sm:overflow-visible [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <SlidingPillTabsList
                  activeValue={activeCourseTab}
                  className="inline-flex h-10 w-max max-w-none flex-nowrap gap-0.5 rounded-full p-1 sm:gap-1"
                >
                  <TabsTrigger
                    value="content"
                    className={cn(slidingPillTabTriggerClassName, "px-2.5 text-xs sm:px-3 sm:text-sm")}
                  >
                    <span className="sm:hidden">Content</span>
                    <span className="hidden sm:inline">Class Content</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="resume"
                    className={cn(slidingPillTabTriggerClassName, "px-2.5 text-xs sm:px-3 sm:text-sm")}
                  >
                    Resume
                  </TabsTrigger>
                  <TabsTrigger
                    value="quiz"
                    className={cn(slidingPillTabTriggerClassName, "px-2.5 text-xs sm:px-3 sm:text-sm")}
                  >
                    Quiz
                  </TabsTrigger>
                  <TabsTrigger
                    value="attendance"
                    className={cn(slidingPillTabTriggerClassName, "px-2.5 text-xs sm:px-3 sm:text-sm")}
                  >
                    Attendance
                  </TabsTrigger>
                  <TabsTrigger
                    value="photos"
                    className={cn(slidingPillTabTriggerClassName, "px-2.5 text-xs sm:px-3 sm:text-sm")}
                  >
                    Photos
                  </TabsTrigger>
                </SlidingPillTabsList>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="hidden shrink-0 rounded-full sm:inline-flex"
                onClick={openScanner}
                disabled={Boolean(attendanceTuitionBlock)}
                title={attendanceTuitionBlock ?? "Scan attendance QR"}
              >
                <Camera className="h-4 w-4" aria-hidden />
                Scan QR
              </Button>
            </div>

            <TabsContent value="content" className="mt-0">
              {isEnrolled && (
                <div className="mb-4 flex items-center justify-between">
                  <h2
                    className="font-bold text-foreground"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    Class Content
                  </h2>
                  {nextLesson && (
                    <Link to={`/dashboard/courses/${String(course.id)}/lessons/${nextLesson.id}${nextLesson.moduleId ? `?moduleId=${nextLesson.moduleId}` : ""}`}>
                      <Button size="sm" className="rounded-full" style={{ backgroundColor: "#1e40af" }}>
                        <PlayCircle className="mr-2 h-4 w-4" />
                        Continue: {nextLesson.title}
                      </Button>
                    </Link>
                  )}
                </div>
              )}

              {isEnrolled && (
                <div className="space-y-2">
                  {lessons.map((lesson, index) => {
                  const isUnlocked = index === 0 || lessons[index - 1].completed;
                  return (
                    <div
                      key={lesson.id}
                      className={`flex items-center gap-4 rounded-xl border p-4 transition-colors ${
                        lesson.completed ? "border-gray-200/50 bg-gray-50/50" : "border-gray-200/50 bg-white/80 hover:border-gray-300/50"
                      }`}
                    >
                      <div
                        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
                          lesson.completed ? "bg-green-100" : "bg-gray-200/80"
                        }`}
                      >
                        {lesson.completed ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <span className="text-sm font-medium text-foreground/60">{index + 1}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1">
                          <p className={`font-bold ${lesson.completed ? "text-foreground/70" : "text-foreground"}`}>
                            {lesson.title}
                          </p>
                          {lesson.completed && (
                            <span className="flex-shrink-0 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                              Completed
                            </span>
                          )}
                        </div>
                        {lesson.duration !== "—" && (
                          <p className="text-xs text-foreground/50 mt-0.5">{lesson.duration}</p>
                        )}
                      </div>
                      {lesson.completed ? (
                        <Link to={`/dashboard/courses/${String(course.id)}/lessons/${lesson.id}${lesson.moduleId ? `?moduleId=${lesson.moduleId}` : ""}`}>
                          <Button size="sm" variant="outline" className="rounded-full flex-shrink-0 px-5">
                            View
                          </Button>
                        </Link>
                      ) : isUnlocked ? (
                        <Link to={`/dashboard/courses/${String(course.id)}/lessons/${lesson.id}${lesson.moduleId ? `?moduleId=${lesson.moduleId}` : ""}`}>
                          <Button size="sm" className="rounded-full flex-shrink-0" style={{ backgroundColor: "#1e40af" }}>
                            <PlayCircle className="mr-1.5 h-4 w-4" />
                            Start
                          </Button>
                        </Link>
                      ) : (
                        <Button
                          size="sm"
                          className="rounded-full flex-shrink-0"
                          style={{ backgroundColor: "#1e40af" }}
                          disabled
                          title="Complete the previous lesson first"
                        >
                          <PlayCircle className="mr-1.5 h-4 w-4" />
                          Start
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
              )}

              <div className="mt-8 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-6 text-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-100">
                    <ClipboardList className="h-6 w-6 text-violet-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground" style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400 }}>
                      Placement test / Quiz
                    </h3>
                    <p className="mt-1 text-sm text-foreground/60 max-w-md mx-auto">
                      Quizzes from your instructor also appear in the Quiz tab. Start a quiz when you are ready.
                    </p>
                  </div>
                  <Button
                    type="button"
                    className="rounded-full mt-2"
                    style={{ backgroundColor: "#3954d0" }}
                    onClick={() => onCourseTabChange("quiz")}
                  >
                    <ClipboardList className="mr-2 h-4 w-4" />
                    Open Quiz tab
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="resume" className="mt-0">
              {!isEnrolled ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
                  Enroll in this class first to read your instructor&apos;s class resume and recap notes.
                </div>
              ) : classResumeList.length > 0 ? (
                <div className="space-y-4">
                  <p className="text-xs text-foreground/55 leading-relaxed">
                    Recaps from your instructor (newest first).
                  </p>
                  <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 xl:grid-cols-3">
                    {classResumeList.map((r) => (
                      <li key={r.id}>
                        <Link
                          to={`/dashboard/courses/${encodeURIComponent(courseId ?? "")}/resume/${encodeURIComponent(r.id)}`}
                          className="group flex h-full flex-col rounded-xl border border-zinc-200/90 bg-white p-2 shadow-sm ring-1 ring-zinc-100/80 transition-colors hover:border-zinc-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
                        >
                          {r.thumbnailUrl ? (
                            <div className="mb-2 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50">
                              <img
                                src={r.thumbnailUrl}
                                alt="Resume thumbnail"
                                className="h-40 w-full object-cover transition-transform group-hover:scale-[1.02]"
                                loading="lazy"
                              />
                            </div>
                          ) : null}
                          <div className="flex flex-1 flex-col gap-2 px-1 pb-1">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="min-w-0 space-y-1">
                                <h3 className="flex items-center gap-2 font-semibold text-zinc-900 group-hover:text-zinc-950">
                                  <FileText className="h-5 w-5 shrink-0 text-zinc-500" aria-hidden />
                                  Class resume
                                </h3>
                                {r.sessionLabel ? (
                                  <p className="text-sm font-medium text-zinc-700">{r.sessionLabel}</p>
                                ) : (
                                  <p className="text-sm text-zinc-600">General recap</p>
                                )}
                              </div>
                              {r.updatedAt ? (
                                <p className="shrink-0 text-xs tabular-nums text-zinc-500">
                                  Updated{" "}
                                  {new Date(r.updatedAt).toLocaleString(undefined, {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                    hour: "numeric",
                                    minute: "2-digit",
                                  })}
                                </p>
                              ) : null}
                            </div>
                            {r.body ? (
                              <p className="line-clamp-3 text-sm leading-relaxed text-zinc-600">{r.body}</p>
                            ) : null}
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/60 p-8 text-center">
                  <FileText className="mx-auto h-10 w-10 text-foreground/20" aria-hidden />
                  <p className="mt-3 text-sm font-medium text-foreground">No class resumes yet</p>
                  <p className="mt-1 text-sm text-foreground/60 max-w-md mx-auto">
                    When your instructor publishes recap notes for this class, they will appear here.
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="quiz" className="mt-0 space-y-4">
              {!isEnrolled ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
                  Enroll in this class first to see quizzes your instructor publishes for it.
                </div>
              ) : !canLoadStudentQuizzes ? (
                <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/60 p-8 text-center text-sm text-foreground/70">
                  <p>
                    Quizzes load for catalog classes on the server. Open a class from <span className="font-medium">My Class</span>{" "}
                    to take instructor quizzes here.
                  </p>
                </div>
              ) : studentQuizzesLoading ? (
                <div className="flex items-center justify-center gap-3 rounded-xl border border-gray-200/80 bg-white py-14 text-muted-foreground">
                  <Loader2 className="h-8 w-8 shrink-0 animate-spin" aria-hidden />
                  <span>Loading quizzes…</span>
                </div>
              ) : (
                <>
                  {studentQuizzesError ? (
                    <div className="rounded-lg border border-amber-200/90 bg-amber-50/90 px-3 py-2.5 text-sm text-amber-950">
                      {studentQuizzesError}
                    </div>
                  ) : null}
                  <p className="text-xs text-foreground/55 leading-relaxed">
                    Published quizzes for this class. Select <span className="font-medium text-foreground/70">Start</span> to
                    take a quiz on the full quiz page.
                  </p>
                  {studentQuizzes.length === 0 ? (
                    <div className="rounded-xl border border-gray-200/50 bg-white/80 p-8 text-center">
                      <ClipboardList className="mx-auto mb-3 h-12 w-12 text-foreground/30" aria-hidden />
                      <p className="text-foreground/60">
                        No quizzes available yet. Your instructor may add a practice quiz or placement test soon.
                      </p>
                    </div>
                  ) : (
                    <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 xl:grid-cols-3">
                      {studentQuizzes.map((quiz) => {
                        const completed = completedStudentQuizIds.has(quiz.id);
                        const isPlacement = (quiz.quizType ?? "QUIZ") === "PLACEMENT_TEST";
                        return (
                          <li
                            key={quiz.id}
                            className="flex h-full flex-col rounded-xl border border-gray-200/90 bg-gray-50/40 p-4 shadow-sm ring-1 ring-gray-900/[0.03]"
                          >
                            <div className="mb-3 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#1e40af]/10 ring-1 ring-[#1e40af]/15">
                              <ClipboardList className="h-5 w-5 text-[#1e40af]" aria-hidden />
                            </div>
                            <div className="min-h-0 flex-1 space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold leading-snug text-foreground line-clamp-2">{quiz.title}</p>
                                {completed ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                                    Done
                                  </span>
                                ) : null}
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                <span
                                  className={`rounded-full px-2 py-0.5 font-semibold uppercase tracking-wide ${
                                    isPlacement ? "bg-violet-100 text-violet-900" : "bg-slate-100 text-slate-800"
                                  }`}
                                >
                                  {isPlacement ? "Placement" : "Quiz"}
                                </span>
                                <span className="tabular-nums">
                                  {quiz.questions.length} question{quiz.questions.length === 1 ? "" : "s"}
                                </span>
                              </div>
                            </div>
                            <div className="mt-4 flex shrink-0 flex-wrap gap-2 border-t border-gray-200/80 pt-3">
                              {completed ? (
                                <span className="text-sm font-medium text-muted-foreground">Completed</span>
                              ) : (
                                <Button className="rounded-full" style={{ backgroundColor: "#3954d0" }} asChild>
                                  <Link
                                    to={`/dashboard/quiz?courseId=${encodeURIComponent(String(course.id))}`}
                                    aria-label={`Start quiz: ${quiz.title}`}
                                  >
                                    Start
                                  </Link>
                                </Button>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="attendance" className="mt-0">
              {!isEnrolled ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
                  Enroll in this class first to access attendance records and session check-ins.
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="flex items-start gap-3.5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-zinc-200/80 bg-zinc-50 text-[#3954d0] ring-1 ring-zinc-100/80">
                      <QrCode className="size-5" aria-hidden />
                    </span>
                    <div className="min-w-0 pt-0.5">
                      <h2
                        className="text-base font-semibold tracking-tight text-zinc-900"
                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                      >
                        Session check-ins
                      </h2>
                      <p className="mt-1 max-w-xl text-sm leading-relaxed text-zinc-600">
                        When class starts, tap <span className="font-medium text-zinc-800">Scan QR</span> and point
                        your camera at the code on screen. Check-in is only available for schedule months you have
                        paid tuition for.
                      </p>
                    </div>
                  </div>

                  {attendanceTuitionBlock ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                      <p>{attendanceTuitionBlock}</p>
                      <Link
                        to={installmentPaymentHref}
                        className="mt-2 inline-block font-semibold text-[#3954d0] underline-offset-2 hover:underline"
                      >
                        Pay remaining month
                      </Link>
                    </div>
                  ) : null}

                  {attendanceTableRows.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 px-5 py-10 text-center">
                      <QrCode className="mx-auto size-8 text-zinc-300" aria-hidden />
                      <p className="mt-3 text-sm font-medium text-zinc-800">No check-ins yet</p>
                      <p className="mt-1 text-sm text-zinc-500">
                        Sessions you scan into will appear in the list below.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-slate-200/90 bg-white shadow-[0_2px_8px_-2px_rgba(15,23,42,0.06)] ring-1 ring-slate-900/[0.04] overflow-hidden">
                      <Table className="text-sm">
                        <TableHeader>
                          <TableRow className="border-0 bg-gradient-to-r from-slate-50 via-slate-50 to-blue-50/30 hover:from-slate-50 hover:via-slate-50 hover:to-blue-50/30">
                            <TableHead className="h-12 min-w-[140px] border-0 pl-5 pr-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                              Class
                            </TableHead>
                            <TableHead className="h-12 min-w-[120px] border-0 px-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                              Lecturer
                            </TableHead>
                            <TableHead className="h-12 border-0 px-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                              Meeting
                            </TableHead>
                            <TableHead className="h-12 border-0 pl-3 pr-5 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500 whitespace-nowrap">
                              Checked in
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {attendanceTableRows.map((row, idx) => {
                            const dt = new Date(row.checkedAt);
                            return (
                              <TableRow
                                key={row.key}
                                className={`border-slate-100 transition-colors hover:bg-slate-50/70 ${idx === attendanceTableRows.length - 1 ? "border-0" : ""}`}
                              >
                                <TableCell className="border-0 py-4 pl-5 pr-3 align-middle">
                                  <p className="max-w-[220px] font-medium leading-snug text-slate-800 line-clamp-2">
                                    {course.title}
                                  </p>
                                </TableCell>
                                <TableCell className="border-0 py-4 px-3 align-middle text-slate-700">
                                  <p className="max-w-[200px] leading-snug line-clamp-2">
                                    {formatDisplayPersonName(course.instructor)}
                                  </p>
                                </TableCell>
                                <TableCell className="border-0 py-4 px-3 align-middle">
                                  <p className="max-w-[200px] font-medium leading-snug text-slate-900 line-clamp-2">
                                    {formatStudentAttendanceMeetingLabel(row.meetingName)}
                                  </p>
                                </TableCell>
                                <TableCell className="border-0 py-4 pl-3 pr-5 align-middle text-right">
                                  <div className="flex flex-col items-end gap-0.5">
                                    <span className="inline-flex items-center gap-1.5 text-sm font-medium tabular-nums text-slate-800">
                                      <Clock className="hidden h-3.5 w-3.5 text-slate-400 sm:block" aria-hidden />
                                      {dt.toLocaleTimeString(undefined, {
                                        hour: "numeric",
                                        minute: "2-digit",
                                      })}
                                    </span>
                                    <span className="text-xs tabular-nums text-slate-500">
                                      {dt.toLocaleDateString(undefined, {
                                        weekday: "short",
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                      })}
                                    </span>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="photos" className="mt-0 space-y-4">
              <div>
                <h2
                  className="text-base font-semibold tracking-tight text-zinc-900"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  Class photos
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-zinc-600">
                  Photos your instructor shares of the space, materials, or sessions.
                </p>
              </div>
              {classPhotoUrls.length > 0 ? (
                <ul
                  className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3"
                  aria-label="Class photo gallery"
                >
                  {classPhotoUrls.slice(0, MAX_CLASS_PHOTOS).map((url, i) => (
                    <li
                      key={`${url}-${i}`}
                      className="aspect-[4/3] overflow-hidden rounded-xl bg-zinc-100 ring-1 ring-zinc-200/80"
                    >
                      <img
                        src={url}
                        alt={`Class photo ${i + 1}`}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <div>
                  <ul
                    className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3"
                    aria-label="Class photo gallery (empty slots)"
                  >
                    {Array.from({ length: MAX_CLASS_PHOTOS }, (_, i) => (
                      <li
                        key={`class-photo-placeholder-${i}`}
                        className="aspect-[4/3] overflow-hidden rounded-xl border border-dashed border-zinc-200 bg-zinc-50 ring-1 ring-zinc-200/70"
                      >
                        <div
                          className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-100/90 to-zinc-50/90"
                          aria-hidden
                        >
                          <Images className="h-7 w-7 text-zinc-300/90" />
                        </div>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-xs text-foreground/55">
                    No photos yet. Your instructor can add up to eight images; they will replace these
                    placeholders.
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
                </div>

                  </div>

                  <aside className="min-w-0 lg:col-span-4 lg:sticky lg:top-6 lg:z-10 lg:self-start lg:h-fit">
                    <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 ring-1 ring-zinc-100/80">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h2 className="text-base font-semibold tracking-tight text-foreground">Upcoming Schedule</h2>
                        <p className="text-xs text-foreground/55">This class</p>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-zinc-600">
                        Class period and the approved class schedule. Pick a month below to see every session planned
                        for that part of the term.
                      </p>

                      {hasScheduleSummary ? (
                        <div className="mt-4 space-y-3">
                          {hasClassDateRange ? (
                            <div className="rounded-2xl border border-zinc-100 bg-zinc-50/60 px-3 py-2.5">
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Class period</p>
                              <p className="mt-1 flex items-start gap-1.5 text-sm font-medium leading-snug text-zinc-900">
                                <CalendarRange className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#3954d0]" aria-hidden />
                                <span>
                                  {classStartLabel && classEndLabel
                                    ? `${classStartLabel} → ${classEndLabel}`
                                    : classStartLabel
                                      ? `Starts ${classStartLabel}`
                                      : classEndLabel
                                        ? `Ends ${classEndLabel}`
                                        : ""}
                                </span>
                              </p>
                            </div>
                          ) : null}
                          {totalSessionsCount != null ? (
                            <div className="rounded-2xl border border-zinc-100 bg-zinc-50/60 px-3 py-2.5">
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Scheduled sessions</p>
                              <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-zinc-900">
                                <CalendarDays className="h-3.5 w-3.5 shrink-0 text-[#3954d0]" aria-hidden />
                                {totalSessionsCount}
                                {adminScheduleMonthCount > 0 ? (
                                  <span className="font-normal text-zinc-500">
                                    {" "}
                                    across {adminScheduleMonthCount} month
                                    {adminScheduleMonthCount === 1 ? "" : "s"}
                                  </span>
                                ) : (
                                  <span className="font-normal text-zinc-500"> on your schedule</span>
                                )}
                              </p>
                            </div>
                          ) : null}
                          <StudentCourseScheduleMonthSelect
                            slots={allSessionSlots}
                            statusHint={scheduleStatusHint}
                            className="border-t border-zinc-100 pt-3"
                            access={scheduleMonthAccess}
                            enrollHref={enrollApplicationHref}
                            paidTuitionMonths={paidTuitionMonths}
                            paymentHref={installmentPaymentHref}
                            renderSession={(slot, idx) => (
                              <StudentSessionScheduleCard
                                slot={slot}
                                indexZeroBased={idx}
                                heldSlotKeys={scheduleAttendance.heldSlotKeys}
                                activeSlotKeys={scheduleAttendance.activeSlotKeys}
                              />
                            )}
                          />
                        </div>
                      ) : null}

                      {!hasScheduleSummary && (
                        <p className="mt-4 rounded-lg border border-dashed border-zinc-200 bg-zinc-50/70 px-3 py-2 text-xs text-zinc-600">
                          No fixed session times here yet.{" "}
                          <Link className="font-medium text-[#3954d0] underline-offset-2 hover:underline" to="/dashboard/schedule">
                            Full schedule
                          </Link>
                        </p>
                      )}

                      <Button asChild variant="outline" className="mt-4 w-full rounded-full">
                        <Link to="/dashboard/schedule">
                          <CalendarDays className="mr-2 h-4 w-4" aria-hidden />
                          View full schedule
                        </Link>
                      </Button>
                    </div>
                  </aside>
                </div>

              </div>
            </div>
          </header>

        </div>
      {createPortal(
        <footer className="fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-200/90 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
          <div className="flex w-full min-w-0 items-center justify-center px-4 py-3 sm:px-6">
            <Button
              type="button"
              className="h-10 w-full max-w-none rounded-xl border-0 px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#2f47b3] hover:text-white sm:px-5 disabled:opacity-60"
              style={{ backgroundColor: "#3954d0" }}
              onClick={openScanner}
              disabled={Boolean(attendanceTuitionBlock)}
              title={attendanceTuitionBlock ?? "Scan attendance QR"}
            >
              <Camera className="h-4 w-4" aria-hidden />
              Scan QR
            </Button>
          </div>
        </footer>,
        document.body,
      )}
      <Dialog
        open={scannerOpen}
        onOpenChange={(open) => {
          setScannerOpen(open);
          if (!open) {
            setScannerError(null);
            setScannerStatus("Align the QR code in the frame");
          }
        }}
      >
        <DialogContent className="gap-0 w-[calc(100%-2rem)] max-w-[calc(100%-2rem)] overflow-hidden rounded-2xl border-zinc-200/80 p-0 shadow-xl sm:w-full sm:max-w-md sm:rounded-2xl [&>button]:hidden sm:[&>button]:inline-flex sm:[&>button]:right-4 sm:[&>button]:top-4 sm:[&>button]:rounded-full sm:[&>button]:border sm:[&>button]:border-zinc-200 sm:[&>button]:bg-white/90">
          <div className="border-b border-zinc-100 bg-gradient-to-b from-zinc-50/90 to-white px-6 pb-5 pt-6">
            <div className="flex items-start gap-3.5 sm:pr-8">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#3954d0]/10 text-[#3954d0] ring-1 ring-[#3954d0]/15">
                <QrCode className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-left text-base font-semibold tracking-tight text-zinc-900">
                  Check in with QR
                </DialogTitle>
                <DialogDescription className="mt-1.5 text-left text-sm leading-relaxed text-zinc-600">
                  Scan the code your instructor shows in class to record attendance for this session.
                </DialogDescription>
              </div>
            </div>
          </div>

          <div className="px-6 py-5">
            <div className="relative overflow-hidden rounded-2xl bg-zinc-950 ring-1 ring-zinc-900/10">
              <video
                ref={scannerVideoRef}
                className="aspect-[4/3] w-full rounded-2xl object-cover"
                playsInline
                muted
              />
              {!scannerCameraBlocked ? (
                <div className="pointer-events-none absolute inset-0" aria-hidden>
                  <div className="absolute inset-[10%] rounded-2xl border border-white/25 shadow-[inset_0_0_24px_rgba(0,0,0,0.35)]">
                    <span className="absolute left-0 top-0 h-7 w-7 rounded-tl-2xl border-l-[3px] border-t-[3px] border-[#3954d0]" />
                    <span className="absolute right-0 top-0 h-7 w-7 rounded-tr-2xl border-r-[3px] border-t-[3px] border-[#3954d0]" />
                    <span className="absolute bottom-0 left-0 h-7 w-7 rounded-bl-2xl border-b-[3px] border-l-[3px] border-[#3954d0]" />
                    <span className="absolute bottom-0 right-0 h-7 w-7 rounded-br-2xl border-b-[3px] border-r-[3px] border-[#3954d0]" />
                  </div>
                  {!scannerStatus.includes("Requesting") ? (
                    <div className="absolute inset-x-[10%] top-[10%] h-[80%] overflow-hidden rounded-2xl opacity-70">
                      <div className="absolute inset-x-6 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-[#3954d0] to-transparent motion-safe:animate-pulse" />
                    </div>
                  ) : null}
                </div>
              ) : null}
              {scannerCameraBlocked ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl bg-zinc-950/92 px-6 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/15 text-red-400 ring-1 ring-red-500/25">
                    <Camera className="h-6 w-6" aria-hidden />
                  </div>
                  <p className="text-sm font-medium text-white">Couldn&apos;t start the camera</p>
                  <p className="max-w-[240px] text-xs leading-relaxed text-zinc-400">{scannerError}</p>
                </div>
              ) : null}
            </div>

            <div
              className={cn(
                "mt-4 flex items-start gap-2.5 rounded-2xl px-3.5 py-3 text-sm leading-snug",
                scannerError
                  ? "bg-red-50 text-red-900 ring-1 ring-red-100"
                  : scannerStatus.includes("Requesting")
                    ? "bg-zinc-50 text-zinc-700 ring-1 ring-zinc-100"
                    : scannerStatus.includes("detected")
                      ? "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-100"
                      : "bg-blue-50/80 text-blue-950 ring-1 ring-blue-100",
              )}
            >
              {scannerStatus.includes("Requesting") ? (
                <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-zinc-500" aria-hidden />
              ) : (
                <Camera className="mt-0.5 h-4 w-4 shrink-0 text-[#3954d0]" aria-hidden />
              )}
              <p>{scannerCameraBlocked ? scannerStatus : (scannerError ?? scannerStatus)}</p>
            </div>

            <ul className="mt-4 space-y-2.5 text-xs leading-relaxed text-zinc-500">
              <li className="flex gap-2.5">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-300" aria-hidden />
                Hold your phone steady and keep the QR inside the frame.
              </li>
              <li className="flex gap-2.5">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-300" aria-hidden />
                On mobile, use Chrome or Safari over HTTPS so the camera can open.
              </li>
            </ul>
          </div>

          <div className="border-t border-zinc-100 bg-zinc-50/60 px-6 py-4">
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-full border-zinc-200"
              onClick={() => setScannerOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default StudentCourseDetail;
