import { Link, useNavigate } from "react-router-dom";
import { Upload, Loader2, Image } from "@/lib/icons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuthSession } from "@/features/auth/context";
import { formatDisplayPersonName, profileInitials } from "@/lib/formatPersonName";
import { cn } from "@/lib/utils";
import { useTeacherCourseForm } from "./TeacherCourseFormContext";
import { TeacherCourseFormStickyFooter } from "./TeacherCourseFormStickyFooter";
import { INSTRUCTOR_CATEGORY_MISSING } from "../resolveInstructorCategory";
import { COURSE_LEVEL_REQUIRED, COURSE_LEVELS } from "../data/courseLevels";
import { useTranslation } from "react-i18next";

const TeacherCourseFormDetailsPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthSession();
  const {
    basePath,
    title,
    setTitle,
    category,
    level,
    setLevel,
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
  const levelRequiredError = error === COURSE_LEVEL_REQUIRED;
  const dateFieldErrors =
    error === "Enter both a class start date and a class end date, or leave both empty." ||
    error === "Class end date must be on or after the start date." ||
    error === "Class dates are invalid.";
  const showDetailsGlobalBanner =
    Boolean(error) &&
    !titleRequiredError &&
    !categoryRequiredError &&
    !levelRequiredError &&
    !dateFieldErrors;

  const continueToSchedule = () => {
    setError("");
    if (!validateDetailsStep()) return;
    navigate(`${basePath}/schedule`);
  };

  const triggerThumbnailPick = () => thumbnailInputRef.current?.click();
  const displayInstructor = formatDisplayPersonName(instructorDisplayName);
  const categoryLabel = category || t("teacher.courseForm.details.categoryNotAssigned");

  return (
    <div className="flex w-full max-w-5xl flex-col pb-24 text-left">
      {showDetailsGlobalBanner ? (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:items-start xl:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        {/* Cover */}
        <div className="space-y-3">
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
          {thumbnailUrl ? (
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="relative aspect-[4/3] w-full bg-muted">
                <img src={thumbnailUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
              </div>
              <div className="flex flex-wrap gap-2 border-t border-border bg-muted/20 px-3 py-2.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  disabled={thumbnailUploading}
                  onClick={triggerThumbnailPick}
                >
                  {thumbnailUploading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5 shrink-0" />
                  )}
                  {t("teacher.courseForm.details.replaceImage")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => setThumbnailUrl("")}
                >
                  {t("teacherSettings.remove")}
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              disabled={thumbnailUploading}
              onClick={triggerThumbnailPick}
              className={cn(
                "flex aspect-[4/3] w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/20 px-6 text-center transition-colors",
                "hover:border-teal-600/40 hover:bg-teal-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/30",
                thumbnailUploading && "pointer-events-none opacity-60",
              )}
            >
              {thumbnailUploading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <span className="flex size-11 items-center justify-center rounded-full border border-border bg-background">
                  <Image className="h-5 w-5 text-muted-foreground" aria-hidden />
                </span>
              )}
              <span className="space-y-0.5">
                <span className="block text-sm font-medium text-foreground">
                  {t("teacher.courseForm.details.addCoverImage")}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {t("teacher.courseForm.details.coverHint")}
                </span>
              </span>
            </button>
          )}
        </div>

        {/* Form */}
        <div className="min-w-0 space-y-8">
          <div className="space-y-2">
            <Label htmlFor="title" className="sr-only">
              {t("teacher.courseForm.details.classNameLabel")}
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("teacher.courseForm.details.classNamePlaceholder")}
              aria-invalid={titleRequiredError}
              aria-describedby={titleRequiredError ? "title-error" : undefined}
              className={cn(
                "h-auto rounded-none border-0 border-b bg-transparent px-0 py-2 text-2xl font-semibold tracking-tight shadow-none placeholder:font-normal placeholder:text-muted-foreground/60 focus-visible:border-b-teal-700 focus-visible:ring-0 focus-visible:ring-offset-0 sm:text-3xl",
                titleRequiredError ? "border-red-400 focus-visible:border-red-500" : "border-border",
              )}
            />
            {titleRequiredError ? (
              <p id="title-error" className="text-sm text-red-600" role="alert">
                {error}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <Avatar className="size-8 shrink-0">
                {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt="" /> : null}
                <AvatarFallback className="text-[10px]">{profileInitials(displayInstructor)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {t("teacher.courseForm.details.instructorLabel")}
                </p>
                <p className="truncate text-sm font-medium text-foreground">{displayInstructor}</p>
              </div>
            </div>
            <span className="hidden text-border sm:inline" aria-hidden>
              ·
            </span>
            <div
              className={cn(
                "inline-flex max-w-full items-center rounded-md border px-2.5 py-1 text-xs font-medium",
                categoryRequiredError
                  ? "border-red-300 bg-red-50 text-red-800"
                  : "border-border bg-muted/50 text-foreground",
              )}
              title={t("teacher.courseForm.details.categoryHint")}
            >
              <span className="truncate">
                {t("teacher.courseForm.details.categoryLabel")}: {categoryLabel}
              </span>
            </div>
            {categoryRequiredError ? (
              <p className="basis-full text-sm text-red-600" role="alert">
                {error}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="classLevel">{t("teacher.courseForm.details.levelLabel")}</Label>
            <Select
              value={level || undefined}
              onValueChange={(value) => {
                setLevel(value);
                if (error === COURSE_LEVEL_REQUIRED) setError("");
              }}
            >
              <SelectTrigger
                id="classLevel"
                aria-invalid={levelRequiredError}
                className={cn(
                  "h-11 bg-background",
                  levelRequiredError && "border-red-400 focus:ring-red-400",
                )}
              >
                <SelectValue placeholder={t("teacher.courseForm.details.levelPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {COURSE_LEVELS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {t(item.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {levelRequiredError ? (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t("teacher.courseForm.details.aboutLabel")}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("teacher.courseForm.details.aboutPlaceholder")}
              rows={4}
              className="resize-none bg-background"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-foreground">{t("teacher.courseForm.details.datesSectionTitle")}</Label>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="classStartDate" className="text-muted-foreground font-normal">
                  {t("teacher.courseForm.details.startLabel")}
                </Label>
                <Input
                  id="classStartDate"
                  type="date"
                  value={classStartDate}
                  onChange={(e) => setClassStartDate(e.target.value)}
                  className="h-11 bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="classEndDate" className="text-muted-foreground font-normal">
                  {t("teacher.courseForm.details.endLabel")}
                </Label>
                <Input
                  id="classEndDate"
                  type="date"
                  value={classEndDate}
                  min={classStartDate || undefined}
                  onChange={(e) => setClassEndDate(e.target.value)}
                  className="h-11 bg-background"
                />
              </div>
            </div>
            {dateFieldErrors ? (
              <p id="class-dates-error" className="text-sm text-red-600" role="alert">
                {error}
              </p>
            ) : null}
          </div>

          <p className="text-xs text-muted-foreground">{t("teacher.courseForm.details.pricingHint")}</p>
        </div>
      </div>

      <TeacherCourseFormStickyFooter>
        <Button type="button" variant="outline" asChild>
          <Link to="/dashboard/teacher/courses">{t("common.cancel")}</Link>
        </Button>
        <Button type="button" className="bg-teal-700 hover:bg-teal-800" onClick={continueToSchedule}>
          {t("teacher.courseForm.details.continueToSchedule")}
        </Button>
      </TeacherCourseFormStickyFooter>
    </div>
  );
};

export default TeacherCourseFormDetailsPage;
