import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Send, Trash2 } from "@/lib/icons";
import { toast } from "sonner";
import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { eduhubAdmin, eduhubCourses, eduhubSchedule } from "@/api/eduhubClient";
import { isUuid } from "@/api/utils";
import type { ScheduleProposalResponse } from "@/api/eduhubTypes";
import { CourseStatusBadge } from "@/features/admin/components/AdminStatusBadges";
import { useTranslation } from "react-i18next";
import {
  mergeScheduleDisplayForAdminReview,
  toDateInputValue,
} from "@/features/admin/utils/adminCourseScheduleDisplay";
import { courseScheduleProposalStore } from "@/features/courses/courseScheduleProposalStore";
import {
  adminScheduleMonthBlurb,
  adminScheduleMonthHeading,
  distributeSessionsIntoMonths,
  padScheduleSlots,
  type ScheduleSlotRow,
} from "@/features/courses/scheduleThreeMonthBuckets";

function parseNonNegativeInt(raw: string): number | undefined {
  const t = raw.trim();
  if (!t) return undefined;
  const n = parseInt(t, 10);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return n;
}

function instructorInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

function formatClassDate(iso?: string): string {
  if (!iso?.trim()) return "—";
  const d = new Date(iso.trim());
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(d);
}

type MonthPlanState = { count: string; sessions: ScheduleSlotRow[] };

const DEFAULT_MONTH_PLANS: MonthPlanState[] = [{ count: "4", sessions: [] }];

function monthPlansFromDistribution(counts: number[], buckets: ScheduleSlotRow[][]): MonthPlanState[] {
  return counts.map((c, i) => ({
    count: String(c),
    sessions: buckets[i] ?? [],
  }));
}

export default function AdminCourseSchedulePage() {
  const { t } = useTranslation();
  const { courseId = "" } = useParams<{ courseId: string }>();
  const [title, setTitle] = useState("");
  const [instructorName, setInstructorName] = useState("");
  const [instructorAvatarUrl, setInstructorAvatarUrl] = useState<string | undefined>();
  const [courseStatus, setCourseStatus] = useState("");
  const [monthPlans, setMonthPlans] = useState<MonthPlanState[]>(DEFAULT_MONTH_PLANS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [proposal, setProposal] = useState<ScheduleProposalResponse | null>(null);
  const [scheduleRejectionNote, setScheduleRejectionNote] = useState<string | undefined>();
  const [scheduleBoundsFallback, setScheduleBoundsFallback] = useState<{
    start?: string;
    end?: string;
  }>({});

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
        setInstructorName(course.lecturer?.fullName?.trim() ?? "");
        setInstructorAvatarUrl(course.lecturer?.avatarUrl?.trim() || undefined);
        setCourseStatus(course.status);
        setScheduleRejectionNote(course.scheduleRejectionNote);

        const display = mergeScheduleDisplayForAdminReview(courseId, course);
        setScheduleBoundsFallback({
          start: display.classStartDate,
          end: display.classEndDate,
        });

        const mapSession = (s: {
          title?: string;
          sessionDate?: string;
          sessionTime?: string;
          durationMinutes?: number;
        }) => ({
          title: s.title ?? "",
          sessionDate: toDateInputValue(s.sessionDate),
          sessionTime: s.sessionTime ?? "",
          durationMinutes: s.durationMinutes,
        });

        if (proposalData) {
          setProposal(proposalData);
          const count = proposalData.sessionCount;
          const flat = padScheduleSlots(count, proposalData.sessions.map(mapSession));
          const { counts, buckets } = distributeSessionsIntoMonths(flat, { emptyEditorDefaults: true });
          setMonthPlans(monthPlansFromDistribution(counts, buckets));
        } else {
          const count = course.classMeetingsInSixMonths ?? 12;
          const flat = padScheduleSlots(count, course.classMeetingSlots?.map(mapSession));
          const { counts, buckets } = distributeSessionsIntoMonths(flat, { emptyEditorDefaults: true });
          setMonthPlans(monthPlansFromDistribution(counts, buckets));
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

  const monthCountSignature = useMemo(
    () => monthPlans.map((p) => p.count).join("\0"),
    [monthPlans],
  );

  useEffect(() => {
    setMonthPlans((prev) => {
      let changed = false;
      const next = prev.map((plan) => ({
        count: plan.count,
        sessions: [...plan.sessions],
      }));
      for (let m = 0; m < next.length; m++) {
        const n = parseNonNegativeInt(next[m].count.trim());
        if (n === undefined) continue;
        const padded = padScheduleSlots(n, prev[m]?.sessions);
        if (padded.length !== next[m].sessions.length) {
          next[m].sessions = padded;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [monthCountSignature]);

  const updateSession = useCallback((monthIdx: number, index: number, patch: Partial<ScheduleSlotRow>) => {
    setMonthPlans((prev) => {
      const copy = prev.map((plan) => ({
        count: plan.count,
        sessions: plan.sessions.map((s) => ({ ...s })),
      }));
      while (copy[monthIdx].sessions.length <= index) {
        copy[monthIdx].sessions.push({ title: "", sessionDate: "", sessionTime: "" });
      }
      copy[monthIdx].sessions[index] = {
        title: copy[monthIdx].sessions[index]?.title ?? "",
        sessionDate: copy[monthIdx].sessions[index]?.sessionDate ?? "",
        sessionTime: copy[monthIdx].sessions[index]?.sessionTime ?? "",
        ...patch,
      };
      return copy;
    });
  }, []);

  const monthSessionCounts = useMemo(
    () => monthPlans.map((p) => parseNonNegativeInt(p.count.trim()) ?? 0),
    [monthPlans],
  );

  const mergedSessionsFlat = useMemo(() => {
    return monthPlans.flatMap((plan, m) => {
      const n = monthSessionCounts[m] ?? 0;
      return plan.sessions.slice(0, n);
    });
  }, [monthPlans, monthSessionCounts]);

  const addMonth = useCallback(() => {
    setMonthPlans((prev) => [...prev, { count: "0", sessions: [] }]);
  }, []);

  const removeMonth = useCallback((monthIdx: number) => {
    setMonthPlans((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== monthIdx);
    });
  }, []);

  const setMonthCount = useCallback((monthIdx: number, raw: string) => {
    const v = raw.replace(/\D/g, "");
    setMonthPlans((prev) =>
      prev.map((plan, i) => (i === monthIdx ? { ...plan, count: v } : plan)),
    );
  }, []);

  const handleSendToInstructor = async () => {
    const total = monthSessionCounts.reduce((sum, n) => sum + n, 0);
    if (total < 1) {
      toast.error(t("admin.courses.schedule.toast.minOneSession"));
      return;
    }
    setSaving(true);
    try {
      const merged = monthPlans.flatMap((plan, m) => {
        const n = monthSessionCounts[m] ?? 0;
        return plan.sessions.slice(0, n);
      });
      const sessionsPayload = merged.map((s, i) => ({
        title: s.title || `Session ${i + 1}`,
        sessionDate: s.sessionDate || undefined,
        sessionTime: s.sessionTime || undefined,
        durationMinutes: s.durationMinutes || undefined,
      }));

      const result = await eduhubAdmin.proposeSchedule(courseId, {
        sessionCount: total,
        sessions: sessionsPayload,
      });

      setProposal(result);
      setCourseStatus("SCHEDULE_PENDING");
      courseScheduleProposalStore.save(courseId, {
        classMeetingsInSixMonths: total,
        classMeetingSlots: merged.map((s, i) => ({
          title: s.title || `Session ${i + 1}`,
          sessionDate: s.sessionDate ?? "",
          sessionTime: s.sessionTime ?? "",
        })),
      });
      const flatBack = padScheduleSlots(
        result.sessionCount,
        result.sessions.map((s) => ({
          title: s.title,
          sessionDate: s.sessionDate,
          sessionTime: s.sessionTime,
          durationMinutes: s.durationMinutes,
        })),
      );
      const { counts, buckets } = distributeSessionsIntoMonths(flatBack, { emptyEditorDefaults: true });
      setMonthPlans(monthPlansFromDistribution(counts, buckets));
      toast.success(t("admin.courses.schedule.toast.sent"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send");
    } finally {
      setSaving(false);
    }
  };

  const classStartDisplay = useMemo(() => {
    const dates = mergedSessionsFlat
      .map((s) => s.sessionDate)
      .filter((d): d is string => !!d?.trim())
      .sort();
    return dates[0] || scheduleBoundsFallback.start;
  }, [mergedSessionsFlat, scheduleBoundsFallback.start]);

  const classEndDisplay = useMemo(() => {
    const dates = mergedSessionsFlat
      .map((s) => s.sessionDate)
      .filter((d): d is string => !!d?.trim())
      .sort();
    return dates[dates.length - 1] || scheduleBoundsFallback.end;
  }, [mergedSessionsFlat, scheduleBoundsFallback.end]);

  if (!isUuid(courseId)) {
    return (
      <AdminLayout>
        <div className="container mx-auto px-6">
          <p className="text-sm text-red-600">{t("admin.courses.detail.invalidId")}</p>
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
          title={t("admin.courses.schedule.title")}
          description={t("admin.courses.schedule.description")}
        />

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-sm text-slate-600">{t("admin.courses.schedule.courseStatus")}</span>
          <CourseStatusBadge status={courseStatus} />
          {courseStatus === "SCHEDULE_PENDING" && (
            <span className="text-sm text-blue-600">{t("admin.courses.schedule.waitingInstructor")}</span>
          )}
          {courseStatus === "SCHEDULE_APPROVED" && (
            <span className="text-sm text-teal-600">{t("admin.courses.schedule.scheduleApprovedReady")}</span>
          )}
          {scheduleRejectionNote && (
            <p className="text-sm text-red-800 w-full mt-1 rounded-md border border-red-200 bg-red-50 px-3 py-2">
              Instructor note: {scheduleRejectionNote}
            </p>
          )}
        </div>

        {loading ? (
          <p className="text-sm text-slate-600">{t("common.loading")}</p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : (
          <>
            <div className="mb-4 rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm">
              <div className="flex items-start gap-3.5">
                <Avatar className="h-12 w-12 shrink-0 border border-slate-200">
                  <AvatarImage src={instructorAvatarUrl} alt={instructorName || "Instructor"} />
                  <AvatarFallback className="bg-slate-100 text-sm font-semibold text-slate-600">
                    {instructorInitials(instructorName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{t("admin.shared.instructor")}</p>
                  <p className="truncate text-base font-semibold text-slate-900" title={instructorName || undefined}>
                    {instructorName || "—"}
                  </p>
                  <div className="mt-2.5 border-t border-slate-100 pt-2.5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{t("admin.shared.class")}</p>
                    <p className="text-sm font-medium leading-snug text-slate-800" title={title || undefined}>
                      {title || "—"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50/90 px-3 py-2.5 text-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                <div className="flex justify-between gap-4 sm:justify-start sm:gap-8">
                  <span className="text-slate-500 shrink-0">{t("admin.courses.detail.fields.classStart")}</span>
                  <span className="tabular-nums font-medium text-slate-900 text-right sm:text-left">
                    {formatClassDate(classStartDisplay)}
                  </span>
                </div>
                <div className="flex justify-between gap-4 sm:justify-start sm:gap-8">
                  <span className="text-slate-500 shrink-0">{t("admin.courses.detail.fields.classEnd")}</span>
                  <span className="tabular-nums font-medium text-slate-900 text-right sm:text-left">
                    {formatClassDate(classEndDisplay)}
                  </span>
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                From session dates below, or the class start/end saved on the course when no session dates are set.
              </p>
            </div>

            <div className="space-y-4">
              {monthPlans.map((plan, monthIdx) => {
                const sessionsCount = parseNonNegativeInt(plan.count.trim());
                const sessionLabelOffset = monthSessionCounts
                  .slice(0, monthIdx)
                  .reduce((sum, n) => sum + n, 0);
                const isLastMonth = monthIdx === monthPlans.length - 1;
                const heading = adminScheduleMonthHeading(monthIdx);
                const blurb = adminScheduleMonthBlurb(monthIdx, isLastMonth);
                const canEdit = courseStatus !== "SCHEDULE_PENDING";

                return (
                  <Card
                    key={`month-${monthIdx}`}
                    className="w-full overflow-hidden rounded-2xl border-slate-200/90 shadow-sm"
                  >
                    <CardContent className="space-y-8 p-0 px-4 pb-4 pt-4">
                      <section className="space-y-2">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <label
                            htmlFor={`adminClassMeetingsM${monthIdx}`}
                            className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500"
                          >
                            {heading} <span className="text-red-600">*</span>
                          </label>
                          {canEdit && monthPlans.length > 1 ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 shrink-0 gap-1.5 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                              onClick={() => removeMonth(monthIdx)}
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden />
                              Remove month
                            </Button>
                          ) : null}
                        </div>
                        <Input
                          id={`adminClassMeetingsM${monthIdx}`}
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={plan.count}
                          onChange={(e) => setMonthCount(monthIdx, e.target.value)}
                          placeholder="8"
                          className="h-11 max-w-[10rem] rounded-xl bg-white text-lg font-medium tabular-nums shadow-none"
                          disabled={!canEdit}
                        />
                        <p className="max-w-lg text-xs leading-relaxed text-slate-500">{blurb}</p>

                        {sessionsCount != null && sessionsCount > 0 ? (
                          <div className="mt-5 space-y-3 border-t border-slate-100 pt-5">
                            <div className="space-y-1">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                                Per-session details{" "}
                                <span className="font-normal normal-case tracking-normal text-slate-400">{t("admin.courses.schedule.optional")}</span>
                              </p>
                              <p className="max-w-lg text-xs leading-relaxed text-slate-500">
                                Title, date, and time for each session in this month (optional).
                              </p>
                            </div>
                            <div className="space-y-3">
                              {Array.from({ length: sessionsCount }, (_, i) => {
                                const slot = plan.sessions[i] ?? { title: "", sessionDate: "", sessionTime: "" };
                                const globalNum = sessionLabelOffset + i + 1;
                                return (
                                  <div
                                    key={`${monthIdx}-${i}`}
                                    className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3 sm:flex-row sm:items-end sm:gap-3"
                                  >
                                    <div className="min-w-0 flex-1 space-y-1.5">
                                      <label
                                        htmlFor={`admin-meeting-title-${monthIdx}-${i}`}
                                        className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500"
                                      >
                                        Session {globalNum}
                                      </label>
                                      <Input
                                        id={`admin-meeting-title-${monthIdx}-${i}`}
                                        value={slot.title ?? ""}
                                        onChange={(e) => updateSession(monthIdx, i, { title: e.target.value })}
                                        placeholder={`Session ${globalNum} title`}
                                        className="h-11 rounded-xl border-slate-200 bg-white text-[15px]"
                                        disabled={!canEdit}
                                      />
                                    </div>
                                    <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-end sm:gap-2">
                                      <div className="w-full space-y-1.5 sm:w-[10.5rem]">
                                        <label
                                          htmlFor={`admin-meeting-date-${monthIdx}-${i}`}
                                          className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500"
                                        >
                                          Date
                                        </label>
                                        <Input
                                          id={`admin-meeting-date-${monthIdx}-${i}`}
                                          type="date"
                                          value={slot.sessionDate ?? ""}
                                          onChange={(e) => updateSession(monthIdx, i, { sessionDate: e.target.value })}
                                          className="h-11 rounded-xl border-slate-200 bg-white text-[15px]"
                                          disabled={!canEdit}
                                        />
                                      </div>
                                      <div className="w-full space-y-1.5 sm:w-[8.5rem]">
                                        <label
                                          htmlFor={`admin-meeting-time-${monthIdx}-${i}`}
                                          className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500"
                                        >
                                          Time
                                        </label>
                                        <Input
                                          id={`admin-meeting-time-${monthIdx}-${i}`}
                                          type="time"
                                          value={slot.sessionTime ?? ""}
                                          onChange={(e) => updateSession(monthIdx, i, { sessionTime: e.target.value })}
                                          className="h-11 rounded-xl border-slate-200 bg-white text-[15px]"
                                          disabled={!canEdit}
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
                );
              })}

              {courseStatus !== "SCHEDULE_PENDING" ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full rounded-xl border-dashed border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  onClick={addMonth}
                >
                  <Plus className="mr-2 h-4 w-4" aria-hidden />
                  Add schedule month
                </Button>
              ) : null}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <Button type="button" variant="outline" asChild>
                <Link to={`/dashboard/admin/courses/${courseId}`}>{t("common.cancel")}</Link>
              </Button>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  disabled={saving || courseStatus === "SCHEDULE_PENDING"}
                  className="bg-slate-900 hover:bg-slate-800"
                  onClick={() => void handleSendToInstructor()}
                >
                  <Send className="h-4 w-4 mr-2" />
                  {courseStatus === "SCHEDULE_APPROVED" ? t("admin.courses.schedule.resendToInstructor") : t("admin.courses.schedule.sendToInstructor")}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
