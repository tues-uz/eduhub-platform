import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Mail, Lock, Eye, EyeOff, User, Phone, IdCard, MapPin, GraduationCap, AlertCircle, ShieldCheck, ArrowLeft } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { DateOfBirthPicker } from "@/components/ui/date-of-birth-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { eduhubAuth, setAuthTokens } from "@/api/eduhubClient";
import { setSessionUser, useAuthSession } from "@/features/auth/context";
import type { UserRole } from "@/features/auth/types";

const SignUp = () => {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    parentPhoneNumber: "",
    passportNumber: "",
    dateOfBirth: "",
    birthCity: "",
    latestSchool: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();
  const { refreshUser } = useAuthSession();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError(t("auth.signUp.passwordsMismatch"));
      return;
    }

    setIsLoading(true);
    try {
      const res = await eduhubAuth.register({
        fullName: formData.fullName,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        parentPhoneNumber: formData.parentPhoneNumber,
        passportNumber: formData.passportNumber,
        dateOfBirth: formData.dateOfBirth,
        birthCity: formData.birthCity,
        latestSchool: formData.latestSchool,
        password: formData.password,
        role: "STUDENT",
      });

      setAuthTokens(res.accessToken, res.refreshToken, res.expiresIn);
      const role: UserRole = "student";
      setSessionUser({
        id: res.user.id,
        name: res.user.fullName,
        email: res.user.email,
        role,
        avatarUrl: res.user.avatarUrl,
        phoneNumber: res.user.phoneNumber ?? formData.phoneNumber,
      });
      refreshUser();

      toast({ title: t("auth.signUp.welcome"), description: t("auth.signUp.accountCreated") });
      navigate("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("auth.signUp.registerFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-dvh bg-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <main className="flex min-h-dvh items-center overflow-y-auto py-6">
        <div className="container mx-auto w-full px-6">
          <div className="max-w-4xl mx-auto">
            <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-8 md:p-10">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="absolute left-6 top-6 md:left-8 md:top-8 z-10 h-10 w-10 shrink-0 rounded-full border-gray-200 hover:bg-gray-50"
                asChild
              >
                <Link to="/signin" aria-label={t("auth.signUp.backToSignIn")}>
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <div className="mb-6 border-b border-gray-200/60 pb-6 text-center">
                <img
                  src="/logo-eduhub.png"
                  alt={t("auth.signUp.logoAlt")}
                  className="mx-auto mb-4 h-12 w-auto object-contain"
                />
                <div className="space-y-1">
                  <h1
                    className="text-3xl font-bold text-foreground"
                    style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.5px" }}
                  >
                    {t("auth.signUp.title")}
                  </h1>
                  <p className="text-sm text-foreground/70">{t("auth.signUp.subtitle")}</p>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-0 gap-y-8 md:gap-y-5">
                  <div className="space-y-5 md:pr-10 md:border-r md:border-gray-200/60">
                    <div>
                      <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <User className="h-4 w-4 text-[#1e40af]" />
                        {t("auth.signUp.personalDetails")}
                      </h2>
                      <p className="mt-1 text-xs text-foreground/60">{t("auth.signUp.personalDetailsHint")}</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="fullName" className="text-sm font-medium text-foreground">
                        {t("auth.signUp.fullName")}
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
                        <Input
                          id="fullName"
                          name="fullName"
                          type="text"
                          placeholder={t("auth.signUp.fullNamePlaceholder")}
                          value={formData.fullName}
                          onChange={handleChange}
                          className="pl-10 h-12 rounded-xl border-gray-200 focus:border-primary focus:ring-primary"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm font-medium text-foreground">
                          {t("auth.signUp.email")}
                        </Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
                          <Input
                            id="email"
                            name="email"
                            type="email"
                            placeholder={t("auth.signUp.emailPlaceholder")}
                            value={formData.email}
                            onChange={handleChange}
                            className="pl-10 h-12 rounded-xl border-gray-200 focus:border-primary focus:ring-primary"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="passportNumber" className="text-sm font-medium text-foreground">
                          {t("auth.signUp.passportNumber")}
                        </Label>
                        <div className="relative">
                          <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
                          <Input
                            id="passportNumber"
                            name="passportNumber"
                            type="text"
                            placeholder={t("auth.signUp.passportPlaceholder")}
                            value={formData.passportNumber}
                            onChange={handleChange}
                            className="pl-10 h-12 rounded-xl border-gray-200 focus:border-primary focus:ring-primary"
                            required
                            autoComplete="off"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="phoneNumber" className="text-sm font-medium text-foreground">
                          {t("auth.signUp.yourPhone")}
                        </Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
                          <Input
                            id="phoneNumber"
                            name="phoneNumber"
                            type="tel"
                            placeholder={t("auth.signUp.yourPhonePlaceholder")}
                            value={formData.phoneNumber}
                            onChange={handleChange}
                            className="pl-10 h-12 rounded-xl border-gray-200 focus:border-primary focus:ring-primary"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="parentPhoneNumber" className="text-sm font-medium text-foreground">
                          {t("auth.signUp.parentPhone")}
                        </Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
                          <Input
                            id="parentPhoneNumber"
                            name="parentPhoneNumber"
                            type="tel"
                            placeholder={t("auth.signUp.parentPhonePlaceholder")}
                            value={formData.parentPhoneNumber}
                            onChange={handleChange}
                            className="pl-10 h-12 rounded-xl border-gray-200 focus:border-primary focus:ring-primary"
                            required
                            autoComplete="tel"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-5 md:pl-10">
                    <div>
                      <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <ShieldCheck className="h-4 w-4 text-[#1e40af]" />
                        {t("auth.signUp.educationAccount")}
                      </h2>
                      <p className="mt-1 text-xs text-foreground/60">{t("auth.signUp.educationAccountHint")}</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="dateOfBirth" className="text-sm font-medium text-foreground">
                          {t("auth.signUp.dateOfBirth")}
                        </Label>
                        <DateOfBirthPicker
                          id="dateOfBirth"
                          value={formData.dateOfBirth}
                          onChange={(dateOfBirth) =>
                            setFormData((prev) => ({ ...prev, dateOfBirth }))
                          }
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="birthCity" className="text-sm font-medium text-foreground">
                          {t("auth.signUp.bornCity")}
                        </Label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
                          <Input
                            id="birthCity"
                            name="birthCity"
                            type="text"
                            placeholder={t("auth.signUp.bornCityPlaceholder")}
                            value={formData.birthCity}
                            onChange={handleChange}
                            className="pl-10 h-12 rounded-xl border-gray-200 focus:border-primary focus:ring-primary"
                            required
                            autoComplete="address-level2"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="latestSchool" className="text-sm font-medium text-foreground">
                        {t("auth.signUp.latestSchool")}
                      </Label>
                      <div className="relative">
                        <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
                        <Input
                          id="latestSchool"
                          name="latestSchool"
                          type="text"
                          placeholder={t("auth.signUp.latestSchoolPlaceholder")}
                          value={formData.latestSchool}
                          onChange={handleChange}
                          className="pl-10 h-12 rounded-xl border-gray-200 focus:border-primary focus:ring-primary"
                          required
                          autoComplete="organization"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="password" className="text-sm font-medium text-foreground">
                          {t("auth.signUp.password")}
                        </Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
                          <Input
                            id="password"
                            name="password"
                            type={showPassword ? "text" : "password"}
                            placeholder={t("auth.signUp.passwordPlaceholder")}
                            value={formData.password}
                            onChange={handleChange}
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
                          {t("auth.signUp.confirmPassword")}
                        </Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
                          <Input
                            id="confirmPassword"
                            name="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder={t("auth.signUp.confirmPasswordPlaceholder")}
                            value={formData.confirmPassword}
                            onChange={handleChange}
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
                    </div>
                  </div>
                </div>

                <div className="space-y-5 border-t border-gray-200/60 pt-6">
                  <div className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      id="terms"
                      className="w-4 h-4 mt-0.5 shrink-0 rounded appearance-none bg-white border border-black/40 checked:bg-white checked:border-black/40 focus:ring-primary"
                      required
                    />
                    <label htmlFor="terms" className="cursor-pointer text-foreground/70">
                      {t("auth.signUp.termsPrefix")}{" "}
                      <Link to="#" className="text-primary hover:text-primary/80 font-medium transition-colors">
                        {t("auth.signUp.termsOfService")}
                      </Link>{" "}
                      {t("auth.signUp.termsAnd")}{" "}
                      <Link to="#" className="text-primary hover:text-primary/80 font-medium transition-colors">
                        {t("auth.signUp.privacyPolicy")}
                      </Link>
                    </label>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="h-12 w-full rounded-full text-white font-semibold text-base transition-all duration-300 hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: "#1e40af" }}
                  >
                    {isLoading ? t("auth.signUp.submitting") : t("auth.signUp.submit")}
                  </Button>
                </div>
              </form>

              <div className="mt-8 text-center text-sm">
                <span className="text-foreground/70">{t("auth.signUp.hasAccount")} </span>
                <Link to="/signin" className="text-primary hover:text-primary/80 font-semibold transition-colors">
                  {t("auth.signUp.signIn")}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SignUp;
