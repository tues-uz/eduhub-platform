import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import QRCode from "react-qr-code";
import { Maximize2, Minimize2, QrCode, RefreshCw, Square } from "@/lib/icons";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { isUuid } from "@/api/utils";
import {
  buildCourseScheduleSlots,
  toApprovedScheduleSlotOptions,
} from "@/features/courses/courseScheduleSlots";
import {
  refreshScheduleAttendanceState,
  scheduleSlotKeyFromParts,
} from "@/features/teacher/attendance/heldScheduleMeetingsStorage";
import {
  notifyAttendanceQrGenerated,
  notifyAttendanceSessionCompleted,
} from "@/features/notifications/appNotificationStore";
import {
  ATTENDANCE_SESSION_MAX_MS,
  fetchAttendanceMeetings,
  MAX_STORED_MEETINGS,
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
      return;
    }
    if (!courseId || !isUuid(courseId)) {
      setLoadedScheduleSlots([]);
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
      })
      .catch(() => {
        if (!cancelled) setLoadedScheduleSlots([]);
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
          return list.map((m) => ({ ...m, token: prevById.get(m.sessionId)?.token }));
        });
        setCurrentSessionToken(null);
        setSessionId((prev) => {
          if (prev && list.some((m) => m.sessionId === prev)) return prev;
          const open = list.find((m) => m.status === "OPEN");
          return open?.sessionId ?? list[0]?.sessionId ?? null;
        });
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
    const prevMeeting = prevSessionId ? storedMeetings.find((m) => m.sessionId === prevSessionId) : undefined;
    const courseTitle = selectedCourse?.title?.trim() || "Class";

    const slotIndex = scheduleSlotForGenerate?.index;
    const scheduleSlotKey = slotKeyForScheduleOption(scheduleSlotForGenerate);
    let created;
    try {
      created = await eduhubAttendance.createSession(courseId, {
        meetingName: name,
        modality: "IN_PERSON",
        scheduleSlotIndex: typeof slotIndex === "number" && slotIndex >= 0 ? slotIndex : undefined,
        scheduleSlotKey,
      });
    } catch (e) {
      toast.error("Could not generate attendance QR", {
        description: e instanceof Error ? e.message : "Please try again.",
      });
      return;
    }

    // Backend auto-closes the previous open session (reason NEW_SESSION) as part of createSession.
    if (prevMeeting && !prevMeeting.endedAt) {
      const startMs = new Date(prevMeeting.createdAt).getTime();
      const endMs = new Date(created.startedAt).getTime();
      if (Number.isFinite(startMs) && Number.isFinite(endMs)) {
        notifyAttendanceSessionCompleted({
          id: prevMeeting.sessionId,
          courseTitle,
          meetingName: prevMeeting.name,
          endedAt: created.startedAt,
          durationMs: Math.max(0, endMs - startMs),
          endReason: "NEW_SESSION",
          instructorEmail: user.email ?? "",
          instructorName: user.name ?? "",
        });
      }
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
    setNextMeetingName(useSchedulePicker ? "" : (suggestedMeetingName?.trim() ?? ""));

    notifyAttendanceQrGenerated({
      id: next.sessionId,
      courseTitle,
      meetingName: name,
      startedAt: created.startedAt,
      instructorEmail: user.email ?? "",
      instructorName: user.name ?? "",
    });
    if (useSchedulePicker) {
      setRosterScheduleSlotIntent(null);
    }
  }, [
    courseId,
    nextMeetingName,
    scheduleSlotForGenerate,
    slotKeyForScheduleOption,
    sessionId,
    selectedCourse?.title,
    storedMeetings,
    suggestedMeetingName,
    useSchedulePicker,
    user.email,
    user.name,
  ]);

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
    const courseTitle = selectedCourse?.title?.trim() || "Class";
    const meetingName = activeMeeting.name.trim() || "Meeting";
    const startedAtIso = activeMeeting.createdAt;
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
        const startMs = new Date(startedAtIso).getTime();
        const endMs = closed.endedAt ? new Date(closed.endedAt).getTime() : NaN;
        if (Number.isFinite(startMs) && Number.isFinite(endMs)) {
          notifyAttendanceSessionCompleted({
            id: sid,
            courseTitle,
            meetingName,
            endedAt: closed.endedAt as string,
            durationMs: Math.max(0, endMs - startMs),
            endReason: closed.endReason ?? "MAX_DURATION",
            instructorEmail: user.email ?? "",
            instructorName: user.name ?? "",
          });
        }
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
    selectedCourse?.title,
    user.email,
    user.name,
  ]);

  const stopSession = useCallback(async () => {
    if (!courseId || !sessionId || !activeMeeting) return;
    if (manuallyStoppedSessionIds.includes(sessionId)) return;
    if (manualStopOnceRef.current.has(sessionId)) return;
    manualStopOnceRef.current.add(sessionId);

    const courseTitle = selectedCourse?.title?.trim() || "Class";
    const meetingName = activeMeeting.name.trim() || "Meeting";
    const startedAtIso = activeMeeting.createdAt;

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
        const startMs = new Date(startedAtIso).getTime();
        const endMs = closed.endedAt ? new Date(closed.endedAt).getTime() : NaN;
        if (Number.isFinite(startMs) && Number.isFinite(endMs)) {
          notifyAttendanceSessionCompleted({
            id: sessionId,
            courseTitle,
            meetingName,
            endedAt: closed.endedAt as string,
            durationMs: Math.max(0, endMs - startMs),
            endReason: closed.endReason ?? "MANUAL_STOP",
            instructorEmail: user.email ?? "",
            instructorName: user.name ?? "",
          });
        }
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
    selectedCourse?.title,
    user.email,
    user.name,
  ]);

  return (
    <>
      <Card className="border border-gray-100 shadow-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <QrCode className="h-5 w-5 text-[#1e40af]" />{t("teacher.attendancePanel.title")}</CardTitle>
          <CardDescription>
            {fixedCourse
              ? "Pick the planned session from your class schedule, then generate the QR. Stopping the session marks that meeting as held for enrollment."
              : useSchedulePicker
                ? "Pick the planned session from your class schedule, then generate the QR. When you stop the session, that meeting is marked held for enrollment."
                : embedded
                  ? "Name the meeting, then generate. Share the link or show the QR. Older meetings stay in this browser."
                  : "Generate a check-in code for each session; recent meetings are kept on this device."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? (
            <p className="text-sm text-foreground/60">{t("teacher.courses.loading")}</p>
          ) : courses.length === 0 ? (
            <p className="text-sm text-foreground/70">{t("teacher.dashboard.classesTable.emptyPrefix")}{" "}
              <Link to="/dashboard/teacher/courses/new" className="text-[#1e40af] font-medium underline">
                Create a class
              </Link>{" "}
              first.
            </p>
          ) : (
            <>
              {!fixedCourse ? (
                <div className="space-y-2">
                  <Label htmlFor={embedded ? "attendance-course-embedded" : "attendance-course"}>{t("teacher.dashboard.classesTable.header.class")}</Label>
                  <Select value={courseId} onValueChange={setCourseId}>
                    <SelectTrigger id={embedded ? "attendance-course-embedded" : "attendance-course"} className="bg-white">
                      <SelectValue placeholder="Select class" />
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
                <div className="rounded-lg border border-slate-200 bg-slate-50/90 px-4 py-3 text-sm text-slate-700">
                  {fixedScheduleHint}
                </div>
              ) : fixedCourse ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50/90 px-4 py-3 text-sm text-slate-700">
                  Set &quot;Sessions in 6 months&quot; on the class details form so we can estimate meetings per week next
                  to your QR workflow.
                </div>
              ) : null}

              {!useSchedulePicker ? (
                <div className="space-y-2">
                  <Label htmlFor={embedded ? "attendance-meeting-name-embedded" : "attendance-meeting-name"}>
                    Name this class meeting
                  </Label>
                  <Input
                    id={embedded ? "attendance-meeting-name-embedded" : "attendance-meeting-name"}
                    value={nextMeetingName}
                    onChange={(e) => setNextMeetingName(e.target.value.slice(0, 120))}
                    placeholder='e.g. Week 3 — Tuesday, or "Midterm review (online)"'
                    className="max-w-xl bg-white"
                    autoComplete="off"
                  />
                  <p className="text-xs text-muted-foreground max-w-xl">
                    Enter a short name before generating the QR (shown under the code and in projector view).
                    {suggestedMeetingName?.trim() ? (
                      <>
                        {" "}
                        <span className="text-foreground/75">
                          Pre-filled from your scheduled cover session; edit if you need a different label.
                        </span>
                      </>
                    ) : null}
                  </p>
                </div>
              ) : null}

              {useSchedulePicker && courseId ? (
                <AttendanceOverviewQrPicker
                  courseId={courseId}
                  className="mb-0"
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

              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  className="rounded-full bg-[#1e40af] hover:bg-[#1e3a8a]"
                  onClick={generateSession}
                  disabled={
                    !courseId ||
                    (!useSchedulePicker && !nextMeetingName.trim()) ||
                    (useSchedulePicker && !rosterOverviewSessionId && !rosterScheduleSlotIntent)
                  }
                  title={
                    useSchedulePicker && !rosterOverviewSessionId && !rosterScheduleSlotIntent
                      ? "Choose a planned session from the schedule dropdown above first."
                      : undefined
                  }
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {storedMeetings.length > 0 ? "New QR for next meeting" : "Generate QR for this meeting"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full"
                  disabled={!joinUrl || !checkInWindowOpen}
                  onClick={() => setProjectorMode(true)}
                >
                  <Maximize2 className="h-4 w-4 mr-2" />
                  Projector view
                </Button>
              </div>

              {sessionId && selectedCourse ? (
                <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-6 flex flex-col items-center gap-4">
                  <div className="text-center space-y-1">
                    <p className="text-sm font-medium text-foreground">{selectedCourse.title}</p>
                    {activeMeeting?.name.trim() ? (
                      <p className="text-sm text-[#1e40af] font-medium">{activeMeeting.name.trim()}</p>
                    ) : null}
                    {activeMeeting ? (
                      <p className="text-xs text-muted-foreground">
                        {activeMeeting.modality === "online"
                          ? "Online check-in — students can scan or open the link away from campus."
                          : "In-person check-in — students scan in the room."}
                      </p>
                    ) : null}
                  </div>
                  {checkInWindowOpen ? (
                    <>
                      <div className="w-full max-w-md rounded-lg border border-[#1e40af]/25 bg-[#1e40af]/[0.06] px-4 py-3 text-center">
                        <p className="text-xs font-medium uppercase tracking-wide text-[#1e40af]/90">
                          Class session time
                        </p>
                        <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                          {formatElapsedLabel(sessionElapsedMs)}
                          <span className="text-sm font-normal text-muted-foreground">
                            {" "}
                            / {formatElapsedLabel(ATTENDANCE_SESSION_MAX_MS)} max
                          </span>
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Check-in closes automatically after{" "}
                          {formatElapsedLabel(ATTENDANCE_SESSION_MAX_MS)} total ·{" "}
                          {formatElapsedLabel(sessionRemainingMs)} remaining
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-3 rounded-full border-red-200 bg-white text-red-800 hover:bg-red-50 hover:text-red-900"
                          onClick={stopSession}
                        >
                          <Square className="h-3.5 w-3.5 mr-2 fill-current" />
                          Stop session
                        </Button>
                      </div>
                      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200/80">
                        <QRCode value={joinUrl} size={qrSize} level="M" />
                      </div>
                      <p className="text-xs text-center text-foreground/55 max-w-md">
                        Scan opens student check-in for this meeting only. Meeting id (support):{" "}
                        <span className="font-mono text-foreground/70">{sessionId.slice(0, 8)}…</span>
                      </p>
                    </>
                  ) : isSessionManuallyStopped ? (
                    <div className="w-full max-w-md rounded-lg border border-amber-200 bg-amber-50/90 px-4 py-5 text-center">
                      <p className="text-sm font-semibold text-amber-950">Session stopped</p>
                      <p className="mt-2 text-sm text-amber-950/85">
                        You ended check-in for this meeting ({formatElapsedLabel(sessionElapsedMs)}). Generate a new QR
                        when you are ready for another check-in window.
                      </p>
                    </div>
                  ) : isBackendSessionClosed ? (
                    <div className="w-full max-w-md rounded-lg border border-amber-200 bg-amber-50/90 px-4 py-5 text-center">
                      <p className="text-sm font-semibold text-amber-950">Check-in closed</p>
                      <p className="mt-2 text-sm text-amber-950/85">
                        This meeting is closed on the server. Generate a new QR when you need another check-in window.
                      </p>
                    </div>
                  ) : noTokenKnown ? (
                    <div className="w-full max-w-md rounded-lg border border-amber-200 bg-amber-50/90 px-4 py-5 text-center">
                      <p className="text-sm font-semibold text-amber-950">QR not available in this tab</p>
                      <p className="mt-2 text-sm text-amber-950/85">
                        This meeting is still open on the server, but its one-time QR code isn&apos;t available here
                        (e.g. after a page reload). Generate a new QR to show a scannable code again.
                      </p>
                    </div>
                  ) : (
                    <div className="w-full max-w-md rounded-lg border border-amber-200 bg-amber-50/90 px-4 py-5 text-center">
                      <p className="text-sm font-semibold text-amber-950">Check-in window ended</p>
                      <p className="mt-2 text-sm text-amber-950/85">
                        This session ran for {formatElapsedLabel(ATTENDANCE_SESSION_MAX_MS)} (the maximum length).
                        Generate a new QR if you need another check-in period.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-foreground/60">
                  {rosterAttendanceOverviewPicker
                    ? "Tap Generate below to create the check-in QR for this class."
                    : "Pick a class and tap Generate QR for this meeting to create the code for today's session."}
                </p>
              )}

              {courseId ? (
                <AttendanceSessionLogsSection
                  meetings={storedMeetings}
                  title="Session log (this class)"
                  description="Each QR starts a session; time in class is recorded when you tap Stop session, the 2h 15m cap is confirmed, or you start a new QR."
                />
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      {projectorMode && joinUrl && selectedCourse ? (
        <div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black px-6 py-10 text-white"
          role="dialog"
          aria-label="Projector attendance QR"
        >
          <p className="text-xl sm:text-2xl font-semibold text-center mb-2 max-w-4xl">{selectedCourse.title}</p>
          {activeMeeting?.name.trim() ? (
            <p className="text-base text-white/90 font-medium text-center mb-1 max-w-4xl">{activeMeeting.name.trim()}</p>
          ) : null}
          <p className="text-sm text-white/70 mb-4 text-center max-w-lg">
            {activeMeeting?.modality === "online"
              ? "Online meeting check-in · Scan or open link · Esc to exit"
              : activeMeeting
                ? "In-person meeting check-in · Scan to check in · Esc to exit"
                : "Class meeting check-in · Scan to check in · Esc to exit"}
          </p>
          {checkInWindowOpen ? (
            <>
              <p className="text-lg font-semibold tabular-nums text-white mb-8">
                Session: {formatElapsedLabel(sessionElapsedMs)} / {formatElapsedLabel(ATTENDANCE_SESSION_MAX_MS)}
              </p>
              <div className="rounded-3xl bg-white p-6 sm:p-10 shadow-2xl">
                <QRCode value={joinUrl} size={qrSize} level="H" />
              </div>
            </>
          ) : isSessionManuallyStopped ? (
            <p className="text-lg text-center text-amber-200 max-w-lg mb-8">
              Session stopped — check-in closed for this meeting. Generate a new QR to continue.
            </p>
          ) : (
            <p className="text-lg text-center text-amber-200 max-w-lg mb-8">
              Check-in closed — session reached {formatElapsedLabel(ATTENDANCE_SESSION_MAX_MS)}. Generate a new QR to
              continue.
            </p>
          )}
          <Button
            type="button"
            variant="secondary"
            className="mt-10 rounded-full"
            onClick={() => setProjectorMode(false)}
          >
            <Minimize2 className="h-4 w-4 mr-2" />
            Exit projector view
          </Button>
        </div>
      ) : null}
    </>
  );
}
