import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  IdCard,
  MapPin,
  GraduationCap,
  Globe,
  AlertCircle,
  ArrowLeft,
  Check,
  Upload,
  X,
} from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { DateOfBirthPicker } from "@/components/ui/date-of-birth-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { eduhubAuth, eduhubUploadFile, setAuthTokens } from "@/api/eduhubClient";
import { PhoneWithCountryCode } from "@/features/auth/components/PhoneWithCountryCode";
import {
  composeInternationalPhone,
  DEFAULT_COUNTRY_ISO,
  getCountryByIso,
} from "@/features/auth/data/countryDialCodes";
import { setSessionUser, useAuthSession } from "@/features/auth/context";
import type { UserRole } from "@/features/auth/types";
import { cn } from "@/lib/utils";

type SignUpStep = 1 | 2;
type StudentAffiliation = "internal" | "external";

/** Stored in `latestSchool` when the student selects internal affiliation. */
const TUES_UNIVERSITY_SCHOOL_NAME = "TUES University";

const PASSPORT_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";
const PASSPORT_IMAGE_MAX_BYTES = 8 * 1024 * 1024;

function PassportImageField({
  id,
  label,
  optionalLabel,
  file,
  previewUrl,
  inputRef,
  onPick,
  onClear,
  browseLabel,
  replaceLabel,
  removeLabel,
  hint,
}: {
  id: string;
  label: string;
  optionalLabel?: string;
  file: File | null;
  previewUrl: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onPick: (file: File | null) => void;
  onClear: () => void;
  browseLabel: string;
  replaceLabel: string;
  removeLabel: string;
  hint: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="inline-flex flex-wrap items-baseline gap-x-1.5">
        <span>{label}</span>
        {optionalLabel ? (
          <span className="font-normal text-foreground/50">{optionalLabel}</span>
        ) : null}
      </Label>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={PASSPORT_IMAGE_ACCEPT}
        className="sr-only"
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
      />
      {file && previewUrl ? (
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50/80 p-3">
          <img
            src={previewUrl}
            alt=""
            className="h-14 w-14 shrink-0 rounded-lg border border-gray-200 object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
            <p className="text-xs text-foreground/55">
              {(file.size / 1024).toFixed(file.size < 10240 ? 1 : 0)} KB
            </p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              <button
                type="button"
                className="text-xs font-medium text-[#1e40af] hover:underline"
                onClick={() => inputRef.current?.click()}
              >
                {replaceLabel}
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-0.5 text-xs font-medium text-foreground/55 hover:text-foreground"
                onClick={onClear}
              >
                <X className="h-3 w-3" />
                {removeLabel}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-gray-50/50 px-3 py-5 text-center transition-colors hover:border-[#1e40af]/40 hover:bg-[#eff3ff]/40"
        >
          <span className="inline-flex size-9 items-center justify-center rounded-full bg-[#1e40af]/10 text-[#1e40af]">
            <Upload className="h-4 w-4" />
          </span>
          <span className="text-sm font-medium text-foreground">{browseLabel}</span>
          <span className="text-xs text-foreground/55">{hint}</span>
        </button>
      )}
    </div>
  );
}

const SignUp = () => {
  const { t } = useTranslation();
  const [step, setStep] = useState<SignUpStep>(1);
  const [studentAffiliation, setStudentAffiliation] = useState<StudentAffiliation | "">("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phoneCountryIso: DEFAULT_COUNTRY_ISO,
    phoneNational: "",
    parentPhoneCountryIso: DEFAULT_COUNTRY_ISO,
    parentPhoneNational: "",
    passportNumber: "",
    internationalPassportNumber: "",
    dateOfBirth: "",
    birthCity: "",
    latestSchool: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [localPassportFile, setLocalPassportFile] = useState<File | null>(null);
  const [internationalPassportFile, setInternationalPassportFile] = useState<File | null>(null);
  const [localPassportPreview, setLocalPassportPreview] = useState("");
  const [internationalPassportPreview, setInternationalPassportPreview] = useState("");
  const localPassportInputRef = useRef<HTMLInputElement>(null);
  const internationalPassportInputRef = useRef<HTMLInputElement>(null);

  const navigate = useNavigate();
  const { toast } = useToast();
  const { refreshUser } = useAuthSession();

  useEffect(() => {
    if (!localPassportFile) {
      setLocalPassportPreview("");
      return;
    }
    const url = URL.createObjectURL(localPassportFile);
    setLocalPassportPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [localPassportFile]);

  useEffect(() => {
    if (!internationalPassportFile) {
      setInternationalPassportPreview("");
      return;
    }
    const url = URL.createObjectURL(internationalPassportFile);
    setInternationalPassportPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [internationalPassportFile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const pickPassportImage = (
    file: File | null,
    setFile: (f: File | null) => void,
    inputRef: React.RefObject<HTMLInputElement | null>,
  ) => {
    if (!file) {
      setFile(null);
      return;
    }
    const okType =
      file.type === "image/jpeg" || file.type === "image/png" || file.type === "image/webp";
    if (!okType) {
      setError(t("auth.signUp.passportImageInvalidType"));
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    if (file.size > PASSPORT_IMAGE_MAX_BYTES) {
      setError(t("auth.signUp.passportImageTooLarge"));
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setError("");
    setFile(file);
  };

  const validateStep1 = (): boolean => {
    if (
      !formData.fullName.trim() ||
      !formData.phoneNational.trim() ||
      !formData.parentPhoneNational.trim()
    ) {
      setError(t("auth.signUp.completeStep"));
      return false;
    }
    const email = formData.email.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(t("auth.signUp.invalidEmail"));
      return false;
    }
    return true;
  };

  const goNext = () => {
    setError("");
    if (!validateStep1()) return;
    setStep(2);
  };

  const goBack = () => {
    setError("");
    setStep(1);
  };

  const selectStudentAffiliation = (affiliation: StudentAffiliation) => {
    setStudentAffiliation(affiliation);
    setFormData((prev) => ({
      ...prev,
      latestSchool:
        affiliation === "internal" ? TUES_UNIVERSITY_SCHOOL_NAME : "",
    }));
  };

  const resolveLatestSchool = (): string => {
    if (studentAffiliation === "internal") {
      return TUES_UNIVERSITY_SCHOOL_NAME;
    }
    return formData.latestSchool.trim();
  };

  const validateStep2 = (): boolean => {
    if (!studentAffiliation) {
      setError(t("auth.signUp.studentAffiliationRequired"));
      return false;
    }
    if (studentAffiliation === "external" && !formData.latestSchool.trim()) {
      setError(t("auth.signUp.latestSchoolRequired"));
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (step !== 2) {
      goNext();
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError(t("auth.signUp.passwordsMismatch"));
      return;
    }

    if (!validateStep2()) {
      return;
    }

    const latestSchool = resolveLatestSchool();

    setIsLoading(true);
    try {
      const internationalPassport = formData.internationalPassportNumber.trim();
      const localPassport = formData.passportNumber.trim();
      const phoneNumber = composeInternationalPhone(
        getCountryByIso(formData.phoneCountryIso).dial,
        formData.phoneNational,
      );
      const parentPhoneNumber = composeInternationalPhone(
        getCountryByIso(formData.parentPhoneCountryIso).dial,
        formData.parentPhoneNational,
      );
      const res = await eduhubAuth.register({
        fullName: formData.fullName,
        ...(formData.email.trim() ? { email: formData.email.trim() } : {}),
        phoneNumber,
        parentPhoneNumber,
        ...(localPassport ? { passportNumber: localPassport } : {}),
        ...(internationalPassport
          ? { internationalPassportNumber: internationalPassport }
          : {}),
        dateOfBirth: formData.dateOfBirth,
        birthCity: formData.birthCity,
        latestSchool,
        password: formData.password,
        role: "STUDENT",
      });

      setAuthTokens(res.accessToken, res.refreshToken, res.expiresIn);

      try {
        let passportImageUrl: string | undefined;
        if (localPassportFile) {
          const uploaded = await eduhubUploadFile(localPassportFile, "passport-ids");
          passportImageUrl = uploaded.url;
        }
        let internationalPassportImageUrl: string | undefined;
        if (internationalPassportFile) {
          const uploaded = await eduhubUploadFile(internationalPassportFile, "passport-ids");
          internationalPassportImageUrl = uploaded.url;
        }
        if (passportImageUrl || internationalPassportImageUrl) {
          await eduhubAuth.updateProfile({
            ...(passportImageUrl ? { passportImageUrl } : {}),
            ...(internationalPassportImageUrl ? { internationalPassportImageUrl } : {}),
          });
        }
      } catch {
        toast({
          title: t("auth.signUp.passportImageUploadFailed"),
          variant: "destructive",
        });
      }

      const role: UserRole = "student";
      setSessionUser({
        id: res.user.id,
        name: res.user.fullName,
        email: res.user.email ?? formData.email.trim(),
        role,
        avatarUrl: res.user.avatarUrl,
        phoneNumber: res.user.phoneNumber ?? phoneNumber,
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

  const steps = [
    {
      id: 1 as const,
      label: t("auth.signUp.personalDetails"),
      hint: t("auth.signUp.personalDetailsHint"),
    },
    {
      id: 2 as const,
      label: t("auth.signUp.educationAccount"),
      hint: t("auth.signUp.educationAccountHint"),
    },
  ];

  const selectStep = (next: SignUpStep) => {
    setError("");
    if (next === 2 && !validateStep1()) return;
    setStep(next);
  };

  return (
    <div className="min-h-dvh bg-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <main className="flex min-h-dvh items-center overflow-y-auto py-6">
        <div className="container mx-auto w-full px-4 sm:px-6">
          <div className="mx-auto w-full max-w-4xl">
            <div className="relative overflow-hidden rounded-2xl border border-gray-200/50 bg-white shadow-lg">
              <div className="grid md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]">
                {/* Left: brand + vertical stepper */}
                <aside className="relative border-b border-gray-200/70 bg-gradient-to-b from-[#eff3ff] to-[#f8fafc] px-5 py-6 sm:px-6 md:border-b-0 md:border-r md:border-gray-200/70 md:py-8">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="mb-5 h-9 w-9 shrink-0 rounded-full border-gray-200 bg-white/80 hover:bg-white"
                    asChild
                  >
                    <Link to="/signin" aria-label={t("auth.signUp.backToSignIn")}>
                      <ArrowLeft className="h-4 w-4" />
                    </Link>
                  </Button>

                  <img
                    src="/logo-eduhub.png"
                    alt={t("auth.signUp.logoAlt")}
                    className="mb-4 h-10 w-auto object-contain"
                  />
                  <h1 className="text-2xl font-bold tracking-tight text-foreground">
                    {t("auth.signUp.title")}
                  </h1>
                  <p className="mt-1.5 text-sm leading-relaxed text-foreground/65">
                    {t("auth.signUp.subtitle")}
                  </p>

                  <nav className="mt-8" aria-label={t("auth.signUp.stepsAria")}>
                    <ol className="space-y-0">
                      {steps.map((s, index) => {
                        const isActive = step === s.id;
                        const isCompleted = step > s.id;
                        const canSelect = s.id === 1 || isCompleted || step >= s.id;
                        return (
                          <li key={s.id} className="relative flex gap-3">
                            <div className="flex flex-col items-center">
                              <button
                                type="button"
                                onClick={() => canSelect && selectStep(s.id)}
                                disabled={!canSelect}
                                className={cn(
                                  "relative z-[1] inline-flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums transition-colors",
                                  isActive && "bg-[#1e40af] text-white",
                                  isCompleted &&
                                    !isActive &&
                                    "bg-[#1e40af]/15 text-[#1e40af] ring-1 ring-[#1e40af]/30",
                                  !isActive &&
                                    !isCompleted &&
                                    "bg-white text-foreground/45 ring-1 ring-gray-200",
                                  canSelect && "cursor-pointer",
                                  !canSelect && "cursor-default",
                                )}
                                aria-current={isActive ? "step" : undefined}
                              >
                                {isCompleted && !isActive ? (
                                  <Check className="h-3.5 w-3.5" aria-hidden />
                                ) : (
                                  s.id
                                )}
                              </button>
                              {index < steps.length - 1 ? (
                                <div
                                  className={cn(
                                    "my-1 w-px flex-1 min-h-[2.25rem]",
                                    isCompleted ? "bg-[#1e40af]/45" : "bg-gray-200",
                                  )}
                                  aria-hidden
                                />
                              ) : null}
                            </div>
                            <button
                              type="button"
                              onClick={() => canSelect && selectStep(s.id)}
                              disabled={!canSelect}
                              className={cn(
                                "min-w-0 pb-6 text-left",
                                index === steps.length - 1 && "pb-0",
                                canSelect ? "cursor-pointer" : "cursor-default",
                              )}
                            >
                              <p
                                className={cn(
                                  "text-sm font-semibold",
                                  isActive
                                    ? "text-[#1e40af]"
                                    : isCompleted
                                      ? "text-foreground"
                                      : "text-foreground/45",
                                )}
                              >
                                {s.label}
                              </p>
                              <p className="mt-0.5 text-xs leading-snug text-foreground/55">{s.hint}</p>
                            </button>
                          </li>
                        );
                      })}
                    </ol>
                  </nav>

                  <p className="mt-8 hidden text-sm text-foreground/60 md:block">
                    <span>{t("auth.signUp.hasAccount")} </span>
                    <Link
                      to="/signin"
                      className="font-semibold text-[#1e40af] transition-colors hover:text-[#1e40af]/80"
                    >
                      {t("auth.signUp.signIn")}
                    </Link>
                  </p>
                </aside>

                {/* Right: form */}
                <div className="px-5 py-6 sm:px-8 sm:py-8">
              {error ? (
                <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              ) : null}

              <form onSubmit={handleSubmit} className="space-y-5">
                {step === 1 ? (
                  <div className="space-y-4">
                    <div className="md:hidden">
                      <h2 className="text-sm font-semibold text-foreground">
                        {t("auth.signUp.personalDetails")}
                      </h2>
                      <p className="mt-0.5 text-xs text-foreground/60">
                        {t("auth.signUp.personalDetailsHint")}
                      </p>
                    </div>
                    <div className="hidden md:block">
                      <h2 className="text-lg font-semibold tracking-tight text-foreground">
                        {t("auth.signUp.personalDetails")}
                      </h2>
                      <p className="mt-1 text-sm text-foreground/60">
                        {t("auth.signUp.personalDetailsHint")}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="fullName">{t("auth.signUp.fullName")}</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
                          <Input
                            id="fullName"
                            name="fullName"
                            type="text"
                            placeholder={t("auth.signUp.fullNamePlaceholder")}
                            value={formData.fullName}
                            onChange={handleChange}
                            className="h-11 rounded-xl border-gray-200 pl-10"
                            required
                            autoComplete="name"
                          />
                        </div>
                      </div>
                      <PhoneWithCountryCode
                        id="phoneNumber"
                        label={t("auth.signUp.yourPhone")}
                        countryIso={formData.phoneCountryIso}
                        nationalNumber={formData.phoneNational}
                        onCountryChange={(iso) =>
                          setFormData((prev) => ({ ...prev, phoneCountryIso: iso }))
                        }
                        onNationalChange={(value) =>
                          setFormData((prev) => ({ ...prev, phoneNational: value }))
                        }
                        placeholder={t("auth.signUp.yourPhonePlaceholder")}
                        required
                        countryAriaLabel={t("auth.signUp.countryCode")}
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="email" className="inline-flex flex-wrap items-baseline gap-x-1.5">
                          <span>{t("auth.signUp.email")}</span>
                          <span className="font-normal text-foreground/50">
                            {t("auth.signUp.optional")}
                          </span>
                        </Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
                          <Input
                            id="email"
                            name="email"
                            type="email"
                            placeholder={t("auth.signUp.emailPlaceholder")}
                            value={formData.email}
                            onChange={handleChange}
                            className="h-11 rounded-xl border-gray-200 pl-10"
                            autoComplete="email"
                          />
                        </div>
                      </div>
                      <PhoneWithCountryCode
                        id="parentPhoneNumber"
                        label={t("auth.signUp.parentPhone")}
                        countryIso={formData.parentPhoneCountryIso}
                        nationalNumber={formData.parentPhoneNational}
                        onCountryChange={(iso) =>
                          setFormData((prev) => ({ ...prev, parentPhoneCountryIso: iso }))
                        }
                        onNationalChange={(value) =>
                          setFormData((prev) => ({ ...prev, parentPhoneNational: value }))
                        }
                        placeholder={t("auth.signUp.parentPhonePlaceholder")}
                        required
                        countryAriaLabel={t("auth.signUp.countryCode")}
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="passportNumber" className="inline-flex flex-wrap items-baseline gap-x-1.5">
                          <span>{t("auth.signUp.passportLocal")}</span>
                          <span className="font-normal text-foreground/50">
                            {t("auth.signUp.optional")}
                          </span>
                        </Label>
                        <div className="relative">
                          <IdCard className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
                          <Input
                            id="passportNumber"
                            name="passportNumber"
                            type="text"
                            placeholder={t("auth.signUp.passportLocalPlaceholder")}
                            value={formData.passportNumber}
                            onChange={handleChange}
                            className="h-11 rounded-xl border-gray-200 pl-10"
                            autoComplete="off"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label
                          htmlFor="internationalPassportNumber"
                          className="inline-flex flex-wrap items-baseline gap-x-1.5"
                        >
                          <span>{t("auth.signUp.passportInternational")}</span>
                          <span className="font-normal text-foreground/50">
                            {t("auth.signUp.optional")}
                          </span>
                        </Label>
                        <div className="relative">
                          <IdCard className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
                          <Input
                            id="internationalPassportNumber"
                            name="internationalPassportNumber"
                            type="text"
                            placeholder={t("auth.signUp.passportInternationalPlaceholder")}
                            value={formData.internationalPassportNumber}
                            onChange={handleChange}
                            className="h-11 rounded-xl border-gray-200 pl-10"
                            autoComplete="off"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <PassportImageField
                        id="localPassportImage"
                        label={t("auth.signUp.passportLocalImage")}
                        optionalLabel={t("auth.signUp.optional")}
                        file={localPassportFile}
                        previewUrl={localPassportPreview}
                        inputRef={localPassportInputRef}
                        onPick={(file) =>
                          pickPassportImage(file, setLocalPassportFile, localPassportInputRef)
                        }
                        onClear={() => {
                          setLocalPassportFile(null);
                          if (localPassportInputRef.current) localPassportInputRef.current.value = "";
                        }}
                        browseLabel={t("auth.signUp.passportImageBrowse")}
                        replaceLabel={t("auth.signUp.passportImageReplace")}
                        removeLabel={t("auth.signUp.passportImageRemove")}
                        hint={t("auth.signUp.passportImageHint")}
                      />
                      <PassportImageField
                        id="internationalPassportImage"
                        label={t("auth.signUp.passportInternationalImage")}
                        optionalLabel={t("auth.signUp.optional")}
                        file={internationalPassportFile}
                        previewUrl={internationalPassportPreview}
                        inputRef={internationalPassportInputRef}
                        onPick={(file) =>
                          pickPassportImage(
                            file,
                            setInternationalPassportFile,
                            internationalPassportInputRef,
                          )
                        }
                        onClear={() => {
                          setInternationalPassportFile(null);
                          if (internationalPassportInputRef.current) {
                            internationalPassportInputRef.current.value = "";
                          }
                        }}
                        browseLabel={t("auth.signUp.passportImageBrowse")}
                        replaceLabel={t("auth.signUp.passportImageReplace")}
                        removeLabel={t("auth.signUp.passportImageRemove")}
                        hint={t("auth.signUp.passportImageHint")}
                      />
                    </div>

                    <Button
                      type="button"
                      onClick={goNext}
                      className="h-11 w-full rounded-full text-base font-semibold text-white hover:opacity-90"
                      style={{ backgroundColor: "#1e40af" }}
                    >
                      {t("auth.signUp.continue")}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="md:hidden">
                      <h2 className="text-sm font-semibold text-foreground">
                        {t("auth.signUp.educationAccount")}
                      </h2>
                      <p className="mt-0.5 text-xs text-foreground/60">
                        {t("auth.signUp.educationAccountHint")}
                      </p>
                    </div>
                    <div className="hidden md:block">
                      <h2 className="text-lg font-semibold tracking-tight text-foreground">
                        {t("auth.signUp.educationAccount")}
                      </h2>
                      <p className="mt-1 text-sm text-foreground/60">
                        {t("auth.signUp.educationAccountHint")}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="dateOfBirth">{t("auth.signUp.dateOfBirth")}</Label>
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
                        <Label htmlFor="birthCity">{t("auth.signUp.bornCity")}</Label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
                          <Input
                            id="birthCity"
                            name="birthCity"
                            type="text"
                            placeholder={t("auth.signUp.bornCityPlaceholder")}
                            value={formData.birthCity}
                            onChange={handleChange}
                            className="h-11 rounded-xl border-gray-200 pl-10"
                            required
                            autoComplete="address-level2"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <Label>{t("auth.signUp.studentAffiliation")}</Label>
                        <p className="mt-1 text-xs text-foreground/55">
                          {t("auth.signUp.studentAffiliationHint")}
                        </p>
                      </div>

                      <div
                        className="grid grid-cols-1 gap-3 sm:grid-cols-2"
                        role="radiogroup"
                        aria-label={t("auth.signUp.studentAffiliation")}
                      >
                        {(
                          [
                            {
                              value: "internal" as const,
                              title: t("auth.signUp.studentAffiliationInternal"),
                              subtitle: t("auth.signUp.studentAffiliationInternalTitle"),
                              hint: t("auth.signUp.studentAffiliationInternalHint"),
                              icon: GraduationCap,
                            },
                            {
                              value: "external" as const,
                              title: t("auth.signUp.studentAffiliationExternal"),
                              subtitle: t("auth.signUp.studentAffiliationExternalTitle"),
                              hint: t("auth.signUp.studentAffiliationExternalHint"),
                              icon: Globe,
                            },
                          ] as const
                        ).map((option) => {
                          const selected = studentAffiliation === option.value;
                          const Icon = option.icon;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              role="radio"
                              aria-checked={selected}
                              onClick={() => selectStudentAffiliation(option.value)}
                              className={cn(
                                "relative flex h-full min-h-[7.5rem] flex-col rounded-xl border p-4 text-left transition-all",
                                selected
                                  ? "border-[#1e40af]/40 bg-[#eff3ff]/70 ring-2 ring-[#1e40af]/25"
                                  : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/80",
                              )}
                            >
                              <span
                                className={cn(
                                  "absolute right-3 top-3 inline-flex size-5 items-center justify-center rounded-full border transition-colors",
                                  selected
                                    ? "border-[#1e40af] bg-[#1e40af] text-white"
                                    : "border-gray-300 bg-white text-transparent",
                                )}
                                aria-hidden
                              >
                                <Check className="h-3 w-3" strokeWidth={3} />
                              </span>
                              <span
                                className={cn(
                                  "mb-3 inline-flex size-9 items-center justify-center rounded-full",
                                  selected ? "bg-[#1e40af]/10 text-[#1e40af]" : "bg-gray-100 text-foreground/55",
                                )}
                              >
                                <Icon className="h-4 w-4" />
                              </span>
                              <span className="text-sm font-semibold text-foreground">{option.title}</span>
                              <span
                                className={cn(
                                  "mt-0.5 text-sm font-medium",
                                  selected ? "text-[#1e40af]" : "text-foreground/75",
                                )}
                              >
                                {option.subtitle}
                              </span>
                              <span className="mt-1.5 text-xs leading-snug text-foreground/55">{option.hint}</span>
                            </button>
                          );
                        })}
                      </div>

                      {studentAffiliation === "external" ? (
                        <div className="space-y-2 rounded-xl border border-gray-200 bg-gray-50/60 p-4">
                          <Label htmlFor="latestSchool">{t("auth.signUp.latestSchoolExternalLabel")}</Label>
                          <div className="relative">
                            <GraduationCap className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
                            <Input
                              id="latestSchool"
                              name="latestSchool"
                              type="text"
                              placeholder={t("auth.signUp.latestSchoolPlaceholder")}
                              value={formData.latestSchool}
                              onChange={handleChange}
                              className="h-11 rounded-xl border-gray-200 bg-white pl-10"
                              required
                              autoComplete="organization"
                            />
                          </div>
                        </div>
                      ) : studentAffiliation === "internal" ? (
                        <div className="rounded-xl border border-[#1e40af]/20 bg-[#eff3ff]/50 px-4 py-3">
                          <p className="text-sm font-medium text-[#1e40af]">
                            {t("auth.signUp.studentAffiliationInternalConfirmed", {
                              university: TUES_UNIVERSITY_SCHOOL_NAME,
                            })}
                          </p>
                        </div>
                      ) : null}
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="password">{t("auth.signUp.password")}</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
                          <Input
                            id="password"
                            name="password"
                            type={showPassword ? "text" : "password"}
                            placeholder={t("auth.signUp.passwordPlaceholder")}
                            value={formData.password}
                            onChange={handleChange}
                            className="h-11 rounded-xl border-gray-200 pl-10 pr-10"
                            required
                            autoComplete="new-password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 transition-colors hover:text-foreground"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">{t("auth.signUp.confirmPassword")}</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
                          <Input
                            id="confirmPassword"
                            name="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder={t("auth.signUp.confirmPasswordPlaceholder")}
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            className="h-11 rounded-xl border-gray-200 pl-10 pr-10"
                            required
                            autoComplete="new-password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 transition-colors hover:text-foreground"
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        id="terms"
                        className="mt-0.5 h-4 w-4 shrink-0 appearance-none rounded border border-black/40 bg-white checked:border-black/40 checked:bg-white focus:ring-primary"
                        required
                      />
                      <label htmlFor="terms" className="cursor-pointer text-foreground/70">
                        {t("auth.signUp.termsPrefix")}{" "}
                        <Link
                          to="#"
                          className="font-medium text-primary transition-colors hover:text-primary/80"
                        >
                          {t("auth.signUp.termsOfService")}
                        </Link>{" "}
                        {t("auth.signUp.termsAnd")}{" "}
                        <Link
                          to="#"
                          className="font-medium text-primary transition-colors hover:text-primary/80"
                        >
                          {t("auth.signUp.privacyPolicy")}
                        </Link>
                      </label>
                    </div>

                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={goBack}
                        className="h-11 rounded-full sm:flex-1"
                      >
                        {t("auth.signUp.back")}
                      </Button>
                      <Button
                        type="submit"
                        disabled={isLoading}
                        className="h-11 rounded-full text-base font-semibold text-white hover:opacity-90 disabled:opacity-50 sm:flex-[1.4]"
                        style={{ backgroundColor: "#1e40af" }}
                      >
                        {isLoading ? t("auth.signUp.submitting") : t("auth.signUp.submit")}
                      </Button>
                    </div>
                  </div>
                )}
              </form>

              <div className="mt-6 text-center text-sm md:hidden">
                <span className="text-foreground/70">{t("auth.signUp.hasAccount")} </span>
                <Link
                  to="/signin"
                  className="font-semibold text-primary transition-colors hover:text-primary/80"
                >
                  {t("auth.signUp.signIn")}
                </Link>
              </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SignUp;
