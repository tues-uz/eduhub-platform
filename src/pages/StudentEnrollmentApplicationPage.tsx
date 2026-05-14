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
import { Textarea } from "@/components/ui/textarea";
import { useAuthSession } from "@/features/auth/context";
import { eduhubCourses, eduhubUploadFile, eduhubEnrollmentApplications } from "@/api/eduhubClient";
import { isUuid } from "@/api/utils";
import { teacherCoursesStore } from "@/features/teacher/data/teacherCoursesStore";
import {
  enrollmentRecordToPdfData,
  type EnrollmentApplicationPdfData,
} from "@/features/enrollment/enrollmentApplicationPdf";
import type { EnrollmentInstallmentCount } from "@/api/eduhubTypes";
import { cn } from "@/lib/utils";

import {
  payNowForPlanMonths,
  tuitionThirds,
  type TuitionPlanMonths,
} from "@/features/enrollment/enrollmentTuitionThirds";

type MonthlyPlanMonthCount = TuitionPlanMonths;

const MONTH_PLAN_OPTIONS: { months: MonthlyPlanMonthCount; label: string }[] = [
  { months: 1, label: "1 month" },
  { months: 2, label: "2 months" },
  { months: 3, label: "3 months" },
];

const ENROLL_SUCCESS_SESSION_PREFIX = "eduhub_enrollment_success_pdf__";

function formatPrice(price: number | undefined, currency = "USD"): string {
  if (price == null || price <= 0) return "Free";
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(price);
}

/** One-line “due now” amount on each plan card (⅓, ⅔, or full of listed tuition). */
function planCardPriceSubtitle(
  total: number | undefined,
  planMonths: MonthlyPlanMonthCount,
  currency: string,
): string | null {
  if (total == null || total <= 0) return null;
  const now = payNowForPlanMonths(planMonths, total);
  if (now == null) return null;
  return formatPrice(now, currency);
}

function enrollSuccessSessionKey(courseId: string, emailNorm: string): string {
  return `${ENROLL_SUCCESS_SESSION_PREFIX}${encodeURIComponent(courseId)}__${emailNorm}`;
}

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

/** Transfer proof upload limit */
const PROOF_MAX_BYTES = 2 * 1024 * 1024;

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
  /** Total calendar months (1 = pay full tuition with this application). */
  const [monthlyPlanMonths, setMonthlyPlanMonths] = useState<MonthlyPlanMonthCount>(3);
  const [phoneSecondary, setPhoneSecondary] = useState("");

  const primaryPhone = useMemo(
    () => (user.phoneNumber ?? registrationPhoneForEmail(user.email)).trim(),
    [user.phoneNumber, user.email],
  );

  const readonlyProfileClass =
    "rounded-xl border-zinc-200 bg-zinc-50 text-zinc-900 cursor-not-allowed selection:bg-zinc-100 focus-visible:ring-0 focus-visible:ring-offset-0";

  const monthlyPaySummary = useMemo(() => {
    const total = coursePriceAmount;
    if (total == null || total <= 0) return { kind: "noPrice" as const };
    const thirds = tuitionThirds(total);
    if (!thirds) return { kind: "noPrice" as const };
    const plan = monthlyPlanMonths;
    const payNow = payNowForPlanMonths(plan, total);
    if (payNow == null) return { kind: "noPrice" as const };
    const remaining = total - payNow;
    const apiInstallmentCount: EnrollmentInstallmentCount | undefined =
      plan === 3 ? undefined : plan === 2 ? 1 : 2;
    return {
      kind: "ok" as const,
      total,
      thirds,
      planMonths: plan,
      payNow,
      remaining,
      apiInstallmentCount,
    };
  }, [coursePriceAmount, monthlyPlanMonths]);

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
    const emailNorm = user.email.trim().toLowerCase();
    eduhubEnrollmentApplications
      .getMyPending(courseId, emailNorm)
      .then((pending) => {
        if (pending.length > 0) {
          const app = pending[0];
          const pdfData: EnrollmentApplicationPdfData = {
            submittedAtIso: app.submittedAt,
            courseTitle: app.courseTitle ?? courseId,
            courseId: app.courseId,
            tuitionLabel: priceDisplay || "—",
            fullName: app.fullName,
            email: app.email,
            phone: app.phone,
            phoneSecondary: app.phoneSecondary,
            address: app.address,
            paymentDetailLines: [
              app.paymentPlan === "FULL"
                ? "Payment plan: Full payment"
                : `Payment plan: Down payment (${app.installmentCount ?? 2} instalments)`,
            ],
            proofFileName: "payment-proof",
            idFileName: "id-document",
          };
          navigate(
            `/dashboard/available-courses/enroll/${encodeURIComponent(courseId)}/success`,
            { replace: true, state: { pdfData } },
          );
        }
      })
      .catch(() => {
        // Ignore errors - user can still submit
      });
  }, [courseId, user.email, navigate, priceDisplay]);

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
    const hasPricedPlan = monthlyPaySummary.kind === "ok";
    const submitsDownPaymentPlan = hasPricedPlan && (monthlyPlanMonths === 1 || monthlyPlanMonths === 2);
    const downAmount = submitsDownPaymentPlan ? monthlyPaySummary.payNow : undefined;

    setSubmitting(true);

    try {
      // Upload files to R2
      toast.loading("Uploading files...", { id: "enrollment-upload" });
      const [proofResult, idResult] = await Promise.all([
        eduhubUploadFile(file, "enrollment-proofs"),
        eduhubUploadFile(idCardFile, "enrollment-ids"),
      ]);
      toast.dismiss("enrollment-upload");

      const paymentDetailLines: string[] = [];
      if (hasPricedPlan && monthlyPaySummary.kind === "ok") {
        const { total, thirds, payNow, remaining, planMonths } = monthlyPaySummary;
        const [a, b, c] = thirds;
        paymentDetailLines.push(
          `Tuition in 3 equal parts (whole amounts, sum to listed price): ${formatPrice(a, priceCurrency)} + ${formatPrice(b, priceCurrency)} + ${formatPrice(c, priceCurrency)} = ${formatPrice(total, priceCurrency)}`,
        );
        if (planMonths === 1) {
          paymentDetailLines.push(
            "Payment plan: 1 month — pay the first part (⅓ of tuition) with this application; two further instalments for the rest.",
          );
          paymentDetailLines.push(`Pay now: ${formatPrice(payNow, priceCurrency)} · Remaining: ${formatPrice(remaining, priceCurrency)} (2 instalments).`);
        } else if (planMonths === 2) {
          paymentDetailLines.push(
            "Payment plan: 2 months — pay the first two parts (⅔ of tuition) with this application; one further instalment for the final third.",
          );
          paymentDetailLines.push(`Pay now: ${formatPrice(payNow, priceCurrency)} · Remaining: ${formatPrice(remaining, priceCurrency)} (1 instalment).`);
        } else {
          paymentDetailLines.push(
            "Payment plan: 3 months — full tuition (all three parts) in one payment with this application.",
          );
          paymentDetailLines.push(`Amount: ${formatPrice(total, priceCurrency)}`);
        }
      } else {
        paymentDetailLines.push(
          "Payment plan: Tuition not split in this form — school will confirm schedule (listed price unavailable or free).",
        );
      }
      paymentDetailLines.push(`Tuition shown: ${priceDisplay || "—"}`);

      // Submit application to API
      await eduhubEnrollmentApplications.submit({
        courseId,
        fullName: user.name.trim(),
        email: user.email.trim(),
        phone: primaryPhone,
        phoneSecondary: phoneSecondary.trim() || undefined,
        address: address.trim(),
        paymentProofUrl: proofResult.url,
        idCardUrl: idResult.url,
        paymentPlan: submitsDownPaymentPlan ? "DOWN_PAYMENT" : "FULL",
        downPaymentAmount: downAmount,
        priceCurrency,
        installmentCount:
          submitsDownPaymentPlan && monthlyPaySummary.kind === "ok"
            ? monthlyPaySummary.apiInstallmentCount
            : undefined,
      });

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
      toast.error("Could not submit your application", {
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
                        <div className="pointer-events-auto mb-6 flex flex-col items-end gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
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
                          <div className="flex shrink-0 flex-col items-end gap-1.5">
                            <div className="flex w-fit items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-3.5 py-2 text-sm font-semibold tabular-nums text-white backdrop-blur-sm">
                              <DollarSign className="h-4 w-4 text-white/80" aria-hidden />
                              {loadingCourse && !priceDisplay ? "…" : priceDisplay || "—"}
                            </div>
                            {monthlyPaySummary.kind === "ok" ? (
                              <div className="rounded-full border border-white/20 bg-black/25 px-3 py-1.5 text-xs font-semibold tabular-nums text-white/95 backdrop-blur-sm">
                                Due now: {formatPrice(monthlyPaySummary.payNow, priceCurrency)}
                              </div>
                            ) : null}
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
              title="Tuition payments"
              description="Listed tuition is split into three equal whole parts (like a 3-month fee). 1 month = pay one part now; 2 months = pay two parts now; 3 months = pay all three (full tuition) in one transfer."
            >
              <fieldset className="min-w-0 border-0 p-0 shadow-none">
                <legend className="sr-only">Monthly payment</legend>
                <p className="text-xs text-zinc-500">
                  When a price is shown, each card shows how much to pay with this application. Your transfer proof should
                  match that &quot;due now&quot; amount.
                </p>
                <p className="mt-4 text-xs font-medium text-zinc-700">Pay over</p>
                <RadioGroup
                  value={String(monthlyPlanMonths)}
                  onValueChange={(v) => setMonthlyPlanMonths(Number(v) as MonthlyPlanMonthCount)}
                  className="mt-2 grid gap-2 sm:grid-cols-3"
                >
                  {MONTH_PLAN_OPTIONS.map(({ months, label }) => {
                    const priceLine = planCardPriceSubtitle(coursePriceAmount, months, priceCurrency);
                    return (
                    <label
                      key={months}
                      htmlFor={`pay-months-${months}`}
                      className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-200 bg-zinc-50/40 px-4 py-3 transition-colors hover:bg-zinc-50 has-[[data-state=checked]]:border-[#3954d0]/40 has-[[data-state=checked]]:bg-[#3954d0]/[0.06]"
                    >
                      <RadioGroupItem value={String(months)} id={`pay-months-${months}`} className="mt-0.5 shrink-0" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-zinc-900">{label}</span>
                        <span className="mt-0.5 block text-[11px] font-medium text-zinc-500">Due now</span>
                        <span
                          className={cn(
                            "mt-0.5 block text-xs font-semibold tabular-nums tracking-tight",
                            priceLine ? "text-[#3954d0]" : "font-medium text-zinc-400",
                          )}
                        >
                          {priceLine ?? (loadingCourse ? "Loading…" : "Price not listed")}
                        </span>
                      </span>
                    </label>
                    );
                  })}
                </RadioGroup>
                <p className="mt-3 text-[11px] leading-relaxed text-zinc-500">
                  {monthlyPlanMonths === 1
                    ? "1 month: pay the first third of listed tuition now; the school schedules two further instalments for the other two thirds."
                    : monthlyPlanMonths === 2
                      ? "2 months: pay two thirds of listed tuition now; one further instalment covers the last third."
                      : "3 months: pay the full listed tuition in one transfer (all three parts together)."}
                </p>
                <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-800">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-600">Schedule</p>
                  {monthlyPaySummary.kind === "noPrice" ? (
                    <p className="text-zinc-600">
                      No listed class price here (or the class is free). The school will confirm how much to pay and when.
                      You can still submit your application and proof of any transfer they asked you to make.
                    </p>
                  ) : (
                    <ul className="space-y-2 text-zinc-800">
                      <li className="flex flex-wrap justify-between gap-x-4 gap-y-0.5">
                        <span className="text-zinc-500">Total tuition</span>
                        <span className="font-semibold tabular-nums text-zinc-900">
                          {formatPrice(monthlyPaySummary.total, priceCurrency)}
                        </span>
                      </li>
                      <li className="border-t border-zinc-200/90 pt-2 text-zinc-700">
                        <span className="text-zinc-500">Three equal parts</span>
                        <span className="mx-1.5 text-zinc-300">·</span>
                        <span className="font-medium tabular-nums text-zinc-900">
                          {(() => {
                            const [x, y, z] = monthlyPaySummary.thirds;
                            return `${formatPrice(x, priceCurrency)} + ${formatPrice(y, priceCurrency)} + ${formatPrice(z, priceCurrency)}`;
                          })()}
                        </span>
                        <span className="mt-1 block text-xs font-normal text-zinc-500">
                          Each part is one third of the total (rounded to whole currency so the three still add up exactly).
                        </span>
                      </li>
                      <li className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 border-t border-zinc-200/90 pt-2">
                        <span className="text-zinc-500">Due with this application</span>
                        <span className="font-semibold tabular-nums text-zinc-900">
                          {formatPrice(monthlyPaySummary.payNow, priceCurrency)}
                        </span>
                      </li>
                      {monthlyPaySummary.remaining > 0 ? (
                        <li className="flex flex-wrap justify-between gap-x-4 gap-y-0.5">
                          <span className="text-zinc-500">Remaining after this transfer</span>
                          <span className="font-semibold tabular-nums text-zinc-900">
                            {formatPrice(monthlyPaySummary.remaining, priceCurrency)}
                            <span className="ml-1.5 text-xs font-normal text-zinc-500">
                              (
                              {monthlyPaySummary.apiInstallmentCount === 2 ? "2 instalments" : "1 instalment"}
                              )
                            </span>
                          </span>
                        </li>
                      ) : (
                        <li className="border-t border-zinc-200/90 pt-2 text-xs text-zinc-600">
                          No remaining tuition on this plan — full amount is paid with this application.
                        </li>
                      )}
                    </ul>
                  )}
                </div>
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
            <div className="flex min-w-0 flex-col items-center justify-center gap-2 sm:flex-row sm:items-center sm:justify-center sm:gap-4 lg:justify-end">
              <div className="min-w-0 max-w-full text-center sm:max-w-[min(100%,14rem)] sm:text-right">
                <p className="truncate text-sm font-semibold text-zinc-900">
                  {MONTH_PLAN_OPTIONS.find((o) => o.months === monthlyPlanMonths)?.label ?? "Plan"}
                </p>
                <p className="mt-1 text-base font-bold tabular-nums tracking-tight text-[#3954d0]">
                  {monthlyPaySummary.kind === "ok"
                    ? formatPrice(monthlyPaySummary.payNow, priceCurrency)
                    : loadingCourse
                      ? "…"
                      : "—"}
                </p>
              </div>
              <Button
                type="submit"
                form="enrollment-application-form"
                className="h-12 w-full max-w-[200px] shrink-0 rounded-xl text-[15px] font-semibold shadow-sm transition-opacity disabled:opacity-60 sm:max-w-[220px]"
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
