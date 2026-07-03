import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";
import { AlertCircle, ArrowLeft, Loader2 } from "@/lib/icons";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { appRoutes } from "@/app/routes";
import {
  eduhubAttendance,
  eduhubCourses,
  eduhubEnrollmentApplications,
  eduhubSchedule,
  getAccessToken,
} from "@/api/eduhubClient";
import type { AttendanceJoinInfoResponse } from "@/api/eduhubTypes";
import { useAuthSession } from "@/features/auth/context";
import { buildCourseScheduleSlots } from "@/features/courses/courseScheduleSlots";
import {
  buildScheduleMonthTabs,
  orderSessionSlotsChronologically,
} from "@/features/courses/classSchedulePreview";
import {
  attendanceTuitionBlockMessage,
  isAttendanceMonthPaid,
  paymentMonthForMeetingName,
  paymentMonthForScheduleSlotKey,
  resolvePaidTuitionMonths,
} from "@/features/enrollment/enrollmentPaidMonths";
import { installmentPaymentPath } from "@/features/enrollment/enrollmentInstallmentPayments";
import type { TuitionPlanMonths } from "@/features/enrollment/enrollmentTuitionThirds";
import { cn } from "@/lib/utils";

function formatTime(value?: string): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

const ATTENDANCE_ILLUSTRATION = "/attendance-check-in-illustration.svg";

function AttendanceJoinShell({
  tone = "default",
  eyebrow,
  title,
  description,
  children,
}: {
  tone?: "default" | "success" | "warning" | "fun";
  eyebrow?: string;
  title: string;
  description: ReactNode;
  children?: ReactNode;
}) {
  const toneStyles = {
    default: "from-[#3954d0]/10 via-white to-sky-50/80",
    success: "from-emerald-50 via-white to-teal-50/70",
    warning: "from-amber-50/80 via-white to-orange-50/60",
    fun: "from-violet-50/80 via-white to-sky-50/90",
  } as const;

  return (
    <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-[1.75rem] bg-white p-6 shadow-[0_8px_32px_-8px_rgba(24,24,27,0.12)] sm:p-8">
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-gradient-to-br opacity-80 blur-2xl",
          toneStyles[tone],
        )}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-[#3954d0]/5 blur-2xl"
      />

      <div className="relative">
        <img
          src={ATTENDANCE_ILLUSTRATION}
          alt=""
          className="mx-auto mb-4 h-36 w-auto max-w-[220px] object-contain sm:h-40"
        />

        {eyebrow ? (
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3954d0]">
            {eyebrow}
          </p>
        ) : null}

        <h1
          className="mt-2 text-center text-2xl font-bold tracking-tight text-zinc-900"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          {title}
        </h1>
        <div className="mx-auto mt-3 max-w-sm text-center text-sm leading-relaxed text-zinc-600">{description}</div>

        {children ? <div className="relative mt-6 space-y-3">{children}</div> : null}
      </div>
    </div>
  );
}

export default function StudentAttendanceJoin() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const { user } = useAuthSession();
  const [info, setInfo] = useState<AttendanceJoinInfoResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [alreadyRecorded, setAlreadyRecorded] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [joinClock, setJoinClock] = useState(() => Date.now());
  const [tuitionBlock, setTuitionBlock] = useState<string | null>(null);
  const [tuitionCheckDone, setTuitionCheckDone] = useState(false);
  const [tuitionPayHref, setTuitionPayHref] = useState("/dashboard/payment");
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
        if (!cancelled) setLoadError(e instanceof Error ? e.message : t("attendance.loadSessionFailed"));
      });
    return () => {
      cancelled = true;
    };
  }, [hasToken, t, token, validParams]);

  useEffect(() => {
    if (!validParams || !hasToken || !info || user.role !== "student") {
      setTuitionBlock(null);
      setTuitionCheckDone(false);
      return;
    }
    let cancelled = false;
    setTuitionCheckDone(false);
    setTuitionBlock(null);

    const emailNorm = user.email.trim().toLowerCase();
    void (async () => {
      try {
        const [apps, sessions, course, proposal] = await Promise.all([
          eduhubEnrollmentApplications.getMy(emailNorm),
          eduhubAttendance.listSessions(info.courseId).catch(() => []),
          eduhubCourses.getById(info.courseId).catch(() => null),
          eduhubSchedule.getProposal(info.courseId).catch(() => null),
        ]);
        if (cancelled) return;
        const approved = apps.find((a) => a.courseId === info.courseId && a.status === "APPROVED");
        const slots = buildCourseScheduleSlots(course ?? {}, proposal, info.courseId);
        const ordered = orderSessionSlotsChronologically(slots);
        const session = sessions.find((s) => s.id === info.sessionId);
        const paymentMonth = session?.scheduleSlotKey
          ? paymentMonthForScheduleSlotKey(ordered, session.scheduleSlotKey)
          : paymentMonthForMeetingName(ordered, info.meetingName);
        const paidMonths = resolvePaidTuitionMonths(approved, ordered, approved?.id);
        if (!isAttendanceMonthPaid(paidMonths, paymentMonth) && paymentMonth) {
          const tabs = buildScheduleMonthTabs(ordered);
          setTuitionBlock(attendanceTuitionBlockMessage(paymentMonth, tabs));
          if (approved?.id) {
            setTuitionPayHref(installmentPaymentPath(approved.id, paymentMonth as TuitionPlanMonths));
          }
        }
      } catch {
        // Allow check-in when tuition context cannot be loaded.
      } finally {
        if (!cancelled) setTuitionCheckDone(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hasToken, info, user.email, user.role, validParams]);

  useEffect(() => {
    if (
      !validParams ||
      !hasToken ||
      user.role !== "student" ||
      confirmed ||
      processing ||
      loadError ||
      tuitionBlock ||
      !tuitionCheckDone
    ) {
      return;
    }
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
        toast.success(
          res.alreadyRecorded ? t("attendance.toastAlreadyRecorded") : t("attendance.toastRecorded"),
          {
            description: t("attendance.toastRecordedHint"),
          },
        );
      })
      .catch((e) => {
        if (!cancelled) {
          checkInStartedRef.current = false;
          setLoadError(e instanceof Error ? e.message : t("attendance.recordFailed"));
        }
      })
      .finally(() => {
        if (!cancelled) setProcessing(false);
      });
    return () => {
      cancelled = true;
    };
  }, [confirmed, hasToken, loadError, processing, t, token, tuitionBlock, tuitionCheckDone, user.role, validParams]);

  return (
    <div className="mx-auto w-full max-w-md px-2 sm:px-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        {!validParams ? (
          <AttendanceJoinShell
            tone="fun"
            eyebrow={t("attendance.eyebrowCheckIn")}
            title={t("attendance.invalidLinkTitle")}
            description={t("attendance.invalidLinkDescription")}
          >
            <Button asChild className="h-11 w-full rounded-full text-white hover:bg-[#2f47b3]" style={{ backgroundColor: "#3954d0" }}>
              <Link to="/dashboard">
                <ArrowLeft className="h-4 w-4" aria-hidden />
                {t("attendance.backToDashboard")}
              </Link>
            </Button>
          </AttendanceJoinShell>
        ) : !hasToken ? (
          <AttendanceJoinShell
            tone="default"
            eyebrow={t("attendance.almostThere")}
            title={t("attendance.signInTitle")}
            description={t("attendance.signInDescription")}
          >
            <Button asChild className="h-11 w-full rounded-full text-white hover:bg-[#2f47b3]" style={{ backgroundColor: "#3954d0" }}>
              <Link to={signInLink}>{t("attendance.signInAndCheckIn")}</Link>
            </Button>
            <Button asChild variant="ghost" className="h-11 w-full rounded-full text-zinc-600">
              <Link to="/dashboard">{t("attendance.maybeLater")}</Link>
            </Button>
          </AttendanceJoinShell>
        ) : user.role === "student" ? (
          <AttendanceJoinShell
            tone={confirmed ? "success" : checkInExpired || loadError ? "warning" : "default"}
            eyebrow={confirmed ? t("attendance.youreIn") : t("attendance.classCheckIn")}
            title={
              confirmed
                ? alreadyRecorded
                  ? t("attendance.alreadyCheckedIn")
                  : t("attendance.checkInComplete")
                : tuitionBlock
                  ? t("attendance.tuitionRequired")
                : loadError
                  ? t("attendance.somethingWrong")
                  : checkInExpired
                    ? t("attendance.checkInClosed")
                    : processing
                      ? t("attendance.recording")
                      : !tuitionCheckDone
                        ? t("attendance.checkingAccess")
                        : t("attendance.gettingReady")
            }
            description={
              info ? (
                <span className="inline-flex flex-col gap-1">
                  <span className="font-semibold text-zinc-800">{info.courseTitle}</span>
                  <span>{info.meetingName}</span>
                </span>
              ) : loadError ? (
                t("attendance.couldNotLoadSession")
              ) : (
                t("attendance.loadingSession")
              )
            }
          >
            {tuitionBlock ? (
              <div className="space-y-3">
                <div className="flex items-start gap-2 rounded-2xl border border-amber-200/80 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <span>{tuitionBlock}</span>
                </div>
                <Button asChild className="h-11 w-full rounded-full text-white hover:bg-[#2f47b3]" style={{ backgroundColor: "#3954d0" }}>
                  <Link to={tuitionPayHref}>{t("attendance.payScheduleMonth")}</Link>
                </Button>
              </div>
            ) : loadError ? (
              <div className="flex items-start gap-2 rounded-2xl border border-amber-200/80 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span>{loadError}</span>
              </div>
            ) : checkInExpired && !confirmed ? (
              <div className="rounded-2xl border border-amber-200/80 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-950">
                {t("attendance.checkInClosedSince", {
                  since: info?.endsAt ? t("attendance.since", { time: formatTime(info.endsAt) }) : "",
                })}
              </div>
            ) : confirmed ? (
              <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/90 px-4 py-4 text-center">
                <p className="text-sm font-medium text-emerald-900">
                  {alreadyRecorded ? t("attendance.alreadyOnRoster") : t("attendance.attendanceSaved")}
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 rounded-2xl bg-zinc-50 px-4 py-4 text-sm text-zinc-600">
                <Loader2 className="h-4 w-4 animate-spin text-[#3954d0]" aria-hidden />
                {processing
                  ? t("attendance.savingCheckIn")
                  : !tuitionCheckDone
                    ? t("attendance.checkingTuition")
                    : t("attendance.oneMoment")}
              </div>
            )}
            <Button asChild variant="outline" className="h-11 w-full rounded-full border-zinc-200">
              <Link to="/dashboard">{t("attendance.backToDashboard")}</Link>
            </Button>
          </AttendanceJoinShell>
        ) : (
          <AttendanceJoinShell
            tone="default"
            eyebrow={t("attendance.studentCheckIn")}
            title={t("attendance.qrForStudentsTitle")}
            description={t("attendance.qrForStudentsDescription")}
          >
            <Button asChild className="h-11 w-full rounded-full text-white hover:bg-[#2f47b3]" style={{ backgroundColor: "#3954d0" }}>
              <Link to={signInLink}>{t("attendance.signInAsStudent")}</Link>
            </Button>
            <Button asChild variant="outline" className="h-11 w-full rounded-full">
              <Link to="/dashboard/teacher/attendance">{t("attendance.teacherQrTool")}</Link>
            </Button>
          </AttendanceJoinShell>
        )}
    </div>
  );
}
