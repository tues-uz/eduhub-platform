import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Banknotes,
  BookOpen,
  CreditCard,
  DollarSign,
  FileCheck,
  IdCard,
  Loader2,
  MoreVertical,
  Upload,
  User,
  type LucideIcon,
} from "@/lib/icons";
import { toast } from "sonner";
import {
  isTeacherClassFull,
  TEACHER_CLASS_MAX_STUDENTS,
} from "@/features/courses/teacherClassCapacity";
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
import {
  eduhubAuth,
  eduhubCourses,
  eduhubSchedule,
  eduhubUploadFile,
  eduhubEnrollmentApplications,
  getAccessToken,
} from "@/api/eduhubClient";
import type { CourseResponse, GeneralReferralCodeResponse, ScheduleProposalResponse, UserResponse } from "@/api/eduhubTypes";
import { isUuid } from "@/api/utils";
import { computeDiscountedPrice } from "@/features/admin/utils/adminCourseCatalog";
import {
  loadGeneralReferralCodes,
  matchGeneralReferralCode,
  matchGeneralTrialCode,
} from "@/features/admin/data/generalReferralCodesStore";
import { findActiveSpecialTuitionGrant, SPECIAL_TUITION_GRANTS_CHANGED_EVENT } from "@/features/admin/data/specialTuitionGrantsStore";
import {
  buildEnrollmentScheduleSessionSummaries,
  enrollmentRecordToPdfData,
  type EnrollmentApplicationPdfData,
} from "@/features/enrollment/enrollmentApplicationPdf";
import type {
  EnrollmentInstallmentCount,
  EnrollmentPaymentMethod,
  EnrollmentPaymentPlan,
} from "@/api/eduhubTypes";
import {
  enrollmentRequiresVerificationUploads,
  formatPaymentMethodLabel,
} from "@/features/enrollment/enrollmentDocumentConfig";
import { EnrollmentBankTransferPanel } from "@/features/enrollment/EnrollmentBankTransferPanel";
import { cn } from "@/lib/utils";
import {
  buildScheduleMonthTabs,
  orderSessionSlotsChronologically,
  resolveEnrollmentSessionTimingStatus,
  resolvePreviewSessionSlots,
  scheduleMonthRemainingSessionCounts,
  scheduleTabToPaymentMonths,
} from "@/features/courses/classSchedulePreview";
import { SessionTimingChip } from "@/features/courses/SessionTimingChip";
import { useScheduleAttendanceState } from "@/features/courses/useScheduleAttendanceState";
import type { SessionSlotLike } from "@/features/courses/classSchedulePreview";
import type { TuitionPlanMonths } from "@/features/enrollment/enrollmentTuitionThirds";
import {
  EnrollmentMonthlyPaymentSelector,
  useEnrollmentMonthlyPaySummary,
  type MonthlyPlanMonthCount,
} from "@/features/enrollment/EnrollmentMonthlyPaymentSelector";
import {
  resolveJoinFromMeeting,
  tuitionForJoinFromMeeting,
} from "@/features/enrollment/enrollmentSessionTuition";

const ENROLL_SUCCESS_SESSION_PREFIX = "eduhub_enrollment_success_pdf__";

function formatPrice(price: number | undefined, currency = "USD"): string {
  if (price == null || price <= 0) return "Free";
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(price);
}

function enrollSuccessSessionKey(courseId: string, emailNorm: string): string {
  return `${ENROLL_SUCCESS_SESSION_PREFIX}${encodeURIComponent(courseId)}__${emailNorm}`;
}

function monthlyPaymentPlanLabel(selectedCount: number, scheduleMonthCount: number): string {
  if (scheduleMonthCount > 0 && selectedCount >= scheduleMonthCount) {
    return scheduleMonthCount === 1 ? "Full tuition" : `Full tuition (${scheduleMonthCount} months)`;
  }
  if (selectedCount === 2) return "2 months";
  if (selectedCount === 1) return "1 month";
  return "Monthly payment";
}

function EnrollmentFormGroup({
  step,
  title,
  description,
  icon: Icon,
  children,
}: {
  step: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-sm">
      <div className="border-b border-zinc-800 bg-zinc-900 p-4">
        <div className="flex items-start gap-3">
          {Icon ? (
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/10"
              aria-hidden
            >
              <Icon className="h-5 w-5 text-white" />
            </div>
          ) : null}
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/70">{step}</p>
            <h2 className="mt-1 text-base font-semibold tracking-tight text-white">{title}</h2>
            {description ? (
              <p className="mt-1 text-xs leading-relaxed text-white/65">{description}</p>
            ) : null}
          </div>
        </div>
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

const StudentEnrollmentApplicationPage = () => {
  const { courseId: rawCourseId } = useParams<{ courseId: string }>();
  const courseId = rawCourseId ? decodeURIComponent(rawCourseId) : undefined;
  const { user } = useAuthSession();

  const [courseTitle, setCourseTitle] = useState<string | undefined>(undefined);
  const [priceDisplay, setPriceDisplay] = useState<string>("");
  const [priceCurrency, setPriceCurrency] = useState("USD");
  const [coursePriceAmount, setCoursePriceAmount] = useState<number | undefined>(undefined);
  const [loadingCourse, setLoadingCourse] = useState(false);
  const [apiCourse, setApiCourse] = useState<CourseResponse | null>(null);
  const [scheduleProposal, setScheduleProposal] = useState<ScheduleProposalResponse | null>(null);
  const [courseThumbnailUrl, setCourseThumbnailUrl] = useState<string | undefined>(undefined);
  const [paymentMethod, setPaymentMethod] = useState<EnrollmentPaymentMethod>("BANK_TRANSFER");
  const [grantsTick, setGrantsTick] = useState(0);
  const [selectedPaymentMonths, setSelectedPaymentMonths] = useState<Set<MonthlyPlanMonthCount>>(
    () => new Set([1]),
  );
  const [viewingScheduleMonth, setViewingScheduleMonth] = useState<TuitionPlanMonths>(1);
  const [apiUser, setApiUser] = useState<UserResponse | null>(null);
  const [phoneSecondary, setPhoneSecondary] = useState("");
  const [phoneSecondaryTouched, setPhoneSecondaryTouched] = useState(false);
  const [referralCodeInput, setReferralCodeInput] = useState("");
  const [trialCodeInput, setTrialCodeInput] = useState("");

  useEffect(() => {
    if (!getAccessToken()) return;
    eduhubAuth
      .me()
      .then(setApiUser)
      .catch(() => {
        // Leave prefill fields blank if profile fetch fails; user can type manually.
      });
  }, []);

  const [generalCodes, setGeneralCodes] = useState<GeneralReferralCodeResponse | null>(null);
  useEffect(() => {
    let mounted = true;
    loadGeneralReferralCodes().then((codes) => {
      if (mounted) setGeneralCodes(codes);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (phoneSecondaryTouched) return;
    const parentPhone = apiUser?.parentPhoneNumber?.trim();
    if (parentPhone) setPhoneSecondary(parentPhone);
  }, [apiUser, phoneSecondaryTouched]);

  useEffect(() => {
    const refresh = () => setGrantsTick((n) => n + 1);
    const onStorage = (event: StorageEvent) => {
      if (event.key === "eduhub_special_tuition_grants") refresh();
    };
    window.addEventListener(SPECIAL_TUITION_GRANTS_CHANGED_EVENT, refresh);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(SPECIAL_TUITION_GRANTS_CHANGED_EVENT, refresh);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const specialTuitionGrant = useMemo(() => {
    void grantsTick;
    if (!courseId) return null;
    return findActiveSpecialTuitionGrant(user.email, courseId);
  }, [courseId, user.email, grantsTick]);

  const requiresVerificationUploads =
    !specialTuitionGrant && enrollmentRequiresVerificationUploads(paymentMethod);

  const primaryPhone = useMemo(
    () => (user.phoneNumber ?? apiUser?.phoneNumber ?? "").trim(),
    [user.phoneNumber, apiUser],
  );

  const readonlyProfileClass =
    "rounded-xl border-zinc-200 bg-zinc-50 text-zinc-900 cursor-not-allowed selection:bg-zinc-100 focus-visible:ring-0 focus-visible:ring-offset-0";

  const isApiCourse = Boolean(courseId && isUuid(courseId));

  const sessionSlotsPreview = useMemo((): SessionSlotLike[] => {
    if (!courseId) return [];
    return orderSessionSlotsChronologically(
      resolvePreviewSessionSlots(courseId, apiCourse, scheduleProposal, isApiCourse, null),
    );
  }, [courseId, apiCourse, scheduleProposal, isApiCourse]);

  const scheduleAttendance = useScheduleAttendanceState(courseId);

  const sessionJoin = useMemo(() => {
    const n = sessionSlotsPreview.length;
    if (n < 1) return { joinFromMeeting: 1, allSessionsFinished: false };
    const { heldSlotKeys, activeSlotKeys } = scheduleAttendance;
    const timings = sessionSlotsPreview.map((slot) =>
      resolveEnrollmentSessionTimingStatus(slot, heldSlotKeys, activeSlotKeys),
    );
    return resolveJoinFromMeeting(n, timings);
  }, [sessionSlotsPreview, scheduleAttendance]);

  const courseReferralMeta = useMemo(() => {
    if (apiCourse?.pricing) {
      const pricing = apiCourse.pricing;
      return {
        code: pricing.referralCode?.trim() ?? "",
        discountPercent: pricing.discountPercent ?? 0,
        listedAmount: pricing.amount,
      };
    }
    return null;
  }, [apiCourse]);

  const appliedReferralDiscountPercent = useMemo(() => {
    const entered = referralCodeInput.trim();
    if (!entered) return 0;
    if (
      courseReferralMeta?.code &&
      entered.toLowerCase() === courseReferralMeta.code.toLowerCase() &&
      courseReferralMeta.discountPercent > 0
    ) {
      return courseReferralMeta.discountPercent;
    }
    const general = matchGeneralReferralCode(entered, generalCodes);
    if (general && general.discountPercent > 0) return general.discountPercent;
    return 0;
  }, [referralCodeInput, courseReferralMeta, generalCodes]);

  const referralDiscountApplied = appliedReferralDiscountPercent > 0;

  const courseTrialMeta = useMemo(() => {
    if (apiCourse?.pricing?.trialCode?.trim()) return apiCourse.pricing.trialCode.trim();
    return "";
  }, [apiCourse]);

  const trialCodeApplied = useMemo(() => {
    const entered = trialCodeInput.trim();
    if (!entered) return false;
    if (courseTrialMeta && entered.toLowerCase() === courseTrialMeta.toLowerCase()) return true;
    return matchGeneralTrialCode(entered, generalCodes);
  }, [trialCodeInput, courseTrialMeta, generalCodes]);

  const listedTuitionBase = useMemo(() => {
    if (courseReferralMeta?.listedAmount != null && courseReferralMeta.listedAmount > 0) {
      return courseReferralMeta.listedAmount;
    }
    return coursePriceAmount;
  }, [courseReferralMeta, coursePriceAmount]);

  const effectiveListedTuition = useMemo(() => {
    if (specialTuitionGrant) return 0;
    const base = listedTuitionBase;
    if (base == null || base <= 0) return base;
    if (appliedReferralDiscountPercent > 0) {
      return computeDiscountedPrice(base, appliedReferralDiscountPercent);
    }
    return base;
  }, [listedTuitionBase, appliedReferralDiscountPercent, specialTuitionGrant]);

  const sessionTuitionQuote = useMemo(() => {
    const listed = effectiveListedTuition;
    const n = sessionSlotsPreview.length;
    if (listed == null || listed <= 0 || n < 1) return null;
    return tuitionForJoinFromMeeting(listed, n, sessionJoin.joinFromMeeting);
  }, [effectiveListedTuition, sessionSlotsPreview.length, sessionJoin.joinFromMeeting]);

  /** Tuition base for this enrollment: prorated when schedule exists, else full listed price. */
  const tuitionDueTotal = specialTuitionGrant
    ? 0
    : sessionTuitionQuote?.amountDue ?? coursePriceAmount;

  useEffect(() => {
    const join = sessionTuitionQuote?.joinFromMeeting;
    if (!join || join < 1 || sessionSlotsPreview.length === 0 || sessionJoin.allSessionsFinished) return;
    const tabs = buildScheduleMonthTabs(sessionSlotsPreview);
    let seen = 0;
    for (const tab of tabs) {
      seen += tab.slots.length;
      if (join <= seen) {
        const month = scheduleTabToPaymentMonths(tab.value);
        setViewingScheduleMonth(month);
        setSelectedPaymentMonths(new Set([month]));
        break;
      }
    }
  }, [courseId, sessionSlotsPreview, sessionTuitionQuote?.joinFromMeeting, sessionJoin.allSessionsFinished]);

  // Per-month tuition weights counting only remaining (non-finished) sessions, so a month
  // with already-held meetings is charged for its remaining classes only — matching the
  // session-level proration already applied in `tuitionDueTotal`.
  const scheduleMonthCounts = useMemo(
    () =>
      scheduleMonthRemainingSessionCounts(
        sessionSlotsPreview,
        scheduleAttendance.heldSlotKeys,
        scheduleAttendance.activeSlotKeys,
      ),
    [sessionSlotsPreview, scheduleAttendance],
  );

  const scheduleMonthTabs = useMemo(
    () => buildScheduleMonthTabs(sessionSlotsPreview),
    [sessionSlotsPreview],
  );

  const scheduleMonthCount = scheduleMonthTabs.length;

  useEffect(() => {
    if (scheduleMonthTabs.length === 0) return;
    const validMonths = new Set(
      scheduleMonthTabs.map((tab) => scheduleTabToPaymentMonths(tab.value)),
    );
    setSelectedPaymentMonths((prev) => {
      const next = new Set([...prev].filter((m) => validMonths.has(m)));
      if (next.size === 0) {
        next.add(scheduleTabToPaymentMonths(scheduleMonthTabs[0]!.value));
      }
      if (next.size === prev.size && [...next].every((m) => prev.has(m))) return prev;
      return next;
    });
    setViewingScheduleMonth((prev) => (validMonths.has(prev) ? prev : scheduleTabToPaymentMonths(scheduleMonthTabs[0]!.value)));
  }, [scheduleMonthTabs]);

  const monthlyPaySummary = useEnrollmentMonthlyPaySummary(
    tuitionDueTotal,
    selectedPaymentMonths,
    scheduleMonthCounts,
    scheduleMonthCount,
  );

  const monthlyPaymentFields = useMemo(():
    | {
        paymentPlan: EnrollmentPaymentPlan;
        installmentCount?: EnrollmentInstallmentCount;
        payNow: number | null;
        selectedCount: number;
        scheduleMonthCount: number;
      }
    | null => {
    if (monthlyPaySummary.kind === "emptySelection") return null;
    if (monthlyPaySummary.kind === "noPrice") {
      return {
        paymentPlan: "FULL",
        installmentCount: undefined,
        payNow: null,
        selectedCount: 0,
        scheduleMonthCount,
      };
    }
    const activeCount = monthlyPaySummary.scheduleMonthCount;
    if (activeCount > 0 && monthlyPaySummary.selectedCount >= activeCount) {
      return {
        paymentPlan: "FULL",
        installmentCount: undefined,
        payNow: monthlyPaySummary.payNow,
        selectedCount: monthlyPaySummary.selectedCount,
        scheduleMonthCount: activeCount,
      };
    }
    return {
      paymentPlan: "DOWN_PAYMENT",
      installmentCount: monthlyPaySummary.apiInstallmentCount,
      payNow: monthlyPaySummary.payNow,
      selectedCount: monthlyPaySummary.selectedCount,
      scheduleMonthCount: activeCount,
    };
  }, [monthlyPaySummary, scheduleMonthCount]);

  const transferDueSummary = useMemo(() => {
    if (!monthlyPaymentFields) {
      return { label: "Monthly payment", amount: null as number | null };
    }
    const label = monthlyPaymentPlanLabel(
      monthlyPaymentFields.selectedCount,
      monthlyPaymentFields.scheduleMonthCount,
    );
    return { label, amount: monthlyPaymentFields.payNow };
  }, [monthlyPaymentFields]);

  const [address, setAddress] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const proofInputRef = useRef<HTMLInputElement>(null);
  const [idCardFile, setIdCardFile] = useState<File | null>(null);
  const idCardInputRef = useRef<HTMLInputElement>(null);
  const [cashPaymentProofUrl, setCashPaymentProofUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const isClassFull = isTeacherClassFull(apiCourse?.enrollmentCount);

  useEffect(() => {
    if (!courseId || !isUuid(courseId)) {
      setCourseTitle(undefined);
      setPriceDisplay("");
      setPriceCurrency("USD");
      setCoursePriceAmount(undefined);
      setCourseThumbnailUrl(undefined);
      setApiCourse(null);
      setScheduleProposal(null);
      return;
    }
    setPriceDisplay("");
    setCourseThumbnailUrl(undefined);
    setLoadingCourse(true);
    Promise.all([
      eduhubCourses.getById(courseId),
      eduhubSchedule.getProposal(courseId).catch(() => null),
    ])
      .then(([c, proposal]) => {
        setApiCourse(c);
        setScheduleProposal(proposal);
        setCourseTitle(c.title);
        const listed = c.pricing?.amount;
        const cur = c.pricing?.currency ?? "USD";
        setPriceCurrency(cur);
        setPriceDisplay(formatPrice(listed, cur));
        setCoursePriceAmount(listed != null && listed > 0 ? listed : undefined);
        setCourseThumbnailUrl(c.thumbnailUrl?.trim() || undefined);
      })
      .catch(() => {
        setCourseTitle(undefined);
        setPriceDisplay("");
        setPriceCurrency("USD");
        setCoursePriceAmount(undefined);
        setCourseThumbnailUrl(undefined);
        setApiCourse(null);
        setScheduleProposal(null);
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
                ? "Payment plan: Full tuition (3 months)"
                : `Payment plan: Monthly (${app.installmentCount === 1 ? "2 months remaining" : "1 month remaining"})`,
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

  useEffect(() => {
    if (!requiresVerificationUploads) {
      setFile(null);
      setIdCardFile(null);
      if (proofInputRef.current) proofInputRef.current.value = "";
      if (idCardInputRef.current) idCardInputRef.current.value = "";
    }
  }, [requiresVerificationUploads]);

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
    if (isTeacherClassFull(apiCourse?.enrollmentCount)) {
      toast.error(`This class is full (${TEACHER_CLASS_MAX_STUDENTS} students). New enrollments are closed.`);
      return;
    }
    const emailNorm = user.email.trim().toLowerCase();
    if (!user.name.trim() || !user.email.trim() || !primaryPhone || !address.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (requiresVerificationUploads) {
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
    } else if (!specialTuitionGrant && paymentMethod === "CASH") {
      const url = cashPaymentProofUrl.trim();
      if (!url) {
        toast.error("Paste a payment proof URL for cash payment.");
        return;
      }
      if (!/^https?:\/\//i.test(url)) {
        toast.error("Payment proof URL must start with http:// or https://");
        return;
      }
    }
    if (!monthlyPaymentFields) {
      toast.error("Select at least one month to pay for.");
      return;
    }
    const { paymentPlan, installmentCount, payNow } = monthlyPaymentFields;
    let downAmount: number | undefined;
    if (tuitionDueTotal != null && tuitionDueTotal <= 0) {
      downAmount = 0;
    } else if (payNow != null && payNow > 0) {
      downAmount = payNow;
    } else if (monthlyPaySummary.kind === "noPrice") {
      downAmount = undefined;
    } else {
      toast.error("Select at least one month to pay for.");
      return;
    }

    setSubmitting(true);

    try {
      let proofUrl: string | undefined;
      let idUrl: string | undefined;
      if (requiresVerificationUploads && file && idCardFile) {
        toast.loading("Uploading files...", { id: "enrollment-upload" });
        const [proofResult, idResult] = await Promise.all([
          eduhubUploadFile(file, "enrollment-proofs"),
          eduhubUploadFile(idCardFile, "enrollment-ids"),
        ]);
        toast.dismiss("enrollment-upload");
        proofUrl = proofResult.url;
        idUrl = idResult.url;
      } else if (!specialTuitionGrant && paymentMethod === "CASH") {
        proofUrl = cashPaymentProofUrl.trim();
      }

      const paymentDetailLines: string[] = [];
      paymentDetailLines.push(`Payment method: ${formatPaymentMethodLabel(paymentMethod)}`);
      if (paymentMethod === "CASH" && proofUrl) {
        paymentDetailLines.push(`Cash payment proof URL: ${proofUrl}`);
      }
      paymentDetailLines.push(
        paymentPlan === "FULL"
          ? `Payment plan: ${monthlyPaymentPlanLabel(monthlyPaymentFields.selectedCount, monthlyPaymentFields.scheduleMonthCount)}`
          : `Payment plan: ${monthlyPaymentPlanLabel(monthlyPaymentFields.selectedCount, monthlyPaymentFields.scheduleMonthCount)} (remaining balance in instalments)`,
      );
      if (monthlyPaySummary.kind === "ok") {
        paymentDetailLines.push(
          `Months paying now: ${[...monthlyPaySummary.selectedMonths].sort((a, b) => a - b).join(", ")}`,
        );
        paymentDetailLines.push(
          `Due with this application: ${formatPrice(monthlyPaySummary.payNow, priceCurrency)}`,
        );
        if (monthlyPaySummary.remaining > 0) {
          paymentDetailLines.push(
            `Remaining tuition after this transfer: ${formatPrice(monthlyPaySummary.remaining, priceCurrency)}`,
          );
          paymentDetailLines.push(
            `Instalments for remaining balance: ${monthlyPaySummary.apiInstallmentCount}`,
          );
        }
      }
      paymentDetailLines.push(`Listed class price: ${priceDisplay || "—"}`);
      const referralEntered = referralCodeInput.trim();
      if (referralEntered) {
        paymentDetailLines.push(`Referral code entered: ${referralEntered}`);
      }
      if (referralDiscountApplied && appliedReferralDiscountPercent > 0) {
        paymentDetailLines.push(
          `Referral discount applied: ${appliedReferralDiscountPercent}% off listed tuition`,
        );
      }
      const trialEntered = trialCodeInput.trim();
      if (trialEntered) {
        paymentDetailLines.push(`Trial class code entered: ${trialEntered}`);
      }
      if (trialCodeApplied) {
        paymentDetailLines.push("Trial class code recognized for this application.");
      }
      if (specialTuitionGrant) {
        paymentDetailLines.push("Special tuition grant: free enrollment for this account.");
        if (specialTuitionGrant.note.trim()) {
          paymentDetailLines.push(`Grant note: ${specialTuitionGrant.note.trim()}`);
        }
      }
      if (sessionTuitionQuote) {
        paymentDetailLines.push(
          `Schedule: ${sessionTuitionQuote.totalSessions} meetings · tuition from meeting ${sessionTuitionQuote.joinFromMeeting} (next upcoming on schedule)`,
        );
        paymentDetailLines.push(
          `Your tuition (${sessionTuitionQuote.sessionsIncluded} meetings): ${formatPrice(sessionTuitionQuote.amountDue, priceCurrency)}`,
        );
      }

      await eduhubEnrollmentApplications.submit({
        courseId,
        fullName: user.name.trim(),
        email: user.email.trim(),
        phone: primaryPhone,
        phoneSecondary: phoneSecondary.trim() || undefined,
        address: address.trim(),
        paymentMethod,
        paymentProofUrl: proofUrl,
        idCardUrl: idUrl,
        paymentPlan,
        downPaymentAmount: downAmount,
        priceCurrency,
        installmentCount: paymentPlan === "DOWN_PAYMENT" ? installmentCount : undefined,
        joinFromSessionNumber: sessionTuitionQuote?.joinFromMeeting ?? 1,
        scheduleSessionCount:
          sessionTuitionQuote?.totalSessions ??
          (sessionSlotsPreview.length > 0 ? sessionSlotsPreview.length : undefined),
        referralCode: referralCodeInput.trim() || undefined,
        trialCode: trialCodeInput.trim() || undefined,
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
        proofFileName:
          requiresVerificationUploads && file
            ? file.name
            : paymentMethod === "CASH" && cashPaymentProofUrl.trim()
              ? cashPaymentProofUrl.trim()
              : "Not required (cash)",
        idFileName: requiresVerificationUploads && idCardFile ? idCardFile.name : "Not required (cash)",
        amount: downAmount,
        currency: priceCurrency,
        paymentMethod,
        teacherName: apiCourse?.lecturer?.fullName?.trim() || undefined,
        scheduleSessions: buildEnrollmentScheduleSessionSummaries(sessionSlotsPreview),
        paymentPlan,
        joinFromSessionNumber: sessionTuitionQuote?.joinFromMeeting ?? 1,
        scheduleSessionCount:
          sessionTuitionQuote?.totalSessions ??
          (sessionSlotsPreview.length > 0 ? sessionSlotsPreview.length : undefined),
      };

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
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex min-h-[38%] flex-col justify-end bg-gradient-to-t from-black/80 via-black/40 via-45% to-transparent px-4 pb-6 pt-16 sm:px-5 sm:pb-6 sm:pt-24 lg:pt-32">
                        <div className="pointer-events-auto flex flex-col items-end gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
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
                              {loadingCourse && !priceDisplay && !specialTuitionGrant
                                ? "…"
                                : specialTuitionGrant
                                  ? "Free"
                                  : priceDisplay || "—"}
                            </div>
                            {transferDueSummary.amount != null ? (
                              <div className="rounded-full border border-white/20 bg-black/25 px-3 py-1.5 text-xs font-semibold tabular-nums text-white/95 backdrop-blur-sm">
                                Due now: {formatPrice(transferDueSummary.amount, priceCurrency)}
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
                      Fill out each section below
                      {requiresVerificationUploads
                        ? " and upload the requested documents"
                        : ""}
                      . We will review everything before you can join the class.
                    </p>
                    {specialTuitionGrant ? (
                      <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-900">
                        <p className="font-medium">Special tuition grant applied</p>
                        <p className="mt-1 text-emerald-800/90">
                          This class is free for your account
                          {specialTuitionGrant.note.trim() ? ` (${specialTuitionGrant.note.trim()})` : ""}. No payment
                          proof is required.
                        </p>
                      </div>
                    ) : null}
                    {isClassFull ? (
                      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
                        <p className="font-medium">Class full</p>
                        <p className="mt-1 text-amber-900/90">
                          This class has reached the maximum of {TEACHER_CLASS_MAX_STUDENTS} students. New enrollment
                          applications are not accepted until a spot opens.
                        </p>
                      </div>
                    ) : null}
                  </div>
                  <form
                    id="enrollment-application-form"
                    onSubmit={handleSubmit}
                    className="flex flex-col gap-4 pb-6"
                  >
            <EnrollmentFormGroup
              step="Step 1"
              title="Contact"
              icon={User}
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
                        Parent / additional phone{" "}
                        <span className="font-normal text-zinc-500">(optional)</span>
                      </Label>
                      <Input
                        id="phone2"
                        type="tel"
                        className={inputEditClass}
                        value={phoneSecondary}
                        onChange={(e) => {
                          setPhoneSecondaryTouched(true);
                          setPhoneSecondary(e.target.value);
                        }}
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
              icon={CreditCard}
              description={
                requiresVerificationUploads
                  ? "Choose how you pay and your plan. Review the schedule below before you transfer."
                  : "Choose cash payment and your plan. Paste a proof URL after you pay at the school office."
              }
            >
              <fieldset className="min-w-0 border-0 p-0 shadow-none">
                <legend className="sr-only">Payment method</legend>
                <p className="text-xs text-zinc-500">How are you paying?</p>
                <RadioGroup
                  value={paymentMethod}
                  onValueChange={(v) => setPaymentMethod(v as EnrollmentPaymentMethod)}
                  className="mt-3 grid gap-2 sm:grid-cols-2"
                >
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50/40 px-4 py-3 transition-colors hover:bg-zinc-50 has-[[data-state=checked]]:border-[#3954d0]/40 has-[[data-state=checked]]:bg-[#3954d0]/[0.06]">
                    <RadioGroupItem value="BANK_TRANSFER" id="pay-method-transfer" />
                    <span className="text-sm font-medium text-zinc-900">Transfer</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50/40 px-4 py-3 transition-colors hover:bg-zinc-50 has-[[data-state=checked]]:border-[#3954d0]/40 has-[[data-state=checked]]:bg-[#3954d0]/[0.06]">
                    <RadioGroupItem value="CASH" id="pay-method-cash" />
                    <span className="text-sm font-medium text-zinc-900">Cash</span>
                  </label>
                </RadioGroup>
                {paymentMethod === "CASH" && !specialTuitionGrant ? (
                  <div className="mt-4">
                    <Label htmlFor="enrollment-cash-proof-url" className="text-zinc-700">
                      Payment proof URL
                    </Label>
                    <Input
                      id="enrollment-cash-proof-url"
                      type="url"
                      inputMode="url"
                      value={cashPaymentProofUrl}
                      onChange={(e) => setCashPaymentProofUrl(e.target.value)}
                      placeholder="https://…"
                      autoComplete="off"
                      required
                      className="mt-1.5 h-11 rounded-xl border-zinc-200"
                    />
                    <p className="mt-1.5 text-xs text-zinc-500">
                      Paste a link to your cash payment receipt or confirmation (http:// or https://).
                    </p>
                  </div>
                ) : null}
              </fieldset>
              <fieldset className="mt-6 min-w-0 border-0 border-t border-zinc-100 p-0 pt-6 shadow-none">
                <legend className="sr-only">Payment plan</legend>
                <p className="text-xs text-zinc-500">Payment plan for this class.</p>
                {sessionTuitionQuote ? (
                  <div className="mt-4 rounded-xl border border-[#3954d0]/20 bg-[#3954d0]/[0.04] px-4 py-3 text-sm text-zinc-800">
                    <p className="font-medium text-zinc-900">Tuition for your schedule</p>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-600">
                      Listed price {formatPrice(sessionTuitionQuote.listedTotal, priceCurrency)} for{" "}
                      {sessionTuitionQuote.totalSessions} meetings. See the schedule below —{" "}
                      <SessionTimingChip status="finished" /> means already held (date passed or instructor took
                      attendance); tuition starts at the first <SessionTimingChip status="upcoming" /> or{" "}
                      <SessionTimingChip status="ongoing" /> meeting.
                    </p>
                    {sessionJoin.allSessionsFinished ? (
                      <p className="mt-2 text-xs leading-relaxed text-amber-800">
                        All meetings on this schedule have already finished. Contact the school if you still need to
                        enroll.
                      </p>
                    ) : null}
                    <div className="mt-3">
                      <p className="text-xs text-zinc-500">Your tuition</p>
                      <p className="text-lg font-semibold tabular-nums text-zinc-900">
                        {formatPrice(sessionTuitionQuote.amountDue, priceCurrency)}
                      </p>
                      {!sessionJoin.allSessionsFinished ? (
                        <p className="text-[11px] text-zinc-500">
                          {sessionTuitionQuote.sessionsIncluded} meetings
                          {sessionTuitionQuote.joinFromMeeting > 1
                            ? ` · from meeting ${sessionTuitionQuote.joinFromMeeting} (earlier meetings already held)`
                            : " · full schedule"}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ) : null}
                <EnrollmentMonthlyPaymentSelector
                  courseId={courseId}
                  apiCourse={apiCourse}
                  scheduleProposal={scheduleProposal}
                  coursePriceAmount={tuitionDueTotal}
                  priceCurrency={priceCurrency}
                  loadingCourse={loadingCourse}
                  selectedPaymentMonths={selectedPaymentMonths}
                  onSelectedPaymentMonthsChange={setSelectedPaymentMonths}
                  viewingScheduleMonth={viewingScheduleMonth}
                  onViewingScheduleMonthChange={setViewingScheduleMonth}
                  monthlyPaySummary={monthlyPaySummary}
                  heldSlotKeys={scheduleAttendance.heldSlotKeys}
                  activeSlotKeys={scheduleAttendance.activeSlotKeys}
                  pricingMonthCounts={scheduleMonthCounts}
                  schedulePanelClassName="mt-5 rounded-xl border border-zinc-200 bg-zinc-50/80 px-4 py-3"
                />
              </fieldset>
            </EnrollmentFormGroup>

            {requiresVerificationUploads ? (
            <EnrollmentFormGroup
              step="Step 3"
              title="Verification uploads"
              icon={IdCard}
              description="Pay by transfer, upload your ID, then attach the bank receipt so we can verify you."
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
                  <div className="flex items-center gap-2">
                    <Banknotes className="h-4 w-4 text-zinc-500" aria-hidden />
                    <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500">
                      Bank transfer
                    </h3>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">Pay first, then upload your receipt below.</p>

                  <EnrollmentBankTransferPanel className="mt-5" />

                  <div className="mt-8 border-t border-zinc-100 pt-8">
                    <div className="flex items-center gap-2">
                      <Upload className="h-4 w-4 text-zinc-500" aria-hidden />
                      <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500">
                        Payment receipt
                      </h3>
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">Screenshot or PDF from your bank app.</p>

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

              </div>
            </EnrollmentFormGroup>
            ) : null}

            <EnrollmentFormGroup
              step={requiresVerificationUploads ? "Step 4" : "Step 3"}
              title="Optional codes"
              icon={CreditCard}
              description="Enter a referral or trial class code if you have one. Both are optional."
            >
              <div className="space-y-8">
                <div>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-zinc-500" aria-hidden />
                    <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500">
                      Referral code
                    </h3>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">
                    Optional. Enter a code from your school or referrer to apply a tuition discount.
                  </p>
                  <div className="mt-5">
                    <Label htmlFor="enrollment-referral" className="text-zinc-700">
                      Referral code
                    </Label>
                    <Input
                      id="enrollment-referral"
                      value={referralCodeInput}
                      onChange={(e) => setReferralCodeInput(e.target.value)}
                      placeholder="Optional"
                      maxLength={64}
                      autoComplete="off"
                      className="mt-1.5 h-11 rounded-xl border-zinc-200"
                    />
                    {referralCodeInput.trim() ? (
                      referralDiscountApplied ? (
                        <p className="mt-2 text-xs text-emerald-700">
                          Referral applied — {appliedReferralDiscountPercent}% off listed tuition.
                        </p>
                      ) : (
                        <p className="mt-2 text-xs text-amber-800">This code is not valid for this class.</p>
                      )
                    ) : null}
                  </div>
                </div>

                <div className="border-t border-zinc-100 pt-8">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-zinc-500" aria-hidden />
                    <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500">
                      Trial class code
                    </h3>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">
                    Optional. Enter a trial code from your school for trial access to this class.
                  </p>
                  <div className="mt-5">
                    <Label htmlFor="enrollment-trial" className="text-zinc-700">
                      Trial class code
                    </Label>
                    <Input
                      id="enrollment-trial"
                      value={trialCodeInput}
                      onChange={(e) => setTrialCodeInput(e.target.value)}
                      placeholder="Optional"
                      maxLength={64}
                      autoComplete="off"
                      className="mt-1.5 h-11 rounded-xl border-zinc-200"
                    />
                    {trialCodeInput.trim() ? (
                      trialCodeApplied ? (
                        <p className="mt-2 text-xs text-emerald-700">
                          Trial code recognized — we will apply trial access when your enrollment is approved.
                        </p>
                      ) : (
                        <p className="mt-2 text-xs text-amber-800">This trial code is not valid for this class.</p>
                      )
                    ) : null}
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
                <p className="truncate text-sm font-semibold text-zinc-900">{transferDueSummary.label}</p>
                <p className="mt-1 text-base font-bold tabular-nums tracking-tight text-[#3954d0]">
                  {transferDueSummary.amount != null
                    ? formatPrice(transferDueSummary.amount, priceCurrency)
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
                disabled={submitting || isClassFull}
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
