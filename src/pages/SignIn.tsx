import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Mail, Lock, Eye, EyeOff, AlertCircle, ArrowLeft } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { eduhubAuth, setAuthTokens } from "@/api/eduhubClient";
import { appRoutes } from "@/app/routes";
import { resolveAvatarFromAuthResponse, setSessionUser, useAuthSession } from "@/features/auth/context";
import { resolveInstructorCategory } from "@/features/teacher/resolveInstructorCategory";
import { mapApiRoleToSession } from "@/features/admin/adminStaffRoles";
import { dashboardHomeByRole } from "@/app/routes";

function safeInternalPath(p: string | null): string | null {
  if (!p || !p.startsWith("/") || p.startsWith("//")) return null;
  return p;
}

const SignIn = () => {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { refreshUser } = useAuthSession();
  const nextPath = useMemo(
    () => safeInternalPath(searchParams.get("redirect") ?? searchParams.get("next")),
    [searchParams],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await eduhubAuth.login({ identifier: email.trim(), password });
      setAuthTokens(res.accessToken, res.refreshToken, res.expiresIn);
      const { appRole: role, staffRole } = mapApiRoleToSession(res.user.role);
      const category =
        role === "teacher" ? resolveInstructorCategory(res.user.email, res.user.category) : undefined;
      setSessionUser({
        id: res.user.id,
        name: res.user.fullName,
        email: res.user.email,
        role,
        staffRole,
        avatarUrl: resolveAvatarFromAuthResponse(res.user.avatarUrl, res.user.email),
        phoneNumber: res.user.phoneNumber ?? undefined,
        category,
        adminCode: res.user.adminCode,
      });
      refreshUser();

      if (res.mustChangePassword) {
        toast({
          title: t("auth.signIn.passwordChangeRequired"),
          description: t("auth.signIn.passwordChangeRequiredDesc"),
        });
        navigate("/change-password");
        return;
      }

      toast({
        title: t("auth.signIn.welcome"),
        description: t("auth.signIn.signedInAs", { name: res.user.fullName }),
      });
      const fallback = dashboardHomeByRole(role, staffRole);
      navigate(role === "student" && nextPath ? nextPath : fallback);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t("auth.signIn.invalidCredentials");
      setError(message || t("auth.signIn.invalidCredentials"));
      toast({
        title: t("auth.signIn.failed"),
        description: message || t("auth.signIn.invalidCredentialsShort"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-dvh bg-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <main className="flex h-dvh items-center overflow-y-auto">
        <div className="container mx-auto w-full px-6 py-6">
          <div className="max-w-md mx-auto">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border-2 border-gray-200 p-8">
              <div className="text-center mb-8">
                <img
                  src="/logo-eduhub.png"
                  alt={t("auth.signIn.logoAlt")}
                  className="mx-auto mb-4 h-12 w-auto object-contain"
                />
                <h1
                  className="text-3xl font-bold text-foreground mb-2"
                  style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.5px" }}
                >
                  {t("auth.signIn.title")}
                </h1>
                <p className="text-foreground/70 text-sm">{t("auth.signIn.subtitle")}</p>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="identifier" className="text-sm font-medium text-foreground">
                    {t("auth.signIn.emailOrPhone")}
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
                    <Input
                      id="identifier"
                      type="text"
                      placeholder={t("auth.signIn.emailOrPhonePlaceholder")}
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setError("");
                      }}
                      className={`pl-10 h-12 rounded-xl border-gray-200 focus:border-primary focus:ring-primary ${
                        error ? "border-red-300" : ""
                      }`}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-foreground">
                    {t("auth.signIn.password")}
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder={t("auth.signIn.passwordPlaceholder")}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError("");
                      }}
                      className={`pl-10 pr-10 h-12 rounded-xl border-gray-200 focus:border-primary focus:ring-primary ${
                        error ? "border-red-300" : ""
                      }`}
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

                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded appearance-none bg-white border border-black/40 checked:bg-white checked:border-black/40 focus:ring-primary"
                      style={{ backgroundImage: "none" }}
                    />
                    <span className="text-foreground/70">{t("auth.signIn.rememberMe")}</span>
                  </label>
                  <Link
                    to={appRoutes.forgotPassword}
                    className="text-primary hover:text-primary/80 font-medium transition-colors"
                  >
                    {t("auth.signIn.forgotPassword")}
                  </Link>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 rounded-full text-white font-semibold text-base transition-all duration-300 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: "#3954d0" }}
                >
                  {isLoading ? t("auth.signIn.submitting") : t("auth.signIn.submit")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 rounded-full border-gray-200 font-semibold hover:bg-gray-50"
                  asChild
                >
                  <Link to={appRoutes.home}>
                    <ArrowLeft className="h-4 w-4" />
                    {t("common.back")}
                  </Link>
                </Button>
              </form>

              <div className="mt-8 text-center text-sm">
                <span className="text-foreground/70">{t("auth.signIn.noAccount")} </span>
                <Link
                  to="/register"
                  className="text-primary hover:text-primary/80 font-semibold transition-colors"
                >
                  {t("auth.signIn.signUp")}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SignIn;
