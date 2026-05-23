import { useCallback, useEffect, useMemo, useState } from "react";
import type { ClassMeetingSlot, TeacherCourse } from "@/features/teacher/types";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  BarChart2,
  BookOpen,
  CalendarDays,
  ClipboardList,
  CheckCircle2,
  FileText,
  Loader2,
  Pencil,
  Plus,
  GraduationCap,
  QrCode,
  Trash2,
  UserPlus,
  Users,
} from "@/lib/icons";
import { toast } from "sonner";
import DashboardSidebar from "@/components/DashboardSidebar";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { eduhubAttendance, eduhubCourseQuizzes, eduhubCourses, eduhubClassResumes, eduhubSchedule, type QuizResponse } from "@/api/eduhubClient";
import {
  isLocalOnlyQuizId,
  mergeCourseQuizListsWithLocal,
  setLocalCourseQuizPublished,
} from "@/features/teacher/data/localCourseQuizzesStorage";
import type { CourseResponse, CourseStatus } from "@/api/eduhubTypes";
import { isUuid } from "@/api/utils";
import {
  pushSubstituteInviteNotifications,
} from "@/features/notifications/appNotificationStore";
import {
  substituteInviteWorkflowStore,
  type SubstituteInviteRecord,
  type SubstituteInviteStatus,
} from "@/features/teacher/data/substituteInviteWorkflowStore";
import { isAdminRegisteredLecturerEmail } from "@/features/teacher/data/knownLecturerEmails";
import { useAuthSession } from "@/features/auth/context";
import { TeacherAttendanceSessionPanel } from "@/features/teacher/components/TeacherAttendanceSessionPanel";
import { TeacherCourseGradesPanel } from "@/features/teacher/components/TeacherCourseGradesPanel";
import { teacherCoursesStore } from "@/features/teacher/data/teacherCoursesStore";
import {
  buildCourseScheduleSlotsForPicker,
  padMeetingSlotsForCourse,
  parseOptionalPositiveInt,
  resolveClassScheduleFormState,
} from "@/features/teacher/pages/teacherCourseFormHelpers";
import {
  ATTENDANCE_MEETINGS_CHANGED,
  ATTENDANCE_OVERVIEW_SESSION_SYNC,
  formatMeetingOptionLabel,
  loadStoredMeetings,
  meetingsStorageKey,
  pickStoredMeetingForScheduleSlot,
} from "@/features/teacher/attendance/attendanceMeetingsStorage";
import {
  ATTENDANCE_ROLL_BROADCAST,
  ATTENDANCE_ROLL_CHANGED,
  ATTENDANCE_ROLL_STORAGE_KEY,
  countPresentForSession,
  countSessionsStudentAttended,
  getPresentForStudent,
} from "@/features/attendance/attendanceRollStorage";
import type { ClassResumeResponse } from "@/api/eduhubTypes";
import { useTeacherClassChecklist } from "@/features/teacher/hooks/useTeacherClassChecklist";

function formatClassMeetingSlotLabel(slot: ClassMeetingSlot, index: number): string {
  const title = slot.title?.trim() || `Session ${index + 1}`;
  const date = slot.sessionDate?.trim();
  const time = slot.sessionTime?.trim();
  const tail = [date, time].filter(Boolean).join(" ");
  return tail ? `${title} · ${tail}` : title;
}

/** Latest planned session by calendar date (ties: higher row index). */
function lastPlannedScheduleSlotIndex(slots: ClassMeetingSlot[]): number | null {
  if (!slots.length) return null;
  const scored = slots
    .map((slot, i) => ({
      i,
      t: new Date(slot.sessionDate?.trim() ?? "").getTime(),
    }))
    .filter((x) => Number.isFinite(x.t) && !Number.isNaN(x.t));
  if (scored.length) {
    scored.sort((a, b) => (b.t !== a.t ? b.t - a.t : b.i - a.i));
    return scored[0].i;
  }
  for (let idx = slots.length - 1; idx >= 0; idx--) {
    const s = slots[idx];
    if (s?.title?.trim() || s?.sessionTime?.trim()) return idx;
  }
  return slots.length - 1;
}

function dispatchAttendanceOverviewSessionSync(courseId: string, sessionId: string) {
  window.dispatchEvent(
    new CustomEvent(ATTENDANCE_OVERVIEW_SESSION_SYNC, { detail: { courseId, sessionId } }),
  );
}

const ACTIVE_SUBSTITUTE_INVITE_STATUSES: SubstituteInviteStatus[] = [
  "approved",
  "pending_admin_approval",
  "pending_primary_approval",
  "pending_substitute_response",
];

function isActiveSubstituteInviteStatus(s: SubstituteInviteStatus): boolean {
  return ACTIVE_SUBSTITUTE_INVITE_STATUSES.includes(s);
}

function pickHighestSubstituteInvite(invites: SubstituteInviteRecord[]): SubstituteInviteRecord | undefined {
  const order: SubstituteInviteStatus[] = [
    "approved",
    "pending_admin_approval",
    "pending_primary_approval",
    "pending_substitute_response",
  ];
  for (const st of order) {
    const hit = invites.find((r) => r.status === st);
    if (hit) return hit;
  }
  return invites[0];
}

function substituteCoverChipLabel(status: SubstituteInviteStatus): string {
  switch (status) {
    case "approved":
      return "Substitute cover";
    case "pending_admin_approval":
      return "Cover · admin";
    case "pending_primary_approval":
      return "Cover · instructor";
    case "pending_substitute_response":
      return "Cover · substitute";
    default:
      return "Substitute cover";
  }
}

function substituteCoverChipClass(status: SubstituteInviteStatus): string {
  if (status === "approved") {
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

/** Example cards on the Quiz tab when this class has no quizzes yet (preview only, not saved). */
const QUIZ_TAB_DUMMY_EXAMPLES: {
  id: string;
  title: string;
  kind: "quiz" | "placement";
  published: boolean;
  questions: number;
}[] = [
  { id: "__demo_quiz_1", title: "Week 1 — Concept check", kind: "quiz", published: true, questions: 8 },
  { id: "__demo_quiz_2", title: "Course placement assessment", kind: "placement", published: false, questions: 12 },
  { id: "__demo_quiz_3", title: "Session wrap-up", kind: "quiz", published: false, questions: 5 },
];

const TEACHER_COURSE_TABS = ["roster", "schedule", "resume", "quiz", "attendance", "grades"] as const;
type TeacherCourseTab = (typeof TEACHER_COURSE_TABS)[number];

function isTeacherCourseTab(t: string | null): t is TeacherCourseTab {
  return (
    t === "roster" ||
    t === "schedule" ||
    t === "resume" ||
    t === "quiz" ||
    t === "attendance" ||
    t === "grades"
  );
}

function isCourseQuizListPermissionError(message: string): boolean {
  return /access denied|don'?t have permission|permission/i.test(message);
}

export default function TeacherCourseRosterPage() {
  const { courseId = "" } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useAuthSession();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [substituteOpen, setSubstituteOpen] = useState(false);
  const [substituteEmail, setSubstituteEmail] = useState("");
  const [substituteSessionSlotKey, setSubstituteSessionSlotKey] = useState("");
  const [substituteMessage, setSubstituteMessage] = useState("");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem("sidebarCollapsed") === "true";
  });

  useEffect(() => {
    const check = () => setIsSidebarCollapsed(localStorage.getItem("sidebarCollapsed") === "true");
    check();
    const id = setInterval(check, 100);
    return () => clearInterval(id);
  }, []);

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
  const [workflowTick, setWorkflowTick] = useState(0);
  useEffect(() => {
    const fn = () => setWorkflowTick((t) => t + 1);
    window.addEventListener("eduhub.substituteInviteWorkflow.changed", fn);
    return () => window.removeEventListener("eduhub.substituteInviteWorkflow.changed", fn);
  }, []);

  const substituteCanAccess = useMemo(() => {
    void workflowTick;
    if (!courseId || !userEmailNorm) return false;
    return substituteInviteWorkflowStore.isApprovedSubstituteForCourse(courseId, userEmailNorm);
  }, [courseId, userEmailNorm, workflowTick]);

  const isApiCourseLecturer = Boolean(
    apiCourseQuery.data && apiCourseQuery.data.lecturer?.id === user.id,
  );

  const isSubstituteViewer = Boolean(
    apiCourseQuery.data && substituteCanAccess && !isApiCourseLecturer,
  );

  const approvedSubstituteInviteRow = useMemo(() => {
    void workflowTick;
    if (!courseId || !userEmailNorm) return undefined;
    return substituteInviteWorkflowStore.findApprovedInviteAsSubstitute(courseId, userEmailNorm);
  }, [courseId, userEmailNorm, workflowTick]);

  const approvedCoverAsPrimaryRow = useMemo(() => {
    void workflowTick;
    if (!courseId || !userEmailNorm || !isApiCourseLecturer) return undefined;
    return substituteInviteWorkflowStore.findApprovedInviteAsPrimary(courseId, userEmailNorm);
  }, [courseId, userEmailNorm, workflowTick, isApiCourseLecturer]);

  const courseLeadDisplayName = useMemo(() => {
    const apiName = apiCourseQuery.data?.lecturer?.fullName?.trim();
    if (apiName) return apiName;
    return approvedSubstituteInviteRow?.primaryInstructorName?.trim() || "Course lead";
  }, [apiCourseQuery.data?.lecturer?.fullName, approvedSubstituteInviteRow?.primaryInstructorName]);

  const courseLeadEmail = apiCourseQuery.data?.lecturer?.email?.trim();

  const localCourse =
    !isUuid(courseId) && courseId ? teacherCoursesStore.getById(courseId) : undefined;

  const courseMeta =
    apiCourseQuery.data != null
      ? {
          id: apiCourseQuery.data.id,
          title: apiCourseQuery.data.title,
          status: apiCourseQuery.data.status,
          allowed: isApiCourseLecturer || substituteCanAccess,
        }
      : localCourse
        ? {
            id: localCourse.id,
            title: localCourse.title,
            status: localCourse.status,
            allowed: true,
          }
        : null;

  const teacherChecklist = useTeacherClassChecklist(courseMeta?.id ?? courseId);

  /** Server roster is lecturer-scoped today; substitutes must not call it or the API returns forbidden and shows a scary error. */
  const studentsQuery = useQuery({
    queryKey: ["teacher", "roster", "students", courseId],
    queryFn: () => eduhubCourses.getEnrolledStudents(courseId, 0, 100),
    enabled:
      Boolean(courseId) &&
      isUuid(courseId) &&
      apiCourseQuery.isSuccess &&
      isApiCourseLecturer,
  });

  const courseQuizzesQuery = useQuery({
    queryKey: ["teacher", "roster", "courseQuizzes", courseId],
    queryFn: async (): Promise<{ quizzes: QuizResponse[]; fetchNote?: string }> => {
      try {
        const quizzes = await eduhubCourseQuizzes.list(courseId);
        return { quizzes: mergeCourseQuizListsWithLocal(courseId, quizzes) };
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        if (isCourseQuizListPermissionError(msg)) throw e;
        console.warn("[TeacherCourseRoster] course quizzes list failed:", courseId, e);
        const merged = mergeCourseQuizListsWithLocal(courseId, []);
        return {
          quizzes: merged,
          fetchNote: msg.trim()
            ? `Quiz list could not be loaded (${msg}). Quizzes you save on this device still appear below; sync with the server when the API is available.`
            : "Quiz list could not be loaded. Quizzes you save on this device still appear below.",
        };
      }
    },
    enabled: Boolean(courseId) && isUuid(courseId) && isApiCourseLecturer,
    retry: 1,
  });

  const [quizPublishingId, setQuizPublishingId] = useState<string | null>(null);
  const handlePublishQuiz = useCallback(
    async (quizId: string) => {
      if (!isUuid(courseId)) return;
      setQuizPublishingId(quizId);
      try {
        if (isLocalOnlyQuizId(quizId)) {
          setLocalCourseQuizPublished(courseId, quizId, true);
          await queryClient.invalidateQueries({ queryKey: ["teacher", "roster", "courseQuizzes", courseId] });
          toast.success("Published on this device");
        } else {
          await eduhubCourseQuizzes.publish(courseId, quizId);
          await queryClient.invalidateQueries({ queryKey: ["teacher", "roster", "courseQuizzes", courseId] });
          toast.success("Quiz published");
        }
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
    if (!isUuid(courseId)) return teacherCoursesStore.getById(courseId);
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

  const scheduleSubstituteCoverage = useMemo(() => {
    void workflowTick;
    const empty = {
      wholeClass: [] as SubstituteInviteRecord[],
      bySlotIndex: new Map<number, SubstituteInviteRecord[]>(),
    };
    if (!courseId) return empty;

    const rows = substituteInviteWorkflowStore
      .listAll()
      .filter((r) => r.courseId === courseId && isActiveSubstituteInviteStatus(r.status));

    const wholeClass = rows.filter((r) => !r.sessionNote?.trim());
    const keyed = rows.filter((r) => r.sessionNote?.trim());
    const bySlotIndex = new Map<number, SubstituteInviteRecord[]>();
    const slots = rosterScheduleView.slots;
    for (const inv of keyed) {
      const note = inv.sessionNote.trim();
      slots.forEach((slot, i) => {
        if (formatClassMeetingSlotLabel(slot, i).trim() === note) {
          const arr = bySlotIndex.get(i) ?? [];
          arr.push(inv);
          bySlotIndex.set(i, arr);
        }
      });
    }
    return { wholeClass, bySlotIndex };
  }, [courseId, workflowTick, rosterScheduleView.slots]);

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
  const substituteViewerSchedule = useMemo((): null | { kind: "empty" } | { kind: "whole"; invite: SubstituteInviteRecord } | { kind: "rows"; rows: { index: number; slot: ClassMeetingSlot }[] } => {
    if (!isSubstituteViewer) return null;
    void workflowTick;
    if (!courseId || !userEmailNorm) return { kind: "empty" };
    const invites = substituteInviteWorkflowStore
      .listAll()
      .filter(
        (r) =>
          r.courseId === courseId &&
          r.substituteEmailNorm === userEmailNorm &&
          isActiveSubstituteInviteStatus(r.status),
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
  }, [isSubstituteViewer, courseId, userEmailNorm, workflowTick, rosterScheduleView.slots]);

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

  const courseThumbnailUrl = useMemo(() => {
    const raw = scheduleSourceCourse?.thumbnailUrl;
    const t = typeof raw === "string" ? raw.trim() : "";
    return t || undefined;
  }, [scheduleSourceCourse]);

  const [overviewSessionId, setOverviewSessionId] = useState<string | null>(null);
  const [attendanceScheduleFilter, setAttendanceScheduleFilter] = useState("latest-qr");
  const [attendanceUiKey, setAttendanceUiKey] = useState(0);
  const tabFromUrl = searchParams.get("tab");
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
    const onStorage = (e: StorageEvent) => {
      if (!e.key) return;
      if (e.key === ATTENDANCE_ROLL_STORAGE_KEY) bump();
      if (courseMeta?.id && e.key === meetingsStorageKey(courseMeta.id)) bump();
    };
    const onFocus = () => bump();
    const onVis = () => {
      if (document.visibilityState === "visible") bump();
    };
    window.addEventListener(ATTENDANCE_ROLL_CHANGED, bump);
    window.addEventListener(ATTENDANCE_MEETINGS_CHANGED, bump);
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener(ATTENDANCE_ROLL_CHANGED, bump);
      window.removeEventListener(ATTENDANCE_MEETINGS_CHANGED, bump);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [courseMeta?.id]);

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined" || !courseMeta?.id) return;
    const bump = () => setAttendanceUiKey((k) => k + 1);
    const bc = new BroadcastChannel(ATTENDANCE_ROLL_BROADCAST);
    bc.onmessage = (ev: MessageEvent) => {
      const d = ev.data as { type?: string; courseId?: string } | undefined;
      if (d?.type === "check-in" && d.courseId === courseMeta.id) bump();
    };
    return () => bc.close();
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

  const overviewMeetingLabel = useMemo(() => {
    if (!courseMeta?.id || !overviewSessionId) return null;
    void attendanceUiKey;
    const m = loadStoredMeetings(courseMeta.id).find((x) => x.sessionId === overviewSessionId);
    return m ? formatMeetingOptionLabel(m) : null;
  }, [courseMeta?.id, overviewSessionId, attendanceUiKey]);

  const attendanceRosterQuery = useQuery({
    queryKey: ["teacher", "attendance-roster", courseMeta?.id, overviewSessionId, attendanceUiKey],
    queryFn: () => eduhubAttendance.roster(courseMeta!.id, overviewSessionId!),
    enabled: Boolean(courseMeta?.id && overviewSessionId && isUuid(overviewSessionId)),
  });

  const attendanceRosterByStudent = useMemo(() => {
    const rows = attendanceRosterQuery.data?.rows ?? [];
    return new Map(rows.map((row) => [row.studentId, row]));
  }, [attendanceRosterQuery.data?.rows]);

  useEffect(() => {
    setAttendanceScheduleFilter("latest-qr");
  }, [courseMeta?.id]);

  const applyAttendanceScheduleFilter = useCallback(
    (value: string) => {
      if (!courseMeta?.id) return;
      const cid = courseMeta.id;
      const meetings = loadStoredMeetings(cid);
      const slots = rosterScheduleView.slots;

      let picked = null as ReturnType<typeof pickStoredMeetingForScheduleSlot>;
      if (value === "latest-qr") {
        picked = meetings[0] ?? null;
      } else if (value === "last-scheduled") {
        const idx = lastPlannedScheduleSlotIndex(slots);
        if (idx != null && slots[idx]) {
          const slot = slots[idx];
          picked = pickStoredMeetingForScheduleSlot(
            meetings,
            formatClassMeetingSlotLabel(slot, idx),
            slot.sessionDate,
          );
        }
      } else if (value.startsWith("slot-")) {
        const idx = Number.parseInt(value.slice("slot-".length), 10);
        if (!Number.isNaN(idx) && slots[idx]) {
          const slot = slots[idx];
          picked = pickStoredMeetingForScheduleSlot(
            meetings,
            formatClassMeetingSlotLabel(slot, idx),
            slot.sessionDate,
          );
        }
      }

      setAttendanceScheduleFilter(value);

      if (picked) {
        setOverviewSessionId(picked.sessionId);
        dispatchAttendanceOverviewSessionSync(cid, picked.sessionId);
        return;
      }

      if (value === "latest-qr" && meetings.length === 0) {
        toast.info("No QR meetings yet — generate check-in in Class meeting check-in above.");
        return;
      }
      if (value !== "latest-qr") {
        toast.info(
          "No saved meeting matches that schedule row yet. Generate a QR for that class day, or pick the meeting manually in Class meeting check-in.",
          { duration: 6500 },
        );
      }
    },
    [courseMeta?.id, rosterScheduleView.slots],
  );

  const handleDelete = async (id: string) => {
    if (isUuid(id)) {
      try {
        await eduhubCourses.delete(id);
      } catch {
        return;
      }
    } else {
      teacherCoursesStore.delete(id);
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

  const handleSubmitSubstituteInvite = () => {
    if (!courseMeta) return;
    const email = substituteEmail.trim();
    if (!inviterEmailNorm) {
      toast.error("Your account needs an email to send this invite.");
      return;
    }
    if (!email) {
      toast.error("Enter the substitute lecturer's email.");
      return;
    }
    if (email.toLowerCase() === inviterEmailNorm) {
      toast.error("Use another instructor's email — not your own.");
      return;
    }
    if (!isAdminRegisteredLecturerEmail(email)) {
      toast.error("That email is not on the admin lecturer list (demo).", {
        description: "Ask your admin to register the lecturer (Add user role), then invite using that work email.",
      });
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
    if (substituteSessionSlotKey.startsWith("slot-")) {
      const idx = Number.parseInt(substituteSessionSlotKey.slice("slot-".length), 10);
      if (!Number.isNaN(idx) && scheduleSlots[idx]) {
        sessionNoteFromSchedule = formatClassMeetingSlotLabel(scheduleSlots[idx], idx);
        sessionSlotKeyToSave = substituteSessionSlotKey;
      }
    }

    const record = substituteInviteWorkflowStore.create({
      courseId: courseMeta.id,
      courseTitle: courseMeta.title,
      sessionNote: sessionNoteFromSchedule,
      sessionSlotKey: sessionSlotKeyToSave,
      message: substituteMessage.trim(),
      primaryInstructorName: user.name?.trim() || "Instructor",
      primaryInstructorEmailNorm: inviterEmailNorm,
      substituteEmailNorm: email.toLowerCase(),
    });
    pushSubstituteInviteNotifications(record);
    toast.success("Substitute invite recorded", {
      description: "The substitute must accept, then you approve. Check instructor notifications (demo).",
    });
    setSubstituteOpen(false);
    setSubstituteEmail("");
    setSubstituteSessionSlotKey("");
    setSubstituteMessage("");
  };

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <DashboardSidebar />
      <main
        className={`min-h-[calc(100dvh-4rem)] lg:min-h-dvh pt-16 lg:pt-0 pb-20 transition-all duration-300 ${isSidebarCollapsed ? "lg:pl-20" : "lg:pl-64"}`}
      >
        <header
          className={`fixed z-40 flex min-h-[4.5625rem] items-center border-b border-gray-100 bg-white transition-all duration-300 ${
            isSidebarCollapsed ? "lg:left-20" : "lg:left-64"
          } left-0 right-0 top-16 lg:top-0`}
        >
          <div className="container mx-auto flex w-full flex-wrap items-center justify-between gap-x-3 gap-y-2 px-6">
            <Link
              to="/dashboard/teacher/courses"
              className="inline-flex shrink-0 items-center gap-2 text-sm font-medium text-foreground/75 hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" />
              Back to My Class
            </Link>
            {courseMeta ? (
              <div className="flex min-w-0 max-w-full flex-wrap items-center justify-end gap-2 sm:flex-nowrap">
                {isUuid(courseId) && courseMeta.status === "DRAFT" ? (
                  <span
                    className="max-w-[140px] shrink-0 rounded-md border border-amber-200/90 bg-amber-50 px-2.5 py-1 text-center text-xs font-medium leading-tight text-amber-900"
                    title="An admin will set the price and publish this class."
                  >
                    Awaiting admin approval
                  </span>
                ) : null}
                {!isSubstituteViewer && isUuid(courseId) && courseMeta.status !== "DRAFT" ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    className={`h-8 w-8 shrink-0 rounded-full border border-gray-200 bg-white hover:bg-gray-100 ${
                      courseMeta.status === "ARCHIVED"
                        ? "text-amber-600 hover:text-amber-700"
                        : "text-orange-600 hover:text-orange-700"
                    }`}
                    disabled={publishingId === courseMeta.id}
                    title={courseMeta.status === "ARCHIVED" ? "Unarchive" : "Archive"}
                    onClick={() => handleArchive(courseMeta.id)}
                  >
                    {courseMeta.status === "ARCHIVED" ? (
                      <ArchiveRestore className="h-3.5 w-3.5 shrink-0" />
                    ) : (
                      <Archive className="h-3.5 w-3.5 shrink-0" />
                    )}
                  </Button>
                ) : null}
                {!isSubstituteViewer ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    className="h-8 w-8 shrink-0 rounded-full border border-gray-200 bg-white text-muted-foreground hover:bg-gray-100 hover:text-red-600"
                    title="Delete class"
                    onClick={() => setDeleteId(courseMeta.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 shrink-0" />
                  </Button>
                ) : null}
                {!isSubstituteViewer ? (
                  <Button asChild variant="outline" className="h-8 shrink-0 rounded-full gap-1.5 px-4">
                    <Link
                      to={`/dashboard/teacher/courses/${courseMeta.id}/edit`}
                      className="inline-flex items-center justify-center gap-1.5"
                      title="Edit class content"
                    >
                      <Pencil className="h-3.5 w-3.5 shrink-0" />
                      Edit class content
                    </Link>
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
        </header>

        <div className="pt-[4.5625rem]">
          {!courseId ? (
            <div className="container mx-auto px-6">
              <p className="text-sm text-red-600">Missing class.</p>
            </div>
          ) : loadingCourse ? (
            <div className="container mx-auto px-6">
              <p className="text-sm text-foreground/60">Loading class…</p>
            </div>
          ) : forbidden ? (
            <div className="container mx-auto px-6">
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-6 text-sm text-amber-900">
                You don&apos;t have access to this class roster.
              </div>
            </div>
          ) : apiCourseQuery.isError && isUuid(courseId) ? (
            <div className="container mx-auto px-6">
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-800">
                Could not load this class. It may have been removed or you may need to sign in again.
              </div>
            </div>
          ) : !courseMeta ? (
            <div className="container mx-auto px-6">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-700">
                Class not found.
              </div>
            </div>
          ) : (
            <>
              <div className="relative h-44 w-full overflow-hidden border-b border-gray-200/80 bg-gray-100 sm:h-52">
                {courseThumbnailUrl ? (
                  <img
                    src={courseThumbnailUrl}
                    alt={`${courseMeta.title} thumbnail`}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full min-h-0 items-center justify-center" aria-hidden>
                    <BookOpen className="h-12 w-12 text-gray-400/90" />
                  </div>
                )}
                <div
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-transparent"
                  aria-hidden
                />
              </div>

              <div className="container mx-auto px-6">
                <div className="w-full">
                  <div className="flex flex-col gap-4 pb-6 pt-6">
                    {isSubstituteViewer ? (
                      <div className="rounded-xl border border-sky-200/90 bg-sky-50/90 px-4 py-3 text-sm text-sky-950 leading-relaxed space-y-2">
                        <p>
                          <span className="font-semibold">You are viewing as substitute.</span>{" "}
                          <span className="text-sky-950/90">
                            Course lead (owns this class in the catalog):{" "}
                            <span className="font-semibold text-sky-950">{courseLeadDisplayName}</span>
                            {courseLeadEmail ? (
                              <span className="font-normal text-sky-950/80"> ({courseLeadEmail})</span>
                            ) : null}
                          </span>
                        </p>
                        <p className="text-sky-950/85">
                          You can use class resumes and local attendance (QR and this browser&apos;s check-ins). The
                          server enrollment list is only returned for the course lead today, so the Enrolled tab explains
                          that limitation. Catalog edits, deleting the class, and inviting another substitute stay with the
                          course lead. Demo access is tied to your approved invite; the API still lists the course lead as
                          lecturer until a backend assigns cover officially.
                        </p>
                      </div>
                    ) : null}
                    {!isSubstituteViewer && approvedCoverAsPrimaryRow ? (
                      <div className="rounded-xl border border-emerald-200/90 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-950 leading-relaxed">
                        <span className="font-semibold">You are the course lead.</span> Approved substitute{" "}
                        <span className="font-mono font-medium">{approvedCoverAsPrimaryRow.substituteEmailNorm}</span>{" "}
                        has demo access to this class page for resumes and local attendance. The server enrollment list
                        stays course-lead only until the API supports substitutes. Catalog-only actions remain yours.
                      </div>
                    ) : null}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {courseMeta.status ? (
                            <span
                              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium shadow-sm ${
                                courseMeta.status === "PUBLISHED"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {courseMeta.status}
                            </span>
                          ) : null}
                          <span className="text-xs text-foreground/55">
                            Students enrolled from the catalog appear below when the API returns roster data.
                          </span>
                        </div>
                        <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">{courseMeta.title}</h1>
                      </div>
                      {!isSubstituteViewer ? (
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full shrink-0 gap-2 rounded-full border-amber-200/90 bg-amber-50/60 text-amber-950 hover:bg-amber-50 sm:w-auto sm:self-start"
                          onClick={() => setSubstituteOpen(true)}
                        >
                          <UserPlus className="h-4 w-4 shrink-0" />
                          Invite Substitute
                        </Button>
                      ) : null}
                    </div>

                    {!isSubstituteViewer ? (
                      <p className="text-xs text-foreground/55 leading-relaxed sm:max-w-2xl">
                        Covers a session when you&apos;re unavailable. Enter the Substitute&apos;s{" "}
                        <span className="font-medium text-foreground/70">admin-registered lecturer email</span>. Demo:
                        in-app notifications only.
                      </p>
                    ) : null}
                  </div>

              <div className="pt-1">
              <Tabs
                value={activeTab}
                onValueChange={(v) => {
                  const t = v as TeacherCourseTab;
                  setActiveTab(t);
                  if (t === "roster") {
                    setSearchParams({}, { replace: true });
                  } else {
                    setSearchParams({ tab: t }, { replace: true });
                  }
                }}
                className="w-full"
              >
                <TabsList className="mb-6 h-11 w-full sm:w-auto justify-start bg-slate-100/90 p-1 rounded-xl border border-slate-200/80">
                  <TabsTrigger
                    value="roster"
                    className="rounded-lg px-4 gap-2 data-[state=active]:shadow-sm"
                  >
                    <Users className="h-4 w-4 shrink-0 opacity-70" />
                    Enrolled
                  </TabsTrigger>
                  <TabsTrigger
                    value="schedule"
                    className="rounded-lg px-4 gap-2 data-[state=active]:shadow-sm"
                  >
                    <CalendarDays className="h-4 w-4 shrink-0 opacity-70" />
                    Schedule
                  </TabsTrigger>
                  <TabsTrigger
                    value="resume"
                    className="rounded-lg px-4 gap-2 data-[state=active]:shadow-sm"
                  >
                    <FileText className="h-4 w-4 shrink-0 opacity-70" />
                    Resume
                  </TabsTrigger>
                  <TabsTrigger
                    value="quiz"
                    className="rounded-lg px-4 gap-2 data-[state=active]:shadow-sm"
                  >
                    <ClipboardList className="h-4 w-4 shrink-0 opacity-70" />
                    Quiz
                  </TabsTrigger>
                  <TabsTrigger
                    value="attendance"
                    className="rounded-lg px-4 gap-2 data-[state=active]:shadow-sm"
                  >
                    <QrCode className="h-4 w-4 shrink-0 opacity-70" />
                    Attendance
                  </TabsTrigger>
                  <TabsTrigger
                    value="grades"
                    className="rounded-lg px-4 gap-2 data-[state=active]:shadow-sm"
                  >
                    <GraduationCap className="h-4 w-4 shrink-0 opacity-70" />
                    Grades
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="roster" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
                  <h2 className="text-lg font-semibold text-foreground mb-1 flex items-center gap-2">
                    <Users className="h-5 w-5 text-[#1e40af]" />
                    Enrolled students
                  </h2>
                  <p className="text-sm text-foreground/60 mb-4">
                    Everyone signed up for this class in the platform. Local-only classes won&apos;t show rows until the
                    class exists on the server.
                    {apiCourseQuery.data?.classMeetingsInSixMonths != null ? (
                      <>
                        {" "}
                        This class is set to{" "}
                        <span className="font-medium text-foreground">
                          {apiCourseQuery.data.classMeetingsInSixMonths} sessions in 6 months
                        </span>{" "}
                        (from class settings); the table compares local check-ins to that target.
                      </>
                    ) : null}
                  </p>

                  {!isUuid(courseId) ? (
                    <p className="text-sm text-foreground/70 rounded-xl border border-dashed border-gray-200 bg-gray-50/50 px-4 py-8 text-center">
                      This class is stored only in your browser. Connect it to the API to load enrolled students here.
                    </p>
                  ) : isSubstituteViewer ? (
                    <div className="rounded-xl border border-amber-200/90 bg-amber-50/90 px-4 py-4 text-sm text-amber-950 leading-relaxed">
                      <p className="font-semibold text-amber-950">Enrollment list is not loaded for substitutes (API).</p>
                      <p className="mt-2 text-amber-950/90">
                        The server only returns <span className="font-medium">/courses/…/students</span> for the catalog
                        course lead. Your access here is from the approved substitute workflow (demo). Ask the course lead
                        for a roster export, or use attendance below with names you already know, until the backend grants
                        cover instructors roster read.
                      </p>
                    </div>
                  ) : studentsQuery.isLoading ? (
                    <p className="text-sm text-foreground/60">Loading students…</p>
                  ) : studentsQuery.isError ? (
                    <p className="text-sm text-red-600">
                      Could not load enrollment list. Check permissions or try again later.
                    </p>
                  ) : !studentsQuery.data?.length ? (
                    <p className="text-sm text-foreground/70 rounded-xl border border-dashed border-gray-200 bg-gray-50/50 px-4 py-8 text-center">
                      No students enrolled yet.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      <div className="rounded-xl border border-gray-200 bg-gray-50/30 overflow-hidden shadow-sm">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-50/90 hover:bg-slate-50/90">
                              <TableHead>Name</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead
                                className="text-right whitespace-nowrap min-w-[10rem]"
                                title="Check-ins recorded on this browser vs planned class meetings in six months (class settings)."
                              >
                                Sessions in 6 months *
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {studentsQuery.data.map((s) => {
                              void attendanceUiKey;
                              const planned = apiCourseQuery.data?.classMeetingsInSixMonths;
                              const attended = countSessionsStudentAttended(courseMeta.id, s.id, s.email);
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
                                  <TableCell className="font-medium text-foreground">{s.fullName}</TableCell>
                                  <TableCell className="text-muted-foreground">{s.email}</TableCell>
                                  <TableCell className="text-right text-sm">{sessionsCell}</TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                      <p className="text-xs text-muted-foreground px-0.5 leading-relaxed">
                        * <span className="font-medium text-foreground/80">Sessions in 6 months</span> is the planned
                        total from class settings (e.g. 32 class meetings). The first number is how many distinct sessions
                        this student checked into on this browser only — not synced across devices until an attendance API
                        exists.
                      </p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="schedule" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
                  <h2 className="text-lg font-semibold text-foreground mb-1 flex items-center gap-2">
                    <CalendarDays className="h-5 w-5 text-[#1e40af]" />
                    {isSubstituteViewer ? "Your cover on this class" : "Class schedule"}
                  </h2>
                  {isSubstituteViewer ? (
                    <p className="text-sm text-foreground/60 mb-4 max-w-2xl">
                      Only the session(s) you are covering appear here—not the course lead&apos;s full term calendar. Ask
                      them if you need other dates. Course lead:{" "}
                      <span className="font-medium text-foreground/80">{courseLeadDisplayName}</span>
                      {courseLeadEmail ? (
                        <span className="text-foreground/55"> ({courseLeadEmail})</span>
                      ) : null}
                      .
                    </p>
                  ) : (
                    <p className="text-sm text-foreground/60 mb-4 max-w-2xl">
                      Session plan from the catalog and, when present, the latest{" "}
                      <span className="font-medium text-foreground/75">admin proposal</span> from the server. Open{" "}
                      <Link
                        to="/dashboard/teacher/schedule"
                        className="font-medium text-[#3954d0] underline underline-offset-2 hover:text-[#2f46b3]"
                      >
                        Schedule approvals
                      </Link>{" "}
                      for every class, or use{" "}
                      <Link
                        to={`/dashboard/teacher/courses/${courseMeta.id}/edit/schedule`}
                        className="font-medium text-[#3954d0] underline underline-offset-2 hover:text-[#2f46b3]"
                      >
                        Edit class → Schedule
                      </Link>{" "}
                      for approve / request changes.
                    </p>
                  )}

                  {!isSubstituteViewer && apiCourseQuery.data?.scheduleRejectionNote ? (
                    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
                      <p className="font-medium">Schedule feedback on file</p>
                      <p className="mt-1 whitespace-pre-wrap">{apiCourseQuery.data.scheduleRejectionNote}</p>
                    </div>
                  ) : null}

                  {!isSubstituteViewer ? (
                    <>
                      {(() => {
                        const st = apiCourseQuery.data?.status as CourseStatus | undefined;
                        const pill = scheduleStatusPill(st);
                        return pill ? (
                          <div className="mb-4">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${pill.className}`}
                            >
                              {pill.label}
                            </span>
                          </div>
                        ) : null;
                      })()}

                      {formatCourseDateLabel(apiCourseQuery.data?.classStartDate) ||
                      formatCourseDateLabel(apiCourseQuery.data?.classEndDate) ? (
                        <p className="text-sm text-foreground/75 mb-4">
                          {formatCourseDateLabel(apiCourseQuery.data?.classStartDate) ? (
                            <>
                              Class window start:{" "}
                              <span className="font-medium text-foreground">
                                {formatCourseDateLabel(apiCourseQuery.data?.classStartDate)}
                              </span>
                            </>
                          ) : null}
                          {formatCourseDateLabel(apiCourseQuery.data?.classStartDate) &&
                          formatCourseDateLabel(apiCourseQuery.data?.classEndDate) ? (
                            <span className="text-foreground/40"> · </span>
                          ) : null}
                          {formatCourseDateLabel(apiCourseQuery.data?.classEndDate) ? (
                            <>
                              End:{" "}
                              <span className="font-medium text-foreground">
                                {formatCourseDateLabel(apiCourseQuery.data?.classEndDate)}
                              </span>
                            </>
                          ) : null}
                        </p>
                      ) : null}
                    </>
                  ) : null}

                  {isUuid(courseId) && isApiCourseLecturer && apiCourseQuery.data?.status === "SCHEDULE_PENDING" ? (
                    <div className="mb-5 flex flex-wrap gap-2">
                      <Button asChild className="rounded-full bg-emerald-700 hover:bg-emerald-800">
                        <Link to={`/dashboard/teacher/courses/${courseId}/edit/schedule`}>
                          Approve or request schedule changes
                        </Link>
                      </Button>
                    </div>
                  ) : null}

                  {!isSubstituteViewer && isUuid(courseId) && scheduleProposalQuery.isLoading ? (
                    <p className="text-sm text-foreground/60 mb-4">Loading latest admin schedule proposal…</p>
                  ) : null}

                  {isSubstituteViewer && substituteViewerSchedule ? (
                    <>
                      {substituteViewerSchedule.kind === "empty" ? (
                        <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50/60 px-6 py-10 text-center text-sm text-amber-950">
                          <p>We couldn&apos;t match an active substitute invite on this device to a schedule row.</p>
                          <p className="mt-2 text-xs text-amber-900/85">
                            Check that your sign-in email matches the invited substitute, or ask the course lead which
                            session you cover.
                          </p>
                        </div>
                      ) : substituteViewerSchedule.kind === "whole" ? (
                        <div className="rounded-xl border border-sky-200/90 bg-sky-50/90 px-5 py-4 text-sm text-sky-950 leading-relaxed">
                          <p className="font-semibold">Whole-class substitute cover</p>
                          <p className="mt-2 text-sky-950/90">
                            The course lead did not tie this cover to a single calendar row, so the full term schedule is
                            not listed here. Use your notifications and the lead for specific meeting dates.
                          </p>
                          <div className="mt-4 flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-medium text-sky-950 break-all">
                              {substituteViewerSchedule.invite.substituteEmailNorm}
                            </span>
                            <span
                              className={`inline-flex max-w-full shrink-0 items-center truncate rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${substituteCoverChipClass(substituteViewerSchedule.invite.status)}`}
                            >
                              {substituteCoverChipLabel(substituteViewerSchedule.invite.status)}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-sm font-medium text-foreground">
                            Session(s) you are covering:{" "}
                            <span className="tabular-nums text-foreground">{substituteViewerSchedule.rows.length}</span>
                          </p>
                          <div className="rounded-xl border border-gray-200 bg-gray-50/30 overflow-hidden shadow-sm">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-slate-50/90 hover:bg-slate-50/90">
                                  <TableHead className="w-14">#</TableHead>
                                  <TableHead>Session</TableHead>
                                  <TableHead
                                    className="min-w-[10rem] max-w-[14rem]"
                                    title="Your invited cover email and workflow status."
                                  >
                                    Your cover
                                  </TableHead>
                                  <TableHead className="whitespace-nowrap">Date</TableHead>
                                  <TableHead className="whitespace-nowrap">Time</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {substituteViewerSchedule.rows.map(({ index, slot }) => (
                                  <TableRow key={`sub-slot-${index}`}>
                                    <TableCell className="tabular-nums text-muted-foreground">{index + 1}</TableCell>
                                    <TableCell className="font-medium text-foreground text-sm">
                                      {slot.title?.trim() || `Session ${index + 1}`}
                                    </TableCell>
                                    <TableCell className="align-top text-sm">
                                      {(() => {
                                        const inv = substituteInviteForScheduleRow(index);
                                        if (!inv) {
                                          return <span className="text-muted-foreground">—</span>;
                                        }
                                        return (
                                          <div className="flex min-w-0 flex-col gap-1.5">
                                            <span
                                              className="font-mono text-xs font-medium text-foreground break-all"
                                              title="Your work email on this cover"
                                            >
                                              {inv.substituteEmailNorm}
                                            </span>
                                            <span
                                              className={`inline-flex w-fit max-w-full shrink-0 items-center truncate rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${substituteCoverChipClass(inv.status)}`}
                                            >
                                              {substituteCoverChipLabel(inv.status)}
                                            </span>
                                          </div>
                                        );
                                      })()}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                      {slot.sessionDate?.trim() || "—"}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                      {slot.sessionTime?.trim() || "—"}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                          <p className="text-xs text-muted-foreground px-0.5 leading-relaxed">
                            Other sessions in this class are hidden on purpose. The course lead still sees the full
                            schedule.
                          </p>
                        </div>
                      )}
                    </>
                  ) : rosterScheduleView.slots.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 px-6 py-10 text-center text-sm text-foreground/70">
                      <p>No session rows yet. When an admin proposes dates and times, they will show here.</p>
                      {isUuid(courseId) ? (
                        <p className="mt-3 text-xs text-foreground/55">
                          Tip: local demo proposals saved in this browser are merged when the API does not return slot
                          details yet (same logic as the class edit schedule step).
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {rosterScheduleView.mode === "proposal" && rosterScheduleView.proposedByName ? (
                        <p className="text-xs text-foreground/60">
                          Admin proposal from{" "}
                          <span className="font-medium text-foreground/80">{rosterScheduleView.proposedByName}</span>.
                        </p>
                      ) : null}
                      <p className="text-sm font-medium text-foreground">
                        Planned sessions (six-month window):{" "}
                        <span className="tabular-nums text-foreground">
                          {Math.max(rosterScheduleView.sessionsCount, rosterScheduleView.slots.length) || rosterScheduleView.slots.length}
                        </span>
                      </p>
                      <div className="rounded-xl border border-gray-200 bg-gray-50/30 overflow-hidden shadow-sm">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-50/90 hover:bg-slate-50/90">
                              <TableHead className="w-14">#</TableHead>
                              <TableHead>Session</TableHead>
                              <TableHead className="min-w-[10rem] max-w-[14rem]" title="Lecturer invited when the course lead cannot run this session (demo workflow).">
                                Substitute instructor
                              </TableHead>
                              <TableHead className="whitespace-nowrap">Date</TableHead>
                              <TableHead className="whitespace-nowrap">Time</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {rosterScheduleView.slots.map((slot, i) => (
                              <TableRow key={i}>
                                <TableCell className="tabular-nums text-muted-foreground">{i + 1}</TableCell>
                                <TableCell className="font-medium text-foreground text-sm">
                                  {slot.title?.trim() || `Session ${i + 1}`}
                                </TableCell>
                                <TableCell className="align-top text-sm">
                                  {(() => {
                                    const inv = substituteInviteForScheduleRow(i);
                                    if (!inv) {
                                      return <span className="text-muted-foreground">—</span>;
                                    }
                                    return (
                                      <div className="flex min-w-0 flex-col gap-1.5">
                                        <span
                                          className="font-mono text-xs font-medium text-foreground break-all"
                                          title="Invited substitute work email"
                                        >
                                          {inv.substituteEmailNorm}
                                        </span>
                                        <span
                                          className={`inline-flex w-fit max-w-full shrink-0 items-center truncate rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${substituteCoverChipClass(inv.status)}`}
                                        >
                                          {substituteCoverChipLabel(inv.status)}
                                        </span>
                                      </div>
                                    );
                                  })()}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {slot.sessionDate?.trim() || "—"}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {slot.sessionTime?.trim() || "—"}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      {scheduleSubstituteCoverage.wholeClass.length > 0 ||
                      scheduleSubstituteCoverage.bySlotIndex.size > 0 ? (
                        <p className="text-xs text-muted-foreground leading-relaxed px-0.5">
                          The <span className="font-medium text-foreground/80">Substitute instructor</span> column lists
                          the work email from your invite when the course lead cannot run that session (or every row for a
                          whole-class invite with no session picked). Chips show where that invite sits in the approval
                          flow.
                        </p>
                      ) : null}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="resume" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
                  <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        <FileText className="h-5 w-5 text-[#1e40af]" />
                        Class resumes
                      </h2>
                      <p className="mt-1 text-sm text-foreground/60 max-w-xl">
                        Each card is a recap students can read on their class page (Resume tab). Create or edit on a dedicated page.
                      </p>
                    </div>
                    <Button
                      type="button"
                      className="shrink-0 gap-2 rounded-full bg-[#3954d0] hover:bg-[#2f46b3] sm:self-center"
                      onClick={(e) => {
                        e.stopPropagation();
                        void navigate(`/dashboard/teacher/courses/${courseMeta.id}/resume/new`);
                      }}
                    >
                      <Plus className="h-4 w-4 shrink-0" />
                      New resume
                    </Button>
                  </div>

                  {classResumes.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 px-6 py-10 text-center">
                      <FileText className="mx-auto h-10 w-10 text-foreground/20" aria-hidden />
                      <p className="mt-3 text-sm font-medium text-foreground">No resumes yet</p>
                      <p className="mt-1 text-sm text-foreground/60">
                        Write your first recap so enrolled students can review it anytime.
                      </p>
                      <Button
                        type="button"
                        className="mt-5 gap-2 rounded-full bg-[#3954d0] hover:bg-[#2f46b3]"
                        onClick={(e) => {
                          e.stopPropagation();
                          void navigate(`/dashboard/teacher/courses/${courseMeta.id}/resume/new`);
                        }}
                      >
                        <Plus className="h-4 w-4 shrink-0" />
                        Create resume
                      </Button>
                    </div>
                  ) : (
                    <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {classResumes.map((r) => (
                        <li
                          key={r.id}
                          className="flex h-full flex-col rounded-xl border border-gray-200/90 bg-gray-50/40 p-2 shadow-sm ring-1 ring-gray-900/[0.03]"
                        >
                          {r.thumbnailUrl ? (
                            <div className="mb-4 overflow-hidden rounded-lg border border-gray-200 bg-white">
                              <img
                                src={r.thumbnailUrl}
                                alt="Resume thumbnail"
                                className="h-40 w-full object-cover"
                                loading="lazy"
                              />
                            </div>
                          ) : null}
                          <div className="flex min-h-0 flex-1 flex-col gap-3">
                            <div className="min-h-0 flex-1 space-y-2">
                              {r.sessionLabel ? (
                                <p className="text-xs font-semibold uppercase tracking-wide text-[#1e40af]/90">
                                  {r.sessionLabel}
                                </p>
                              ) : (
                                <p className="text-xs font-medium text-muted-foreground">Whole class recap</p>
                              )}
                              <p className="text-sm text-foreground leading-relaxed line-clamp-2 whitespace-pre-wrap">
                                {r.body}
                              </p>
                              <p className="text-xs text-muted-foreground tabular-nums">
                                Updated{" "}
                                {new Date(r.updatedAt).toLocaleString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                  hour: "numeric",
                                  minute: "2-digit",
                                })}
                              </p>
                            </div>
                            <div className="mt-auto flex shrink-0 flex-wrap gap-2 border-t border-gray-200/80 pt-3">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="rounded-full"
                                onClick={() => {
                                  void navigate(`/dashboard/teacher/courses/${courseMeta.id}/resume/${r.id}`);
                                }}
                              >
                                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                                Edit
                              </Button>
                              {!isSubstituteViewer ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="rounded-full text-red-700 border-red-200 hover:bg-red-50"
                                  onClick={() => setResumeDeleteId(r.id)}
                                >
                                  Delete
                                </Button>
                              ) : null}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </TabsContent>

                <TabsContent value="quiz" className="mt-0 space-y-6 focus-visible:outline-none focus-visible:ring-0">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        <ClipboardList className="h-5 w-5 text-[#1e40af]" />
                        Quiz & placement tests
                      </h2>
                      <p className="mt-1 text-sm text-foreground/60 max-w-xl">
                        Multiple-choice quizzes for this class appear below as cards. Use{" "}
                        <span className="font-medium text-foreground/75">Create quiz</span> to add one, then publish,
                        edit, or open results from each card.
                      </p>
                    </div>
                    {!isSubstituteViewer ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="shrink-0 gap-2 rounded-md border-slate-200 bg-white px-3 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-slate-50 sm:self-center"
                        asChild
                      >
                        <Link
                          to={
                            isUuid(courseId)
                              ? `/dashboard/teacher/placement-test?courseId=${encodeURIComponent(courseId)}&new=1`
                              : "/dashboard/teacher/placement-test?new=1"
                          }
                        >
                          <ClipboardList className="h-4 w-4 shrink-0 text-foreground/70" />
                          Create quiz
                        </Link>
                      </Button>
                    ) : null}
                  </div>

                  {isSubstituteViewer ? (
                    <div className="rounded-xl border border-amber-200/90 bg-amber-50/90 px-4 py-4 text-sm text-amber-950 leading-relaxed">
                      <p className="font-semibold text-amber-950">Quiz management is for the course lead.</p>
                      <p className="mt-2 text-amber-950/90">
                        Creating and publishing quizzes for this class is done by the instructor who owns the catalog
                        listing. If you need a quiz while covering, ask them to set it up or share instructions with the
                        class.
                      </p>
                    </div>
                  ) : !isUuid(courseId) ? (
                    <p className="text-sm text-foreground/70 rounded-xl border border-dashed border-gray-200 bg-gray-50/50 px-4 py-8 text-center">
                      This class exists only in your browser. Connect it to the API to list server-backed quizzes for this
                      course. Use <span className="font-medium text-foreground/80">My Class</span> after your class is on
                      the server, then open this class and use the Quiz tab to create quizzes.
                    </p>
                  ) : (
                    <section className="space-y-4" aria-labelledby="class-quiz-list-heading">
                      <h3 id="class-quiz-list-heading" className="text-sm font-semibold text-foreground">
                        Your quizzes
                      </h3>

                      {courseQuizzesQuery.data?.fetchNote ? (
                        <div className="rounded-lg border border-amber-200/90 bg-amber-50/90 px-3 py-2.5 text-sm text-amber-950 leading-relaxed">
                          {courseQuizzesQuery.data.fetchNote}
                        </div>
                      ) : null}

                      {courseQuizzesQuery.isLoading ? (
                        <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
                          {[0, 1, 2].map((i) => (
                            <li
                              key={i}
                              className="h-44 animate-pulse rounded-xl border border-gray-200/80 bg-slate-100/80"
                              aria-hidden
                            />
                          ))}
                        </ul>
                      ) : courseQuizzesQuery.isError ? (
                        <p className="text-sm text-red-600">
                          {courseQuizzesQuery.error instanceof Error
                            ? courseQuizzesQuery.error.message
                            : "Could not load quizzes for this class."}
                        </p>
                      ) : !courseQuizzesQuery.data?.quizzes?.length ? (
                        <div className="space-y-6">
                          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 px-6 py-10 text-center">
                            <ClipboardList className="mx-auto h-10 w-10 text-foreground/20" aria-hidden />
                            <p className="mt-3 text-sm font-medium text-foreground">No quizzes for this class yet</p>
                            <p className="mt-1 text-sm text-foreground/60">
                              Your real quizzes will replace the example cards below. Create a practice quiz or placement
                              test to get started.
                            </p>
                            <Button
                              type="button"
                              className="mt-5 gap-2 rounded-full bg-[#3954d0] hover:bg-[#2f46b3]"
                              asChild
                            >
                              <Link
                                to={`/dashboard/teacher/placement-test?courseId=${encodeURIComponent(courseId)}&new=1`}
                              >
                                <Plus className="h-4 w-4 shrink-0" />
                                Create quiz
                              </Link>
                            </Button>
                          </div>
                          <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              Example layout (not saved — disappears when you add a quiz)
                            </p>
                            <ul
                              className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                              aria-hidden
                            >
                              {QUIZ_TAB_DUMMY_EXAMPLES.map((d) => {
                                const isPlacement = d.kind === "placement";
                                return (
                                  <li
                                    key={d.id}
                                    className="pointer-events-none relative flex h-full flex-col rounded-xl border border-dashed border-slate-300/90 bg-slate-50/50 p-4 opacity-90 shadow-sm ring-1 ring-slate-900/[0.04]"
                                  >
                                    <span className="absolute right-3 top-3 rounded-full bg-slate-200/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700">
                                      Example
                                    </span>
                                    <div className="mb-3 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#1e40af]/10 ring-1 ring-[#1e40af]/15">
                                      <ClipboardList className="h-5 w-5 text-[#1e40af]" aria-hidden />
                                    </div>
                                    <div className="min-h-0 flex-1 space-y-2 pr-14">
                                      <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2">
                                        {d.title}
                                      </p>
                                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                        <span
                                          className={`rounded-full px-2 py-0.5 font-semibold uppercase tracking-wide ${
                                            isPlacement
                                              ? "bg-violet-100 text-violet-900"
                                              : "bg-slate-100 text-slate-800"
                                          }`}
                                        >
                                          {isPlacement ? "Placement" : "Quiz"}
                                        </span>
                                        <span
                                          className={`rounded-full px-2 py-0.5 font-semibold uppercase tracking-wide ${
                                            d.published
                                              ? "bg-emerald-100 text-emerald-900"
                                              : "bg-amber-100 text-amber-900"
                                          }`}
                                        >
                                          {d.published ? "Published" : "Draft"}
                                        </span>
                                        <span className="tabular-nums">
                                          {d.questions} question{d.questions === 1 ? "" : "s"}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="mt-4 flex shrink-0 flex-wrap gap-2 border-t border-slate-200/80 pt-3">
                                      {!d.published ? (
                                        <span className="inline-flex h-8 items-center rounded-full border border-slate-200 bg-white px-3 text-xs font-medium text-muted-foreground">
                                          Publish
                                        </span>
                                      ) : null}
                                      <span className="inline-flex h-8 items-center rounded-full border border-slate-200 bg-white px-3 text-xs font-medium text-muted-foreground">
                                        Results
                                      </span>
                                      <span className="inline-flex h-8 items-center rounded-full border border-slate-200 bg-white px-3 text-xs font-medium text-muted-foreground">
                                        Edit
                                      </span>
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        </div>
                      ) : (
                        <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                          {courseQuizzesQuery.data.quizzes.map((q) => {
                            const isPlacement = (q.quizType ?? "QUIZ") === "PLACEMENT_TEST";
                            return (
                              <li
                                key={q.id}
                                className="flex h-full flex-col rounded-xl border border-gray-200/90 bg-gray-50/40 p-4 shadow-sm ring-1 ring-gray-900/[0.03]"
                              >
                                <div className="mb-3 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#1e40af]/10 ring-1 ring-[#1e40af]/15">
                                  <ClipboardList className="h-5 w-5 text-[#1e40af]" aria-hidden />
                                </div>
                                <div className="min-h-0 flex-1 space-y-2">
                                  <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2">
                                    {q.title}
                                  </p>
                                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                    <span
                                      className={`rounded-full px-2 py-0.5 font-semibold uppercase tracking-wide ${
                                        isPlacement
                                          ? "bg-violet-100 text-violet-900"
                                          : "bg-slate-100 text-slate-800"
                                      }`}
                                    >
                                      {isPlacement ? "Placement" : "Quiz"}
                                    </span>
                                    <span
                                      className={`rounded-full px-2 py-0.5 font-semibold uppercase tracking-wide ${
                                        q.isPublished
                                          ? "bg-emerald-100 text-emerald-900"
                                          : "bg-amber-100 text-amber-900"
                                      }`}
                                    >
                                      {q.isPublished ? "Published" : "Draft"}
                                    </span>
                                    <span className="tabular-nums">
                                      {q.questions.length} question{q.questions.length === 1 ? "" : "s"}
                                    </span>
                                  </div>
                                </div>
                                <div className="mt-4 flex shrink-0 flex-wrap gap-2 border-t border-gray-200/80 pt-3">
                                  {!q.isPublished ? (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="rounded-full gap-1.5"
                                      disabled={quizPublishingId === q.id}
                                      onClick={() => void handlePublishQuiz(q.id)}
                                    >
                                      {quizPublishingId === q.id ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : null}
                                      Publish
                                    </Button>
                                  ) : null}
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="rounded-full gap-1.5"
                                    asChild
                                  >
                                    <Link to={`/dashboard/teacher/placement-test/${courseId}/${q.id}/results`}>
                                      <BarChart2 className="h-3.5 w-3.5" />
                                      Results
                                    </Link>
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="rounded-full gap-1.5"
                                    asChild
                                  >
                                    <Link
                                      to={`/dashboard/teacher/placement-test?courseId=${encodeURIComponent(courseId)}&edit=${encodeURIComponent(q.id)}`}
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                      Edit
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

                <TabsContent value="grades" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
                  <TeacherCourseGradesPanel
                    courseId={courseMeta.id}
                    courseTitle={courseMeta.title}
                    students={studentsQuery.data ?? []}
                    instructorEmail={user.email}
                    instructorName={courseLeadDisplayName}
                    isSubstituteViewer={isSubstituteViewer}
                    isApiCourse={isUuid(courseId)}
                    isLoading={studentsQuery.isLoading}
                    isError={studentsQuery.isError}
                    plannedSessions={apiCourseQuery.data?.classMeetingsInSixMonths ?? null}
                  />
                </TabsContent>

                <TabsContent value="attendance" className="mt-0 space-y-8 focus-visible:outline-none focus-visible:ring-0">
                  <section>
                    <h2 className="text-lg font-semibold text-foreground mb-1 flex items-center gap-2">
                      <QrCode className="h-5 w-5 text-[#1e40af]" />
                      Class meeting check-in (QR)
                    </h2>
                    <p className="text-sm text-foreground/60 mb-4">
                      Each QR opens the check-in link; students must use it signed in as a student. The roster table
                      below only shows check-ins stored on this browser—scanning on another device will not fill those cells
                      until attendance is stored on the server.
                    </p>
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
                        approvedScheduleSlots: rosterScheduleView.slots.map((slot, i) => ({
                          index: i,
                          label: formatClassMeetingSlotLabel(slot, i),
                          sessionDate: slot.sessionDate?.trim() || undefined,
                          sessionTime: slot.sessionTime?.trim() || undefined,
                          title: slot.title?.trim() || undefined,
                        })),
                      }}
                    />
                  </section>

                  <section>
                    <h2 className="text-lg font-semibold text-foreground mb-1">Student attendance overview</h2>
                    <p className="text-sm text-foreground/60 mb-4">
                      Use <span className="font-medium text-foreground/80">Jump by class schedule</span> to pick the last
                      planned session or a specific row from your schedule—we match it to a saved QR when the name or date
                      lines up. Otherwise choose the meeting in Class meeting check-in. Check-ins are read from this browser
                      only: same machine and same app URL as where the student opened the link.
                    </p>

                    {!isUuid(courseId) ? (
                      <p className="text-sm text-foreground/70 rounded-xl border border-dashed border-gray-200 bg-gray-50/50 px-4 py-8 text-center">
                        Connect this class to the API to align attendance tracking with enrolled students.
                      </p>
                    ) : isSubstituteViewer ? (
                      <div className="rounded-xl border border-amber-200/90 bg-amber-50/90 px-4 py-4 text-sm text-amber-950 leading-relaxed">
                        <p className="font-semibold text-amber-950">Attendance overview needs the server roster.</p>
                        <p className="mt-2 text-amber-950/90">
                          That roster is only returned for the course lead today, so this table cannot load while you are
                          signed in as substitute. The QR check-in section above still works; match students manually until
                          the API supports substitute roster access.
                        </p>
                      </div>
                    ) : studentsQuery.isLoading ? (
                      <p className="text-sm text-foreground/60">Loading roster for attendance table…</p>
                    ) : studentsQuery.isError ? (
                      <p className="text-sm text-red-600">Could not load students for this overview.</p>
                    ) : !studentsQuery.data?.length ? (
                      <p className="text-sm text-foreground/70 rounded-xl border border-dashed border-gray-200 bg-gray-50/50 px-4 py-8 text-center">
                        No enrolled students yet — nothing to show in the attendance overview.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        <div className="rounded-lg border border-sky-200 bg-sky-50/90 px-3 py-2.5 text-xs text-sky-950/90 leading-relaxed space-y-2">
                          <p>
                            <span className="font-semibold text-sky-950">Phone scan vs this screen:</span> if the student
                            checks in on their phone, data stays on the phone until a server attendance API exists. This
                            table only reads check-ins saved in the browser where you opened this page (or another tab on
                            the same computer).
                          </p>
                          <p>
                            Also confirm the student account email matches the roster row, the meeting selected here or in
                            Class meeting check-in matches the QR they scanned, and they are signed in as a student on the
                            check-in page.
                          </p>
                        </div>
                        {overviewMeetingLabel ? (
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <p className="text-sm text-foreground">
                              <span className="text-muted-foreground">Showing attendance for: </span>
                              <span className="font-medium">{overviewMeetingLabel}</span>
                            </p>
                            {overviewSessionId ? (
                              <p className="text-xs text-muted-foreground tabular-nums">
                                Present for this meeting:{" "}
                                <span className="font-medium text-foreground">
                                  {attendanceRosterQuery.data?.summary.present ?? countPresentForSession(courseMeta.id, overviewSessionId)} / {studentsQuery.data.length}
                                </span>
                              </p>
                            ) : null}
                          </div>
                        ) : (
                          <p className="text-xs text-amber-800/90 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2">
                            Select a meeting with <span className="font-medium">Jump by class schedule</span> or in Class
                            meeting check-in to load check-in data for the table below.
                          </p>
                        )}
                        <p className="rounded-lg border border-amber-200/90 bg-amber-50/70 px-3 py-2 text-xs text-amber-950/85 leading-relaxed">
                          Enrollment lists everyone who joined the class on the platform. Present and Checked in now use
                          the EduHub attendance API for the selected QR meeting; if the API is unavailable, this page falls
                          back to same-browser prototype data.
                        </p>
                        <div className="space-y-2">
                          <Label htmlFor="attendance-schedule-filter" className="text-foreground">
                            Jump by class schedule
                          </Label>
                          <Select
                            value={attendanceScheduleFilter}
                            onValueChange={applyAttendanceScheduleFilter}
                          >
                            <SelectTrigger id="attendance-schedule-filter" className="max-w-xl bg-white">
                              <SelectValue placeholder="Choose schedule context" />
                            </SelectTrigger>
                            <SelectContent className="max-h-72">
                              <SelectItem value="latest-qr">Latest QR session (newest)</SelectItem>
                              <SelectItem value="last-scheduled" disabled={rosterScheduleView.slots.length === 0}>
                                Last date on class schedule
                              </SelectItem>
                              {rosterScheduleView.slots.map((slot, i) => (
                                <SelectItem key={`att-slot-${i}`} value={`slot-${i}`}>
                                  {formatClassMeetingSlotLabel(slot, i)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
                            When a row matches a saved QR, the{" "}
                            <span className="font-medium text-foreground/80">Present</span> and{" "}
                            <span className="font-medium text-foreground/80">Checked in</span> columns in this table use
                            that meeting—the same session as in Class meeting check-in. If nothing matches, generate a QR
                            for that day in Class meeting check-in, then try again.
                          </p>
                          <div
                            className="overflow-x-auto rounded-xl border border-gray-200 bg-gray-50/30 shadow-sm"
                            aria-label="Student attendance for the selected check-in meeting"
                          >
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-slate-50/90 hover:bg-slate-50/90">
                                <TableHead>Student</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead className="text-center whitespace-nowrap">Present</TableHead>
                                <TableHead className="text-right whitespace-nowrap">Checked in</TableHead>
                                <TableHead
                                  title="Instructor Check"
                                  className="text-center whitespace-nowrap border-l border-slate-200 bg-slate-50/70 min-w-[7.5rem] px-2"
                                >
                                  Instructor Check
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {studentsQuery.data.map((s, rowIndex) => {
                                void attendanceUiKey;
                                const apiEntry = attendanceRosterByStudent.get(s.id);
                                const localEntry =
                                  overviewSessionId != null
                                    ? getPresentForStudent(courseMeta.id, overviewSessionId, s.id, s.email)
                                    : undefined;
                                const entry = apiEntry
                                  ? {
                                      checkedAt: apiEntry.checkedAt ?? "",
                                      email: apiEntry.studentEmail,
                                      fullName: apiEntry.studentName,
                                      present: apiEntry.present,
                                    }
                                  : localEntry
                                    ? { ...localEntry, present: true }
                                    : undefined;
                                const rosterLen = studentsQuery.data.length;
                                return (
                                  <TableRow key={s.id}>
                                    <TableCell className="font-medium text-foreground">{s.fullName}</TableCell>
                                    <TableCell className="text-muted-foreground">{s.email}</TableCell>
                                    <TableCell className="text-center">
                                      {entry?.present ? (
                                        <span className="inline-flex items-center justify-center text-emerald-600" title="Checked in">
                                          <CheckCircle2 className="h-5 w-5" aria-label="Present" />
                                        </span>
                                      ) : (
                                        <span className="text-muted-foreground">—</span>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-right text-sm text-muted-foreground tabular-nums whitespace-nowrap">
                                      {entry?.present && entry.checkedAt
                                        ? new Date(entry.checkedAt).toLocaleString(undefined, {
                                            month: "short",
                                            day: "numeric",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                          })
                                        : "—"}
                                    </TableCell>
                                    {rowIndex === 0 ? (
                                      <TableCell
                                        rowSpan={rosterLen}
                                        className="align-middle border-l border-slate-200 bg-slate-50/50 p-2 text-center"
                                      >
                                        <div className="flex justify-center py-0.5">
                                          {teacherChecklist.ready ? (
                                            teacherChecklist.items.map((item) => (
                                              <Checkbox
                                                key={item.id}
                                                id={`teacher-class-check-${courseMeta?.id ?? courseId}-${item.id}`}
                                                checked={Boolean(teacherChecklist.checked[item.id])}
                                                onCheckedChange={(v) => teacherChecklist.toggle(item.id, v === true)}
                                                className="shrink-0"
                                                aria-label={item.label}
                                              />
                                            ))
                                          ) : (
                                            <Checkbox
                                              disabled
                                              className="shrink-0 opacity-40"
                                              aria-label="Sign in to save teacher check"
                                            />
                                          )}
                                        </div>
                                      </TableCell>
                                    ) : null}
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                        </div>
                      </div>
                    )}
                  </section>
                </TabsContent>
              </Tabs>
              </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this class?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this class and all its lessons. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) void handleDelete(deleteId);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
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
            <AlertDialogCancel onClick={() => setResumeDeleteId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (resumeDeleteId && courseId) {
                  deleteResumeMutation.mutate({ resumeId: resumeDeleteId });
                }
              }}
            >
              Delete
            </AlertDialogAction>
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
            <Button type="button" variant="outline" onClick={() => setSubstituteOpen(false)}>
              Cancel
            </Button>
            <Button type="button" className="bg-[#3954d0] hover:bg-[#2f46b3]" onClick={handleSubmitSubstituteInvite}>
              Send invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
