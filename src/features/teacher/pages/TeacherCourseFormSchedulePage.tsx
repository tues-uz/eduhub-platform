import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { eduhubCourses } from "@/api/eduhubClient";
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
import { parseOptionalPositiveInt, resolveClassScheduleFormState } from "./teacherCourseFormHelpers";
import { isUuid } from "@/api/utils";
import { boundsFromMeetingSlots } from "@/features/admin/utils/adminCourseScheduleDisplay";
import { courseScheduleProposalStore } from "@/features/courses/courseScheduleProposalStore";
import { courseScheduleWorkflowStore } from "@/features/courses/courseScheduleWorkflowStore";

export default function TeacherCourseFormSchedulePage() {
  const navigate = useNavigate();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [approveSaving, setApproveSaving] = useState(false);

  const {
    basePath,
    isEdit,
    courseId,
    classMeetingsInSixMonths,
    setClassMeetingsInSixMonths,
    classMeetingSlots,
    setClassMeetingSlots,
    updateMeetingSlot,
    error,
    setError,
    validateScheduleStep,
  } = useTeacherCourseForm();

  const workflow = useMemo(
    () => (courseId && isUuid(courseId) ? courseScheduleWorkflowStore.get(courseId) : null),
    [courseId, refreshKey],
  );

  const bumpWorkflow = () => setRefreshKey((k) => k + 1);

  const applyResolvedSchedule = useCallback(() => {
    if (!courseId || !isUuid(courseId)) return;
    eduhubCourses
      .getById(courseId)
      .then((course) => {
        const { meetingsSixMonthsStr, slots } = resolveClassScheduleFormState(course, courseId);
        setClassMeetingsInSixMonths(meetingsSixMonthsStr);
        setClassMeetingSlots(slots);
      })
      .catch(() => {
        /* layout may already show error */
      });
  }, [courseId, setClassMeetingsInSixMonths, setClassMeetingSlots]);

  /** Fresh copy from API + local admin proposal snapshot (when GET omits slots). */
  useEffect(() => {
    if (!isEdit || !courseId || !isUuid(courseId)) return;
    applyResolvedSchedule();
  }, [isEdit, courseId, applyResolvedSchedule]);

  useEffect(() => {
    if (!isEdit || !courseId || !isUuid(courseId)) return;
    const onProposalSaved = (e: Event) => {
      const id = (e as CustomEvent<{ courseId?: string }>).detail?.courseId;
      if (id === courseId) applyResolvedSchedule();
    };
    window.addEventListener("eduhub-schedule-proposal-saved", onProposalSaved);
    return () => window.removeEventListener("eduhub-schedule-proposal-saved", onProposalSaved);
  }, [isEdit, courseId, applyResolvedSchedule]);

  const sessionsCount = parseOptionalPositiveInt(classMeetingsInSixMonths.trim());
  const apiCourse = Boolean(courseId && isUuid(courseId));

  const continueToLessons = () => {
    setError("");
    if (!validateScheduleStep()) return;
    navigate(`${basePath}/lessons`);
  };

  const persistScheduleForStudents = (alsoApproveWorkflow: boolean) => {
    if (!courseId || !isUuid(courseId)) return;
    const meetingsSixMo = parseOptionalPositiveInt(classMeetingsInSixMonths.trim());
    if (meetingsSixMo == null || meetingsSixMo < 1) {
      toast.error("Session count is missing or invalid.");
      return;
    }
    setApproveSaving(true);
    const meetingSlotsForSave = Array.from({ length: meetingsSixMo }, (_, i) => ({
      title: classMeetingSlots[i]?.title ?? "",
      sessionDate: classMeetingSlots[i]?.sessionDate ?? "",
      sessionTime: classMeetingSlots[i]?.sessionTime ?? "",
    }));
    eduhubCourses
      .getById(courseId)
      .then((course) => {
        const bounds = boundsFromMeetingSlots(meetingSlotsForSave);
        const classStartDate =
          course.classStartDate?.trim() || (bounds.start ? `${bounds.start}T00:00:00.000Z` : undefined);
        const classEndDate =
          course.classEndDate?.trim() || (bounds.end ? `${bounds.end}T00:00:00.000Z` : undefined);
        return eduhubCourses
          .update(courseId, {
            title: course.title,
            description: course.description ?? "—",
            category: course.category,
            status: course.status,
            classMeetingsInSixMonths: meetingsSixMo,
            classMeetingTitles: meetingSlotsForSave.map((s) => s.title),
            classMeetingSlots: meetingSlotsForSave,
            ...(course.thumbnailUrl ? { thumbnailUrl: course.thumbnailUrl } : {}),
            ...(classStartDate ? { classStartDate } : {}),
            ...(classEndDate ? { classEndDate } : {}),
          })
          .then(() => {
            courseScheduleProposalStore.save(courseId, {
              classMeetingsInSixMonths: meetingsSixMo,
              classMeetingSlots: meetingSlotsForSave,
            });
            if (alsoApproveWorkflow) {
              courseScheduleWorkflowStore.approve(courseId);
              bumpWorkflow();
              toast.success("Schedule approved and saved for students");
            } else {
              bumpWorkflow();
              toast.success("Schedule saved for students");
            }
          });
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Could not save schedule");
      })
      .finally(() => setApproveSaving(false));
  };

  const handleApprove = () => persistScheduleForStudents(true);

  const handleRejectConfirm = () => {
    if (!courseId || !isUuid(courseId)) return;
    courseScheduleWorkflowStore.reject(courseId, rejectNote);
    setRejectOpen(false);
    setRejectNote("");
    bumpWorkflow();
    toast.success("Feedback sent to admin");
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
            {workflow?.status === "pending_instructor" ? (
              <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-900">
                Awaiting your approval
              </Badge>
            ) : null}
            {workflow?.status === "approved" ? (
              <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-900">
                Approved
              </Badge>
            ) : null}
            {workflow?.status === "instructor_rejected" ? (
              <Badge variant="outline" className="border-red-200 bg-red-50 text-red-900">
                Changes requested
              </Badge>
            ) : null}
            {workflow?.status === "none" || !workflow ? (
              <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-800">
                No approval request yet
              </Badge>
            ) : null}
          </div>
        ) : null}

        {isEdit && apiCourse && workflow?.status === "instructor_rejected" && workflow.rejectionNote ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
            <p className="font-medium">Your note to admin</p>
            <p className="mt-1">{workflow.rejectionNote}</p>
          </div>
        ) : null}

        {isEdit && courseId && !apiCourse ? (
          <Card className="w-full overflow-hidden rounded-2xl border-slate-200/90 shadow-sm">
            <CardContent className="space-y-8 p-0 px-4 pb-4 pt-4">
              <section className="space-y-2">
                <label
                  htmlFor="classMeetings6m-local"
                  className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500"
                >
                  Sessions in 6 months <span className="text-red-600">*</span>
                </label>
                <Input
                  id="classMeetings6m-local"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={classMeetingsInSixMonths}
                  onChange={(e) => setClassMeetingsInSixMonths(e.target.value.replace(/\D/g, ""))}
                  placeholder="24"
                  className="h-11 max-w-[10rem] rounded-xl bg-white text-lg font-medium tabular-nums shadow-none focus-visible:border-slate-400 focus-visible:ring-[#1e40af]/20 border-slate-200"
                />
                <p className="max-w-lg text-xs leading-relaxed text-slate-500">
                  Local-only class — you edit the schedule here (not connected to the admin approval flow).
                </p>

                {sessionsCount != null && sessionsCount >= 1 ? (
                  <div className="mt-5 space-y-3 border-t border-slate-100 pt-5">
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Per-session details{" "}
                        <span className="font-normal normal-case tracking-normal text-slate-400">(optional)</span>
                      </p>
                    </div>
                    <div className="space-y-3">
                      {Array.from({ length: sessionsCount }, (_, i) => {
                        const slot = classMeetingSlots[i] ?? { title: "", sessionDate: "", sessionTime: "" };
                        return (
                          <div
                            key={i}
                            className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3 sm:flex-row sm:items-end sm:gap-3"
                          >
                            <div className="min-w-0 flex-1 space-y-1.5">
                              <label
                                htmlFor={`meeting-title-${i}`}
                                className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500"
                              >
                                Session {i + 1}
                              </label>
                              <Input
                                id={`meeting-title-${i}`}
                                value={slot.title ?? ""}
                                onChange={(e) => updateMeetingSlot(i, { title: e.target.value })}
                                placeholder={`Session ${i + 1} title`}
                                className="h-11 rounded-xl border-slate-200 bg-white text-[15px] shadow-none focus-visible:border-slate-400 focus-visible:ring-[#1e40af]/20"
                              />
                            </div>
                            <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-end sm:gap-2">
                              <div className="w-full space-y-1.5 sm:w-[10.5rem]">
                                <label
                                  htmlFor={`meeting-date-${i}`}
                                  className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500"
                                >
                                  Date
                                </label>
                                <Input
                                  id={`meeting-date-${i}`}
                                  type="date"
                                  value={slot.sessionDate ?? ""}
                                  onChange={(e) => updateMeetingSlot(i, { sessionDate: e.target.value })}
                                  className="h-11 rounded-xl border-slate-200 bg-white text-[15px] shadow-none focus-visible:border-slate-400 focus-visible:ring-[#1e40af]/20"
                                />
                              </div>
                              <div className="w-full space-y-1.5 sm:w-[8.5rem]">
                                <label
                                  htmlFor={`meeting-time-${i}`}
                                  className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500"
                                >
                                  Time
                                </label>
                                <Input
                                  id={`meeting-time-${i}`}
                                  type="time"
                                  value={slot.sessionTime ?? ""}
                                  onChange={(e) => updateMeetingSlot(i, { sessionTime: e.target.value })}
                                  className="h-11 rounded-xl border-slate-200 bg-white text-[15px] shadow-none focus-visible:border-slate-400 focus-visible:ring-[#1e40af]/20"
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
        ) : null}

        {isEdit && apiCourse ? (
          <Card className="w-full overflow-hidden rounded-2xl border-slate-200/90 shadow-sm">
            <CardContent className="space-y-6 p-0 px-4 pb-4 pt-4">
              {(workflow?.status === "none" || !workflow) && (
                <p className="text-sm text-slate-600">
                  When an admin proposes a schedule for this class, it will appear here for your approval. You can open{" "}
                  <span className="font-medium text-slate-900">All classes</span> in admin to manage schedules if you have
                  access.
                </p>
              )}

              <section className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Sessions in 6 months
                </p>
                <p className="text-2xl font-semibold tabular-nums text-slate-900">
                  {sessionsCount != null ? sessionsCount : "—"}
                </p>
                <p className="max-w-lg text-xs leading-relaxed text-slate-500">
                  Proposed by admin. Student attendance expectations are based on this plan.
                </p>
              </section>

              {sessionsCount != null && sessionsCount >= 1 ? (
                <div className="space-y-3 border-t border-slate-100 pt-5">
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Per-session details
                    </p>
                  </div>
                  <div className="space-y-3">
                    {Array.from({ length: sessionsCount }, (_, i) => {
                      const slot = classMeetingSlots[i] ?? { title: "", sessionDate: "", sessionTime: "" };
                      return (
                        <div
                          key={i}
                          className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3 sm:flex-row sm:items-end sm:gap-3"
                        >
                          <div className="min-w-0 flex-1 space-y-1.5">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                              Session {i + 1}
                            </p>
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
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500">No session rows yet — waiting for admin.</p>
              )}

              {workflow?.status === "pending_instructor" ? (
                <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-5">
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
              {workflow?.status === "approved" ? (
                <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5">
                  <p className="w-full text-xs text-slate-600 sm:w-auto sm:flex-1">
                    If students still don&apos;t see class dates, push the schedule to the catalog again (one click).
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    className="rounded-full"
                    disabled={approveSaving}
                    onClick={() => persistScheduleForStudents(false)}
                  >
                    {approveSaving ? "Saving…" : "Save schedule for students"}
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
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
            placeholder="e.g. Wednesday evenings don’t work — prefer Tuesday/Thursday…"
            rows={4}
            className="resize-none"
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRejectNote("")}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRejectConfirm}>Send to admin</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
