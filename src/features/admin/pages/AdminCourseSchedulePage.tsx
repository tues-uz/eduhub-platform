import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Send } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { eduhubAdmin, eduhubCourses, eduhubSchedule } from "@/api/eduhubClient";
import { isUuid } from "@/api/utils";
import type { ScheduleProposalResponse, ScheduleSessionDto } from "@/api/eduhubTypes";
import { CourseStatusBadge } from "@/features/admin/components/AdminStatusBadges";
import { parseOptionalPositiveInt } from "@/features/teacher/pages/teacherCourseFormHelpers";

function formatClassDate(iso?: string): string {
  if (!iso?.trim()) return "—";
  const d = new Date(iso.trim());
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(d);
}

function padSessions(n: number, raw?: ScheduleSessionDto[]): ScheduleSessionDto[] {
  const base = Array.isArray(raw)
    ? raw.map((s) => ({
        title: s.title ?? "",
        sessionDate: s.sessionDate ?? "",
        sessionTime: s.sessionTime ?? "",
        durationMinutes: s.durationMinutes ?? undefined,
      }))
    : [];
  const out = base.slice(0, Math.max(0, n));
  while (out.length < n) {
    out.push({ title: "", sessionDate: "", sessionTime: "", durationMinutes: undefined });
  }
  return out;
}

export default function AdminCourseSchedulePage() {
  const { courseId = "" } = useParams<{ courseId: string }>();
  const [title, setTitle] = useState("");
  const [courseStatus, setCourseStatus] = useState("");
  const [sessionCount, setSessionCount] = useState("");
  const [sessions, setSessions] = useState<ScheduleSessionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [proposal, setProposal] = useState<ScheduleProposalResponse | null>(null);
  const [scheduleRejectionNote, setScheduleRejectionNote] = useState<string | undefined>();

  useEffect(() => {
    if (!courseId || !isUuid(courseId)) {
      setLoading(false);
      setError("Invalid class id.");
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");

    Promise.all([
      eduhubCourses.getById(courseId),
      eduhubSchedule.getProposal(courseId).catch(() => null),
    ])
      .then(([course, proposalData]) => {
        if (cancelled) return;
        setTitle(course.title);
        setCourseStatus(course.status);
        setScheduleRejectionNote(course.scheduleRejectionNote);

        if (proposalData) {
          setProposal(proposalData);
          const count = proposalData.sessionCount;
          setSessionCount(String(count));
          setSessions(
            padSessions(
              count,
              proposalData.sessions.map((s) => ({
                title: s.title,
                sessionDate: s.sessionDate,
                sessionTime: s.sessionTime,
                durationMinutes: s.durationMinutes,
              }))
            )
          );
        } else {
          const count = course.classMeetingsInSixMonths ?? 12;
          setSessionCount(String(count));
          setSessions(
            padSessions(
              count,
              course.classMeetingSlots?.map((s) => ({
                title: s.title ?? "",
                sessionDate: s.sessionDate ?? "",
                sessionTime: s.sessionTime ?? "",
              }))
            )
          );
        }
      })
      .catch(() => {
        if (!cancelled) setError("Could not load class.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  useEffect(() => {
    const n = parseOptionalPositiveInt(sessionCount.trim());
    if (n === undefined) return;
    setSessions((prev) => padSessions(n, prev));
  }, [sessionCount]);

  const updateSession = useCallback((index: number, patch: Partial<ScheduleSessionDto>) => {
    setSessions((prev) => {
      const next = prev.map((s) => ({ ...s }));
      while (next.length <= index) next.push({ title: "", sessionDate: "", sessionTime: "" });
      next[index] = {
        title: next[index]?.title ?? "",
        sessionDate: next[index]?.sessionDate ?? "",
        sessionTime: next[index]?.sessionTime ?? "",
        ...patch,
      };
      return next;
    });
  }, []);

  const handleSendToInstructor = async () => {
    const n = parseOptionalPositiveInt(sessionCount.trim());
    if (n === undefined || n < 1) {
      toast.error("Enter a valid number of sessions (whole number ≥ 1).");
      return;
    }
    setSaving(true);
    try {
      const sessionsPayload = sessions.slice(0, n).map((s, i) => ({
        title: s.title || `Session ${i + 1}`,
        sessionDate: s.sessionDate || undefined,
        sessionTime: s.sessionTime || undefined,
        durationMinutes: s.durationMinutes || undefined,
      }));

      const result = await eduhubAdmin.proposeSchedule(courseId, {
        sessionCount: n,
        sessions: sessionsPayload,
      });

      setProposal(result);
      setCourseStatus("SCHEDULE_PENDING");
      toast.success("Schedule sent to instructor for approval");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send");
    } finally {
      setSaving(false);
    }
  };

  const sessionsCount = parseOptionalPositiveInt(sessionCount.trim());

  const classStartDisplay = useMemo(() => {
    const dates = sessions
      .map((s) => s.sessionDate)
      .filter((d): d is string => !!d?.trim())
      .sort();
    return dates[0] || undefined;
  }, [sessions]);

  const classEndDisplay = useMemo(() => {
    const dates = sessions
      .map((s) => s.sessionDate)
      .filter((d): d is string => !!d?.trim())
      .sort();
    return dates[dates.length - 1] || undefined;
  }, [sessions]);

  if (!isUuid(courseId)) {
    return (
      <AdminLayout>
        <div className="container mx-auto px-6">
          <p className="text-sm text-red-600">Invalid class id.</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto px-6 max-w-2xl">
        <Link
          to={`/dashboard/admin/courses/${courseId}`}
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Class overview
        </Link>

        <AdminPageHeader
          title="Class schedule"
          description="Set sessions and optional date/time per session, then send to the instructor for approval."
        />

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-sm text-slate-600">Course status:</span>
          <CourseStatusBadge status={courseStatus} />
          {courseStatus === "SCHEDULE_PENDING" && (
            <span className="text-sm text-blue-600">— Waiting for instructor approval</span>
          )}
          {courseStatus === "SCHEDULE_APPROVED" && (
            <span className="text-sm text-teal-600">— Schedule approved, ready to publish</span>
          )}
          {scheduleRejectionNote && (
            <p className="text-sm text-red-800 w-full mt-1 rounded-md border border-red-200 bg-red-50 px-3 py-2">
              Instructor note: {scheduleRejectionNote}
            </p>
          )}
        </div>

        {loading ? (
          <p className="text-sm text-slate-600">Loading…</p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : (
          <>
            <p className="text-sm text-slate-700 mb-3">
              <span className="font-medium text-slate-900">{title}</span>
            </p>

            <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50/90 px-3 py-2.5 text-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                <div className="flex justify-between gap-4 sm:justify-start sm:gap-8">
                  <span className="text-slate-500 shrink-0">Class start</span>
                  <span className="tabular-nums font-medium text-slate-900 text-right sm:text-left">
                    {formatClassDate(classStartDisplay)}
                  </span>
                </div>
                <div className="flex justify-between gap-4 sm:justify-start sm:gap-8">
                  <span className="text-slate-500 shrink-0">Class end</span>
                  <span className="tabular-nums font-medium text-slate-900 text-right sm:text-left">
                    {formatClassDate(classEndDisplay)}
                  </span>
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                From the earliest and latest session dates you enter below.
              </p>
            </div>

            <Card className="w-full overflow-hidden rounded-2xl border-slate-200/90 shadow-sm">
              <CardContent className="space-y-8 p-0 px-4 pb-4 pt-4">
                <section className="space-y-2">
                  <label
                    htmlFor="adminClassMeetings6m"
                    className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500"
                  >
                    Sessions in 6 months <span className="text-red-600">*</span>
                  </label>
                  <Input
                    id="adminClassMeetings6m"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={sessionCount}
                    onChange={(e) => setSessionCount(e.target.value.replace(/\D/g, ""))}
                    placeholder="24"
                    className="h-11 max-w-[10rem] rounded-xl bg-white text-lg font-medium tabular-nums shadow-none"
                    disabled={courseStatus === "SCHEDULE_PENDING"}
                  />
                  <p className="max-w-lg text-xs leading-relaxed text-slate-500">
                    Planned sessions for attendance tracking. The instructor will confirm this schedule.
                  </p>

                  {sessionsCount != null && sessionsCount >= 1 ? (
                    <div className="mt-5 space-y-3 border-t border-slate-100 pt-5">
                      <div className="space-y-1">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                          Per-session details <span className="font-normal normal-case tracking-normal text-slate-400">(optional)</span>
                        </p>
                        <p className="max-w-lg text-xs leading-relaxed text-slate-500">
                          Title, date, and time for each session (optional).
                        </p>
                      </div>
                      <div className="space-y-3">
                        {Array.from({ length: sessionsCount }, (_, i) => {
                          const slot = sessions[i] ?? { title: "", sessionDate: "", sessionTime: "" };
                          return (
                            <div
                              key={i}
                              className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3 sm:flex-row sm:items-end sm:gap-3"
                            >
                              <div className="min-w-0 flex-1 space-y-1.5">
                                <label
                                  htmlFor={`admin-meeting-title-${i}`}
                                  className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500"
                                >
                                  Session {i + 1}
                                </label>
                                <Input
                                  id={`admin-meeting-title-${i}`}
                                  value={slot.title ?? ""}
                                  onChange={(e) => updateSession(i, { title: e.target.value })}
                                  placeholder={`Session ${i + 1} title`}
                                  className="h-11 rounded-xl border-slate-200 bg-white text-[15px]"
                                  disabled={courseStatus === "SCHEDULE_PENDING"}
                                />
                              </div>
                              <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-end sm:gap-2">
                                <div className="w-full space-y-1.5 sm:w-[10.5rem]">
                                  <label
                                    htmlFor={`admin-meeting-date-${i}`}
                                    className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500"
                                  >
                                    Date
                                  </label>
                                  <Input
                                    id={`admin-meeting-date-${i}`}
                                    type="date"
                                    value={slot.sessionDate ?? ""}
                                    onChange={(e) => updateSession(i, { sessionDate: e.target.value })}
                                    className="h-11 rounded-xl border-slate-200 bg-white text-[15px]"
                                    disabled={courseStatus === "SCHEDULE_PENDING"}
                                  />
                                </div>
                                <div className="w-full space-y-1.5 sm:w-[8.5rem]">
                                  <label
                                    htmlFor={`admin-meeting-time-${i}`}
                                    className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500"
                                  >
                                    Time
                                  </label>
                                  <Input
                                    id={`admin-meeting-time-${i}`}
                                    type="time"
                                    value={slot.sessionTime ?? ""}
                                    onChange={(e) => updateSession(i, { sessionTime: e.target.value })}
                                    className="h-11 rounded-xl border-slate-200 bg-white text-[15px]"
                                    disabled={courseStatus === "SCHEDULE_PENDING"}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </section>
              </CardContent>
            </Card>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <Button type="button" variant="outline" asChild>
                <Link to={`/dashboard/admin/courses/${courseId}`}>Cancel</Link>
              </Button>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  disabled={saving || courseStatus === "SCHEDULE_PENDING"}
                  className="bg-slate-900 hover:bg-slate-800"
                  onClick={() => void handleSendToInstructor()}
                >
                  <Send className="h-4 w-4 mr-2" />
                  {courseStatus === "SCHEDULE_APPROVED" ? "Re-send to instructor" : "Send to instructor"}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
