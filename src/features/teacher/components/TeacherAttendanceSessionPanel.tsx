import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import QRCode from "react-qr-code";
import { Maximize2, Minimize2, QrCode, RefreshCw } from "lucide-react";
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
import { teacherCoursesStore } from "@/features/teacher/data/teacherCoursesStore";
import type { TeacherCourse } from "@/features/teacher/types";
import { eduhubCourses } from "@/api/eduhubClient";
import {
  buildAttendanceJoinUrl,
  loadStoredMeetings,
  MAX_STORED_MEETINGS,
  persistMeetings,
  type StoredAttendanceMeeting,
} from "@/features/teacher/attendance/attendanceMeetingsStorage";

/** ~26 weeks ≈ six calendar months — rough guide for “meetings per week” hints. */
const WEEKS_IN_SIX_MONTHS = 26;

function meetingsPerWeekHint(sessionsSixMo: number): string | null {
  if (!Number.isFinite(sessionsSixMo) || sessionsSixMo < 1) return null;
  const perWeek = sessionsSixMo / WEEKS_IN_SIX_MONTHS;
  const rounded = Math.round(perWeek * 10) / 10;
  return `Your target (${sessionsSixMo} sessions in 6 months) works out to about ${rounded} class meeting${rounded === 1 ? "" : "s"} per week on average.`;
}

type Props = {
  /** Tighter layout + slightly smaller QR when used inside My Class tab */
  embedded?: boolean;
  /** When set, lock QR to this course and hide the course dropdown (e.g. course roster page). */
  fixedCourse?: { id: string; title: string; classMeetingsInSixMonths?: number };
};

export function TeacherAttendanceSessionPanel({ embedded = false, fixedCourse }: Props) {
  const { user } = useAuthSession();
  const [courses, setCourses] = useState<TeacherCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [courseId, setCourseId] = useState<string>("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [storedMeetings, setStoredMeetings] = useState<StoredAttendanceMeeting[]>([]);
  /** Required label before generating a new QR */
  const [nextMeetingName, setNextMeetingName] = useState("");
  const [projectorMode, setProjectorMode] = useState(false);

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
      const local = teacherCoursesStore.getAll();
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
          if (!cancelled) {
            const merged = [...apiCourses, ...local];
            setCourses(merged);
            setCourseId((prev) => {
              if (prev && merged.some((c) => c.id === prev)) return prev;
              return merged[0]?.id ?? "";
            });
          }
        } catch {
          if (!cancelled) {
            setCourses(local);
            setCourseId((prev) => {
              if (prev && local.some((c) => c.id === prev)) return prev;
              return local[0]?.id ?? "";
            });
          }
        }
      } else if (!cancelled) {
        setCourses(local);
        setCourseId((prev) => {
          if (prev && local.some((c) => c.id === prev)) return prev;
          return local[0]?.id ?? "";
        });
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user.id, fixedCourse?.id, fixedCourse?.title]);

  useEffect(() => {
    if (!courseId) {
      setStoredMeetings([]);
      setSessionId(null);
      return;
    }
    const list = loadStoredMeetings(courseId);
    setStoredMeetings(list);
    setSessionId((prev) => {
      if (prev && list.some((m) => m.sessionId === prev)) return prev;
      return list[0]?.sessionId ?? null;
    });
  }, [courseId]);

  const generateSession = useCallback(() => {
    if (!courseId) return;
    const name = nextMeetingName.trim();
    if (!name) return;
    const next: StoredAttendanceMeeting = {
      sessionId: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      modality: "online",
      name,
    };
    setStoredMeetings((prev) => {
      const merged = [next, ...prev.filter((p) => p.sessionId !== next.sessionId)].slice(0, MAX_STORED_MEETINGS);
      persistMeetings(courseId, merged);
      return merged;
    });
    setSessionId(next.sessionId);
    setNextMeetingName("");
  }, [courseId, nextMeetingName]);

  const selectedCourse = useMemo(
    () => courses.find((c) => c.id === courseId),
    [courses, courseId],
  );

  const joinUrl =
    courseId && sessionId ? buildAttendanceJoinUrl(courseId, sessionId) : "";

  const activeMeeting = useMemo(
    () => storedMeetings.find((m) => m.sessionId === sessionId),
    [storedMeetings, sessionId],
  );

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

  return (
    <>
      <Card className="border border-gray-100 shadow-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <QrCode className="h-5 w-5 text-[#1e40af]" />
            Class meeting check-in
          </CardTitle>
          <CardDescription>
            {fixedCourse
              ? "Name each meeting, generate a QR (or share the link), and use projector mode when you need it. Past meetings stay on this browser (see Student attendance overview below for a list by name)."
              : embedded
                ? "Name the meeting, then generate. Share the link or show the QR. Older meetings stay in this browser."
                : "Generate a check-in code for each session; recent meetings are kept on this device."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? (
            <p className="text-sm text-foreground/60">Loading classes…</p>
          ) : courses.length === 0 ? (
            <p className="text-sm text-foreground/70">
              No classes yet.{" "}
              <Link to="/dashboard/teacher/courses/new" className="text-[#1e40af] font-medium underline">
                Create a class
              </Link>{" "}
              first.
            </p>
          ) : (
            <>
              {!fixedCourse ? (
                <div className="space-y-2">
                  <Label htmlFor={embedded ? "attendance-course-embedded" : "attendance-course"}>Class</Label>
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
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  className="rounded-full bg-[#1e40af] hover:bg-[#1e3a8a]"
                  onClick={generateSession}
                  disabled={!courseId || !nextMeetingName.trim()}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {storedMeetings.length > 0 ? "New QR for next meeting" : "Generate QR for this meeting"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full"
                  disabled={!joinUrl}
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
                  <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200/80">
                    <QRCode value={joinUrl} size={qrSize} level="M" />
                  </div>
                  <p className="text-xs text-center text-foreground/55 max-w-md">
                    Scan opens student check-in for this meeting only. Meeting id (support):{" "}
                    <span className="font-mono text-foreground/70">{sessionId.slice(0, 8)}…</span>
                  </p>
                </div>
              ) : (
                <p className="text-sm text-foreground/60">
                  Pick a class and tap Generate QR for this meeting to create the code for today&apos;s session.
                </p>
              )}
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
          <p className="text-sm text-white/70 mb-8 text-center max-w-lg">
            {activeMeeting?.modality === "online"
              ? "Online meeting check-in · Scan or open link · Esc to exit"
              : activeMeeting
                ? "In-person meeting check-in · Scan to check in · Esc to exit"
                : "Class meeting check-in · Scan to check in · Esc to exit"}
          </p>
          <div className="rounded-3xl bg-white p-6 sm:p-10 shadow-2xl">
            <QRCode value={joinUrl} size={qrSize} level="H" />
          </div>
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
