import { Link, useNavigate } from "react-router-dom";
import { Upload, Loader2, X } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuthSession } from "@/features/auth/context";
import { useTeacherCourseForm } from "./TeacherCourseFormContext";
import { INSTRUCTOR_CATEGORY_MISSING } from "../resolveInstructorCategory";
import { useTranslation } from "react-i18next";

function profileInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  if (parts[0]?.length) return parts[0].slice(0, 2).toUpperCase();
  return "?";
}

const TeacherCourseFormDetailsPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthSession();
  const {
    basePath,
    title,
    setTitle,
    category,
    description,
    setDescription,
    classStartDate,
    setClassStartDate,
    classEndDate,
    setClassEndDate,
    thumbnailUrl,
    setThumbnailUrl,
    thumbnailUploading,
    thumbnailInputRef,
    handleThumbnailUpload,
    instructorDisplayName,
    error,
    setError,
    validateDetailsStep,
  } = useTeacherCourseForm();

  const titleRequiredError = error === "Class title is required.";
  const categoryRequiredError = error === INSTRUCTOR_CATEGORY_MISSING;
  const dateFieldErrors =
    error === "Enter both a class start date and a class end date, or leave both empty." ||
    error === "Class end date must be on or after the start date." ||
    error === "Class dates are invalid.";
  const showDetailsGlobalBanner =
    Boolean(error) && !titleRequiredError && !categoryRequiredError && !dateFieldErrors;

  const continueToSchedule = () => {
    setError("");
    if (!validateDetailsStep()) return;
    navigate(`${basePath}/schedule`);
  };

  const triggerThumbnailPick = () => thumbnailInputRef.current?.click();

  return (
    <>
      <div className="mx-auto w-full max-w-2xl">
        {showDetailsGlobalBanner ? (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        <Card className="w-full overflow-hidden rounded-2xl border-slate-200/90 shadow-sm">
        {/* Cover — fixed height so wide layouts don’t grow ~500px tall (16:10 × full width); image uses object-cover like cards */}
        <div className="relative">
          <div className="relative h-36 w-full overflow-hidden bg-gray-200 sm:h-44">
            {thumbnailUrl ? (
              <>
                <img src={thumbnailUrl} alt="" className="h-full w-full object-cover" />
                <div
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-black/5 to-transparent"
                  aria-hidden
                />
              </>
            ) : (
              <div className="flex h-full w-full items-center justify-center" aria-hidden />
            )}
            <div className="absolute bottom-3 right-3 flex flex-wrap items-center justify-end gap-2">
              <input
                ref={thumbnailInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                disabled={thumbnailUploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleThumbnailUpload(file);
                  e.target.value = "";
                }}
              />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="rounded-full border-0 bg-white/95 text-slate-800 shadow-sm hover:bg-white"
                disabled={thumbnailUploading}
                onClick={triggerThumbnailPick}
              >
                {thumbnailUploading ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />{t("teacherSettings.uploading")}</>
                ) : thumbnailUrl ? (
                  <>
                    <Upload className="mr-1.5 h-3.5 w-3.5 opacity-70" />
                    Replace image
                  </>
                ) : (
                  <>
                    <Upload className="mr-1.5 h-3.5 w-3.5 opacity-70" />
                    Add cover image
                  </>
                )}
              </Button>
              {thumbnailUrl ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="rounded-full border-0 bg-white/90 text-slate-700 shadow-sm hover:bg-white"
                  onClick={() => setThumbnailUrl("")}
                >
                  <X className="mr-1 h-3.5 w-3.5" />{t("teacherSettings.remove")}</Button>
              ) : null}
            </div>
          </div>
        </div>

        {/* Instructor */}
        <div className="relative z-10 -mt-10 px-4 pb-2 sm:-mt-12 pointer-events-none">
          <div className="pointer-events-auto flex max-w-md flex-col items-start gap-3">
            <div className="h-[5.25rem] w-[5.25rem] shrink-0 overflow-hidden rounded-full border-[3px] border-white bg-gray-200 shadow-lg ring-1 ring-slate-200/90 sm:h-24 sm:w-24">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-200 to-slate-300 text-base font-semibold text-slate-600 sm:text-lg"
                  aria-hidden
                >
                  {profileInitials(user.name)}
                </div>
              )}
            </div>
            <div className="min-w-0 space-y-1.5 pt-0.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Instructor</p>
              <p className="text-base font-medium text-slate-900">{instructorDisplayName}</p>
            </div>
          </div>
        </div>

        <CardContent className="space-y-8 p-0 px-4 pb-4 pt-4">
          <section className="space-y-2">
            <label htmlFor="title" className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Class name <span className="font-semibold normal-case tracking-normal text-red-600">*</span>
            </label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Introduction to Economics"
              aria-invalid={titleRequiredError}
              aria-describedby={titleRequiredError ? "title-error" : undefined}
              className={`h-auto border-0 border-b bg-transparent px-0 py-2 text-2xl font-semibold tracking-tight text-slate-900 shadow-none placeholder:text-slate-400 focus-visible:border-b-[#1e40af] focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none ${
                titleRequiredError ? "border-red-400 focus-visible:border-red-500" : "border-slate-200"
              }`}
            />
            {titleRequiredError ? (
              <p id="title-error" className="text-sm text-red-600" role="alert">
                {error}
              </p>
            ) : null}
          </section>

          <section className="space-y-2">
            <label htmlFor="category" className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Category <span className="font-semibold normal-case tracking-normal text-red-600">*</span>
            </label>
            <Input
              id="category"
              value={category || "Not assigned"}
              readOnly
              disabled
              aria-invalid={categoryRequiredError}
              aria-describedby={categoryRequiredError ? "category-error" : "category-hint"}
              className={`h-11 rounded-xl border bg-slate-50 text-[15px] text-slate-700 shadow-none ${
                categoryRequiredError ? "border-red-400" : "border-slate-200"
              }`}
            />
            <p id="category-hint" className="text-xs text-slate-500">
              Assigned by admin when your instructor account was created and cannot be changed here.
            </p>
            {categoryRequiredError ? (
              <p id="category-error" className="text-sm text-red-600" role="alert">
                {error}
              </p>
            ) : null}
          </section>

          <section className="space-y-2">
            <label htmlFor="description" className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              About this class <span className="font-normal normal-case tracking-normal text-slate-400">(optional)</span>
            </label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What students will learn — a sentence or two is enough."
              rows={4}
              className="resize-none rounded-xl border-slate-200/90 bg-slate-50/80 text-[15px] leading-relaxed text-slate-800 shadow-none transition-colors focus-visible:border-slate-400 focus-visible:bg-white focus-visible:ring-[#1e40af]/20"
            />
          </section>

          <Separator className="bg-slate-100" />

          <section className="space-y-3">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Class dates <span className="font-normal normal-case tracking-normal text-slate-400">(optional)</span>
              </p>
              <p className="max-w-lg text-xs leading-relaxed text-slate-500">
                When this run starts and ends — shown on student class pages and schedules. Leave blank if not set yet,
                or choose both dates.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="classStartDate" className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Class starts
                </label>
                <Input
                  id="classStartDate"
                  type="date"
                  value={classStartDate}
                  onChange={(e) => setClassStartDate(e.target.value)}
                  className="h-11 rounded-xl border-slate-200 bg-white text-[15px] shadow-none focus-visible:border-slate-400 focus-visible:ring-[#1e40af]/20"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="classEndDate" className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Class ends
                </label>
                <Input
                  id="classEndDate"
                  type="date"
                  value={classEndDate}
                  min={classStartDate || undefined}
                  onChange={(e) => setClassEndDate(e.target.value)}
                  className="h-11 rounded-xl border-slate-200 bg-white text-[15px] shadow-none focus-visible:border-slate-400 focus-visible:ring-[#1e40af]/20"
                />
              </div>
            </div>
            {dateFieldErrors ? (
              <p id="class-dates-error" className="text-sm text-red-600" role="alert">
                {error}
              </p>
            ) : null}
          </section>

          <Separator className="bg-slate-100" />

          <div className="rounded-xl border border-slate-100 bg-slate-50/90 px-4 py-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Pricing</p>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
              Set by an admin after you save. They add catalog price and optional referral discount, then publish so
              students can enroll.
            </p>
          </div>
        </CardContent>
        </Card>

        <div className="mt-6 flex w-full flex-wrap items-center justify-between gap-3">
          <Button type="button" variant="outline" className="rounded-full" asChild>
            <Link to="/dashboard/teacher/courses">{t("common.cancel")}</Link>
          </Button>
          <Button type="button" onClick={continueToSchedule} className="rounded-full" style={{ backgroundColor: "#1e40af" }}>{t("teacher.courseForm.details.continueToSchedule")}</Button>
        </div>
      </div>
    </>
  );
};

export default TeacherCourseFormDetailsPage;
