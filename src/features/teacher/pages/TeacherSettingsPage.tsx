import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Bell, BookOpen, Loader2, Mail, Phone, Save, Upload, User, X } from "@/lib/icons";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { eduhubAuth, eduhubUploadFile, getAccessToken } from "@/api/eduhubClient";
import type { UserResponse } from "@/api/eduhubTypes";
import { setSessionUser, useAuthSession } from "@/features/auth/context";
import { useTeacherCoursesQuery } from "@/features/teacher/hooks/useTeacherQueries";
import { resolveInstructorCategory } from "@/features/teacher/resolveInstructorCategory";
import { syncInstructorProfileAvatar } from "@/features/teacher/syncInstructorProfileAvatar";
import { formatDisplayPersonName, profileInitials } from "@/lib/formatPersonName";
import {
  LanguageSettingsSection,
  persistUiLanguagePreference,
} from "@/features/settings/LanguageSettingsSection";

function DetailCard({ icon: Icon, label, value }: { icon: typeof User; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-100 bg-zinc-50/70 px-4 py-3">
      <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-foreground/50">
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {label}
      </div>
      <p className="text-sm font-medium text-foreground">{value || "—"}</p>
    </div>
  );
}

function formatMemberSince(iso: string | undefined): string {
  if (!iso?.trim()) return "—";
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

export default function TeacherSettingsPage() {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuthSession();
  const [name, setName] = useState(user.name);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl ?? "");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [payrollAlerts, setPayrollAlerts] = useState(true);
  const [scheduleAlerts, setScheduleAlerts] = useState(true);
  const [apiUser, setApiUser] = useState<UserResponse | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const { data: apiCourses = [], isLoading: coursesLoading } = useTeacherCoursesQuery(user.id);

  useEffect(() => {
    if (!getAccessToken()) return;
    eduhubAuth
      .me()
      .then(setApiUser)
      .catch(() => {
        /* keep session data when API is unavailable */
      });
  }, []);

  useEffect(() => {
    setName(user.name);
    setAvatarUrl(user.avatarUrl ?? "");
  }, [user.name, user.avatarUrl]);

  const publishedClassCount = useMemo(() => {
    const byId = new Map<string, (typeof apiCourses)[number]>();
    for (const course of apiCourses) {
      if (course?.id) byId.set(course.id, course);
    }
    return Array.from(byId.values()).filter((course) => course.status === "PUBLISHED").length;
  }, [apiCourses]);

  const accountDetails = useMemo(() => {
    const email = (apiUser?.email ?? user.email).trim() || "—";
    const phone = (apiUser?.phoneNumber ?? user.phoneNumber ?? "").trim() || "—";
    const category = resolveInstructorCategory(email, apiUser?.category ?? user.category).trim() || "—";
    return {
      fullName: formatDisplayPersonName(apiUser?.fullName ?? user.name),
      email,
      phone,
      category,
      memberSince: formatMemberSince(apiUser?.createdAt),
      coursesCount: coursesLoading ? "…" : String(publishedClassCount),
    };
  }, [apiUser, coursesLoading, publishedClassCount, user.category, user.email, user.name, user.phoneNumber]);

  const persistProfile = async (updates: { name?: string; avatarUrl?: string }) => {
    const nextName = updates.name ?? name;
    const nextAvatar =
      updates.avatarUrl !== undefined ? updates.avatarUrl || undefined : avatarUrl || undefined;
    const category = resolveInstructorCategory(user.email, apiUser?.category ?? user.category);

    setSessionUser({
      ...user,
      name: nextName,
      avatarUrl: nextAvatar,
      category: category || user.category,
    });
    syncInstructorProfileAvatar(user.email, nextName, nextAvatar);
    refreshUser();

    if (getAccessToken()) {
      try {
        await eduhubAuth.updateProfile({
          fullName: nextName,
          avatarUrl: nextAvatar,
        });
      } catch {
        /* saved locally; API may be unavailable in demo */
      }
    }
  };

  const handleAvatarUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file (JPEG, PNG, WebP, etc.).");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Image must be 8 MB or smaller.");
      return;
    }

    setAvatarUploading(true);
    try {
      const { url } = await eduhubUploadFile(file, "avatars");
      setAvatarUrl(url);
      await persistProfile({ avatarUrl: url });
      toast.success("Profile picture updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Profile picture upload failed");
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setAvatarUrl("");
    await persistProfile({ avatarUrl: "" });
    toast.success("Profile picture removed");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    persistUiLanguagePreference();
    await persistProfile({ name });
    toast.success("Settings saved");
  };

  return (
    <div
      className="flex w-full min-w-0 max-w-2xl flex-1 flex-col gap-3 px-4 py-4 text-left lg:px-6 md:py-6"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
          <Link
            to="/dashboard/teacher"
            className="inline-flex w-fit items-center gap-2 text-sm text-foreground/70 hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("teacherSettings.backToDashboard")}
          </Link>

          <div className="space-y-1">
            <h1
              className="text-2xl font-bold text-foreground"
              style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400, letterSpacing: "0.5px" }}
            >
              {t("teacherSettings.title")}
            </h1>
            <p className="text-sm text-foreground/60">{t("teacherSettings.subtitle")}</p>
          </div>

          <form onSubmit={handleSave} className="space-y-5">
            <div className="rounded-xl border border-zinc-200/80 bg-white p-6 shadow-sm ring-1 ring-zinc-100/80">
              <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
                <User className="h-5 w-5" aria-hidden />
                {t("teacherSettings.profile")}
              </h2>
              <div className="space-y-6">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border border-zinc-200 bg-zinc-100 ring-1 ring-zinc-100/80">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-zinc-600">
                        {profileInitials(name || user.name)}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">{t("teacherSettings.profilePicture")}</p>
                    <p className="text-xs text-foreground/60">{t("teacherSettings.profilePictureHint")}</p>
                    <div className="flex flex-wrap gap-2">
                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="sr-only"
                        disabled={avatarUploading}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void handleAvatarUpload(file);
                          e.target.value = "";
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-full"
                        disabled={avatarUploading}
                        onClick={() => avatarInputRef.current?.click()}
                      >
                        {avatarUploading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                            {t("teacherSettings.uploading")}
                          </>
                        ) : (
                          <>
                            <Upload className="mr-2 h-4 w-4" aria-hidden />
                            {avatarUrl ? t("teacherSettings.changePhoto") : t("teacherSettings.uploadPhoto")}
                          </>
                        )}
                      </Button>
                      {avatarUrl ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="rounded-full text-foreground/70 hover:text-red-600"
                          disabled={avatarUploading}
                          onClick={() => void handleRemoveAvatar()}
                        >
                          <X className="mr-2 h-4 w-4" aria-hidden />
                          {t("teacherSettings.remove")}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="teacher-display-name">{t("teacherSettings.displayName")}</Label>
                  <Input
                    id="teacher-display-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1.5"
                    placeholder={t("teacherSettings.displayNamePlaceholder")}
                  />
                </div>

                <div className="space-y-4 border-t border-zinc-100 pt-6">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{t("teacherSettings.accountDetails")}</h3>
                    <p className="mt-1 text-xs text-foreground/60">{t("teacherSettings.accountDetailsHint")}</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <DetailCard icon={User} label={t("teacherSettings.fullName")} value={accountDetails.fullName} />
                    <DetailCard icon={Mail} label={t("teacherSettings.email")} value={accountDetails.email} />
                    <DetailCard icon={Phone} label={t("teacherSettings.phone")} value={accountDetails.phone} />
                    <DetailCard icon={BookOpen} label={t("teacherSettings.teachingCategory")} value={accountDetails.category} />
                    <DetailCard icon={User} label={t("teacherSettings.memberSince")} value={accountDetails.memberSince} />
                    <DetailCard icon={BookOpen} label={t("teacherSettings.publishedClasses")} value={accountDetails.coursesCount} />
                  </div>
                </div>
              </div>
            </div>

            <LanguageSettingsSection
              selectId="teacher-language"
              className="border-zinc-200/80 bg-white p-6 shadow-sm ring-1 ring-zinc-100/80"
              headingClassName="text-base font-semibold"
            />

            <div className="rounded-xl border border-zinc-200/80 bg-white p-6 shadow-sm ring-1 ring-zinc-100/80">
              <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
                <Bell className="h-5 w-5" aria-hidden />
                {t("teacherSettings.notifications")}
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-foreground">{t("teacherSettings.emailNotifications")}</p>
                    <p className="text-sm text-foreground/60">{t("teacherSettings.emailNotificationsHint")}</p>
                  </div>
                  <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-foreground">{t("teacherSettings.payrollUpdates")}</p>
                    <p className="text-sm text-foreground/60">{t("teacherSettings.payrollUpdatesHint")}</p>
                  </div>
                  <Switch checked={payrollAlerts} onCheckedChange={setPayrollAlerts} />
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-foreground">{t("teacherSettings.scheduleApprovals")}</p>
                    <p className="text-sm text-foreground/60">{t("teacherSettings.scheduleApprovalsHint")}</p>
                  </div>
                  <Switch checked={scheduleAlerts} onCheckedChange={setScheduleAlerts} />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button type="button" variant="outline" className="rounded-full" asChild>
                <Link to="/change-password">{t("teacherSettings.changePassword")}</Link>
              </Button>
              <Button type="submit" className="rounded-full" style={{ backgroundColor: "#3954d0" }}>
                <Save className="mr-2 h-4 w-4" aria-hidden />
                {t("teacherSettings.saveChanges")}
              </Button>
            </div>
          </form>
    </div>
  );
}
