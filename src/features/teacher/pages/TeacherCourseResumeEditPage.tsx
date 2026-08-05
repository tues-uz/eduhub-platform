import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useMatch, useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Image as ImageIcon, Loader2, X } from "@/lib/icons";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { eduhubCourses, eduhubClassResumes, eduhubUploadFile, eduhubSchedule, eduhubSubstituteInvites } from "@/api/eduhubClient";
import { isUuid } from "@/api/utils";
import { useAuthSession } from "@/features/auth/context";
import {
  buildCourseScheduleSlotsForPicker,
  formatClassMeetingSlotLabel,
  resolveSubstituteAssignedSessionFromInvite,
} from "@/features/teacher/pages/teacherCourseFormHelpers";
import { useTranslation } from "react-i18next";
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

const CLASS_RESUME_SESSION_ALL = "__class_resume_all__";

type SessionSelectOption = { value: string; label: string };

export default function TeacherCourseResumeEditPage() {
  const { t } = useTranslation();
  const { courseId = "", resumeId } = useParams<{ courseId: string; resumeId?: string }>();
  const matchNewResume = useMatch({ path: "/dashboard/teacher/courses/:courseId/resume/new", end: true });
  const navigate = useNavigate();
  const { user } = useAuthSession();
  const isNew = Boolean(matchNewResume);
  const editingResumeId = isNew ? undefined : resumeId;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [bodyDraft, setBodyDraft] = useState("");
  const [sessionKeyDraft, setSessionKeyDraft] = useState("");
  const [thumbnailDraft, setThumbnailDraft] = useState<string>("");
  const [loaded, setLoaded] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  /** Same key as `TeacherCourseRosterPage` so navigating here reuses cached course data. */
  const apiCourseQuery = useQuery({
    queryKey: ["teacher", "roster", "course", courseId],
    queryFn: () => eduhubCourses.getById(courseId),
    enabled: Boolean(courseId) && isUuid(courseId),
  });

  const scheduleProposalQuery = useQuery({
    queryKey: ["teacher", "resume", "scheduleProposal", courseId],
    queryFn: async () => {
      try {
        return await eduhubSchedule.getProposal(courseId);
      } catch {
        return null;
      }
    },
    enabled: Boolean(courseId) && isUuid(courseId),
  });

  const substituteInvitesQuery = useQuery({
    queryKey: ["teacher", "substituteInvites", "mine"],
    queryFn: () => eduhubSubstituteInvites.listMine(),
    enabled: Boolean(courseId) && isUuid(courseId),
  });

  const courseSubstituteInvites = useMemo(
    () => (substituteInvitesQuery.data ?? []).filter((r) => r.courseId === courseId),
    [substituteInvitesQuery.data, courseId],
  );

  const substituteCanAccess = useMemo(() => {
    return courseSubstituteInvites.some((r) => r.substituteId === user.id && r.status === "APPROVED");
  }, [courseSubstituteInvites, user.id]);

  const isApiCourseLecturer = Boolean(
    apiCourseQuery.data && apiCourseQuery.data.lecturer?.id === user.id,
  );

  const isSubstituteViewer = Boolean(
    apiCourseQuery.data && substituteCanAccess && !isApiCourseLecturer,
  );

  const approvedSubstituteInviteRow = useMemo(() => {
    return courseSubstituteInvites.find((r) => r.substituteId === user.id && r.status === "APPROVED");
  }, [courseSubstituteInvites, user.id]);

  const approvedCoverAsPrimaryRow = useMemo(() => {
    if (!isApiCourseLecturer) return undefined;
    return courseSubstituteInvites.find((r) => r.primaryInstructorId === user.id && r.status === "APPROVED");
  }, [courseSubstituteInvites, user.id, isApiCourseLecturer]);

  const courseLeadDisplayName = useMemo(() => {
    const apiName = apiCourseQuery.data?.lecturer?.fullName?.trim();
    if (apiName) return apiName;
    return approvedSubstituteInviteRow?.primaryInstructorName?.trim() || "Course lead";
  }, [apiCourseQuery.data?.lecturer?.fullName, approvedSubstituteInviteRow?.primaryInstructorName]);

  const courseLeadEmail = apiCourseQuery.data?.lecturer?.email?.trim();

  const courseMeta =
    apiCourseQuery.data != null
      ? {
          id: apiCourseQuery.data.id,
          title: apiCourseQuery.data.title,
          allowed: isApiCourseLecturer || substituteCanAccess,
        }
      : null;

  const loadingCourse = isUuid(courseId) && apiCourseQuery.isLoading;
  const forbidden =
    apiCourseQuery.data != null && !isApiCourseLecturer && !substituteCanAccess;

  const scheduleSourceCourse = useMemo(() => {
    if (!courseId) return undefined;
    if (apiCourseQuery.data) return apiCourseQuery.data;
    return undefined;
  }, [courseId, apiCourseQuery.data]);

  const scheduleSlots = useMemo(() => {
    if (!courseId) return [];
    return buildCourseScheduleSlotsForPicker(
      courseId,
      scheduleSourceCourse ?? {},
      scheduleProposalQuery.data,
    );
  }, [courseId, scheduleSourceCourse, scheduleProposalQuery.data]);

  const scheduleSlotOptions = useMemo(() => {
    return scheduleSlots.map((slot, index) => ({
      value: `slot-${index}`,
      label: formatClassMeetingSlotLabel(slot, index),
    }));
  }, [scheduleSlots]);

  /** Session the course lead assigned on the substitute invite (substitutes cannot pick another). */
  const substituteAssignedSession = useMemo((): SessionSelectOption | null => {
    if (!isSubstituteViewer) return null;
    return resolveSubstituteAssignedSessionFromInvite(approvedSubstituteInviteRow, scheduleSlots);
  }, [isSubstituteViewer, approvedSubstituteInviteRow, scheduleSlots]);

  const substituteSessionLocked = Boolean(substituteAssignedSession);
  const substituteWholeClassCover =
    isSubstituteViewer &&
    !substituteAssignedSession &&
    !approvedSubstituteInviteRow?.sessionSlotKey?.trim() &&
    !approvedSubstituteInviteRow?.sessionNote?.trim();

  const resumeSessionSelectOptions = useMemo((): SessionSelectOption[] => {
    if (isSubstituteViewer) return [];
    return scheduleSlotOptions;
  }, [isSubstituteViewer, scheduleSlotOptions]);

  const showResumeSessionSelect =
    !isSubstituteViewer && (scheduleSlotOptions.length > 0 || isSubstituteViewer);

  const resumeSessionSelectValue = useMemo(() => {
    if (sessionKeyDraft === CLASS_RESUME_SESSION_ALL) return CLASS_RESUME_SESSION_ALL;
    if (
      sessionKeyDraft &&
      resumeSessionSelectOptions.some((o) => o.value === sessionKeyDraft)
    ) {
      return sessionKeyDraft;
    }
    return CLASS_RESUME_SESSION_ALL;
  }, [sessionKeyDraft, resumeSessionSelectOptions]);

  /** Substitutes are always tied to the invite session (or whole-class cover when no session was specified). */
  useEffect(() => {
    if (!isSubstituteViewer || !loaded) return;
    if (substituteAssignedSession) {
      setSessionKeyDraft(substituteAssignedSession.value);
      return;
    }
    if (substituteWholeClassCover) {
      setSessionKeyDraft(CLASS_RESUME_SESSION_ALL);
    }
  }, [
    isSubstituteViewer,
    loaded,
    substituteAssignedSession,
    substituteWholeClassCover,
    substituteAssignedSession?.value,
  ]);

  const existingResumeQuery = useQuery({
    queryKey: ["teacher", "roster", "resume", courseId, editingResumeId],
    queryFn: () => eduhubClassResumes.get(courseId, editingResumeId!),
    enabled: Boolean(courseId) && isUuid(courseId) && Boolean(editingResumeId) && !isNew,
  });

  useEffect(() => {
    if (isNew) {
      setBodyDraft("");
      setThumbnailDraft("");
      setSessionKeyDraft(CLASS_RESUME_SESSION_ALL);
      setLoaded(true);
      return;
    }
    if (existingResumeQuery.data) {
      setBodyDraft(existingResumeQuery.data.body);
      setSessionKeyDraft(existingResumeQuery.data.sessionSlotKey ?? "");
      setThumbnailDraft(existingResumeQuery.data.thumbnailUrl ?? "");
      setLoaded(true);
    } else if (existingResumeQuery.isError) {
      toast.error(t("teacher.resumeEdit.toast.notFound"));
      void navigate(`/dashboard/teacher/courses/${courseId}?tab=resume`, { replace: true });
    }
  }, [isNew, existingResumeQuery.data, existingResumeQuery.isError, courseId, navigate, t]);

  const backHref = `/dashboard/teacher/courses/${courseId}?tab=resume`;

  const queryClient = useQueryClient();
  const resumeQueryKey = ["teacher", "roster", "resumes", courseId];

  const createResumeMutation = useMutation({
    mutationFn: (body: { body: string; sessionSlotKey?: string; sessionLabel?: string; thumbnailUrl?: string }) =>
      eduhubClassResumes.create(courseId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: resumeQueryKey });
      toast.success(t("teacher.resumeEdit.toast.created"), {
        description: t("teacher.resumeEdit.toast.createdDescription"),
      });
      void navigate(backHref, { replace: true });
    },
    onError: () => toast.error(t("teacher.resumeEdit.toast.saveFailed")),
  });

  const updateResumeMutation = useMutation({
    mutationFn: (body: { body: string; sessionSlotKey?: string; sessionLabel?: string; thumbnailUrl?: string }) =>
      eduhubClassResumes.update(courseId, editingResumeId!, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: resumeQueryKey });
      toast.success(t("teacher.resumeEdit.toast.updated"), {
        description: t("teacher.resumeEdit.toast.updatedDescription"),
      });
      void navigate(backHref, { replace: true });
    },
    onError: () => toast.error(t("teacher.resumeEdit.toast.saveFailed")),
  });

  const deleteResumeMutation = useMutation({
    mutationFn: () => eduhubClassResumes.delete(courseId, editingResumeId!),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: resumeQueryKey });
      setDeleteOpen(false);
      toast.message(t("teacher.resumeEdit.toast.deleted"));
      void navigate(backHref, { replace: true });
    },
    onError: () => toast.error(t("teacher.resumeEdit.toast.deleteFailed")),
  });

  const isSaving = createResumeMutation.isPending || updateResumeMutation.isPending;

  const handleSave = () => {
    const trimmed = bodyDraft.trim();
    if (!trimmed) {
      toast.error(t("teacher.resumeEdit.errors.emptyBody"));
      return;
    }
    let sessionSlotKey: string | undefined;
    let sessionLabel: string | undefined;
    if (isSubstituteViewer && substituteAssignedSession) {
      sessionSlotKey = substituteAssignedSession.value;
      sessionLabel = substituteAssignedSession.label;
    } else if (isSubstituteViewer && substituteWholeClassCover) {
      sessionSlotKey = undefined;
      sessionLabel = undefined;
    } else {
      const keyForSave =
        resumeSessionSelectValue === CLASS_RESUME_SESSION_ALL ? "" : resumeSessionSelectValue;
      const opt = scheduleSlotOptions.find((o) => o.value === keyForSave);
      if (keyForSave && opt) {
        sessionSlotKey = opt.value;
        sessionLabel = opt.label;
      }
    }
    const payload = {
      body: trimmed,
      sessionSlotKey,
      sessionLabel,
      thumbnailUrl: thumbnailDraft || undefined,
    };
    if (isNew) {
      createResumeMutation.mutate(payload);
    } else {
      updateResumeMutation.mutate(payload);
    }
  };

  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);

  const onThumbnailPicked = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error(t("teacher.resumeEdit.toast.invalidImage"));
      return;
    }
    setUploadingThumbnail(true);
    try {
      const { url } = await eduhubUploadFile(file, "resumes");
      setThumbnailDraft(url);
    } catch {
      toast.error(t("teacher.resumeEdit.toast.uploadFailed"));
    } finally {
      setUploadingThumbnail(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = () => {
    if (!editingResumeId) return;
    deleteResumeMutation.mutate();
  };

  if (!courseId) {
    return (
      <div className="px-4 py-6 lg:px-6">
        <p className="text-sm text-red-600">{t("teacher.resumeEdit.errors.missingClass")}</p>
      </div>
    );
  }

  if (loadingCourse || !loaded) {
    return (
      <div className="px-4 py-6 lg:px-6">
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  if (forbidden || !courseMeta) {
    return (
      <div className="px-4 py-6 lg:px-6">
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-5 text-sm text-amber-900">
          {forbidden ? t("teacher.resumeEdit.errors.noAccess") : t("teacher.resumeEdit.errors.classNotFound")}
        </div>
        <Link
          to="/dashboard/teacher/courses"
          className="mt-4 inline-flex text-sm font-medium text-teal-800 hover:text-teal-900"
        >
          {t("teacher.resumeEdit.backToClasses")}
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 lg:px-6">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <div className="space-y-3">
          <Link
            to={backHref}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            {t("teacher.resumeEdit.backToResumes")}
          </Link>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {isNew ? t("teacher.resumeEdit.title.new") : t("teacher.resumeEdit.title.edit")}
            </h1>
            <p className="text-sm text-muted-foreground">{courseMeta.title}</p>
            <p className="text-sm text-muted-foreground">{t("teacher.resumeEdit.intro")}</p>
          </div>
        </div>

        {isSubstituteViewer ? (
          <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-foreground">
            <p className="font-medium">{t("teacher.resumeEdit.substituteBanner.viewingAs")}</p>
            <p className="mt-1 text-muted-foreground">
              {t("teacher.resumeEdit.substituteBanner.courseLead")}{" "}
              <span className="font-medium text-foreground">{courseLeadDisplayName}</span>
              {courseLeadEmail ? (
                <span className="text-muted-foreground"> ({courseLeadEmail})</span>
              ) : null}
            </p>
            <p className="mt-1 text-muted-foreground">{t("teacher.resumeEdit.substituteBanner.hint")}</p>
          </div>
        ) : null}

        {!isSubstituteViewer && approvedCoverAsPrimaryRow ? (
          <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
            {t("teacher.resumeEdit.primaryBanner")}
            {approvedCoverAsPrimaryRow.substituteEmail ? (
              <>
                {" "}
                <span className="font-medium text-foreground">
                  ({approvedCoverAsPrimaryRow.substituteEmail})
                </span>
              </>
            ) : null}
          </div>
        ) : null}

        <div className="space-y-6 rounded-xl border border-border bg-card p-5 sm:p-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <Label className="text-sm font-medium text-foreground">
                {t("teacher.resumeEdit.thumbnail.label")}
              </Label>
              <span className="text-xs text-muted-foreground">
                {t("teacher.resumeEdit.thumbnail.optional")}
              </span>
            </div>

            <input
              ref={fileInputRef}
              id="resume-thumb"
              type="file"
              accept="image/*"
              disabled={uploadingThumbnail}
              className="sr-only"
              onChange={(e) => void onThumbnailPicked(e.target.files?.[0] ?? null)}
            />

            {thumbnailDraft ? (
              <div className="overflow-hidden rounded-xl border border-border">
                <img
                  src={thumbnailDraft}
                  alt={t("teacher.resumeEdit.thumbnail.previewAlt")}
                  className="h-40 w-full object-cover sm:h-48"
                  loading="lazy"
                />
                <div className="flex flex-wrap gap-2 border-t border-border bg-muted/20 px-3 py-2.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploadingThumbnail}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploadingThumbnail ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : null}
                    {t("teacher.resumeEdit.thumbnail.change")}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                    onClick={() => setThumbnailDraft("")}
                  >
                    <X className="mr-1.5 h-3.5 w-3.5" />
                    {t("teacher.resumeEdit.thumbnail.remove")}
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                disabled={uploadingThumbnail}
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center transition-colors hover:bg-muted/40 disabled:opacity-50"
              >
                {uploadingThumbnail ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : (
                  <ImageIcon className="h-5 w-5 text-muted-foreground" aria-hidden />
                )}
                <span className="text-sm font-medium text-foreground">
                  {uploadingThumbnail
                    ? t("teacherSettings.uploading")
                    : t("teacher.resumeEdit.thumbnail.add")}
                </span>
                <span className="max-w-xs text-xs text-muted-foreground">
                  {t("teacher.resumeEdit.thumbnail.hint")}
                </span>
              </button>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="resume-session" className="text-sm font-medium text-foreground">
              {t("teacher.resumeEdit.sessionLabel")}
            </Label>
            {!isSubstituteViewer ? (
              <p className="text-xs text-muted-foreground">{t("teacher.resumeEdit.sessionHints.primary")}</p>
            ) : null}

            {isUuid(courseId) && scheduleProposalQuery.isLoading && isSubstituteViewer ? (
              <p className="text-xs text-muted-foreground">{t("teacher.resumeEdit.session.loadingAssigned")}</p>
            ) : null}

            {substituteSessionLocked ? (
              <>
                <p className="text-xs text-muted-foreground">
                  {t("teacher.resumeEdit.sessionHints.substituteLocked")}
                </p>
                <div
                  id="resume-session"
                  className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm font-medium text-foreground"
                  aria-readonly="true"
                >
                  {substituteAssignedSession.label}
                </div>
              </>
            ) : substituteWholeClassCover ? (
              <div
                id="resume-session"
                className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm font-medium text-foreground"
                aria-readonly="true"
              >
                {t("teacher.resumeEdit.session.wholeClass")}
              </div>
            ) : showResumeSessionSelect ? (
              <Select value={resumeSessionSelectValue} onValueChange={(v) => setSessionKeyDraft(v)}>
                <SelectTrigger id="resume-session" className="bg-background">
                  <SelectValue placeholder={t("teacher.resumeEdit.session.placeholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={CLASS_RESUME_SESSION_ALL}>
                    {t("teacher.resumeEdit.session.wholeClass")}
                  </SelectItem>
                  {resumeSessionSelectOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-2.5 text-sm text-muted-foreground">
                {t("teacher.resumeEdit.sessionHints.noSessions")}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="resume-body" className="text-sm font-medium text-foreground">
              {t("teacher.resumeEdit.bodyLabel")}
            </Label>
            <Textarea
              id="resume-body"
              value={bodyDraft}
              onChange={(e) => setBodyDraft(e.target.value)}
              placeholder={t("teacher.resumeEdit.bodyPlaceholder")}
              rows={12}
              className="min-h-[220px] resize-y text-sm"
            />
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-5">
            {!isNew && !isSubstituteViewer ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mr-auto border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                onClick={() => setDeleteOpen(true)}
              >
                {t("common.delete")}
              </Button>
            ) : null}
            <Button type="button" variant="outline" size="sm" asChild>
              <Link to={backHref}>{t("common.cancel")}</Link>
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-teal-700 hover:bg-teal-800"
              disabled={isSaving}
              onClick={handleSave}
            >
              {isSaving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
              {t("teacher.resumeEdit.actions.saveForStudents")}
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("teacher.resumeEdit.deleteDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("teacher.resumeEdit.deleteDialog.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteResumeMutation.isPending}
              onClick={() => {
                handleDelete();
              }}
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
