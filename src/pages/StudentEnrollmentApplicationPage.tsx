import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  DollarSign,
  FileCheck,
  IdCard,
  Loader2,
  MoreVertical,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuthSession } from "@/features/auth/context";
import {
  enrollmentApplicationStore,
  type EnrollmentInstallmentCount,
  type EnrollmentPaymentPlan,
} from "@/features/enrollment/enrollmentApplicationStore";
import { eduhubCourses } from "@/api/eduhubClient";
import { isUuid } from "@/api/utils";
import { teacherCoursesStore } from "@/features/teacher/data/teacherCoursesStore";
import {
  enrollmentRecordToPdfData,
  type EnrollmentApplicationPdfData,
} from "@/features/enrollment/enrollmentApplicationPdf";

const ENROLL_SUCCESS_SESSION_PREFIX = "eduhub_enrollment_success_pdf__";

function enrollSuccessSessionKey(courseId: string, emailNorm: string): string {
  return `${ENROLL_SUCCESS_SESSION_PREFIX}${encodeURIComponent(courseId)}__${emailNorm}`;
}
import { cn } from "@/lib/utils";

function EnrollmentFormGroup({
  step,
  title,
  description,
  children,
}: {
  step: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-sm">
      <div className="border-b border-zinc-100 bg-gradient-to-r from-[#3954d0]/[0.06] via-zinc-50/90 to-white p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#3954d0]">{step}</p>
        <h2 className="mt-1 text-base font-semibold tracking-tight text-zinc-900">{title}</h2>
        {description ? <p className="mt-1 text-xs leading-relaxed text-zinc-500">{description}</p> : null}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function formatPrice(price: number | undefined, currency = "USD"): string {
  if (price == null || price <= 0) return "Free";
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(price);
}

/** Title-case each word; words are split by spaces or hyphens. Not applied to raw course IDs. */
function capitalizeCourseTitleWords(raw: string): string {
  return raw
    .split(/(\s+|-)/)
    .map((part) => {
      if (part === "" || /^\s+$/.test(part) || part === "-") return part;
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join("");
}

function parseAmountInput(raw: string): number | null {
  const t = raw.replace(/,/g, "").trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Transfer proof upload limit */
const PROOF_MAX_BYTES = 2 * 1024 * 1024;

/** Payment proof and ID are not uploaded to remote storage; URLs are placeholders so enrollment saves offline (API uploads disabled). */
const ENROLLMENT_PLACEHOLDER_PROOF_URL = "local://eduhub-enrollment/payment-proof";
const ENROLLMENT_PLACEHOLDER_ID_URL = "local://eduhub-enrollment/id-document";

function isAllowedProofType(f: File): boolean {
  return (
    f.type.startsWith("image/") ||
    f.type === "application/pdf" ||
    /\.pdf$/i.test(f.name)
  );
}

function validateProofFile(f: File): string | null {
  if (!isAllowedProofType(f)) {
    return "Please upload a PNG, JPG, or PDF.";
  }
  if (f.size > PROOF_MAX_BYTES) {
    return "File must be 2 MB or smaller.";
  }
  return null;
}

const REG_PHONE_PREFIX = "eduhub_registration_phone_";

function registrationPhoneForEmail(email: string): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(`${REG_PHONE_PREFIX}${email.trim().toLowerCase()}`) ?? "";
}

function resolveCourseTitle(courseId: string | undefined): string | undefined {
  if (!courseId) return undefined;
  if (courseId.startsWith("teacher_")) {
    const c = teacherCoursesStore.getById(courseId.slice("teacher_".length));
    return c?.title;
  }
  return undefined;
}

function resolveCourseThumbnail(courseId: string | undefined): string | undefined {
  if (!courseId?.startsWith("teacher_")) return undefined;
  const c = teacherCoursesStore.getById(courseId.slice("teacher_".length));
  return c?.thumbnailUrl?.trim() || undefined;
}

const StudentEnrollmentApplicationPage = () => {
  const { courseId: rawCourseId } = useParams<{ courseId: string }>();
  const courseId = rawCourseId ? decodeURIComponent(rawCourseId) : undefined;
  const { user } = useAuthSession();

  const [courseTitle, setCourseTitle] = useState<string | undefined>(() => resolveCourseTitle(courseId));
  const [priceDisplay, setPriceDisplay] = useState<string>(() => {
    if (!courseId?.startsWith("teacher_")) return "";
    const c = teacherCoursesStore.getById(courseId.slice("teacher_".length));
    return formatPrice(c?.price, "USD");
  });
  const [priceCurrency, setPriceCurrency] = useState("USD");
  const [coursePriceAmount, setCoursePriceAmount] = useState<number | undefined>(() => {
    if (!courseId?.startsWith("teacher_")) return undefined;
    const c = teacherCoursesStore.getById(courseId.slice("teacher_".length));
    const p = c?.price;
    return p != null && p > 0 ? p : undefined;
  });
  const [loadingCourse, setLoadingCourse] = useState(false);
  const [courseThumbnailUrl, setCourseThumbnailUrl] = useState<string | undefined>(() =>
    resolveCourseThumbnail(courseId),
  );
  const [paymentPlan, setPaymentPlan] = useState<EnrollmentPaymentPlan>("FULL");
  const [installmentCount, setInstallmentCount] = useState<EnrollmentInstallmentCount>(2);
  const [downPaymentRaw, setDownPaymentRaw] = useState("");
  const [phoneSecondary, setPhoneSecondary] = useState("");

  const primaryPhone = useMemo(
    () => (user.phoneNumber ?? registrationPhoneForEmail(user.email)).trim(),
    [user.phoneNumber, user.email],
  );

  const readonlyProfileClass =
    "rounded-xl border-zinc-200 bg-zinc-50 text-zinc-900 cursor-not-allowed selection:bg-zinc-100 focus-visible:ring-0 focus-visible:ring-offset-0";

  const downPaymentSummary = useMemo(() => {
    if (paymentPlan !== "DOWN_PAYMENT") return null;
    const total = coursePriceAmount;
    const down = parseAmountInput(downPaymentRaw);
    const n = installmentCount;
    if (total == null || total <= 0) {
      return { kind: "noPrice" as const };
    }
    if (down == null || down <= 0) {
      return { kind: "needDown" as const, total, n };
    }
    if (down > total) {
      return { kind: "downExceeds" as const, total, down, n };
    }
    const remaining = total - down;
    if (remaining <= 0) {
      return { kind: "fullyCovered" as const, total, down, n };
    }
    const perInstalment = Math.round(remaining / n);
    return {
      kind: "schedule" as const,
      total,
      down,
      remaining,
      n,
      perInstalment,
    };
  }, [paymentPlan, coursePriceAmount, downPaymentRaw, installmentCount]);

  const [address, setAddress] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const proofInputRef = useRef<HTMLInputElement>(null);
  const [idCardFile, setIdCardFile] = useState<File | null>(null);
  const idCardInputRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!courseId) {
      setCourseTitle(undefined);
      setPriceDisplay("");
      setPriceCurrency("USD");
      setCoursePriceAmount(undefined);
      setCourseThumbnailUrl(undefined);
      return;
    }
    if (courseId.startsWith("teacher_")) {
      const c = teacherCoursesStore.getById(courseId.slice("teacher_".length));
      setCourseTitle(c?.title);
      setPriceDisplay(formatPrice(c?.price, "USD"));
      setPriceCurrency("USD");
      const p = c?.price;
      setCoursePriceAmount(p != null && p > 0 ? p : undefined);
      setCourseThumbnailUrl(c?.thumbnailUrl?.trim() || undefined);
      return;
    }
    if (!isUuid(courseId)) {
      setCourseTitle(undefined);
      setPriceDisplay("");
      setPriceCurrency("USD");
      setCoursePriceAmount(undefined);
      setCourseThumbnailUrl(undefined);
      return;
    }
    setPriceDisplay("");
    setCourseThumbnailUrl(undefined);
    setLoadingCourse(true);
    eduhubCourses
      .getById(courseId)
      .then((c) => {
        setCourseTitle(c.title);
        const amt = c.pricing?.discountedAmount ?? c.pricing?.amount;
        const cur = c.pricing?.currency ?? "USD";
        setPriceCurrency(cur);
        setPriceDisplay(formatPrice(amt, cur));
        setCoursePriceAmount(amt != null && amt > 0 ? amt : undefined);
        setCourseThumbnailUrl(c.thumbnailUrl?.trim() || undefined);
      })
      .catch(() => {
        setCourseTitle(undefined);
        setPriceDisplay("");
        setPriceCurrency("USD");
        setCoursePriceAmount(undefined);
        setCourseThumbnailUrl(undefined);
      })
      .finally(() => setLoadingCourse(false));
  }, [courseId]);

  useEffect(() => {
    if (!courseId || !user.email.trim()) return;
    const pending = enrollmentApplicationStore.findPendingForCourseAndEmail(
      courseId,
      user.email.trim().toLowerCase(),
    );
    if (!pending) return;
    const pdfData = enrollmentRecordToPdfData(pending);
    navigate(
      `/dashboard/available-courses/enroll/${encodeURIComponent(courseId)}/success`,
      { replace: true, state: { pdfData } },
    );
  }, [courseId, user.email, navigate]);

  useEffect(() => {
    if (paymentPlan === "FULL") setInstallmentCount(2);
  }, [paymentPlan]);

  const trySetProofFile = (next: File | null) => {
    if (!next) {
      setFile(null);
      return;
    }
    const err = validateProofFile(next);
    if (err) {
      toast.error(err);
      if (proofInputRef.current) proofInputRef.current.value = "";
      return;
    }
    setFile(next);
  };

  const trySetIdCardFile = (next: File | null) => {
    if (!next) {
      setIdCardFile(null);
      return;
    }
    const err = validateProofFile(next);
    if (err) {
      toast.error(err);
      if (idCardInputRef.current) idCardInputRef.current.value = "";
      return;
    }
    setIdCardFile(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId) return;
    const emailNorm = user.email.trim().toLowerCase();
    if (!user.name.trim() || !user.email.trim() || !primaryPhone || !address.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (!file) {
      toast.error("Upload a screenshot or proof of bank transfer.");
      return;
    }
    if (!idCardFile) {
      toast.error("Upload a photo or scan of your ID card.");
      return;
    }
    if (file.size > PROOF_MAX_BYTES) {
      toast.error("Proof file must be 2 MB or smaller.");
      return;
    }
    if (idCardFile.size > PROOF_MAX_BYTES) {
      toast.error("ID document must be 2 MB or smaller.");
      return;
    }
    let downAmount: number | undefined;
    if (paymentPlan === "DOWN_PAYMENT") {
      const parsed = parseAmountInput(downPaymentRaw);
      if (parsed == null || parsed <= 0) {
        toast.error("Enter a valid down payment amount (greater than zero).");
        return;
      }
      downAmount = parsed;
    }
    const existing = enrollmentApplicationStore.findPendingForCourseAndEmail(courseId, emailNorm);
    if (existing) {
      const pdfData = enrollmentRecordToPdfData(existing);
      navigate(`/dashboard/available-courses/enroll/${encodeURIComponent(courseId)}/success`, {
        replace: true,
        state: { pdfData },
      });
      return;
    }

    setSubmitting(true);
    const paymentProofUrl = ENROLLMENT_PLACEHOLDER_PROOF_URL;
    const idCardUrl = ENROLLMENT_PLACEHOLDER_ID_URL;

    try {
      const paymentDetailLines: string[] = [];
      paymentDetailLines.push(
        paymentPlan === "FULL"
          ? "Payment plan: Full payment"
          : "Payment plan: Down payment (instalments apply to remaining balance where offered)",
      );
      paymentDetailLines.push(`Tuition shown: ${priceDisplay || "—"}`);
      if (paymentPlan === "DOWN_PAYMENT") {
        paymentDetailLines.push(`Instalment count selected: ${installmentCount}`);
        const rawDown = downPaymentRaw.trim();
        if (rawDown) {
          paymentDetailLines.push(`Down payment amount (entered): ${rawDown} (${priceCurrency})`);
        }
        const dps = downPaymentSummary;
        if (dps?.kind === "needDown" || dps?.kind === "noPrice") {
          paymentDetailLines.push(
            "Note: Instalment amounts will follow school policy once your payment is verified.",
          );
        }
        if (dps?.kind === "downExceeds") {
          paymentDetailLines.push(
            "Note: Entered down payment exceeds the listed tuition — an administrator will review.",
          );
        }
        if (dps?.kind === "fullyCovered") {
          paymentDetailLines.push(
            "Down payment covers the full listed tuition; no further tuition instalments for that amount.",
          );
        }
        if (dps?.kind === "schedule") {
          paymentDetailLines.push(
            `Remaining balance after down payment: ${formatPrice(dps.remaining, priceCurrency)}`,
          );
          paymentDetailLines.push(
            `Each of ${dps.n} instalments (estimated): ${formatPrice(dps.perInstalment, priceCurrency)}`,
          );
        }
      }

      const pdfData: EnrollmentApplicationPdfData = {
        submittedAtIso: new Date().toISOString(),
        courseTitle: courseTitle ?? courseId,
        courseId,
        tuitionLabel: priceDisplay || "—",
        fullName: user.name.trim(),
        email: user.email.trim(),
        phone: primaryPhone,
        phoneSecondary: phoneSecondary.trim() || undefined,
        address: address.trim(),
        paymentDetailLines,
        proofFileName: file.name,
        idFileName: idCardFile.name,
      };

      enrollmentApplicationStore.add({
        courseId,
        courseTitle,
        applicantUserId: user.id,
        applicantEmailNorm: emailNorm,
        fullName: user.name.trim(),
        email: user.email.trim(),
        phone: primaryPhone,
        phoneSecondary: phoneSecondary.trim() || undefined,
        address: address.trim(),
        paymentProofUrl,
        idCardUrl,
        paymentPlan,
        downPaymentAmount: downAmount,
        priceCurrency,
        installmentCount: paymentPlan === "DOWN_PAYMENT" ? installmentCount : undefined,
      });

      try {
        sessionStorage.setItem(enrollSuccessSessionKey(courseId, emailNorm), JSON.stringify(pdfData));
      } catch {
        /* storage full or private mode */
      }

      navigate(`/dashboard/available-courses/enroll/${encodeURIComponent(courseId)}/success`, {
        replace: true,
        state: { pdfData },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast.error("Could not save your application", {
        description: message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!courseId) {
    return (
      <div className="min-h-dvh bg-zinc-50">
        <main className="min-h-dvh w-full pb-20">
          <div className="pt-0">
            <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 backdrop-blur-md">
              <div className="mx-auto flex max-w-xl items-start justify-between gap-4 px-4 py-3 sm:items-center sm:px-6 sm:py-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Enrollment</p>
                  <h1 className="mt-0.5 text-lg font-semibold tracking-tight text-zinc-900 sm:text-xl">Request access</h1>
                </div>
                <Link
                  to="/dashboard/available-courses"
                  title="Back to available classes"
                  className="inline-flex shrink-0 items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
                >
                  <ArrowLeft className="h-4 w-4 shrink-0" />
                  <span className="hidden sm:inline">Available classes</span>
                </Link>
              </div>
            </header>
            <div className="mx-auto max-w-xl px-4 pt-6 sm:px-6">
              <p className="text-sm text-zinc-600">Missing class.</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const inputEditClass =
    "mt-1.5 h-11 rounded-xl border-zinc-200 bg-white shadow-none transition-colors focus-visible:border-zinc-400 focus-visible:ring-[3px] focus-visible:ring-zinc-200/80";

  return (
    <div className="min-h-dvh bg-zinc-50" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <main className="flex min-h-dvh w-full flex-col">
        <div>
          <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 backdrop-blur-md">
            <div className="w-full px-4 py-3 sm:px-6 sm:py-4">
              <div className="flex w-full items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Enrollment</p>
                  <h1 className="mt-0.5 truncate text-lg font-semibold tracking-tight text-zinc-900 sm:text-xl">
                    Request access
                  </h1>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 shrink-0 rounded-full border border-zinc-200 bg-white/80 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900"
                      aria-label="Enrollment menu"
                    >
                      <MoreVertical className="h-5 w-5" aria-hidden />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-[11rem]">
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard/available-courses" className="cursor-pointer">
                        Available classes
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard" className="cursor-pointer">
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          <div
            className={cn(
              "box-border w-full max-w-6xl",
              "mx-auto px-4 sm:px-6",
              "lg:mx-0 lg:max-w-none lg:px-0",
            )}
          >
            <div className="flex flex-col lg:relative lg:min-h-[100dvh]">
              <aside
                className={cn(
                  "box-border mb-8 w-full shrink-0 p-0 lg:mb-0",
                  "lg:fixed lg:left-0 lg:top-20 lg:z-[5] lg:w-1/2 lg:max-w-none",
                  /* Exact band: viewport − sticky header (5rem) − footer bar (4.5rem + footer safe area) */
                  "lg:h-[calc(100dvh-5rem-4.5rem-env(safe-area-inset-bottom,0px))] lg:max-h-[calc(100dvh-5rem-4.5rem-env(safe-area-inset-bottom,0px))] lg:overflow-y-auto",
                  "lg:bg-zinc-50/95 lg:backdrop-blur-sm",
                  "lg:box-border lg:flex lg:min-h-0 lg:flex-col lg:p-0",
                )}
                aria-label="Course summary"
              >
                <div className="min-h-0 min-w-0 lg:flex lg:h-full lg:min-h-0 lg:flex-1 lg:flex-col">
                  <header className="flex min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-sm lg:flex lg:h-full lg:min-h-0 lg:flex-1 lg:flex-col lg:rounded-none lg:border-0 lg:shadow-none">
                    <div className="relative aspect-[2/1] w-full overflow-hidden bg-gradient-to-b from-zinc-100 to-zinc-200/80 sm:aspect-[21/9] lg:min-h-0 lg:flex-1 lg:aspect-auto">
                      {courseThumbnailUrl ? (
                        <img
                          src={courseThumbnailUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : loadingCourse ? (
                        <div className="h-full w-full animate-pulse bg-zinc-200/90" />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 bg-zinc-100/90 text-zinc-400">
                          <BookOpen className="h-9 w-9 opacity-50" strokeWidth={1.25} aria-hidden />
                          <span className="text-xs font-medium text-zinc-500">No cover image</span>
                        </div>
                      )}
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 min-h-[38%] bg-gradient-to-t from-black/80 via-black/40 via-45% to-transparent px-4 pb-4 pt-16 sm:px-5 sm:pb-5 sm:pt-24 lg:pt-32">
                        <div className="pointer-events-auto mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-white/80">Course</p>
                            <p className="mt-0.5 text-xl font-semibold leading-snug tracking-tight text-white drop-shadow-sm sm:text-2xl lg:text-3xl lg:leading-tight">
                              {loadingCourse && !courseTitle ? (
                                <span className="text-white/60">Loading…</span>
                              ) : courseTitle ? (
                                capitalizeCourseTitleWords(courseTitle)
                              ) : (
                                courseId
                              )}
                            </p>
                          </div>
                          <div className="flex w-fit shrink-0 items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-3.5 py-2 text-sm font-semibold tabular-nums text-white backdrop-blur-sm">
                            <DollarSign className="h-4 w-4 text-white/80" aria-hidden />
                            {loadingCourse && !priceDisplay ? "…" : priceDisplay || "—"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </header>
                </div>
              </aside>

              <div
                className={cn(
                  "min-w-0 w-full py-4",
                  "lg:fixed lg:right-0 lg:top-20 lg:z-[5] lg:ml-0 lg:flex lg:h-[calc(100dvh-5rem-4.5rem-env(safe-area-inset-bottom,0px))] lg:max-h-[calc(100dvh-5rem-4.5rem-env(safe-area-inset-bottom,0px))] lg:w-1/2 lg:min-h-0 lg:flex-col lg:overflow-y-auto lg:pb-6 lg:pt-6",
                  "lg:px-6 xl:px-8",
                )}
              >
                <div className="mx-auto w-full min-h-0 max-w-xl lg:max-w-none">
                  <div className="mb-4 shrink-0">
                    <h2 className="text-lg font-semibold tracking-tight text-zinc-900 sm:text-xl">
                      Complete this enrollment form
                    </h2>
                    <p className="mt-1.5 text-sm leading-relaxed text-zinc-600">
                      Fill out each section below and upload the requested documents. We will review everything before you can join the class.
                    </p>
                  </div>
                  <form
                    id="enrollment-application-form"
                    onSubmit={handleSubmit}
                    className="flex flex-col gap-4 pb-6"
                  >
            <EnrollmentFormGroup
              step="Step 1"
              title="Contact"
              description="Profile fields from your account and your mailing address. Contact support to update read-only details."
            >
              <div className="space-y-8">
                <div>
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500">Your details</h3>
                  <p className="mt-1 text-xs text-zinc-500">From your account — contact support to update.</p>
                  <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-1">
                      <Label htmlFor="fullName" className="text-zinc-700">
                        Full name
                      </Label>
                      <Input
                        id="fullName"
                        readOnly
                        aria-readonly="true"
                        className={`mt-1.5 h-11 ${readonlyProfileClass}`}
                        value={user.name}
                        autoComplete="name"
                      />
                    </div>
                    <div className="sm:col-span-1">
                      <Label htmlFor="email" className="text-zinc-700">
                        Email
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        readOnly
                        aria-readonly="true"
                        className={`mt-1.5 h-11 ${readonlyProfileClass}`}
                        value={user.email}
                        autoComplete="email"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label htmlFor="phone" className="text-zinc-700">
                        Phone number
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        readOnly
                        aria-readonly="true"
                        className={`mt-1.5 h-11 ${readonlyProfileClass}`}
                        value={primaryPhone}
                        autoComplete="tel"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label htmlFor="phone2" className="text-zinc-700">
                        Additional phone <span className="font-normal text-zinc-500">(optional)</span>
                      </Label>
                      <Input
                        id="phone2"
                        type="tel"
                        className={inputEditClass}
                        value={phoneSecondary}
                        onChange={(e) => setPhoneSecondary(e.target.value)}
                        autoComplete="tel"
                      />
                    </div>
                  </div>
                </div>
                <div className="border-t border-zinc-100 pt-8">
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500">Mailing address</h3>
                  <Textarea
                    id="address"
                    aria-label="Your mailing address"
                    className="mt-3 min-h-[100px] resize-y rounded-xl border-zinc-200 bg-white shadow-none focus-visible:ring-[3px] focus-visible:ring-zinc-200/80"
                    placeholder="Street, city, postal code…"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    required
                    autoComplete="street-address"
                  />
                </div>
              </div>
            </EnrollmentFormGroup>

            <EnrollmentFormGroup
              step="Step 2"
              title="Payment plan"
              description="Choose full tuition or a down payment with instalments where your school offers them."
            >
              <fieldset className="min-w-0 border-0 p-0 shadow-none">
                <legend className="sr-only">Payment plan</legend>
                <p className="text-xs text-zinc-500">
                  Choose how you&apos;re paying for this class.
                </p>
                <RadioGroup
                  value={paymentPlan}
                  onValueChange={(v) => setPaymentPlan(v as EnrollmentPaymentPlan)}
                  className="mt-4 grid gap-2 sm:grid-cols-2"
                >
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50/40 px-4 py-3 transition-colors hover:bg-zinc-50 has-[[data-state=checked]]:border-[#3954d0]/40 has-[[data-state=checked]]:bg-[#3954d0]/[0.06]">
                    <RadioGroupItem value="FULL" id="pay-full" />
                    <span className="text-sm font-medium text-zinc-900">Full payment</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50/40 px-4 py-3 transition-colors hover:bg-zinc-50 has-[[data-state=checked]]:border-[#3954d0]/40 has-[[data-state=checked]]:bg-[#3954d0]/[0.06]">
                    <RadioGroupItem value="DOWN_PAYMENT" id="pay-down" />
                    <span className="text-sm font-medium text-zinc-900">Down payment</span>
                  </label>
                </RadioGroup>
                {paymentPlan === "DOWN_PAYMENT" ? (
                  <div className="mt-5 pt-5 border-t border-zinc-100">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-4">
                      <div className="min-w-0 flex-1">
                        <Label htmlFor="downPayment" className="text-zinc-700">
                          Down payment ({priceCurrency})
                        </Label>
                        <Input
                          id="downPayment"
                          inputMode="decimal"
                          autoComplete="off"
                          className={inputEditClass}
                          placeholder="Amount on your transfer"
                          value={downPaymentRaw}
                          onChange={(e) => setDownPaymentRaw(e.target.value)}
                        />
                        <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                          Must match your proof. Any remaining balance follows school policy.
                        </p>
                      </div>
                      <div className="w-full shrink-0 sm:w-16 sm:min-w-0">
                        <Label htmlFor="installments" className="text-[11px] font-medium leading-tight text-zinc-600 sm:text-xs">
                          Instalments
                        </Label>
                        <Select
                          value={String(installmentCount)}
                          onValueChange={(v) => setInstallmentCount(Number(v) as EnrollmentInstallmentCount)}
                        >
                          <SelectTrigger id="installments" className="mt-1.5 h-11 w-full min-w-0 rounded-xl border-zinc-200 px-1.5 text-sm [&>svg]:h-3 [&>svg]:w-3 [&>svg]:shrink-0">
                            <SelectValue placeholder="2" />
                          </SelectTrigger>
                          <SelectContent
                            position="popper"
                            className="min-w-0 w-[var(--radix-select-trigger-width)] max-w-[var(--radix-select-trigger-width)] p-0"
                          >
                            <SelectItem value="2" className="justify-center py-2 pl-2 pr-2 text-center text-sm">
                              2
                            </SelectItem>
                            <SelectItem value="4" className="justify-center py-2 pl-2 pr-2 text-center text-sm">
                              4
                            </SelectItem>
                            <SelectItem value="6" className="justify-center py-2 pl-2 pr-2 text-center text-sm">
                              6
                            </SelectItem>
                            <SelectItem value="8" className="justify-center py-2 pl-2 pr-2 text-center text-sm">
                              8
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {downPaymentSummary ? (
                      <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-800">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-600">Summary</p>
                        {downPaymentSummary.kind === "noPrice" && (
                          <p className="text-zinc-600">
                            Class price is unavailable or free — instalment amounts can&apos;t be calculated here.
                          </p>
                        )}
                        {downPaymentSummary.kind === "needDown" && (
                          <div className="space-y-1.5 text-zinc-700">
                            <p>
                              <span className="text-zinc-500">Class price:</span>{" "}
                              <span className="font-semibold text-zinc-900">
                                {formatPrice(downPaymentSummary.total, priceCurrency)}
                              </span>
                            </p>
                            <p className="text-zinc-600">
                              Enter your down payment amount to see the remaining balance split across {downPaymentSummary.n}{" "}
                              instalments.
                            </p>
                          </div>
                        )}
                        {downPaymentSummary.kind === "downExceeds" && (
                          <p className="text-amber-800">
                            Down payment ({formatPrice(downPaymentSummary.down, priceCurrency)}) is higher than the class price (
                            {formatPrice(downPaymentSummary.total, priceCurrency)}). Please correct the amount.
                          </p>
                        )}
                        {downPaymentSummary.kind === "fullyCovered" && (
                          <p className="text-zinc-700">
                            Your down payment covers the full class price ({formatPrice(downPaymentSummary.total, priceCurrency)}
                            ). No further instalments are needed for tuition.
                          </p>
                        )}
                        {downPaymentSummary.kind === "schedule" && (
                          <ul className="space-y-2 text-zinc-800">
                            <li className="flex flex-wrap justify-between gap-x-4 gap-y-0.5">
                              <span className="text-zinc-500">Class price</span>
                              <span className="font-medium tabular-nums text-zinc-900">
                                {formatPrice(downPaymentSummary.total, priceCurrency)}
                              </span>
                            </li>
                            <li className="flex flex-wrap justify-between gap-x-4 gap-y-0.5">
                              <span className="text-zinc-500">Down payment (this transfer)</span>
                              <span className="font-medium tabular-nums text-zinc-900">
                                {formatPrice(downPaymentSummary.down, priceCurrency)}
                              </span>
                            </li>
                            <li className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 border-t border-zinc-200/90 pt-2">
                              <span className="text-zinc-500">Remaining balance</span>
                              <span className="font-semibold tabular-nums text-zinc-900">
                                {formatPrice(downPaymentSummary.remaining, priceCurrency)}
                              </span>
                            </li>
                            <li className="pt-0.5 text-zinc-900">
                              <span className="text-zinc-500">Each of {downPaymentSummary.n} instalments</span>
                              <span className="mx-1.5 text-zinc-300">·</span>
                              <span className="font-semibold tabular-nums">
                                {formatPrice(downPaymentSummary.perInstalment, priceCurrency)}
                              </span>
                              <span className="mt-1 block text-xs font-normal text-zinc-500">
                                Remaining balance divided equally ({downPaymentSummary.n} payments). Final dates follow school policy.
                              </span>
                            </li>
                          </ul>
                        )}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </fieldset>
            </EnrollmentFormGroup>

            <EnrollmentFormGroup
              step="Step 3"
              title="Verification uploads"
              description="Identification and payment proof so we can verify who you are and match your transfer."
            >
              <div className="space-y-8">
                <div>
                  <div className="flex items-center gap-2">
                    <IdCard className="h-4 w-4 text-zinc-500" aria-hidden />
                    <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500">
                      Identification
                    </h3>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">
                    Upload a clear photo or scan of your government ID, passport, or student ID.
                  </p>

                  <div className="mt-5">
                    {idCardFile ? (
                      <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-zinc-50/90 p-4 sm:flex-row sm:items-center">
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15">
                            <FileCheck className="h-5 w-5 text-emerald-700" aria-hidden />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-zinc-900">{idCardFile.name}</p>
                            <p className="text-xs text-zinc-500">
                              {(idCardFile.size / 1024).toFixed(idCardFile.size < 10240 ? 1 : 0)} KB · attached
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="shrink-0 self-stretch sm:self-center"
                          onClick={() => {
                            setIdCardFile(null);
                            if (idCardInputRef.current) idCardInputRef.current.value = "";
                          }}
                        >
                          Replace
                        </Button>
                      </div>
                    ) : (
                      <label
                        htmlFor="enrollment-id-card"
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const f = e.dataTransfer.files?.[0];
                          if (f) trySetIdCardFile(f);
                        }}
                        className={cn(
                          "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-5 py-10 text-center transition-colors sm:gap-4 sm:py-12",
                          "border-zinc-300 bg-gradient-to-b from-white to-zinc-50/90",
                          "hover:border-[#3954d0]/45 hover:from-zinc-50/50 hover:to-[#3954d0]/[0.04]",
                          "focus-within:border-[#3954d0]/55 focus-within:ring-2 focus-within:ring-[#3954d0]/20",
                        )}
                      >
                        <input
                          ref={idCardInputRef}
                          id="enrollment-id-card"
                          type="file"
                          accept="image/*,.pdf"
                          className="sr-only"
                          onChange={(e) => trySetIdCardFile(e.target.files?.[0] ?? null)}
                        />
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#3954d0]/12">
                          <Upload className="h-6 w-6 text-[#3954d0]" aria-hidden />
                        </div>
                        <div className="max-w-xs space-y-1">
                          <p className="text-sm font-medium text-zinc-900">
                            Drop your ID here or <span className="text-[#3954d0]">browse</span>
                          </p>
                          <p className="text-xs leading-relaxed text-zinc-500">
                            PNG, JPG, or PDF · max 2 MB. Ensure name and photo are readable.
                          </p>
                        </div>
                      </label>
                    )}
                  </div>
                </div>

                <div className="border-t border-zinc-100 pt-8">
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500">Transfer proof</h3>
                  <p className="mt-1 text-xs text-zinc-500">Upload a clear screenshot or PDF of your payment.</p>

                  <div className="mt-5">
                    {file ? (
                      <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-zinc-50/90 p-4 sm:flex-row sm:items-center">
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15">
                            <FileCheck className="h-5 w-5 text-emerald-700" aria-hidden />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-zinc-900">{file.name}</p>
                            <p className="text-xs text-zinc-500">
                              {(file.size / 1024).toFixed(file.size < 10240 ? 1 : 0)} KB · attached
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="shrink-0 self-stretch sm:self-center"
                          onClick={() => {
                            setFile(null);
                            if (proofInputRef.current) proofInputRef.current.value = "";
                          }}
                        >
                          Replace
                        </Button>
                      </div>
                    ) : (
                      <label
                        htmlFor="enrollment-proof"
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const f = e.dataTransfer.files?.[0];
                          if (f) trySetProofFile(f);
                        }}
                        className={cn(
                          "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-5 py-10 text-center transition-colors sm:gap-4 sm:py-12",
                          "border-zinc-300 bg-gradient-to-b from-white to-zinc-50/90",
                          "hover:border-[#3954d0]/45 hover:from-zinc-50/50 hover:to-[#3954d0]/[0.04]",
                          "focus-within:border-[#3954d0]/55 focus-within:ring-2 focus-within:ring-[#3954d0]/20",
                        )}
                      >
                        <input
                          ref={proofInputRef}
                          id="enrollment-proof"
                          type="file"
                          accept="image/*,.pdf"
                          className="sr-only"
                          onChange={(e) => trySetProofFile(e.target.files?.[0] ?? null)}
                        />
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#3954d0]/12">
                          <Upload className="h-6 w-6 text-[#3954d0]" aria-hidden />
                        </div>
                        <div className="max-w-xs space-y-1">
                          <p className="text-sm font-medium text-zinc-900">
                            Drop a file here or <span className="text-[#3954d0]">browse</span>
                          </p>
                          <p className="text-xs leading-relaxed text-zinc-500">
                            PNG, JPG, or PDF · max 2 MB. Clear screenshots speed up verification.
                          </p>
                        </div>
                      </label>
                    )}
                  </div>
                </div>
              </div>
            </EnrollmentFormGroup>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>

        <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200/90 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
          <div className="grid w-full grid-cols-1 gap-3 px-4 py-3 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-4 lg:px-6 xl:gap-6 xl:px-8">
            <div className="flex min-w-0 items-center lg:justify-start">
              <Link
                to="/dashboard/available-courses"
                title="Back to available classes"
                aria-label="Back to available classes"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-200 text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900"
              >
                <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
              </Link>
            </div>
            <div className="flex min-w-0 justify-center lg:justify-end">
              <Button
                type="submit"
                form="enrollment-application-form"
                className="h-12 w-full max-w-[200px] rounded-xl text-[15px] font-semibold shadow-sm transition-opacity disabled:opacity-60 sm:max-w-[220px]"
                style={{ backgroundColor: "#3954d0" }}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" aria-hidden />
                    <span className="line-through decoration-white/50 decoration-2">Submit for review</span>
                    <span className="sr-only">Submitting request</span>
                  </>
                ) : (
                  "Submit for review"
                )}
              </Button>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default StudentEnrollmentApplicationPage;
