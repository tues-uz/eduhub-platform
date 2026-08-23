import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import QRCode from "react-qr-code";
import { Maximize2, Minimize2, QrCode, RefreshCw, Square } from "@/lib/icons";
import { toast } from "sonner";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuthSession } from "@/features/auth/context";
import type { TeacherCourse } from "@/features/teacher/types";
import { eduhubAttendance, eduhubCourses, eduhubSchedule, eduhubSubstituteInvites } from "@/api/eduhubClient";
import type { AttendanceSessionResponse } from "@/api/eduhubTypes";
import { isUuid } from "@/api/utils";
import {
  buildCourseScheduleSlots,
  toApprovedScheduleSlotOptions,
} from "@/features/courses/courseScheduleSlots";
import { orderSessionSlotsChronologically } from "@/features/courses/classSchedulePreview";
import { paymentMonthForScheduleSlotKey } from "@/features/enrollment/enrollmentPaidMonths";
import type { ClassMeetingSlot } from "@/features/teacher/types";
import {
  refreshScheduleAttendanceState,
  scheduleSlotKeyFromParts,
} from "@/features/teacher/attendance/heldScheduleMeetingsStorage";
import {
  ATTENDANCE_OVERVIEW_SESSION_SYNC,
  ATTENDANCE_SESSION_MAX_MS,
  fetchAttendanceMeetings,
  MAX_STORED_MEETINGS,
  rememberAttendanceQrToken,
  type StoredAttendanceMeeting,
} from "@/features/teacher/attendance/attendanceMeetingsStorage";
import { AttendanceSessionLogsSection } from "@/features/teacher/components/AttendanceSessionLogsSection";
import { AttendanceOverviewQrPicker, type ApprovedScheduleSlotOption } from "@/features/teacher/components/AttendanceOverviewQrPicker";
import { useTranslation } from "react-i18next";

function formatElapsedParts(ms: number): { h: number; m: number; s: number } {
  const sec = Math.floor(Math.max(0, ms) / 1000);
  return { h: Math.floor(sec / 3600), m: Math.floor((sec % 3600) / 60), s: sec % 60 };
}

function formatElapsedLabel(ms: number): string {
  const { h, m, s } = formatElapsedParts(ms);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/** ~26 weeks ≈ six calendar months — rough guide for “meetings per week” hints. */
const WEEKS_IN_SIX_MONTHS = 26;

function meetingsPerWeekHint(sessionsSixMo: number): string | null {
  if (!Number.isFinite(sessionsSixMo) || sessionsSixMo < 1) return null;
  const perWeek = sessionsSixMo / WEEKS_IN_SIX_MONTHS;
  const rounded = Math.round(perWeek * 10) / 10;
  return `Your target (${sessionsSixMo} sessions in 6 months) works out to about ${rounded} class meeting${rounded === 1 ? "" : "s"} per week on average.`;
}

function defaultAutoCheckInMeetingLabel(): string {
  const d = new Date();
  return `Check-in · ${d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

type Props = {
  /** Tighter layout + slightly smaller QR when used inside My Class tab */
  embedded?: boolean;
  /** When set, lock QR to this course and hide the course dropdown (e.g. course roster page). */
  fixedCourse?: { id: string; title: string; classMeetingsInSixMonths?: number };
  /**
   * When non-empty, pre-fills "Name this class meeting" while the field is empty, and re-applies after each new QR
   * (e.g. substitute cover tied to a schedule row).
   */
  suggestedMeetingName?: string;
  /**
   * Renders the roster “which meeting for the table” picker in this card (after naming the meeting), so instructors
   * align schedule → name → meeting for overview → generate QR in one place.
   */
  rosterAttendanceOverviewPicker?: {
    onSelectionChange?: (sessionId: string | null) => void;
    /** Approved / planned class meetings (schedule tab) so the overview picker can align with admin + instructor schedule. */
    approvedScheduleSlots?: { index: number; label: string; sessionDate?: string }[];
  };
};

export function TeacherAttendanceSessionPanel({
  embedded = false,
  fixedCourse,
  suggestedMeetingName,
  rosterAttendanceOverviewPicker,
}: Props) {
  const { t } = useTranslation();
  const { user } = useAuthSession();
  const [courses, setCourses] = useState<TeacherCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [courseId, setCourseId] = useState<string>("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [storedMeetings, setStoredMeetings] = useState<StoredAttendanceMeeting[]>([]);
  /** Required label before generating a new QR */
  const [nextMeetingName, setNextMeetingName] = useState("");
  const [projectorMode, setProjectorMode] = useState(false);
  const [sessionClock, setSessionClock] = useState(() => Date.now());
  const [currentSessionToken, setCurrentSessionToken] = useState<string | null>(null);
  /** Sessions ended early via Stop — hides QR until a new meeting QR is generated. */
  const [manuallyStoppedSessionIds, setManuallyStoppedSessionIds] = useState<string[]>([]);
  /** Roster: saved meeting id chosen in overview picker (drives attendance table). */
  const [rosterOverviewSessionId, setRosterOverviewSessionId] = useState<string | null>(null);
  /** Planned schedule row chosen with no matching QR yet — enables Generate using that label. */
  const [rosterScheduleSlotIntent, setRosterScheduleSlotIntent] = useState<ApprovedScheduleSlotOption | null>(null);
  const [loadedScheduleSlots, setLoadedScheduleSlots] = useState<ApprovedScheduleSlotOption[]>([]);
  /** Pending confirmation before Generate actually closes a still-active check-in window. */
  const [confirmState, setConfirmState] = useState<
    | { kind: "same-course"; meetingName: string; presentCount: number; enrolledCount: number }
    | { kind: "cross-course"; sessions: AttendanceSessionResponse[] }
    | null
  >(null);
  const [checkingBeforeGenerate, setCheckingBeforeGenerate] = useState(false);
  /** Raw ordered slots (same shape used by the payment tabs) so Generate can attach a tuition schedule month. */
  const [orderedRawSlots, setOrderedRawSlots] = useState<ClassMeetingSlot[]>([]);
  const qrPreviewRef = useRef<HTMLDivElement | null>(null);

  const approvedScheduleSlots =
    rosterAttendanceOverviewPicker?.approvedScheduleSlots ?? loadedScheduleSlots;
  const useSchedulePicker = approvedScheduleSlots.length > 0;

  useEffect(() => {
    setRosterOverviewSessionId(null);
    setRosterScheduleSlotIntent(null);
  }, [courseId]);

  useEffect(() => {
    if (rosterAttendanceOverviewPicker?.approvedScheduleSlots?.length) {
      setLoadedScheduleSlots([]);
      setOrderedRawSlots([]);
      return;
    }
    if (!courseId || !isUuid(courseId)) {
      setLoadedScheduleSlots([]);
      setOrderedRawSlots([]);
      return;
    }
    let cancelled = false;
    Promise.all([
      eduhubCourses.getById(courseId),
      eduhubSchedule.getProposal(courseId).catch(() => null),
    ])
      .then(([course, proposal]) => {
        if (cancelled) return;
        const slots = buildCourseScheduleSlots(course, proposal, courseId);
        setLoadedScheduleSlots(toApprovedScheduleSlotOptions(slots));
        setOrderedRawSlots(orderSessionSlotsChronologically(slots));
      })
      .catch(() => {
        if (!cancelled) {
          setLoadedScheduleSlots([]);
          setOrderedRawSlots([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [courseId, rosterAttendanceOverviewPicker?.approvedScheduleSlots?.length]);

  const slotKeyForScheduleOption = useCallback((slot: ApprovedScheduleSlotOption | null | undefined) => {
    if (!slot) return undefined;
    return scheduleSlotKeyFromParts({
      sessionDate: slot.sessionDate,
      sessionTime: slot.sessionTime,
      title: slot.title,
    });
  }, []);

  useEffect(() => {
    if (fixedCourse) {
      const synthetic: TeacherCourse = {
        id: fixedCourse.id,
        title: fixedCourse.title,
        description: "",
        instructorName: "",
        lessons: [],
        createdAt: "",
        updatedAt: "",
      };
      setCourses([synthetic]);
      setCourseId(fixedCourse.id);
      setLoading(false);
      return;
    }
    let cancelled = false;
    async function load() {
      setLoading(true);
      if (user.id) {
        try {
          const res = await eduhubCourses.getByLecturer(user.id);
          const apiCourses: TeacherCourse[] = (res || []).map((c) => ({
            id: c.id,
            title: c.title,
            description: "",
            instructorName: c.lecturerName,
            enrollmentCount: c.enrollmentCount,
            lessons: [],
            createdAt: c.createdAt,
            updatedAt: c.createdAt,
            status: c.status,
          }));
          const ownCourseIds = new Set(apiCourses.map((c) => c.id));
          const substituteInvites = await eduhubSubstituteInvites.listMine().catch(() => []);
          const substituteCourses: TeacherCourse[] = substituteInvites
            .filter((inv) => inv.status === "APPROVED" && inv.substituteId === user.id && !ownCourseIds.has(inv.courseId))
            .reduce<TeacherCourse[]>((acc, inv) => {
              if (acc.some((c) => c.id === inv.courseId)) return acc;
              acc.push({
                id: inv.courseId,
                title: `${inv.courseTitle} (substitute)`,
                description: "",
                instructorName: inv.primaryInstructorName,
                lessons: [],
                createdAt: inv.createdAt,
                updatedAt: inv.updatedAt,
              });
              return acc;
            }, []);
          if (!cancelled) {
            const merged = [...apiCourses, ...substituteCourses];
            setCourses(merged);
            setCourseId((prev) => {
              if (prev && merged.some((c) => c.id === prev)) return prev;
              return merged[0]?.id ?? "";
            });
          }
        } catch {
          if (!cancelled) {
            setCourses([]);
            setCourseId("");
          }
        }
      } else if (!cancelled) {
        setCourses([]);
        setCourseId("");
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user.id, fixedCourse?.id, fixedCourse?.title]);

  useEffect(() => {
    const s = suggestedMeetingName?.trim();
    if (!s || rosterAttendanceOverviewPicker) return;
    setNextMeetingName((prev) => (prev.trim() === "" ? s : prev));
  }, [suggestedMeetingName, rosterAttendanceOverviewPicker]);

  useEffect(() => {
    if (!courseId) {
      setStoredMeetings([]);
      setSessionId(null);
      return;
    }
    let cancelled = false;
    fetchAttendanceMeetings(courseId)
      .then((list) => {
        if (cancelled) return;
        setStoredMeetings((prev) => {
          const prevById = new Map(prev.map((m) => [m.sessionId, m]));
          return list.map((m) => ({
            ...m,
            token: m.token || prevById.get(m.sessionId)?.token,
          }));
        });
        setSessionId((prev) => {
          if (prev && list.some((m) => m.sessionId === prev)) return prev;
          const open = list.find((m) => m.status === "OPEN");
          return open?.sessionId ?? list[0]?.sessionId ?? null;
        });
        const open = list.find((m) => m.status === "OPEN" && m.token);
        setCurrentSessionToken(open?.token ?? list.find((m) => m.token)?.token ?? null);
      })
      .catch(() => {
        if (cancelled) return;
        toast.error("Could not load attendance sessions for this class.");
      });
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  const selectedCourse = useMemo(
    () => courses.find((c) => c.id === courseId),
    [courses, courseId],
  );

  const finalizedMaxDurationRef = useRef<Set<string>>(new Set());
  const manualStopOnceRef = useRef<Set<string>>(new Set());

  const handleRosterScheduleSlotIntent = useCallback(
    (slot: ApprovedScheduleSlotOption | null) => {
      setRosterScheduleSlotIntent(slot);
      if (slot) {
        setRosterOverviewSessionId(null);
        rosterAttendanceOverviewPicker?.onSelectionChange?.(null);
      }
    },
    [rosterAttendanceOverviewPicker],
  );

  const scheduleSlotForGenerate = rosterScheduleSlotIntent;

  const generateSession = useCallback(async () => {
    if (!courseId) return;
    const name = useSchedulePicker
      ? (scheduleSlotForGenerate?.label.trim() ||
          suggestedMeetingName?.trim() ||
          defaultAutoCheckInMeetingLabel())
      : nextMeetingName.trim();
    if (!name) return;

    const prevSessionId = sessionId;

    const slotIndex = scheduleSlotForGenerate?.index;
    const scheduleSlotKey = slotKeyForScheduleOption(scheduleSlotForGenerate);
    const scheduleMonth =
      scheduleSlotKey && orderedRawSlots.length
        ? paymentMonthForScheduleSlotKey(orderedRawSlots, scheduleSlotKey) ?? undefined
        : undefined;
    let created;
    try {
      created = await eduhubAttendance.createSession(courseId, {
        meetingName: name,
        modality: "IN_PERSON",
        scheduleSlotIndex: typeof slotIndex === "number" && slotIndex >= 0 ? slotIndex : undefined,
        scheduleSlotKey,
        scheduleMonth,
      });
    } catch (e) {
      toast.error("Could not generate attendance QR", {
        description: e instanceof Error ? e.message : "Please try again.",
      });
      return;
    }

    void refreshScheduleAttendanceState(courseId);

    const next: StoredAttendanceMeeting = {
      sessionId: created.id,
      createdAt: created.startedAt,
      modality: "in_person",
      status: created.status,
      endedAt: created.endedAt,
      endReason: created.endReason,
      name,
      token: created.token,
      ...(typeof slotIndex === "number" && slotIndex >= 0 ? { scheduleSlotIndex: slotIndex } : {}),
      ...(scheduleSlotKey ? { scheduleSlotKey } : {}),
    };
    setStoredMeetings((prev) => {
      const withPrevClosed = prevSessionId
        ? prev.map((m) =>
            m.sessionId === prevSessionId
              ? { ...m, status: "CLOSED" as const, endedAt: created.startedAt, endReason: "NEW_SESSION" }
              : m,
          )
        : prev;
      return [next, ...withPrevClosed.filter((m) => m.sessionId !== next.sessionId)].slice(0, MAX_STORED_MEETINGS);
    });
    setSessionId(next.sessionId);
    setCurrentSessionToken(created.token ?? null);
    if (created.token) {
      rememberAttendanceQrToken(courseId, next.sessionId, created.token);
    }
    setNextMeetingName(useSchedulePicker ? "" : (suggestedMeetingName?.trim() ?? ""));

    if (useSchedulePicker) {
      setRosterScheduleSlotIntent(null);
    }
  }, [
    courseId,
    nextMeetingName,
    orderedRawSlots,
    scheduleSlotForGenerate,
    slotKeyForScheduleOption,
    sessionId,
    suggestedMeetingName,
    useSchedulePicker,
  ]);

  const canGenerate =
    Boolean(courseId) &&
    (!useSchedulePicker ? Boolean(nextMeetingName.trim()) : Boolean(rosterOverviewSessionId || rosterScheduleSlotIntent));

  /** Checks for an already-open check-in window (this class or another) before Generate closes it,
   * so students already checked in aren't silently split off into a second "meeting held". */
  const requestGenerate = useCallback(async () => {
    if (!canGenerate || !courseId) return;
    setCheckingBeforeGenerate(true);
    try {
      if (sessionId) {
        try {
          const fresh = await eduhubAttendance.listSessions(courseId);
          const current = fresh.find((s) => s.id === sessionId);
          if (current && current.status === "OPEN" && (current.presentCount ?? 0) > 0) {
            setConfirmState({
              kind: "same-course",
              meetingName: current.meetingName,
              presentCount: current.presentCount ?? 0,
              enrolledCount: current.enrolledCount ?? 0,
            });
            return;
          }
        } catch {
          // Can't verify live state — fall through and let Generate proceed.
        }
      }
      try {
        const mine = await eduhubAttendance.myOpenSessions();
        const others = mine.filter((s) => s.courseId !== courseId);
        if (others.length > 0) {
          setConfirmState({ kind: "cross-course", sessions: others });
          return;
        }
      } catch {
        // Can't verify — fall through and let Generate proceed.
      }
      await generateSession();
    } finally {
      setCheckingBeforeGenerate(false);
    }
  }, [canGenerate, courseId, generateSession, sessionId]);

  const confirmGenerate = useCallback(async () => {
    setConfirmState(null);
    await generateSession();
  }, [generateSession]);

  const joinUrl = useMemo(() => {
    if (!courseId || !sessionId) return "";
    const meeting = storedMeetings.find((m) => m.sessionId === sessionId);
    const token = currentSessionToken ?? meeting?.token;
    if (!token) return "";
    const path = `/dashboard/attendance/join?token=${encodeURIComponent(token)}`;
    return `${typeof window !== "undefined" ? window.location.origin : ""}${path}`;
  }, [courseId, currentSessionToken, sessionId, storedMeetings]);

  const activeMeeting = useMemo(
    () => storedMeetings.find((m) => m.sessionId === sessionId),
    [storedMeetings, sessionId],
  );

  const selectMeetingFromLog = useCallback(
    (sid: string) => {
      const meeting = storedMeetings.find((m) => m.sessionId === sid);
      if (!meeting) return;
      setSessionId(sid);
      setCurrentSessionToken(meeting.token ?? null);
      setRosterScheduleSlotIntent(null);
      setRosterOverviewSessionId(sid);
      rosterAttendanceOverviewPicker?.onSelectionChange?.(sid);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent(ATTENDANCE_OVERVIEW_SESSION_SYNC, {
            detail: { courseId, sessionId: sid },
          }),
        );
      }
      // Scroll after state paints so the preview shows the selected meeting.
      window.setTimeout(() => {
        qrPreviewRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
    },
    [courseId, rosterAttendanceOverviewPicker, storedMeetings],
  );

  useEffect(() => {
    if (!sessionId) return;
    const meeting = storedMeetings.find((m) => m.sessionId === sessionId);
    if (meeting?.token) setCurrentSessionToken(meeting.token);
  }, [sessionId, storedMeetings]);

  useEffect(() => {
    if (!courseId) return;
    void refreshScheduleAttendanceState(courseId);
  }, [courseId, sessionId]);

  useEffect(() => {
    if (!projectorMode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setProjectorMode(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [projectorMode]);

  const qrBase = embedded ? 240 : 280;
  const qrSize = projectorMode
    ? Math.min(520, Math.floor(Math.min(window.innerWidth, window.innerHeight) * 0.65))
    : qrBase;

  const fixedScheduleHint =
    fixedCourse?.classMeetingsInSixMonths != null
      ? meetingsPerWeekHint(fixedCourse.classMeetingsInSixMonths)
      : null;

  useEffect(() => {
    if (!activeMeeting?.createdAt) return;
    const start = new Date(activeMeeting.createdAt).getTime();
    if (!Number.isFinite(start)) return;
    const tick = () => setSessionClock(Date.now());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [activeMeeting?.createdAt, activeMeeting?.sessionId]);

  const sessionStartMs = activeMeeting?.createdAt
    ? new Date(activeMeeting.createdAt).getTime()
    : NaN;
  const sessionElapsedMs =
    activeMeeting && Number.isFinite(sessionStartMs)
      ? Math.max(0, sessionClock - sessionStartMs)
      : 0;
  const sessionRemainingMs = Math.max(0, ATTENDANCE_SESSION_MAX_MS - sessionElapsedMs);

  const isBackendSessionClosed = activeMeeting?.status === "CLOSED";

  const isSessionManuallyStopped =
    Boolean(sessionId) &&
    (manuallyStoppedSessionIds.includes(sessionId as string) ||
      (isBackendSessionClosed && activeMeeting?.endReason === "MANUAL_STOP"));

  const noTokenKnown = Boolean(activeMeeting) && !isBackendSessionClosed && !joinUrl;

  const checkInWindowOpen =
    Boolean(activeMeeting && Number.isFinite(sessionStartMs)) &&
    !isBackendSessionClosed &&
    !isSessionManuallyStopped &&
    !noTokenKnown &&
    sessionElapsedMs < ATTENDANCE_SESSION_MAX_MS;

  /** Confirms the 2h15m expiry with the backend instead of just hiding the QR locally, so the
   * session actually becomes CLOSED (trigger #2) rather than waiting for someone else to poll it. */
  useEffect(() => {
    if (!courseId || !activeMeeting?.sessionId) return;
    if (isBackendSessionClosed) return;
    if (sessionElapsedMs < ATTENDANCE_SESSION_MAX_MS) return;
    const sid = activeMeeting.sessionId;
    if (!isUuid(sid)) return;
    if (finalizedMaxDurationRef.current.has(sid)) return;
    finalizedMaxDurationRef.current.add(sid);
    eduhubAttendance
      .closeSession(sid, "MAX_DURATION")
      .then((closed) => {
        setStoredMeetings((prev) =>
          prev.map((m) =>
            m.sessionId === sid
              ? { ...m, status: closed.status, endedAt: closed.endedAt, endReason: closed.endReason }
              : m,
          ),
        );
        void refreshScheduleAttendanceState(courseId);
      })
      .catch(() => {
        finalizedMaxDurationRef.current.delete(sid);
      });
  }, [
    courseId,
    activeMeeting?.sessionId,
    activeMeeting?.createdAt,
    activeMeeting?.name,
    isBackendSessionClosed,
    sessionElapsedMs,
  ]);

  const stopSession = useCallback(async () => {
    if (!courseId || !sessionId || !activeMeeting) return;
    if (manuallyStoppedSessionIds.includes(sessionId)) return;
    if (manualStopOnceRef.current.has(sessionId)) return;
    manualStopOnceRef.current.add(sessionId);

    try {
      if (isUuid(sessionId)) {
        const closed = await eduhubAttendance.closeSession(sessionId, "MANUAL_STOP");
        setStoredMeetings((prev) =>
          prev.map((m) =>
            m.sessionId === sessionId
              ? { ...m, status: closed.status, endedAt: closed.endedAt, endReason: closed.endReason }
              : m,
          ),
        );
        void refreshScheduleAttendanceState(courseId);
      }
    } catch (e) {
      toast.error("Could not stop attendance session", {
        description: e instanceof Error ? e.message : "Please try again.",
      });
      manualStopOnceRef.current.delete(sessionId);
      return;
    }

    setCurrentSessionToken(null);
    setManuallyStoppedSessionIds((prev) => (prev.includes(sessionId) ? prev : [...prev, sessionId]));
  }, [
    courseId,
    sessionId,
    activeMeeting,
    manuallyStoppedSessionIds,
  ]);

  const setupControls = (
    <div className="space-y-5">
      {!fixedCourse ? (
        <div className="space-y-2">
          <Label htmlFor={embedded ? "attendance-course-embedded" : "attendance-course"}>
            {t("teacher.attendancePanel.classLabel")}
          </Label>
          <Select value={courseId} onValueChange={setCourseId}>
            <SelectTrigger
              id={embedded ? "attendance-course-embedded" : "attendance-course"}
              className="bg-background"
            >
              <SelectValue placeholder={t("teacher.attendancePanel.classPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {courses.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {fixedScheduleHint ? (
        <p className="text-xs text-muted-foreground">{fixedScheduleHint}</p>
      ) : null}

      {!useSchedulePicker ? (
        <div className="space-y-2">
          <Label htmlFor={embedded ? "attendance-meeting-name-embedded" : "attendance-meeting-name"}>
            {t("teacher.attendancePanel.meetingName.label")}
          </Label>
          <Input
            id={embedded ? "attendance-meeting-name-embedded" : "attendance-meeting-name"}
            value={nextMeetingName}
            onChange={(e) => setNextMeetingName(e.target.value.slice(0, 120))}
            placeholder={t("teacher.attendancePanel.meetingName.placeholder")}
            className="bg-background"
            autoComplete="off"
          />
          <p className="text-xs text-muted-foreground">
            {t("teacher.attendancePanel.meetingName.helper")}
          </p>
        </div>
      ) : null}

      {useSchedulePicker && courseId ? (
        <AttendanceOverviewQrPicker
          courseId={courseId}
          label={t("teacher.attendancePanel.sessionLabel")}
          hideHelper={!rosterAttendanceOverviewPicker}
          generateQrBelow
          deferAutoSelectFirstMeeting
          approvedScheduleSlots={approvedScheduleSlots}
          onSelectionChange={(id) => {
            setRosterOverviewSessionId(id);
            rosterAttendanceOverviewPicker?.onSelectionChange?.(id);
          }}
          onScheduleSlotIntent={handleRosterScheduleSlotIntent}
        />
      ) : null}

      <div className="flex flex-col gap-2">
        <Button
          type="button"
          className="w-full justify-center bg-teal-700 hover:bg-teal-800"
          onClick={requestGenerate}
          disabled={!canGenerate || checkingBeforeGenerate}
          title={
            useSchedulePicker && !canGenerate
              ? t("teacher.attendancePanel.generateQr.pickSessionFirst")
              : undefined
          }
        >
          <RefreshCw className="h-4 w-4 shrink-0" />
          {storedMeetings.length > 0
            ? t("teacher.attendancePanel.generateQr.new")
            : t("teacher.attendancePanel.generateQr.this")}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-center"
          disabled={!joinUrl || !checkInWindowOpen}
          onClick={() => setProjectorMode(true)}
        >
          <Maximize2 className="h-4 w-4 shrink-0" />
          {t("teacher.attendancePanel.projectorView")}
        </Button>
      </div>
    </div>
  );

  const qrPreview = (
    <div
      ref={qrPreviewRef}
      className="flex h-full min-h-[20rem] flex-col items-center justify-center rounded-xl border border-border bg-muted/30 px-6 py-8 text-center"
    >
      {sessionId && selectedCourse ? (
        <>
          <div className="mb-5 space-y-1">
            {checkInWindowOpen ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-800">
                <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden />
                {t("teacher.attendancePanel.live")}
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                {t("teacher.attendancePanel.ended")}
              </span>
            )}
            <p className="pt-2 text-sm font-medium text-foreground">{selectedCourse.title}</p>
            {activeMeeting?.name.trim() ? (
              <p className="text-sm text-muted-foreground">{activeMeeting.name.trim()}</p>
            ) : null}
          </div>

          {checkInWindowOpen ? (
            <>
              <div className="mb-5 rounded-2xl bg-background p-4 ring-1 ring-border">
                <QRCode value={joinUrl} size={qrSize} level="M" />
              </div>
              <p className="text-xs tabular-nums text-muted-foreground">
                {formatElapsedLabel(sessionElapsedMs)}
                <span className="text-foreground/40"> · </span>
                {t("teacher.attendancePanel.sessionTimer.remaining", {
                  time: formatElapsedLabel(sessionRemainingMs),
                })}
              </p>
              <p className="mt-2 max-w-xs text-xs text-muted-foreground">
                {t("teacher.attendancePanel.qrHint")}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-5 border-red-200 text-red-800 hover:bg-red-50 hover:text-red-900"
                onClick={stopSession}
              >
                <Square className="h-3.5 w-3.5 shrink-0 fill-current" />
                {t("teacher.attendancePanel.stopSession")}
              </Button>
            </>
          ) : isSessionManuallyStopped ? (
            <div className="max-w-sm space-y-1">
              <p className="text-sm font-medium text-foreground">
                {t("teacher.attendancePanel.sessionEnded.stopped.title")}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("teacher.attendancePanel.sessionEnded.stopped.body")}
              </p>
            </div>
          ) : isBackendSessionClosed ? (
            <div className="max-w-sm space-y-1">
              <p className="text-sm font-medium text-foreground">
                {t("teacher.attendancePanel.sessionEnded.windowEnded.title")}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("teacher.attendancePanel.sessionEnded.windowEnded.body")}
              </p>
            </div>
          ) : noTokenKnown ? (
            <div className="max-w-sm space-y-1">
              <p className="text-sm font-medium text-foreground">
                {t("teacher.attendancePanel.sessionEnded.noToken.title")}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("teacher.attendancePanel.sessionEnded.noToken.body")}
              </p>
            </div>
          ) : (
            <div className="max-w-sm space-y-1">
              <p className="text-sm font-medium text-foreground">
                {t("teacher.attendancePanel.sessionEnded.closed.title")}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("teacher.attendancePanel.sessionEnded.closed.body")}
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="flex size-12 items-center justify-center rounded-full border border-dashed border-border bg-background">
            <QrCode className="h-5 w-5" aria-hidden />
          </div>
          <p className="max-w-xs text-sm">
            {useSchedulePicker
              ? t("teacher.attendancePanel.emptyQr.pickSession")
              : t("teacher.attendancePanel.emptyQr.pickClass")}
          </p>
        </div>
      )}
    </div>
  );

  return (
    <>
      {loading ? (
        <p className="text-sm text-muted-foreground">{t("teacher.attendancePanel.loading")}</p>
      ) : courses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            {t("teacher.attendancePanel.noClasses")}{" "}
            <Link to="/dashboard/teacher/courses/new" className="font-medium text-teal-700 underline-offset-2 hover:underline">
              {t("teacher.dashboard.classesTable.createFirstClass")}
            </Link>
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start lg:gap-6">
            <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
              <p className="mb-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("teacher.attendancePanel.setupTitle")}
              </p>
              {setupControls}
            </div>
            {qrPreview}
          </div>

          {courseId ? (
            <AttendanceSessionLogsSection
              meetings={storedMeetings}
              title={t("teacher.attendancePanel.sessionLog.title")}
              description={t("teacher.attendancePanel.sessionLog.description")}
              activeSessionId={sessionId}
              onSelectMeeting={selectMeetingFromLog}
            />
          ) : null}
        </div>
      )}

      {projectorMode && joinUrl && selectedCourse ? (
        <div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-zinc-950 px-6 py-10 text-white"
          role="dialog"
          aria-label={t("teacher.attendancePanel.projector.ariaLabel")}
        >
          <p className="mb-2 max-w-4xl text-center text-xl font-semibold sm:text-2xl">{selectedCourse.title}</p>
          {activeMeeting?.name.trim() ? (
            <p className="mb-1 max-w-4xl text-center text-base font-medium text-white/85">
              {activeMeeting.name.trim()}
            </p>
          ) : null}
          <p className="mb-8 max-w-lg text-center text-sm text-white/60">
            {t("teacher.attendancePanel.projector.scanHint")}
          </p>
          {checkInWindowOpen ? (
            <>
              <p className="mb-8 text-lg font-semibold tabular-nums text-white/90">
                {formatElapsedLabel(sessionElapsedMs)}
              </p>
              <div className="rounded-3xl bg-white p-6 sm:p-10">
                <QRCode value={joinUrl} size={qrSize} level="H" />
              </div>
            </>
          ) : (
            <p className="mb-8 max-w-lg text-center text-lg text-amber-200">
              {isSessionManuallyStopped
                ? t("teacher.attendancePanel.sessionEnded.stopped.body")
                : t("teacher.attendancePanel.sessionEnded.closed.body")}
            </p>
          )}
          <Button
            type="button"
            variant="secondary"
            className="mt-10"
            onClick={() => setProjectorMode(false)}
          >
            <Minimize2 className="mr-2 h-4 w-4" />
            {t("teacher.attendancePanel.projector.exitAria")}
          </Button>
        </div>
      ) : null}

      <AlertDialog open={confirmState?.kind === "same-course"} onOpenChange={(open) => !open && setConfirmState(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("teacher.attendancePanel.confirmSameCourse.title")}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <span>
                {confirmState?.kind === "same-course"
                  ? t("teacher.attendancePanel.confirmSameCourse.body", {
                      present: confirmState.presentCount,
                      enrolled: confirmState.enrolledCount,
                      meetingName: confirmState.meetingName,
                    })
                  : ""}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("teacher.attendancePanel.confirmSameCourse.keep")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmGenerate}>
              {t("teacher.attendancePanel.confirmSameCourse.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmState?.kind === "cross-course"} onOpenChange={(open) => !open && setConfirmState(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("teacher.attendancePanel.confirmCrossCourse.title")}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <span className="space-y-2">
                <span className="block">{t("teacher.attendancePanel.confirmCrossCourse.body")}</span>
                {confirmState?.kind === "cross-course"
                  ? confirmState.sessions.map((s) => (
                      <span key={s.id} className="block rounded-md border border-border bg-muted/30 px-3 py-2 text-foreground">
                        <span className="block font-medium">{s.courseTitle}</span>
                        <span className="block text-xs text-muted-foreground">
                          {s.meetingName} · {s.presentCount ?? 0} {t("teacher.attendancePanel.confirmCrossCourse.checkedIn")} ·{" "}
                          {formatElapsedLabel(Math.max(0, Date.parse(s.endsAt) - Date.now()))}{" "}
                          {t("teacher.attendancePanel.confirmCrossCourse.remaining")}
                        </span>
                      </span>
                    ))
                  : null}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("teacher.attendancePanel.confirmCrossCourse.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmGenerate}>
              {t("teacher.attendancePanel.confirmCrossCourse.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
