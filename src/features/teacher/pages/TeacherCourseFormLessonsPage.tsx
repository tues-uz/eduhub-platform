import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Trash2, GripVertical, FileText, Video, Loader2, Upload, X, ChevronDown, ChevronRight } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { TeacherCourseFormStickyFooter } from "./TeacherCourseFormStickyFooter";
import type { LessonContentType } from "../types";
import { getVideoEmbed, getPdfPreviewUrl } from "./teacherCourseFormHelpers";
import { useTranslation } from "react-i18next";

const TeacherCourseFormLessonsPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const formRef = useRef<HTMLFormElement>(null);
  const [confirmCreateOpen, setConfirmCreateOpen] = useState(false);
  const {
    basePath,
    isEdit,
    lessons,
    updateLesson,
    handleAddLessonClick,
    uploadingIndex,
    uploadError,
    durationLoadingIndex,
    collapsedLessonIds,
    setCollapsedLessonIds,
    saving,
    error,
    handleSubmit,
    setLessonToRemoveIndex,
    handleFileUpload,
    handleGetDurationFromUrl,
    handleGetPdfReadingTime,
  } = useTeacherCourseForm();

  const confirmCreateAndSubmit = () => {
    setConfirmCreateOpen(false);
    formRef.current?.requestSubmit();
  };

  return (
    <>
      <div className="flex w-full max-w-5xl flex-col pb-24 text-left">
        {error ? (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {error}
          </div>
        ) : null}

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-5">
            <div className="space-y-0.5">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                {t("teacher.courseForm.lessons.title")}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t("teacher.courseForm.lessons.intro")}
              </p>
            </div>
            <Button type="button" size="sm" className="gap-1.5 bg-teal-700 hover:bg-teal-800" onClick={handleAddLessonClick}>
              <Plus className="h-4 w-4 shrink-0" />
              {t("teacher.courseForm.lessons.addLesson")}
            </Button>
          </div>
          <div className="space-y-3 p-4 sm:p-5">
            {lessons.map((lesson, index) => {
              const isExpanded = !collapsedLessonIds.has(lesson.id);
              return (
                <div key={lesson.id} className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-foreground/60 hover:text-foreground"
                      onClick={() => {
                        setCollapsedLessonIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(lesson.id)) next.delete(lesson.id);
                          else next.add(lesson.id);
                          return next;
                        });
                      }}
                      title={isExpanded ? "Minimize" : "Expand"}
                      aria-expanded={isExpanded}
                    >
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </Button>
                    <GripVertical className="h-4 w-4 text-foreground/40 shrink-0" />
                    <span className="text-sm font-medium text-foreground/70">Lesson {index + 1}</span>
                    {lessons.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="ml-auto h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLessonToRemoveIndex(index);
                        }}
                        title="Remove lesson"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {isExpanded && (
                    <>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="sm:col-span-2 space-y-2">
                          <Label>Lesson title</Label>
                          <Input
                            value={lesson.title}
                            onChange={(e) => updateLesson(index, { title: e.target.value })}
                            placeholder="e.g. Supply and Demand"
                            className="rounded-lg"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Content type</Label>
                          <Select
                            value={lesson.contentType}
                            onValueChange={(v: LessonContentType) => {
                              updateLesson(index, {
                                contentType: v,
                                contentUrl: "",
                                duration: undefined,
                              });
                            }}
                          >
                            <SelectTrigger className="rounded-lg">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="video" className="flex items-center gap-2">
                                <Video className="h-4 w-4" />
                                Video link
                              </SelectItem>
                              <SelectItem value="video_upload" className="flex items-center gap-2">
                                <Upload className="h-4 w-4" />
                                Video upload
                              </SelectItem>
                              <SelectItem value="pdf" className="flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                PDF link
                              </SelectItem>
                              <SelectItem value="pdf_upload" className="flex items-center gap-2">
                                <Upload className="h-4 w-4" />
                                PDF upload
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <Label>
                            {lesson.contentType === "video" && "Video URL"}
                            {lesson.contentType === "video_upload" && "Video upload"}
                            {lesson.contentType === "pdf" && "PDF URL"}
                            {lesson.contentType === "pdf_upload" && "PDF upload"}
                          </Label>
                          {lesson.contentType === "video_upload" || lesson.contentType === "pdf_upload" ? (
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <Input
                                  type="file"
                                  accept={lesson.contentType === "video_upload" ? "video/*" : "application/pdf"}
                                  className="rounded-lg max-w-xs file:mr-2 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:text-primary-foreground file:font-medium"
                                  disabled={uploadingIndex === index}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) void handleFileUpload(index, file);
                                    e.target.value = "";
                                  }}
                                />
                                {uploadingIndex === index && (
                                  <span className="text-sm text-foreground/60 inline-flex items-center gap-1">
                                    <Loader2 className="h-4 w-4 animate-spin" />{t("teacherSettings.uploading")}</span>
                                )}
                              </div>
                              {uploadError && uploadingIndex === null && (
                                <p className="text-sm text-red-600">{uploadError}</p>
                              )}
                              {lesson.contentUrl && (
                                <p className="text-xs text-foreground/60 truncate">
                                  Uploaded:{" "}
                                  <a href={lesson.contentUrl} target="_blank" rel="noopener noreferrer" className="underline">
                                    {lesson.contentUrl}
                                  </a>
                                </p>
                              )}
                            </div>
                          ) : (
                            <Input
                              value={lesson.contentUrl}
                              onChange={(e) => updateLesson(index, { contentUrl: e.target.value })}
                              placeholder={
                                lesson.contentType === "video"
                                  ? "https://youtube.com/... or direct video URL"
                                  : "https://... or Google Drive PDF link"
                              }
                              type="url"
                              className="rounded-lg"
                            />
                          )}
                          {(lesson.contentType === "video" || lesson.contentType === "video_upload") &&
                            lesson.contentUrl?.trim() &&
                            (() => {
                              const embed =
                                lesson.contentType === "video_upload"
                                  ? getVideoEmbed(lesson.contentUrl!) ??
                                    (lesson.contentUrl ? { type: "direct" as const, src: lesson.contentUrl } : null)
                                  : getVideoEmbed(lesson.contentUrl!);
                              if (!embed) return null;
                              return (
                                <div className="mt-2 rounded-lg border border-gray-200 overflow-hidden bg-black/5">
                                  <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-200 bg-white/80">
                                    <p className="text-xs font-medium text-foreground/60">Preview</p>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-foreground/60 hover:text-red-600 hover:bg-red-50"
                                      title="Remove video link"
                                      onClick={() => updateLesson(index, { contentUrl: "", duration: undefined })}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                  <div className="aspect-video w-full">
                                    {embed.type === "direct" ? (
                                      <video
                                        src={embed.src}
                                        controls
                                        className="w-full h-full object-contain"
                                        title="Video preview"
                                      />
                                    ) : (
                                      <iframe
                                        src={embed.src}
                                        title="Video preview"
                                        className="w-full h-full"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                      />
                                    )}
                                  </div>
                                </div>
                              );
                            })()}
                          {(lesson.contentType === "pdf" || lesson.contentType === "pdf_upload") &&
                            lesson.contentUrl?.trim() && (
                              <div className="mt-2 rounded-lg border border-gray-200 overflow-hidden bg-black/5">
                                <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-200 bg-white/80">
                                  <p className="text-xs font-medium text-foreground/60">PDF Preview</p>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-foreground/60 hover:text-red-600 hover:bg-red-50"
                                    title="Remove PDF link"
                                    onClick={() => updateLesson(index, { contentUrl: "", duration: undefined })}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                                <div className="w-full min-h-[360px] bg-white">
                                  <iframe
                                    src={getPdfPreviewUrl(lesson.contentUrl)}
                                    title="PDF preview"
                                    className="w-full h-[360px] border-0"
                                  />
                                </div>
                              </div>
                            )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Duration (optional)</Label>
                        <p className="text-xs text-foreground/50">
                          {lesson.contentType === "pdf" || lesson.contentType === "pdf_upload"
                            ? "Estimated time for this material (e.g. 5 min read)."
                            : "Video length or estimated time."}
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <Input
                            value={lesson.duration ?? ""}
                            onChange={(e) => updateLesson(index, { duration: e.target.value })}
                            placeholder={
                              lesson.contentType === "pdf" || lesson.contentType === "pdf_upload"
                                ? "e.g. 5 min read"
                                : "e.g. 12 min"
                            }
                            className="rounded-lg max-w-[140px]"
                          />
                          {(lesson.contentType === "video" || lesson.contentType === "video_upload") &&
                            lesson.contentUrl?.trim() && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="rounded-lg shrink-0"
                                disabled={durationLoadingIndex === index}
                                onClick={() => void handleGetDurationFromUrl(index)}
                                title="Get duration from video link (YouTube/Vimeo)"
                              >
                                {durationLoadingIndex === index ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  "Get from link"
                                )}
                              </Button>
                            )}
                          {(lesson.contentType === "pdf" || lesson.contentType === "pdf_upload") &&
                            lesson.contentUrl?.trim() && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="rounded-lg shrink-0"
                                disabled={durationLoadingIndex === index}
                                onClick={() => void handleGetPdfReadingTime(index)}
                                title="Estimate reading time from PDF (page count)"
                              >
                                {durationLoadingIndex === index ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  "Estimate"
                                )}
                              </Button>
                            )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <TeacherCourseFormStickyFooter>
          <Button type="button" variant="outline" onClick={() => navigate(`${basePath}/schedule`)}>
            {t("common.back")}
          </Button>
          <Button
            type={isEdit ? "submit" : "button"}
            disabled={saving}
            className="bg-teal-700 hover:bg-teal-800"
            onClick={isEdit ? undefined : () => setConfirmCreateOpen(true)}
          >
            {saving
              ? t("teacher.courseForm.lessons.saving")
              : isEdit
                ? t("teacher.courseForm.lessons.saveChanges")
                : t("teacher.courseForm.lessons.createClass")}
          </Button>
        </TeacherCourseFormStickyFooter>
        </form>

        <AlertDialog open={confirmCreateOpen} onOpenChange={setConfirmCreateOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("teacher.courseForm.lessons.createDialog.title")}</AlertDialogTitle>
              <AlertDialogDescription className="text-left">
                {t("teacher.courseForm.lessons.createDialog.description")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common.back")}</AlertDialogCancel>
              <AlertDialogAction
                className="bg-teal-700 text-white hover:bg-teal-800"
                onClick={confirmCreateAndSubmit}
              >
                {t("teacher.courseForm.lessons.createClass")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
};

export default TeacherCourseFormLessonsPage;
