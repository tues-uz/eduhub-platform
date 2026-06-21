import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Lock, Eye, EyeOff, AlertCircle } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { eduhubAuth, setAuthTokens } from "@/api/eduhubClient";
import { resolveAvatarFromAuthResponse, setSessionUser, useAuthSession } from "@/features/auth/context";
import { resolveInstructorCategory } from "@/features/teacher/resolveInstructorCategory";

const ChangePassword = () => {
  const { t } = useTranslation();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { refreshUser, user: sessionUser } = useAuthSession();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError(t("auth.changePassword.passwordsMismatch"));
      return;
    }

    if (newPassword.length < 8) {
      setError(t("auth.changePassword.passwordTooShort"));
      return;
    }

    if (currentPassword === newPassword) {
      setError(t("auth.changePassword.sameAsCurrent"));
      return;
    }

    setIsLoading(true);
    try {
      const res = await eduhubAuth.changePassword({
        currentPassword,
        newPassword,
      });

      if (res.mustChangePassword === false) {
        setAuthTokens(res.accessToken, res.refreshToken, res.expiresIn);
        const role = res.user.role === "LECTURER" ? "teacher" : res.user.role === "ADMIN" ? "admin" : "student";
        const category =
          role === "teacher"
            ? resolveInstructorCategory(res.user.email, res.user.category ?? sessionUser.category)
            : undefined;
        setSessionUser({
          id: res.user.id,
          name: res.user.fullName,
          email: res.user.email,
          role,
          avatarUrl: resolveAvatarFromAuthResponse(res.user.avatarUrl, res.user.email),
          phoneNumber: res.user.phoneNumber,
          category,
        });
        refreshUser();
        toast({
          title: t("auth.changePassword.toastTitle"),
          description: t("auth.changePassword.toastDescription"),
        });
        const redirect = role === "admin" ? "/dashboard/admin" : role === "teacher" ? "/dashboard/teacher" : "/dashboard";
        navigate(redirect);
      } else {
        setError(t("auth.changePassword.stillRequired"));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("auth.changePassword.changeFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-8">
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-orange-600" />
            </div>
            <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400 }}>
              {t("auth.changePassword.title")}
            </h1>
            <p className="text-foreground/70 text-sm mt-2">{t("auth.changePassword.subtitle")}</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="currentPassword" className="text-sm font-medium text-foreground">
                {t("auth.changePassword.currentPassword")}
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? "text" : "password"}
                  placeholder={t("auth.changePassword.currentPasswordPlaceholder")}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                  className="pl-10 pr-10 h-12 rounded-lg border-gray-200 focus:border-primary focus:ring-primary"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground transition-colors"
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-sm font-medium text-foreground">
                {t("auth.changePassword.newPassword")}
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  placeholder={t("auth.changePassword.newPasswordPlaceholder")}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  className="pl-10 pr-10 h-12 rounded-lg border-gray-200 focus:border-primary focus:ring-primary"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground transition-colors"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                {t("auth.changePassword.confirmPassword")}
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder={t("auth.changePassword.confirmPasswordPlaceholder")}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  className="pl-10 pr-10 h-12 rounded-lg border-gray-200 focus:border-primary focus:ring-primary"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 rounded-full text-white font-semibold text-base transition-all duration-300 hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: "#1e40af" }}
            >
              {isLoading ? t("auth.changePassword.submitting") : t("auth.changePassword.submit")}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;
