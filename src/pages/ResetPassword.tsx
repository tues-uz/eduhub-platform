import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle2 } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { eduhubAuth } from "@/api/eduhubClient";
import { appRoutes } from "@/app/routes";

const ResetPassword = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const { toast } = useToast();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError(t("auth.resetPassword.missingToken"));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t("auth.resetPassword.passwordsMismatch"));
      return;
    }

    if (newPassword.length < 8) {
      setError(t("auth.resetPassword.passwordTooShort"));
      return;
    }

    setIsLoading(true);
    try {
      await eduhubAuth.resetPassword(token, { newPassword });
      setIsSuccess(true);
      toast({
        title: t("auth.resetPassword.toastTitle"),
        description: t("auth.resetPassword.toastDescription"),
      });
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : t("auth.resetPassword.resetFailed"),
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="h-dvh bg-white flex items-center justify-center p-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <div className="w-full max-w-md bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border-2 border-gray-200 p-8 text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">{t("auth.resetPassword.invalidLinkTitle")}</h1>
          <p className="text-foreground/70 text-sm">{t("auth.resetPassword.invalidLinkDesc")}</p>
          <Button
            className="w-full h-12 rounded-full text-white font-semibold"
            style={{ backgroundColor: "#3954d0" }}
            asChild
          >
            <Link to={appRoutes.forgotPassword}>{t("auth.resetPassword.requestNewLink")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-dvh bg-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <main className="flex h-dvh items-center overflow-y-auto">
        <div className="container mx-auto w-full px-6 py-6">
          <div className="max-w-md mx-auto">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border-2 border-gray-200 p-8">
              {isSuccess ? (
                <div className="text-center space-y-6">
                  <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
                  <div>
                    <h1 className="text-2xl font-bold text-foreground mb-2">{t("auth.resetPassword.successTitle")}</h1>
                    <p className="text-foreground/70 text-sm">{t("auth.resetPassword.successDesc")}</p>
                  </div>
                  <Button
                    type="button"
                    className="w-full h-12 rounded-full text-white font-semibold"
                    style={{ backgroundColor: "#3954d0" }}
                    onClick={() => navigate(appRoutes.signIn)}
                  >
                    {t("auth.resetPassword.goToSignIn")}
                  </Button>
                </div>
              ) : (
                <>
                  <div className="text-center mb-8">
                    <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                      <Lock className="w-8 h-8 text-blue-600" />
                    </div>
                    <h1 className="text-3xl font-bold text-foreground mb-2">{t("auth.resetPassword.title")}</h1>
                    <p className="text-foreground/70 text-sm">{t("auth.resetPassword.subtitle")}</p>
                  </div>

                  {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="newPassword" className="text-sm font-medium text-foreground">
                        {t("auth.resetPassword.newPassword")}
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
                        <Input
                          id="newPassword"
                          type={showPassword ? "text" : "password"}
                          placeholder={t("auth.resetPassword.newPasswordPlaceholder")}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          autoComplete="new-password"
                          className="pl-10 pr-10 h-12 rounded-xl border-gray-200 focus:border-primary focus:ring-primary"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground transition-colors"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                        {t("auth.resetPassword.confirmPassword")}
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder={t("auth.resetPassword.confirmPasswordPlaceholder")}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          autoComplete="new-password"
                          className="pl-10 pr-10 h-12 rounded-xl border-gray-200 focus:border-primary focus:ring-primary"
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
                      className="w-full h-12 rounded-full text-white font-semibold text-base transition-all duration-300 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ backgroundColor: "#3954d0" }}
                    >
                      {isLoading ? t("auth.resetPassword.submitting") : t("auth.resetPassword.submit")}
                    </Button>

                    <div className="text-center text-sm">
                      <Link
                        to={appRoutes.forgotPassword}
                        className="text-primary hover:text-primary/80 font-medium transition-colors"
                      >
                        {t("auth.resetPassword.requestAnotherLink")}
                      </Link>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ResetPassword;
