import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { appRoutes } from "@/app/routes";
import { eduhubCourses, getAccessToken } from "@/api/eduhubClient";
import { isUuid } from "@/api/utils";
import { useAuthSession } from "@/features/auth/context";
import { recordAttendanceCheckIn } from "@/features/attendance/attendanceRollStorage";
import { loadStoredMeetings } from "@/features/teacher/attendance/attendanceMeetingsStorage";

function parseStoredAttendanceValue(raw: string): string {
  try {
    const p = JSON.parse(raw) as { checkedAt?: string };
    if (p && typeof p.checkedAt === "string") return p.checkedAt;
  } catch {
    /* legacy plain ISO string */
  }
  return raw;
}

function buildAttendanceSessionPayload(courseId: string, sessionId: string, checkedAt: string): string {
  const meetings = loadStoredMeetings(courseId);
  const meta = meetings.find((m) => m.sessionId === sessionId);
  const meetingName = meta?.name?.trim();
  return JSON.stringify({
    checkedAt,
    ...(meetingName ? { meetingName } : {}),
  });
}

export default function StudentAttendanceJoin() {
  const [searchParams] = useSearchParams();
  const courseId = searchParams.get("courseId") ?? "";
  const session = searchParams.get("session") ?? "";
  const { user } = useAuthSession();
  const [courseTitle, setCourseTitle] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const validParams = Boolean(courseId && session);
  const hasToken = Boolean(getAccessToken());
  const joinPath = useMemo(
    () => `/dashboard/attendance/join?courseId=${encodeURIComponent(courseId)}&session=${encodeURIComponent(session)}`,
    [courseId, session],
  );
  const signInLink = `${appRoutes.signIn}?redirect=${encodeURIComponent(joinPath)}`;

  useEffect(() => {
    if (!validParams || !isUuid(courseId)) return;
    let cancelled = false;
    (async () => {
      try {
        const c = await eduhubCourses.getById(courseId);
        if (!cancelled) setCourseTitle(c.title);
      } catch {
        if (!cancelled) {
          setLoadError("Could not load class details.");
          setCourseTitle(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [courseId, validParams]);

  const storageKey = useMemo(
    () => (validParams ? `attendance-checkin:${courseId}:${session}` : ""),
    [courseId, session, validParams],
  );

  useEffect(() => {
    if (!validParams || !storageKey || !hasToken) return;
    if (user.role !== "student") return;

    const already = sessionStorage.getItem(storageKey);
    const studentKey = user.id ?? `email:${user.email.trim().toLowerCase()}`;
    if (already) {
      setConfirmed(true);
      const checkedAt = parseStoredAttendanceValue(already);
      sessionStorage.setItem(storageKey, buildAttendanceSessionPayload(courseId, session, checkedAt));
      recordAttendanceCheckIn(courseId, session, studentKey, user.email, user.name);
      return;
    }

    const checkedAt = new Date().toISOString();
    sessionStorage.setItem(storageKey, buildAttendanceSessionPayload(courseId, session, checkedAt));
    recordAttendanceCheckIn(courseId, session, studentKey, user.email, user.name);
    setConfirmed(true);
    toast.success("Attendance check-in recorded", {
      description:
        "Saved on this device’s browser only. Your teacher’s roster table updates if they use this same browser (or another tab here); scanning on a different device won’t show up on their laptop yet.",
    });
  }, [validParams, storageKey, user.role, hasToken, courseId, session, user.id, user.email, user.name]);

  return (
    <div className="flex min-h-[min(70dvh,calc(100dvh-12rem))] items-center justify-center bg-slate-50 py-8">
        <div className="w-full max-w-lg">
          {!validParams ? (
            <Card>
              <CardHeader>
                <CardTitle>Invalid link</CardTitle>
                <CardDescription>
                  This attendance link is missing details. Ask your instructor to generate a new QR code.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline">
                  <Link to="/dashboard">Go to dashboard</Link>
                </Button>
              </CardContent>
            </Card>
          ) : !hasToken ? (
            <Card>
              <CardHeader>
                <CardTitle>Sign in to check in</CardTitle>
                <CardDescription>
                  Use your student account so we can record attendance for this session.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <Button asChild className="rounded-full">
                  <Link to={signInLink}>Sign in</Link>
                </Button>
                <Button asChild variant="ghost" className="rounded-full text-slate-600">
                  <Link to="/dashboard">Cancel</Link>
                </Button>
              </CardContent>
            </Card>
          ) : user.role === "student" ? (
            <Card className="border-emerald-100 shadow-sm">
              <CardHeader className="text-center pb-2">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
                  <GraduationCap className="h-7 w-7 text-emerald-700" />
                </div>
                <CardTitle className="text-xl">Attendance</CardTitle>
                <CardDescription>
                  {courseTitle ?? (loadError ? "Class" : "Loading class…")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-center">
                {confirmed ? (
                  <div className="flex flex-col items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/80 px-4 py-6">
                    <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                    <p className="text-sm font-medium text-emerald-900">You&apos;re checked in for this session.</p>
                    <p className="text-xs text-emerald-800/80 max-w-sm">
                      We won&apos;t double-count this browser session if you scan again. Full roster sync runs when your
                      school connects the attendance API.
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-slate-600">Processing…</p>
                )}
                <Button asChild className="w-full rounded-full">
                  <Link to="/dashboard">Back to dashboard</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Student check-in</CardTitle>
                <CardDescription>
                  This QR link is for enrolled students. Sign in as a student to complete check-in, or open the teacher{" "}
                  <Link to="/dashboard/teacher/attendance" className="text-[#1e40af] underline font-medium">
                    Attendance QR
                  </Link>{" "}
                  page to create a code.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 sm:flex-row">
                <Button asChild className="rounded-full">
                  <Link to={signInLink}>Sign in as student</Link>
                </Button>
                <Button asChild variant="outline" className="rounded-full">
                  <Link to="/dashboard/teacher/attendance">Teacher QR tool</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
    </div>
  );
}
