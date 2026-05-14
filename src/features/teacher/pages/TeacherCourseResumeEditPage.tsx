import { useEffect, useMemo, useRef, useState } from "react";
import type { ClassMeetingSlot } from "@/features/teacher/types";
import { Link, useMatch, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays, FileText, Image as ImageIcon, X } from "lucide-react";
import { toast } from "sonner";
import DashboardSidebar from "@/components/DashboardSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { eduhubCourses } from "@/api/eduhubClient";
import { isUuid } from "@/api/utils";
import { useAuthSession } from "@/features/auth/context";
import { getClassResumeById, saveClassResume, deleteClassResume } from "@/features/courses/classResumeStorage";
import { teacherCoursesStore } from "@/features/teacher/data/teacherCoursesStore";
import { substituteInviteWorkflowStore } from "@/features/teacher/data/substituteInviteWorkflowStore";
import { resolveClassScheduleFormState } from "@/features/teacher/pages/teacherCourseFormHelpers";
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

function formatClassMeetingSlotLabel(slot: ClassMeetingSlot, index: number): string {
  const title = slot.title?.trim() || `Session ${index + 1}`;
  const date = slot.sessionDate?.trim();
  const time = slot.sessionTime?.trim();
  const tail = [date, time].filter(Boolean).join(" ");
  return tail ? `${title} · ${tail}` : title;
}

const CLASS_RESUME_SESSION_ALL = "__class_resume_all__";

export default function TeacherCourseResumeEditPage() {
  const { courseId = "", resumeId } = useParams<{ courseId: string; resumeId?: string }>();
  const matchNewResume = useMatch({ path: "/dashboard/teacher/courses/:courseId/resume/new", end: true });
  const navigate = useNavigate();
  const { user } = useAuthSession();
  const isNew = Boolean(matchNewResume);
  const editingResumeId = isNew ? undefined : resumeId;

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem("sidebarCollapsed") === "true";
  });
  const [bodyDraft, setBodyDraft] = useState("");
  const [sessionKeyDraft, setSessionKeyDraft] = useState("");
  const [thumbnailDraft, setThumbnailDraft] = useState<string>("");
  const [loaded, setLoaded] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    const check = () => setIsSidebarCollapsed(localStorage.getItem("sidebarCollapsed") === "true");
    check();
    const id = setInterval(check, 100);
    return () => clearInterval(id);
  }, []);

  /** Same key as `TeacherCourseRosterPage` so navigating here reuses cached course data. */
  const apiCourseQuery = useQuery({
    queryKey: ["teacher", "roster", "course", courseId],
    queryFn: () => eduhubCourses.getById(courseId),
    enabled: Boolean(courseId) && isUuid(courseId),
  });

  const userEmailNorm = (user?.email ?? "").trim().toLowerCase();
  const [workflowTick, setWorkflowTick] = useState(0);
  useEffect(() => {
    const fn = () => setWorkflowTick((t) => t + 1);
    window.addEventListener("eduhub.substituteInviteWorkflow.changed", fn);
    return () => window.removeEventListener("eduhub.substituteInviteWorkflow.changed", fn);
  }, []);

  const substituteCanAccess = useMemo(() => {
    void workflowTick;
    if (!courseId || !userEmailNorm) return false;
    return substituteInviteWorkflowStore.isApprovedSubstituteForCourse(courseId, userEmailNorm);
  }, [courseId, userEmailNorm, workflowTick]);

  const isApiCourseLecturer = Boolean(
    apiCourseQuery.data && apiCourseQuery.data.lecturer?.id === user.id,
  );

  const isSubstituteViewer = Boolean(
    apiCourseQuery.data && substituteCanAccess && !isApiCourseLecturer,
  );

  const approvedSubstituteInviteRow = useMemo(() => {
    void workflowTick;
    if (!courseId || !userEmailNorm) return undefined;
    return substituteInviteWorkflowStore.findApprovedInviteAsSubstitute(courseId, userEmailNorm);
  }, [courseId, userEmailNorm, workflowTick]);

  const approvedCoverAsPrimaryRow = useMemo(() => {
    void workflowTick;
    if (!courseId || !userEmailNorm || !isApiCourseLecturer) return undefined;
    return substituteInviteWorkflowStore.findApprovedInviteAsPrimary(courseId, userEmailNorm);
  }, [courseId, userEmailNorm, workflowTick, isApiCourseLecturer]);

  const courseLeadDisplayName = useMemo(() => {
    const apiName = apiCourseQuery.data?.lecturer?.fullName?.trim();
    if (apiName) return apiName;
    return approvedSubstituteInviteRow?.primaryInstructorName?.trim() || "Course lead";
  }, [apiCourseQuery.data?.lecturer?.fullName, approvedSubstituteInviteRow?.primaryInstructorName]);

  const courseLeadEmail = apiCourseQuery.data?.lecturer?.email?.trim();

  const localCourse =
    !isUuid(courseId) && courseId ? teacherCoursesStore.getById(courseId) : undefined;

  const courseMeta =
    apiCourseQuery.data != null
      ? {
          id: apiCourseQuery.data.id,
          title: apiCourseQuery.data.title,
          allowed: isApiCourseLecturer || substituteCanAccess,
        }
      : localCourse
        ? {
            id: localCourse.id,
            title: localCourse.title,
            allowed: true,
          }
        : null;

  const loadingCourse = isUuid(courseId) && apiCourseQuery.isLoading;
  const forbidden =
    apiCourseQuery.data != null && !isApiCourseLecturer && !substituteCanAccess;

  const scheduleSourceCourse = useMemo(() => {
    if (!courseId) return undefined;
    if (apiCourseQuery.data) return apiCourseQuery.data;
    if (!isUuid(courseId)) return teacherCoursesStore.getById(courseId);
    return undefined;
  }, [courseId, apiCourseQuery.data]);

  const scheduleSlotOptions = useMemo(() => {
    if (!courseId) return [];
    const resolved = resolveClassScheduleFormState(scheduleSourceCourse ?? {}, courseId);
    return resolved.slots
      .map((slot, index) => ({ slot, index }))
      .filter(({ slot }) =>
        Boolean(slot.title?.trim() || slot.sessionDate?.trim() || slot.sessionTime?.trim()),
      )
      .map(({ slot, index }) => ({
        value: `slot-${index}`,
        label: formatClassMeetingSlotLabel(slot, index),
      }));
  }, [courseId, scheduleSourceCourse]);

  /** Substitutes only see the session(s) the course lead picked on the cover request (+ whole class in the UI). */
  const resumeSessionSelectOptions = useMemo(() => {
    if (!isSubstituteViewer) return scheduleSlotOptions;
    const note = approvedSubstituteInviteRow?.sessionNote?.trim();
    if (!note) return [];
    const t = note.trim();
    return scheduleSlotOptions.filter((o) => o.label.trim() === t);
  }, [isSubstituteViewer, approvedSubstituteInviteRow?.sessionNote, scheduleSlotOptions]);

  const showResumeSessionSelect = scheduleSlotOptions.length > 0 || isSubstituteViewer;

  /** One-shot: avoid re-applying invite default when schedule/query updates reset deps (would undo user’s pick). */
  const substituteNewResumeSessionDefaultedRef = useRef(false);
  useEffect(() => {
    substituteNewResumeSessionDefaultedRef.current = false;
  }, [courseId, isNew]);

  useEffect(() => {
    if (!courseMeta?.id) {
      setLoaded(false);
      return;
    }
    if (isNew) {
      setBodyDraft("");
      setThumbnailDraft("");
      setSessionKeyDraft("");
      setLoaded(true);
      return;
    }
    if (!editingResumeId) {
      setLoaded(true);
      return;
    }
    const rec = getClassResumeById(courseMeta.id, editingResumeId);
    if (rec) {
      setBodyDraft(rec.body);
      setSessionKeyDraft(rec.sessionSlotKey ?? "");
      setThumbnailDraft(rec.thumbnailUrl ?? "");
    } else {
      toast.error("Resume not found");
      void navigate(`/dashboard/teacher/courses/${courseId}?tab=resume`, { replace: true });
    }
    setLoaded(true);
  }, [courseMeta?.id, isNew, editingResumeId, courseId, navigate]);

  /** New resume + substitute: default session from invite once schedule rows exist (does not fight refetches). */
  useEffect(() => {
    if (!isNew || !isSubstituteViewer || substituteNewResumeSessionDefaultedRef.current) return;
    const note = approvedSubstituteInviteRow?.sessionNote?.trim();
    if (!note) {
      substituteNewResumeSessionDefaultedRef.current = true;
      return;
    }
    const opt = resumeSessionSelectOptions[0];
    if (!opt) {
      if (note && scheduleSlotOptions.length > 0 && resumeSessionSelectOptions.length === 0) {
        substituteNewResumeSessionDefaultedRef.current = true;
      }
      return;
    }
    setSessionKeyDraft(opt.value);
    substituteNewResumeSessionDefaultedRef.current = true;
  }, [isNew, isSubstituteViewer, approvedSubstituteInviteRow?.sessionNote, scheduleSlotOptions, resumeSessionSelectOptions]);

  const backHref = `/dashboard/teacher/courses/${courseId}?tab=resume`;

  const handleSave = () => {
    if (!courseMeta?.id) return;
    const trimmed = bodyDraft.trim();
    if (!trimmed) {
      toast.error("Write something before saving.");
      return;
    }
    const opt = (isSubstituteViewer ? resumeSessionSelectOptions : scheduleSlotOptions).find(
      (o) => o.value === sessionKeyDraft,
    );
    const savedId = saveClassResume(courseMeta.id, {
      id: editingResumeId,
      body: trimmed,
      session:
        sessionKeyDraft && opt ? { slotKey: opt.value, label: opt.label } : undefined,
      thumbnailUrl: thumbnailDraft || undefined,
    });
    if (!savedId) {
      toast.error("Could not save.");
      return;
    }
    toast.success(isNew ? "Resume created" : "Resume updated", {
      description: "Students can read it on the class Resume tab.",
    });
    void navigate(backHref, { replace: true });
  };

  const onThumbnailPicked = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please pick an image file.");
      return;
    }
    const maxBytes = 900_000;
    if (file.size > maxBytes) {
      toast.error("Image is too large for this demo.", {
        description: "Use a smaller image (under ~900KB) to avoid localStorage limits.",
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const v = typeof reader.result === "string" ? reader.result : "";
      if (!v.startsWith("data:image/")) {
        toast.error("Could not read that image.");
        return;
      }
      setThumbnailDraft(v);
    };
    reader.onerror = () => toast.error("Could not read that image.");
    reader.readAsDataURL(file);
  };

  const handleDelete = () => {
    if (!courseMeta?.id || !editingResumeId) return;
    deleteClassResume(courseMeta.id, editingResumeId);
    setDeleteOpen(false);
    toast.message("Resume deleted");
    void navigate(backHref, { replace: true });
  };

  if (!courseId) {
    return (
      <div className="min-h-screen bg-white p-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <p className="text-sm text-red-600">Missing class.</p>
      </div>
    );
  }

  if (loadingCourse) {
    return (
      <div className="min-h-screen bg-white p-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <p className="text-sm text-foreground/60">Loading…</p>
      </div>
    );
  }

  if (forbidden || !courseMeta) {
    return (
      <div className="min-h-screen bg-white p-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-6 text-sm text-amber-900">
          {forbidden ? "You don't have access to this class." : "Class not found."}
        </div>
        <Link to="/dashboard/teacher/courses" className="mt-4 inline-block text-sm text-[#3954d0]">
          Back to My Classes
        </Link>
      </div>
    );
  }

  if (!loaded) {
    return (
      <div className="min-h-screen bg-white p-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <p className="text-sm text-foreground/60">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <DashboardSidebar />
      <main
        className={`min-h-[calc(100dvh-4rem)] lg:min-h-dvh pt-16 lg:pt-0 pb-20 transition-all duration-300 ${isSidebarCollapsed ? "lg:pl-20" : "lg:pl-64"}`}
      >
        <header
          className={`fixed z-40 flex min-h-[4.5625rem] items-center border-b border-gray-100 bg-white transition-all duration-300 ${
            isSidebarCollapsed ? "lg:left-20" : "lg:left-64"
          } left-0 right-0 top-16 lg:top-0`}
        >
          <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-x-3 gap-y-2 px-6">
            <Link
              to={backHref}
              className="inline-flex shrink-0 items-center gap-2 text-sm font-medium text-foreground/75 hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" />
              Back to resumes
            </Link>
          </div>
        </header>

        <div className="container mx-auto max-w-4xl px-6 pt-[calc(4.5625rem+1rem)]">
          {isSubstituteViewer ? (
            <div className="mb-6 rounded-xl border border-sky-200/90 bg-sky-50/90 px-4 py-3 text-sm text-sky-950 leading-relaxed space-y-2">
              <p>
                <span className="font-semibold">You are editing as substitute.</span>{" "}
                <span className="text-sky-950/90">
                  Course lead: <span className="font-semibold text-sky-950">{courseLeadDisplayName}</span>
                  {courseLeadEmail ? (
                    <span className="font-normal text-sky-950/80"> ({courseLeadEmail})</span>
                  ) : null}
                </span>
              </p>
              <p className="text-sky-950/85">
                You can add or edit resumes for students. Deleting an existing resume stays with the course lead in this
                demo.
              </p>
            </div>
          ) : null}
          {!isSubstituteViewer && approvedCoverAsPrimaryRow ? (
            <div className="mb-6 rounded-xl border border-emerald-200/90 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-950 leading-relaxed">
              <span className="font-semibold">You are the course lead.</span> Substitute{" "}
              <span className="font-mono font-medium">{approvedCoverAsPrimaryRow.substituteEmailNorm}</span> can also
              edit resumes here (demo).
            </div>
          ) : null}
          <div className="mb-6 flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#1e40af]/10 ring-1 ring-[#1e40af]/15">
              <FileText className="h-5 w-5 text-[#1e40af]" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                {isNew ? "New class resume" : "Edit class resume"}
              </h1>
              <p className="mt-1 text-sm text-foreground/60">{courseMeta.title}</p>
            </div>
          </div>

          <Card className="overflow-hidden rounded-xl border border-gray-100 bg-white">
            <CardContent className="space-y-5 pt-6">
              <p className="text-sm text-foreground/60">
                Recaps and reminders appear on students&apos; class page under the Resume tab (browser-local demo until an
                API exists).
              </p>

              <div className="space-y-2">
                <Label htmlFor="resume-thumb" className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <ImageIcon className="h-4 w-4 shrink-0 text-[#1e40af]/80" aria-hidden />
                  Thumbnail image (optional)
                </Label>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    id="resume-thumb"
                    type="file"
                    accept="image/*"
                    className="block w-full max-w-md text-sm file:mr-4 file:rounded-full file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-slate-900 hover:file:bg-slate-200"
                    onChange={(e) => onThumbnailPicked(e.target.files?.[0] ?? null)}
                  />
                  {thumbnailDraft ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full"
                      onClick={() => setThumbnailDraft("")}
                      title="Remove image"
                    >
                      <X className="h-4 w-4" />
                      Remove
                    </Button>
                  ) : null}
                </div>
                {thumbnailDraft ? (
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <img
                      src={thumbnailDraft}
                      alt="Resume thumbnail preview"
                      className="h-48 w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Shows on the resume cards as a cover image. Stored in your browser for this demo.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="resume-session"
                  className="flex items-center gap-2 text-sm font-medium text-foreground"
                >
                  <CalendarDays className="h-4 w-4 shrink-0 text-[#1e40af]/80" aria-hidden />
                  Scheduled session (from admin / class schedule)
                </Label>
                {isSubstituteViewer && approvedSubstituteInviteRow?.sessionNote?.trim() ? (
                  <p className="text-xs text-sky-900/80 leading-relaxed">
                    Only the session your course lead selected on the substitute request is listed here (you can still
                    choose a whole-class recap).
                  </p>
                ) : null}
                {showResumeSessionSelect ? (
                  <Select
                    value={
                      sessionKeyDraft && resumeSessionSelectOptions.some((o) => o.value === sessionKeyDraft)
                        ? sessionKeyDraft
                        : CLASS_RESUME_SESSION_ALL
                    }
                    onValueChange={(v) =>
                      setSessionKeyDraft(v === CLASS_RESUME_SESSION_ALL ? "" : v)
                    }
                  >
                    <SelectTrigger id="resume-session" className="max-w-xl bg-white">
                      <SelectValue placeholder="Whole class or one session…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={CLASS_RESUME_SESSION_ALL}>Whole class — general recap</SelectItem>
                      {resumeSessionSelectOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm text-muted-foreground rounded-md border border-dashed border-amber-200/90 bg-amber-50/60 px-3 py-2.5 leading-relaxed">
                    No schedule rows yet. You can still save a general recap; session-specific labels will appear when the
                    schedule exists.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="resume-body">Resume text</Label>
                <Textarea
                  id="resume-body"
                  value={bodyDraft}
                  onChange={(e) => setBodyDraft(e.target.value)}
                  placeholder="Key points, homework, what to review before next class…"
                  rows={12}
                  className="min-h-[240px] resize-y text-sm"
                />
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-gray-100 pt-5">
                {!isNew && !isSubstituteViewer ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="mr-auto border-red-200 text-red-700 hover:bg-red-50"
                    onClick={() => setDeleteOpen(true)}
                  >
                    Delete
                  </Button>
                ) : null}
                <Button type="button" variant="outline" asChild>
                  <Link to={backHref}>Cancel</Link>
                </Button>
                <Button type="button" className="bg-[#3954d0] hover:bg-[#2f46b3]" onClick={handleSave}>
                  Save for students
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this resume?</AlertDialogTitle>
            <AlertDialogDescription>
              Students will no longer see it on their class page. This cannot be undone in this demo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                handleDelete();
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
