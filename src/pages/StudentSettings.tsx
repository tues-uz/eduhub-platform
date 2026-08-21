import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { User, Bell, Save, Upload, Loader2, X, IdCard, Phone, Calendar, MapPin, Mail, GraduationCap } from "@/lib/icons";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { eduhubAuth, eduhubUploadFile, getAccessToken } from "@/api/eduhubClient";
import type { UserResponse } from "@/api/eduhubTypes";
import { setSessionUser, useAuthSession } from "@/features/auth/context";
import { instructorProfileAvatarsStore } from "@/features/teacher/data/instructorProfileAvatarsStore";
import { formatDisplayPersonName, profileInitials } from "@/lib/formatPersonName";
import {
  LanguageSettingsSection,
  persistUiLanguagePreference,
} from "@/features/settings/LanguageSettingsSection";

function formatRegistrationDate(value: string, notAvailable: string): string {
  if (!value.trim()) return notAvailable;
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function RegistrationDetail({
  icon: Icon,
  label,
  value,
  notAvailable,
}: {
  icon: typeof User;
  label: string;
  value: string;
  notAvailable: string;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3">
      <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-foreground/50">
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {label}
      </div>
      <p className="text-sm font-medium text-foreground">{value || notAvailable}</p>
    </div>
  );
}

const StudentSettings = () => {
  const { t } = useTranslation();
  const notAvailable = t("common.notAvailable");
  const { user, refreshUser } = useAuthSession();
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl ?? "");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [classReminders, setClassReminders] = useState(true);
  const [apiUser, setApiUser] = useState<UserResponse | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!getAccessToken()) return;
    eduhubAuth
      .me()
      .then(setApiUser)
      .catch(() => {
        // Keep registration cache when profile API is unavailable.
      });
  }, []);

  const registrationDetails = useMemo(() => {
    const phone = (apiUser?.phoneNumber ?? user.phoneNumber ?? "").trim() || notAvailable;
    const parentPhone = (apiUser?.parentPhoneNumber ?? "").trim() || notAvailable;
    const passport = (apiUser?.passportNumber ?? "").trim() || notAvailable;
    const passportInternational =
      (apiUser?.internationalPassportNumber ?? "").trim() || notAvailable;
    const passportImageUrl = (apiUser?.passportImageUrl ?? "").trim();
    const internationalPassportImageUrl = (apiUser?.internationalPassportImageUrl ?? "").trim();
    const dateOfBirth = formatRegistrationDate(apiUser?.dateOfBirth ?? "", notAvailable);
    const birthCity = (apiUser?.birthCity ?? "").trim() || notAvailable;
    const latestSchool = (apiUser?.latestSchool ?? "").trim() || notAvailable;
    const isInternal =
      apiUser?.studentAffiliation === "INTERNAL" ||
      (apiUser?.latestSchool ? apiUser.latestSchool.startsWith("TUES University") : false);
    const affiliation = isInternal ? "Internal (TUES University)" : "External";
    const faculty = (apiUser?.faculty ?? "").trim() || notAvailable;

    return {
      fullName: formatDisplayPersonName(apiUser?.fullName ?? user.name),
      email: (apiUser?.email ?? user.email).trim() || notAvailable,
      phone,
      parentPhone,
      passport,
      passportInternational,
      passportImageUrl,
      internationalPassportImageUrl,
      dateOfBirth,
      birthCity,
      latestSchool,
      affiliation,
      faculty,
      isInternal,
    };
  }, [apiUser, notAvailable, user.email, user.name, user.phoneNumber]);

  const persistProfile = async (updates: { name?: string; email?: string; avatarUrl?: string }) => {
    const next = {
      ...user,
      name: updates.name ?? name,
      email: updates.email ?? email,
      avatarUrl: updates.avatarUrl !== undefined ? updates.avatarUrl || undefined : avatarUrl || undefined,
    };
    setSessionUser(next);
    instructorProfileAvatarsStore.set(next.email, next.name, next.avatarUrl);
    refreshUser();

    if (getAccessToken()) {
      try {
        await eduhubAuth.updateProfile({
          fullName: next.name,
          avatarUrl: next.avatarUrl,
        });
      } catch {
        // Profile saved locally; API may not support PATCH /auth/me yet.
      }
    }
  };

  const handleAvatarUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error(t("settings.toastInvalidImage"));
      return;
    }
    const maxBytes = 8 * 1024 * 1024;
    if (file.size > maxBytes) {
      toast.error(t("settings.toastImageTooLarge"));
      return;
    }

    setAvatarUploading(true);
    try {
      const { url } = await eduhubUploadFile(file, "avatars");
      setAvatarUrl(url);
      await persistProfile({ avatarUrl: url });
      toast.success(t("settings.toastAvatarUpdated"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("settings.toastAvatarUploadFailed"));
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setAvatarUrl("");
    await persistProfile({ avatarUrl: "" });
    toast.success(t("settings.toastAvatarRemoved"));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    persistUiLanguagePreference();
    await persistProfile({ name, email });
    toast.success(t("settings.toastSaved"));
  };

  return (
    <div className="w-full max-w-2xl" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="mb-8">
        <p className="text-foreground/70 text-sm">{t("settings.subtitle")}</p>
      </div>
      <form onSubmit={handleSave} className="space-y-8">
        <div className="rounded-xl border border-gray-200/50 bg-white/80 p-4 shadow-sm sm:p-6">
          <h2
            className="mb-4 flex items-center gap-2 font-semibold text-foreground"
            style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.5px" }}
          >
            <User className="h-5 w-5" />
            {t("settings.profile")}
          </h2>
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-white bg-gradient-to-br from-blue-500 to-blue-600 shadow-md ring-1 ring-gray-200/80">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-white">
                    {profileInitials(name || user.name)}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">{t("settings.profilePicture")}</p>
                <p className="text-xs text-foreground/60">{t("settings.profilePictureHint")}</p>
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
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t("settings.uploading")}
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        {avatarUrl ? t("settings.changePhoto") : t("settings.uploadPhoto")}
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
                      <X className="mr-2 h-4 w-4" />
                      {t("settings.remove")}
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
            <div>
              <Label htmlFor="name">{t("settings.displayName")}</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 rounded-xl"
                placeholder={t("settings.displayNamePlaceholder")}
              />
            </div>
            <div>
              <Label htmlFor="email">{t("settings.emailAddress")}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 rounded-xl"
                placeholder={t("settings.emailPlaceholder")}
              />
            </div>

            <div className="space-y-4 border-t border-gray-100 pt-6">
              <div>
                <h3 className="text-sm font-semibold text-foreground">{t("settings.registrationDetails")}</h3>
                <p className="mt-1 text-xs text-foreground/60">
                  {t("settings.registrationDetailsHint")}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <RegistrationDetail icon={User} label={t("settings.fullName")} value={registrationDetails.fullName} notAvailable={notAvailable} />
                <RegistrationDetail icon={Mail} label={t("settings.emailAddress")} value={registrationDetails.email} notAvailable={notAvailable} />
                <RegistrationDetail icon={Phone} label={t("settings.yourPhone")} value={registrationDetails.phone} notAvailable={notAvailable} />
                <RegistrationDetail icon={Phone} label={t("settings.parentPhone")} value={registrationDetails.parentPhone} notAvailable={notAvailable} />
                <RegistrationDetail icon={IdCard} label={t("settings.passportNumber")} value={registrationDetails.passport} notAvailable={notAvailable} />
                <RegistrationDetail icon={IdCard} label={t("settings.passportInternational")} value={registrationDetails.passportInternational} notAvailable={notAvailable} />
                {registrationDetails.passportImageUrl ? (
                  <div className="rounded-lg border border-gray-100 bg-zinc-50/70 px-4 py-3 sm:col-span-2">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-foreground/50">
                      {t("settings.passportLocalImage")}
                    </p>
                    <img
                      src={registrationDetails.passportImageUrl}
                      alt=""
                      className="h-28 max-w-full rounded-md border border-gray-200 object-contain"
                    />
                  </div>
                ) : null}
                {registrationDetails.internationalPassportImageUrl ? (
                  <div className="rounded-lg border border-gray-100 bg-zinc-50/70 px-4 py-3 sm:col-span-2">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-foreground/50">
                      {t("settings.passportInternationalImage")}
                    </p>
                    <img
                      src={registrationDetails.internationalPassportImageUrl}
                      alt=""
                      className="h-28 max-w-full rounded-md border border-gray-200 object-contain"
                    />
                  </div>
                ) : null}
                <RegistrationDetail icon={Calendar} label={t("settings.dateOfBirth")} value={registrationDetails.dateOfBirth} notAvailable={notAvailable} />
                <RegistrationDetail icon={MapPin} label={t("settings.bornCity")} value={registrationDetails.birthCity} notAvailable={notAvailable} />
                <RegistrationDetail icon={GraduationCap} label={t("settings.studentAffiliation") || "Affiliation"} value={registrationDetails.affiliation} notAvailable={notAvailable} />
                {registrationDetails.isInternal ? (
                  <RegistrationDetail icon={GraduationCap} label={t("auth.signUp.faculty") || "Faculty"} value={registrationDetails.faculty} notAvailable={notAvailable} />
                ) : null}
                <RegistrationDetail icon={GraduationCap} label={t("settings.latestSchool")} value={registrationDetails.latestSchool} notAvailable={notAvailable} />
              </div>
            </div>
          </div>
        </div>
        <LanguageSettingsSection selectId="student-language" />
        <div className="rounded-xl border border-gray-200/50 bg-white/80 p-4 shadow-sm sm:p-6">
          <h2
            className="mb-4 flex items-center gap-2 font-semibold text-foreground"
            style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.5px" }}
          >
            <Bell className="h-5 w-5" />
            {t("settings.notifications")}
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">{t("settings.emailNotifications")}</p>
                <p className="text-sm text-foreground/60">{t("settings.emailNotificationsHint")}</p>
              </div>
              <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">{t("settings.classReminders")}</p>
                <p className="text-sm text-foreground/60">{t("settings.classRemindersHint")}</p>
              </div>
              <Switch checked={classReminders} onCheckedChange={setClassReminders} />
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <Button type="submit" className="rounded-full" style={{ backgroundColor: "#3954d0" }}>
            <Save className="mr-2 h-4 w-4" />
            {t("settings.saveChanges")}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default StudentSettings;
