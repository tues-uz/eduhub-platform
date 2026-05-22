import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { eduhubCourses, eduhubSchedule } from "@/api/eduhubClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import { useTeacherCourseForm } from "./TeacherCourseFormContext";
import { parseOptionalPositiveInt } from "./teacherCourseFormHelpers";
import { isUuid } from "@/api/utils";
import type { ScheduleProposalResponse } from "@/api/eduhubTypes";
import type { CourseStatus } from "@/api/eduhubTypes";
import { toDateInputValue } from "@/features/admin/utils/adminCourseScheduleDisplay";
import {
  distributeSessionsIntoThreeMonths,
  padScheduleSlots,
  TEACHER_SCHEDULE_MONTH_SECTIONS,
} from "@/features/courses/scheduleThreeMonthBuckets";

function statusBadge(status: CourseStatus) {
  switch (status) {
    case "SCHEDULE_PENDING":
      return <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-900">Awaiting your approval</Badge>;
    case "SCHEDULE_APPROVED":
      return <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-900">Schedule approved</Badge>;
    case "DRAFT":
      return <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-800">Draft</Badge>;
    default:
      return null;
  }
}

function ReadOnlySessionRow({
  sessionNum,
  slot,
}: {
  sessionNum: number;
  slot: { title?: string; sessionDate?: string; sessionTime?: string };
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3 sm:flex-row sm:items-end sm:gap-3">
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Session {sessionNum}</p>
        <Input readOnly value={slot.title ?? ""} placeholder="—" className="h-11 rounded-xl bg-white" />
      </div>
      <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-end sm:gap-2">
        <div className="w-full space-y-1.5 sm:w-[10.5rem]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Date</p>
          <Input readOnly type="date" value={slot.sessionDate ?? ""} className="h-11 rounded-xl bg-white" />
        </div>
        <div className="w-full space-y-1.5 sm:w-[8.5rem]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Time</p>
          <Input readOnly type="time" value={slot.sessionTime ?? ""} className="h-11 rounded-xl bg-white" />
        </div>
      </div>
    </div>
  );
}

export default function TeacherCourseFormSchedulePage() {
  const navigate = useNavigate();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [approveSaving, setApproveSaving] = useState(false);
  const [proposal, setProposal] = useState<ScheduleProposalResponse | null>(null);
  const [courseStatus, setCourseStatus] = useState<CourseStatus>("DRAFT");
  const [scheduleRejectionNote, setScheduleRejectionNote] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  const {
    basePath,
    isEdit,
    courseId,
    classMeetingsInSixMonths,
    setClassMeetingsInSixMonths,
    classMeetingSlots,
    setClassMeetingSlots,
    error,
    setError,
    validateScheduleStep,
  } = useTeacherCourseForm();

  const mapProposalSession = useCallback(
    (s: { title?: string; sessionDate?: string; sessionTime?: string }) => ({
      title: s.title ?? "",
      sessionDate: toDateInputValue(s.sessionDate),
      sessionTime: s.sessionTime ?? "",
    }),
    [],
  );

  const loadScheduleData = useCallback(() => {
    if (!courseId || !isUuid(courseId)) return;
    setLoading(true);
    Promise.all([
      eduhubCourses.getById(courseId),
      eduhubSchedule.getProposal(courseId).catch(() => null),
    ])
      .then(([course, proposalData]) => {
        setCourseStatus(course.status as CourseStatus);
        setScheduleRejectionNote(course.scheduleRejectionNote);

        if (proposalData) {
          setProposal(proposalData);
          const count = proposalData.sessionCount;
          setClassMeetingsInSixMonths(String(count));
          setClassMeetingSlots(proposalData.sessions.map(mapProposalSession));
        } else {
          const count = course.classMeetingsInSixMonths ?? 0;
          setClassMeetingsInSixMonths(count > 0 ? String(count) : "");
          setClassMeetingSlots(
            course.classMeetingSlots?.map((s) => ({
              title: s.title ?? "",
              sessionDate: toDateInputValue(s.sessionDate),
              sessionTime: s.sessionTime ?? "",
            })) ?? [],
          );
        }
      })
      .catch(() => {
        /* layout may already show error */
      })
      .finally(() => setLoading(false));
  }, [courseId, mapProposalSession, setClassMeetingsInSixMonths, setClassMeetingSlots]);

  useEffect(() => {
    if (!isEdit || !courseId || !isUuid(courseId)) return;
    loadScheduleData();
  }, [isEdit, courseId, loadScheduleData]);

  const formSessionsCount = parseOptionalPositiveInt(classMeetingsInSixMonths.trim());
  const proposalSessions = proposal?.sessions.map(mapProposalSession);
  const sessionsCount = proposal
    ? Math.max(proposal.sessionCount, proposalSessions?.length ?? 0)
    : formSessionsCount;
  const displaySlots = proposal ? (proposalSessions ?? []) : classMeetingSlots;
  const apiCourse = Boolean(courseId && isUuid(courseId));

  const threeMonthPlan = useMemo(() => {
    if (!proposal || sessionsCount == null || sessionsCount < 1) return null;
    const flat = padScheduleSlots(sessionsCount, displaySlots);
    return distributeSessionsIntoThreeMonths(flat);
  }, [proposal, sessionsCount, displaySlots]);

  const continueToLessons = () => {
    setError("");
    if (!validateScheduleStep()) return;
    navigate(`${basePath}/lessons`);
  };

  const handleApprove = async () => {
    if (!courseId || !isUuid(courseId)) return;
    setApproveSaving(true);
    try {
      const result = await eduhubSchedule.approve(courseId);
      setProposal(result);
      setCourseStatus("SCHEDULE_APPROVED");
      toast.success("Schedule approved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not approve schedule");
    } finally {
      setApproveSaving(false);
    }
  };

  const handleRejectConfirm = async () => {
    if (!courseId || !isUuid(courseId)) return;
    try {
      const result = await eduhubSchedule.reject(courseId, rejectNote || undefined);
      setProposal(result);
      setCourseStatus("DRAFT");
      setScheduleRejectionNote(rejectNote || undefined);
      setRejectOpen(false);
      setRejectNote("");
      toast.success("Feedback sent to admin");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not reject schedule");
    }
  };

  const showGlobalBanner = Boolean(error);

  return (
    <>
      <div className="mx-auto w-full max-w-2xl">
        {showGlobalBanner ? (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        {!isEdit ? (
          <Card className="w-full overflow-hidden rounded-2xl border-slate-200/90 shadow-sm">
            <CardContent className="space-y-4 p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Schedule</p>
              <p className="text-sm leading-relaxed text-slate-700">
                After you create this class, an <span className="font-medium text-slate-900">administrator</span> will
                propose the session schedule (how many sessions in six months and optional dates/times). You will{" "}
                <span className="font-medium text-slate-900">review and approve</span> it here when you edit the class.
              </p>
              <p className="text-xs text-slate-500">
                Your new class is saved with a minimal placeholder session count until the schedule is finalized.
              </p>
            </CardContent>
          </Card>
        ) : null}

        {isEdit && apiCourse ? (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {statusBadge(courseStatus)}
          </div>
        ) : null}

        {isEdit && apiCourse && scheduleRejectionNote ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
            <p className="font-medium">Your note to admin</p>
            <p className="mt-1">{scheduleRejectionNote}</p>
          </div>
        ) : null}

        {isEdit && apiCourse ? (
          <>
            {loading ? (
              <p className="text-sm text-slate-600">Loading schedule…</p>
            ) : !proposal ? (
              <Card className="w-full overflow-hidden rounded-2xl border-slate-200/90 shadow-sm">
                <CardContent className="p-6">
                  <p className="text-sm text-slate-600">
                    When an admin proposes a schedule for this class, it will appear here for your approval.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <Card className="w-full overflow-hidden rounded-2xl border-slate-200/90 shadow-sm">
                  <CardContent className="space-y-2 p-0 px-4 pb-4 pt-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Sessions in 6 months
                    </p>
                    <p className="text-2xl font-semibold tabular-nums text-slate-900">
                      {sessionsCount != null ? sessionsCount : "—"}
                    </p>
                    <p className="max-w-lg text-xs leading-relaxed text-slate-500">
                      Proposed by {proposal.proposedByName}. Student attendance expectations are based on this plan.
                      Sessions below are grouped into the first three months, matching how admin entered the schedule.
                    </p>
                  </CardContent>
                </Card>

                {threeMonthPlan && threeMonthPlan.counts.some((c) => c > 0) ? (
                  TEACHER_SCHEDULE_MONTH_SECTIONS.map((section, monthIdx) => {
                    const m = monthIdx as 0 | 1 | 2;
                    const monthCount = threeMonthPlan.counts[m];
                    const n0 = threeMonthPlan.counts[0];
                    const n1 = threeMonthPlan.counts[1];
                    const sessionLabelOffset = m === 0 ? 0 : m === 1 ? n0 : n0 + n1;

                    if (monthCount < 1) return null;

                    return (
                      <Card key={section.heading} className="w-full overflow-hidden rounded-2xl border-slate-200/90 shadow-sm">
                        <CardContent className="space-y-4 p-0 px-4 pb-4 pt-4">
                          <section className="space-y-2">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                              {section.heading}
                            </p>
                            <p className="text-2xl font-semibold tabular-nums text-slate-900">{monthCount}</p>
                            <p className="max-w-lg text-xs leading-relaxed text-slate-500">{section.blurb}</p>

                            <div className="mt-5 space-y-3 border-t border-slate-100 pt-5">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                                Per-session details
                              </p>
                              <div className="space-y-3">
                                {Array.from({ length: monthCount }, (_, i) => {
                                  const slot = threeMonthPlan.buckets[m][i] ?? {
                                    title: "",
                                    sessionDate: "",
                                    sessionTime: "",
                                  };
                                  return (
                                    <ReadOnlySessionRow
                                      key={`${m}-${i}`}
                                      sessionNum={sessionLabelOffset + i + 1}
                                      slot={slot}
                                    />
                                  );
                                })}
                              </div>
                            </div>
                          </section>
                        </CardContent>
                      </Card>
                    );
                  })
                ) : (
                  <Card className="w-full overflow-hidden rounded-2xl border-slate-200/90 shadow-sm">
                    <CardContent className="p-6">
                      <p className="text-sm text-slate-500">No session rows yet — waiting for admin.</p>
                    </CardContent>
                  </Card>
                )}

                <Card className="w-full overflow-hidden rounded-2xl border-slate-200/90 shadow-sm">
                  <CardContent className="p-0 px-4 pb-4 pt-4">
                    {courseStatus === "SCHEDULE_PENDING" ? (
                      <div className="flex flex-wrap gap-3 pt-2">
                        <Button
                          type="button"
                          className="rounded-full bg-emerald-700 hover:bg-emerald-800"
                          disabled={approveSaving}
                          onClick={() => void handleApprove()}
                        >
                          {approveSaving ? "Saving…" : "Approve schedule"}
                        </Button>
                        <Button type="button" variant="outline" className="rounded-full" onClick={() => setRejectOpen(true)}>
                          Request changes
                        </Button>
                      </div>
                    ) : null}
                    {courseStatus === "SCHEDULE_APPROVED" ? (
                      <p className="pt-2 text-xs text-slate-600">
                        Schedule approved. The admin can now set pricing and publish the class.
                      </p>
                    ) : null}
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        ) : null}

        <div className="mt-6 flex w-full flex-wrap items-center justify-between gap-3">
          <Button type="button" variant="outline" className="rounded-full" onClick={() => navigate(`${basePath}/details`)}>
            Back
          </Button>
          <Button type="button" onClick={continueToLessons} className="rounded-full" style={{ backgroundColor: "#1e40af" }}>
            Continue to lessons
          </Button>
        </div>
      </div>

      <AlertDialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Request schedule changes</AlertDialogTitle>
            <AlertDialogDescription>
              Describe what should change (times, number of sessions, etc.). Admin will revise and send an updated
              proposal.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            placeholder="e.g. Wednesday evenings don't work — prefer Tuesday/Thursday…"
            rows={4}
            className="resize-none"
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRejectNote("")}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleRejectConfirm()}>Send to admin</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
