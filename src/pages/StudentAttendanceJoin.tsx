import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, GraduationCap } from "@/lib/icons";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { appRoutes } from "@/app/routes";
import { eduhubAttendance, getAccessToken } from "@/api/eduhubClient";
import type { AttendanceJoinInfoResponse } from "@/api/eduhubTypes";
import { useAuthSession } from "@/features/auth/context";

function formatTime(value?: string): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function StudentAttendanceJoin() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const { user } = useAuthSession();
  const [info, setInfo] = useState<AttendanceJoinInfoResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [alreadyRecorded, setAlreadyRecorded] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [joinClock, setJoinClock] = useState(() => Date.now());
  const checkInStartedRef = useRef(false);

  const hasToken = Boolean(getAccessToken());
  const validParams = Boolean(token.trim());
  const joinPath = useMemo(
    () => `/dashboard/attendance/join?token=${encodeURIComponent(token)}`,
    [token],
  );
  const signInLink = `${appRoutes.signIn}?redirect=${encodeURIComponent(joinPath)}`;

  const endsAtMs = info?.endsAt ? Date.parse(info.endsAt) : NaN;
  const checkInExpired = info?.status === "CLOSED" || (Number.isFinite(endsAtMs) && joinClock >= endsAtMs);

  useEffect(() => {
    const tick = () => setJoinClock(Date.now());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!validParams || !hasToken) return;
    let cancelled = false;
    setLoadError(null);
    eduhubAttendance
      .joinInfo(token)
      .then((res) => {
        if (!cancelled) {
          setInfo(res);
          setAlreadyRecorded(res.alreadyCheckedIn);
          setConfirmed(res.alreadyCheckedIn);
        }
      })
      .catch((e) => {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "Could not load attendance session.");
      });
    return () => {
      cancelled = true;
    };
  }, [hasToken, token, validParams]);

  useEffect(() => {
    if (!validParams || !hasToken || user.role !== "student" || confirmed || processing || loadError) return;
    if (checkInStartedRef.current) return;
    let cancelled = false;
    checkInStartedRef.current = true;
    setProcessing(true);
    eduhubAttendance
      .checkIn(token)
      .then((res) => {
        if (cancelled) return;
        setConfirmed(true);
        setAlreadyRecorded(res.alreadyRecorded);
        toast.success(res.alreadyRecorded ? "Attendance already recorded" : "Attendance check-in recorded", {
          description: "Your instructor can now see this check-in in the class attendance roster.",
        });
      })
      .catch((e) => {
        if (!cancelled) {
          checkInStartedRef.current = false;
          setLoadError(e instanceof Error ? e.message : "Could not record attendance check-in.");
        }
      })
      .finally(() => {
        if (!cancelled) setProcessing(false);
      });
    return () => {
      cancelled = true;
    };
  }, [confirmed, hasToken, loadError, processing, token, user.role, validParams]);

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
              <CardDescription>Use your student account so we can record attendance for this session.</CardDescription>
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
                {info ? `${info.courseTitle} · ${info.meetingName}` : loadError ? "Class" : "Loading class..."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              {loadError ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-5 text-sm text-amber-950">
                  {loadError}
                </div>
              ) : checkInExpired && !confirmed ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-5 text-sm text-amber-950">
                  Check-in is closed{info?.endsAt ? ` since ${formatTime(info.endsAt)}` : ""}. Ask your instructor to generate a new QR if attendance is still open.
                </div>
              ) : confirmed ? (
                <div className="flex flex-col items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/80 px-4 py-6">
                  <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                  <p className="text-sm font-medium text-emerald-900">
                    {alreadyRecorded ? "You're already checked in for this session." : "You're checked in for this session."}
                  </p>
                  <p className="text-xs text-emerald-800/80 max-w-sm">
                    Your check-in is saved on the EduHub attendance roster.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-slate-600">{processing ? "Recording check-in..." : "Preparing check-in..."}</p>
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
