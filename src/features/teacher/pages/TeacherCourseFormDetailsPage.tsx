import { Link, useNavigate } from "react-router-dom";
import { Upload, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuthSession } from "@/features/auth/context";
import { useTeacherCourseForm } from "./TeacherCourseFormContext";

function profileInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  if (parts[0]?.length) return parts[0].slice(0, 2).toUpperCase();
  return "?";
}

const TeacherCourseFormDetailsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthSession();
  const {
    basePath,
    title,
    setTitle,
    description,
    setDescription,
    classMeetingsInSixMonths,
    setClassMeetingsInSixMonths,
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
  const sessionsFieldErrors =
    error === "Sessions in 6 months is required." ||
    error === "Sessions in 6 months must be a whole number of at least 1.";
  const showDetailsGlobalBanner =
    Boolean(error) && !titleRequiredError && !sessionsFieldErrors;

  const continueToLessons = () => {
    setError("");
    if (!validateDetailsStep()) return;
    navigate(`${basePath}/lessons`);
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
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Uploading…
                  </>
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
                  <X className="mr-1 h-3.5 w-3.5" />
                  Remove
                </Button>
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

          <section className="space-y-2">
            <label htmlFor="classMeetings6m" className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Sessions in 6 months <span className="text-red-600">*</span>
            </label>
            <Input
              id="classMeetings6m"
              inputMode="numeric"
              pattern="[0-9]*"
              required
              aria-required
              value={classMeetingsInSixMonths}
              onChange={(e) => setClassMeetingsInSixMonths(e.target.value.replace(/\D/g, ""))}
              placeholder="24"
              aria-invalid={sessionsFieldErrors}
              aria-describedby={sessionsFieldErrors ? "classMeetings6m-error" : undefined}
              className={`h-11 max-w-[10rem] rounded-xl bg-white text-lg font-medium tabular-nums shadow-none focus-visible:border-slate-400 focus-visible:ring-[#1e40af]/20 ${
                sessionsFieldErrors ? "border-red-400 focus-visible:border-red-500" : "border-slate-200"
              }`}
            />
            {sessionsFieldErrors ? (
              <p id="classMeetings6m-error" className="text-sm text-red-600" role="alert">
                {error}
              </p>
            ) : null}
            <p className="max-w-lg text-xs leading-relaxed text-slate-500">
              Planned sessions for this window — used with student attendance (check-ins vs expected sessions).
            </p>
          </section>

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
            <Link to="/dashboard/teacher/courses">Cancel</Link>
          </Button>
          <Button type="button" onClick={continueToLessons} className="rounded-full" style={{ backgroundColor: "#1e40af" }}>
            Continue to lessons
          </Button>
        </div>
      </div>
    </>
  );
};

export default TeacherCourseFormDetailsPage;
