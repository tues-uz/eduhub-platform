import { useEffect, useMemo, useRef, useState } from "react";
import { User, Bell, Save, Upload, Loader2, X, IdCard, Phone, Calendar, MapPin, Mail, GraduationCap } from "@/lib/icons";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { eduhubAuth, eduhubUploadFile, getAccessToken } from "@/api/eduhubClient";
import type { UserResponse } from "@/api/eduhubTypes";
import {
  registrationBirthCityForEmail,
  registrationDateOfBirthForEmail,
  registrationLatestSchoolForEmail,
  registrationParentPhoneForEmail,
  registrationPassportForEmail,
  registrationPhoneForEmail,
} from "@/features/auth/registrationPhoneStorage";
import { setSessionUser, useAuthSession } from "@/features/auth/context";
import { instructorProfileAvatarsStore } from "@/features/teacher/data/instructorProfileAvatarsStore";
import { formatDisplayPersonName, profileInitials } from "@/lib/formatPersonName";

function formatRegistrationDate(value: string): string {
  if (!value.trim()) return "—";
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function RegistrationDetail({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof User;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3">
      <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-foreground/50">
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {label}
      </div>
      <p className="text-sm font-medium text-foreground">{value || "—"}</p>
    </div>
  );
}

const StudentSettings = () => {
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
    const phone =
      (apiUser?.phoneNumber ?? user.phoneNumber ?? registrationPhoneForEmail(user.email)).trim() || "—";
    const parentPhone =
      (apiUser?.parentPhoneNumber ?? registrationParentPhoneForEmail(user.email)).trim() || "—";
    const passport = registrationPassportForEmail(user.email).trim() || "—";
    const dateOfBirth = formatRegistrationDate(registrationDateOfBirthForEmail(user.email));
    const birthCity = registrationBirthCityForEmail(user.email).trim() || "—";
    const latestSchool = registrationLatestSchoolForEmail(user.email).trim() || "—";

    return {
      fullName: formatDisplayPersonName(apiUser?.fullName ?? user.name),
      email: (apiUser?.email ?? user.email).trim() || "—",
      phone,
      parentPhone,
      passport,
      dateOfBirth,
      birthCity,
      latestSchool,
    };
  }, [apiUser, user.email, user.name, user.phoneNumber]);

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
      toast.error("Please choose an image file (JPEG, PNG, WebP, etc.).");
      return;
    }
    const maxBytes = 8 * 1024 * 1024;
    if (file.size > maxBytes) {
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
    await persistProfile({ name, email });
    toast.success("Profile saved");
  };

  return (
    <div className="w-full max-w-2xl" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="mb-8">
        <p className="text-foreground/70 text-sm">Manage your account and preferences.</p>
      </div>
      <form onSubmit={handleSave} className="space-y-8">
        <div className="rounded-xl border border-gray-200/50 bg-white/80 p-4 shadow-sm sm:p-6">
          <h2
            className="mb-4 flex items-center gap-2 font-semibold text-foreground"
            style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.5px" }}
          >
            <User className="h-5 w-5" />
            Profile
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
                <p className="text-sm font-medium text-foreground">Profile picture</p>
                <p className="text-xs text-foreground/60">JPEG, PNG, or WebP. Max 8 MB.</p>
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
                        Uploading…
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        {avatarUrl ? "Change photo" : "Upload photo"}
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
                      Remove
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
            <div>
              <Label htmlFor="name">Display name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 rounded-xl"
                placeholder="Your name"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 rounded-xl"
                placeholder="your@email.com"
              />
            </div>

            <div className="space-y-4 border-t border-gray-100 pt-6">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Registration details</h3>
                <p className="mt-1 text-xs text-foreground/60">
                  Information provided when you created your account. Contact support if anything needs to be corrected.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <RegistrationDetail icon={User} label="Full name" value={registrationDetails.fullName} />
                <RegistrationDetail icon={Mail} label="Email address" value={registrationDetails.email} />
                <RegistrationDetail icon={Phone} label="Your phone number" value={registrationDetails.phone} />
                <RegistrationDetail icon={Phone} label="Parent phone number" value={registrationDetails.parentPhone} />
                <RegistrationDetail icon={IdCard} label="Passport number" value={registrationDetails.passport} />
                <RegistrationDetail icon={Calendar} label="Date of birth" value={registrationDetails.dateOfBirth} />
                <RegistrationDetail icon={MapPin} label="Born city" value={registrationDetails.birthCity} />
                <RegistrationDetail icon={GraduationCap} label="Latest school, university or institution" value={registrationDetails.latestSchool} />
              </div>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200/50 bg-white/80 p-4 shadow-sm sm:p-6">
          <h2
            className="mb-4 flex items-center gap-2 font-semibold text-foreground"
            style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.5px" }}
          >
            <Bell className="h-5 w-5" />
            Notifications
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Email notifications</p>
                <p className="text-sm text-foreground/60">Receive updates and announcements by email.</p>
              </div>
              <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Class reminders</p>
                <p className="text-sm text-foreground/60">Reminders for assignments and live sessions.</p>
              </div>
              <Switch checked={classReminders} onCheckedChange={setClassReminders} />
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <Button type="submit" className="rounded-full" style={{ backgroundColor: "#3954d0" }}>
            <Save className="mr-2 h-4 w-4" />
            Save changes
          </Button>
        </div>
      </form>
    </div>
  );
};

export default StudentSettings;
