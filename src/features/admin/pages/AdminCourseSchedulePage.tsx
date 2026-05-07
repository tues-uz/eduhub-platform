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
import { eduhubCourses } from "@/api/eduhubClient";
import { isUuid } from "@/api/utils";
import type { ClassMeetingSlotDto } from "@/api/eduhubTypes";
import { boundsFromMeetingSlots } from "@/features/admin/utils/adminCourseScheduleDisplay";
import { courseScheduleProposalStore } from "@/features/courses/courseScheduleProposalStore";
import { courseScheduleWorkflowStore, type ScheduleWorkflowStatus } from "@/features/courses/courseScheduleWorkflowStore";
import { parseOptionalPositiveInt } from "@/features/teacher/pages/teacherCourseFormHelpers";

function formatClassDate(iso?: string): string {
  if (!iso?.trim()) return "—";
  const d = new Date(iso.trim());
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(d);
}

function padMeetingSlots(n: number, raw?: ClassMeetingSlotDto[]): ClassMeetingSlotDto[] {
  const base = Array.isArray(raw)
    ? raw.map((s) => ({
        title: s.title ?? "",
        sessionDate: s.sessionDate ?? "",
        sessionTime: s.sessionTime ?? "",
      }))
    : [];
  const out = base.slice(0, Math.max(0, n));
  while (out.length < n) {
    out.push({ title: "", sessionDate: "", sessionTime: "" });
  }
  return out;
}

function buildInitialSlots(course: {
  classMeetingsInSixMonths?: number | null;
  classMeetingSlots?: ClassMeetingSlotDto[];
  classMeetingTitles?: string[];
}): { count: string; slots: ClassMeetingSlotDto[] } {
  const n = course.classMeetingsInSixMonths ?? 0;
  const countStr = n > 0 ? String(n) : "";
  if (course.classMeetingSlots?.length) {
    return { count: countStr || String(Math.max(n, course.classMeetingSlots.length)), slots: padMeetingSlots(n || course.classMeetingSlots.length, course.classMeetingSlots) };
  }
  const fromTitles = course.classMeetingTitles?.map((t) => ({
    title: t ?? "",
    sessionDate: "",
    sessionTime: "",
  }));
  return { count: countStr, slots: padMeetingSlots(n, fromTitles) };
}

function statusLabel(s: ScheduleWorkflowStatus): string {
  switch (s) {
    case "none":
      return "Draft (not sent)";
    case "pending_instructor":
      return "Awaiting instructor";
    case "approved":
      return "Approved by instructor";
    case "instructor_rejected":
      return "Instructor requested changes";
    default:
      return s;
  }
}

function statusBadgeClass(s: ScheduleWorkflowStatus): string {
  switch (s) {
    case "pending_instructor":
      return "bg-amber-50 text-amber-900 border-amber-200";
    case "approved":
      return "bg-emerald-50 text-emerald-900 border-emerald-200";
    case "instructor_rejected":
      return "bg-red-50 text-red-900 border-red-200";
    default:
      return "bg-slate-50 text-slate-800 border-slate-200";
  }
}

export default function AdminCourseSchedulePage() {
  const { courseId = "" } = useParams<{ courseId: string }>();
  const [title, setTitle] = useState("");
  const [classMeetingsInSixMonths, setClassMeetingsInSixMonths] = useState("");
  const [classMeetingSlots, setClassMeetingSlots] = useState<ClassMeetingSlotDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [workflowTick, setWorkflowTick] = useState(0);
  const [apiCohortDates, setApiCohortDates] = useState<{ start?: string; end?: string }>({});

  const workflow = useMemo(
    () => (courseId ? courseScheduleWorkflowStore.get(courseId) : null),
    [courseId, workflowTick],
  );

  const reloadWorkflow = () => setWorkflowTick((v) => v + 1);

  useEffect(() => {
    if (!courseId || !isUuid(courseId)) {
      setLoading(false);
      setError("Invalid class id.");
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    eduhubCourses
      .getById(courseId)
      .then((course) => {
        if (cancelled) return;
        setTitle(course.title);
        setApiCohortDates({
          start: course.classStartDate?.trim() || undefined,
          end: course.classEndDate?.trim() || undefined,
        });
        const init = buildInitialSlots(course);
        let countStr = init.count || "12";
        let slotSeed = init.slots;
        const proposal = courseScheduleProposalStore.get(courseId);
        const apiHasScheduleRows =
          (course.classMeetingSlots?.length ?? 0) > 0 ||
          (typeof course.classMeetingsInSixMonths === "number" && course.classMeetingsInSixMonths > 0);
        if (!apiHasScheduleRows && proposal?.classMeetingSlots?.length) {
          const pn =
            proposal.classMeetingsInSixMonths > 0
              ? proposal.classMeetingsInSixMonths
              : proposal.classMeetingSlots.length;
          countStr = String(pn);
          slotSeed = padMeetingSlots(pn, proposal.classMeetingSlots);
        }
        setClassMeetingsInSixMonths(countStr);
        const n = parseOptionalPositiveInt(countStr.trim()) ?? 12;
        setClassMeetingSlots(padMeetingSlots(n, slotSeed));
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
    const n = parseOptionalPositiveInt(classMeetingsInSixMonths.trim());
    if (n === undefined) return;
    setClassMeetingSlots((prev) => padMeetingSlots(n, prev));
  }, [classMeetingsInSixMonths]);

  const updateSlot = useCallback((index: number, patch: Partial<ClassMeetingSlotDto>) => {
    setClassMeetingSlots((prev) => {
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

  const buildPayload = useCallback(() => {
    const meetingsRaw = classMeetingsInSixMonths.trim();
    const meetingsSixMo = parseOptionalPositiveInt(meetingsRaw);
    if (meetingsSixMo === undefined) {
      throw new Error("Enter a valid number of sessions (whole number ≥ 1).");
    }
    const meetingSlotsForSave = Array.from({ length: meetingsSixMo }, (_, i) => ({
      title: classMeetingSlots[i]?.title ?? "",
      sessionDate: classMeetingSlots[i]?.sessionDate ?? "",
      sessionTime: classMeetingSlots[i]?.sessionTime ?? "",
    }));
    const meetingTitlesForSave = meetingSlotsForSave.map((s) => s.title);
    return { meetingsSixMo, meetingSlotsForSave, meetingTitlesForSave };
  }, [classMeetingsInSixMonths, classMeetingSlots]);

  const persistSchedule = async () => {
    if (!courseId || !isUuid(courseId)) return;
    const { meetingsSixMo, meetingSlotsForSave, meetingTitlesForSave } = buildPayload();
    const course = await eduhubCourses.getById(courseId);
    await eduhubCourses.update(courseId, {
      title: course.title,
      description: course.description ?? "—",
      category: course.category,
      status: course.status,
      classMeetingsInSixMonths: meetingsSixMo,
      classMeetingTitles: meetingTitlesForSave,
      classMeetingSlots: meetingSlotsForSave,
      ...(course.thumbnailUrl ? { thumbnailUrl: course.thumbnailUrl } : {}),
      ...(course.classStartDate ? { classStartDate: course.classStartDate } : {}),
      ...(course.classEndDate ? { classEndDate: course.classEndDate } : {}),
    });
    courseScheduleProposalStore.save(courseId, {
      classMeetingsInSixMonths: meetingsSixMo,
      classMeetingSlots: meetingSlotsForSave,
    });
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      await persistSchedule();
      toast.success("Schedule saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleSendToInstructor = async () => {
    setSaving(true);
    try {
      await persistSchedule();
      courseScheduleWorkflowStore.sendToInstructor(courseId);
      reloadWorkflow();
      toast.success("Schedule sent to instructor for approval");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send");
    } finally {
      setSaving(false);
    }
  };

  const sessionsCount = parseOptionalPositiveInt(classMeetingsInSixMonths.trim());

  const derivedFromSlots = useMemo(() => boundsFromMeetingSlots(classMeetingSlots), [classMeetingSlots]);
  const classStartDisplay = derivedFromSlots.start ?? apiCohortDates.start;
  const classEndDisplay = derivedFromSlots.end ?? apiCohortDates.end;

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

        {workflow ? (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-sm text-slate-600">Status:</span>
            <Badge variant="outline" className={statusBadgeClass(workflow.status)}>
              {statusLabel(workflow.status)}
            </Badge>
            {workflow.status === "instructor_rejected" && workflow.rejectionNote ? (
              <p className="text-sm text-red-800 w-full mt-1 rounded-md border border-red-200 bg-red-50 px-3 py-2">
                Instructor note: {workflow.rejectionNote}
              </p>
            ) : null}
          </div>
        ) : null}

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
                From the earliest and latest session dates you enter below. If sessions have no dates yet, this falls
                back to dates stored on the class (when the API returns them).
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
                    value={classMeetingsInSixMonths}
                    onChange={(e) => setClassMeetingsInSixMonths(e.target.value.replace(/\D/g, ""))}
                    placeholder="24"
                    className="h-11 max-w-[10rem] rounded-xl bg-white text-lg font-medium tabular-nums shadow-none"
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
                          const slot = classMeetingSlots[i] ?? { title: "", sessionDate: "", sessionTime: "" };
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
                                  onChange={(e) => updateSlot(i, { title: e.target.value })}
                                  placeholder={`Session ${i + 1} title`}
                                  className="h-11 rounded-xl border-slate-200 bg-white text-[15px]"
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
                                    onChange={(e) => updateSlot(i, { sessionDate: e.target.value })}
                                    className="h-11 rounded-xl border-slate-200 bg-white text-[15px]"
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
                                    onChange={(e) => updateSlot(i, { sessionTime: e.target.value })}
                                    className="h-11 rounded-xl border-slate-200 bg-white text-[15px]"
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
                <Button type="button" variant="secondary" disabled={saving} onClick={() => void handleSaveDraft()}>
                  Save draft
                </Button>
                <Button
                  type="button"
                  disabled={saving}
                  className="bg-slate-900 hover:bg-slate-800"
                  onClick={() => void handleSendToInstructor()}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send to instructor
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
