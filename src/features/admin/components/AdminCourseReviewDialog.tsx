import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { eduhubAdmin, eduhubCourses } from "@/api/eduhubClient";
import { isUuid } from "@/api/utils";
import type { CourseResponse } from "@/api/eduhubTypes";
import { computeDiscountedPrice } from "@/features/admin/utils/adminCourseCatalog";
import { CourseStatusBadge } from "@/features/admin/components/AdminStatusBadges";
import { useTranslation } from "react-i18next";
import {
  AdminActionCodeField,
  useAdminActionCodeState,
} from "@/features/admin/components/AdminActionCodeField";
import { courseReviewAuditStore } from "@/features/admin/courseReviewAuditStore";
import { validateAdminActionCodeOrThrow } from "@/features/admin/adminStaffCode";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  courseId: string | null;
  courseTitle?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const DEFAULT_CURRENCY = "UZS";

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

export function AdminCourseReviewDialog({ courseId, courseTitle, open, onOpenChange }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [priceInput, setPriceInput] = useState("");
  const [referralInput, setReferralInput] = useState("");
  const [discountInput, setDiscountInput] = useState("");
  const [rejectionInput, setRejectionInput] = useState("");
  const [adminActionCode, setAdminActionCode] = useAdminActionCodeState();

  const enabled = !!courseId && isUuid(courseId) && open;
  const { data: detail, isLoading } = useQuery({
    queryKey: ["admin", "course-detail", courseId],
    queryFn: () => eduhubCourses.getById(courseId!),
    enabled,
  });

  const canReject = detail?.status === "DRAFT" || detail?.status === "REJECTED" || detail?.status === "SCHEDULE_APPROVED";
  const isReviewable = detail?.status === "SCHEDULE_APPROVED";
  const needsScheduleFirst = detail?.status === "DRAFT" || detail?.status === "SCHEDULE_PENDING";

  const pricePreview = useMemo(() => {
    const rawP = priceInput.replace(/\s/g, "");
    const rawD = String(discountInput).replace(/\s/g, "");
    const amount = Number(rawP);
    const d = Number(rawD);
    if (!Number.isFinite(amount) || amount < 0) return null;
    if (!Number.isFinite(d) || d < 0 || d > 100) return null;
    const catalogRounded = Math.round(amount);
    const discounted = computeDiscountedPrice(catalogRounded, Math.round(d));
    const saved = Math.max(0, catalogRounded - discounted);
    return {
      catalog: catalogRounded,
      discountPct: Math.round(d),
      discounted,
      saved,
    };
  }, [priceInput, discountInput]);

  useEffect(() => {
    if (!courseId || !open) return;
    const existing = detail?.pricing;
    if (existing) {
      setPriceInput(String(existing.amount));
      setReferralInput(existing.referralCode ?? "");
      setDiscountInput(String(existing.discountPercent ?? 0));
    } else {
      setPriceInput("");
      setReferralInput("");
      setDiscountInput("0");
    }
    setRejectionInput(detail?.rejectionReason ?? "");
  }, [courseId, detail, open]);

  const reviewMutation = useMutation({
    mutationFn: async (decision: "APPROVE" | "REJECT") => {
      if (!courseId || !isUuid(courseId)) throw new Error(t("admin.components.courseReviewDialog.toast.invalidClass"));
      const code = validateAdminActionCodeOrThrow(adminActionCode);
      if (decision === "REJECT") {
        const rejectionReason = rejectionInput.trim();
        if (!rejectionReason) throw new Error(t("admin.components.courseReviewDialog.toast.rejectionRequired"));
        const result = await eduhubAdmin.reviewCourse(courseId, { decision, rejectionReason, adminActionCode: code });
        courseReviewAuditStore.record(courseId, decision, code);
        return result;
      }

      if (needsScheduleFirst) {
        throw new Error(
          detail?.status === "SCHEDULE_PENDING"
            ? "Wait for the instructor to approve the class schedule before publishing."
            : "Propose a class schedule and get instructor approval before publishing."
        );
      }

      const n = Number(priceInput.replace(/\s/g, ""));
      if (!Number.isFinite(n) || n < 0) {
        throw new Error(t("admin.components.courseReviewDialog.toast.invalidPrice"));
      }
      const dp = Number(String(discountInput).replace(/\s/g, ""));
      if (!Number.isFinite(dp) || dp < 0 || dp > 100) {
        throw new Error(t("admin.referralCodes.toast.discountRange"));
      }
      const discountPercent = Math.round(dp);
      const result = await eduhubAdmin.reviewCourse(courseId, {
        decision,
        priceAmount: Math.round(n),
        currency: DEFAULT_CURRENCY,
        referralCode: referralInput.trim().slice(0, 64),
        discountPercent,
        trialCode: detail?.pricing?.trialCode ?? undefined,
        adminActionCode: code,
      });
      courseReviewAuditStore.record(courseId, decision, code);
      return result;
    },
    onSuccess: (_data, decision) => {
      if (decision === "REJECT") {
        toast.success(t("admin.components.courseReviewDialog.toast.rejectedTitle"), {
          description: courseTitle ? `${courseTitle} was sent back to the lecturer.` : "The lecturer can revise and resubmit.",
        });
      } else if (isReviewable) {
        toast.success(t("admin.components.courseReviewDialog.toast.approvedTitle"), {
          description: courseTitle ? `${courseTitle} is live for students.` : "The class is now published.",
        });
      } else {
        toast.success(t("admin.components.courseReviewDialog.toast.catalogSaved"), {
          description: courseTitle ? `${courseTitle}` : undefined,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["admin", "courses", "list"] });
      onOpenChange(false);
    },
    onError: (e: Error) => {
      toast.error(t("admin.components.courseReviewDialog.toast.reviewFailed"), {
        description: e.message || t("admin.components.courseReviewDialog.toast.reviewFailedDescription"),
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isReviewable ? t("admin.components.courseReviewDialog.titleReviewPublish") : detail?.status === "SCHEDULE_PENDING" ? t("admin.components.courseReviewDialog.titleSchedulePending") : t("admin.components.courseReviewDialog.titleReview")}
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 text-sm text-muted-foreground">
              {isReviewable ? (
                <>
                  <p>
                    The instructor has <strong className="text-foreground">approved the schedule</strong>. Set the catalog price and publish.
                  </p>
                  <ol className="list-decimal list-inside space-y-1.5 text-left border border-slate-200 rounded-md bg-slate-50/80 px-3 py-2.5">
                    <li>Set <strong className="text-foreground">catalog price</strong> (required for publishing).</li>
                    <li>Optionally add a <strong className="text-foreground">referral code</strong> and <strong className="text-foreground">discount %</strong>.</li>
                    <li>Click <strong className="text-foreground">Publish class</strong> to make it visible in the catalog.</li>
                  </ol>
                </>
              ) : detail?.status === "SCHEDULE_PENDING" ? (
                <p>
                  The schedule has been sent to the instructor and is <strong className="text-foreground">awaiting their approval</strong>.
                  You can publish once they approve.
                </p>
              ) : detail?.status === "DRAFT" ? (
                <p>
                  This class is in <strong className="text-foreground">draft</strong>. Propose a class schedule first, then get instructor approval before publishing.
                </p>
              ) : (
                <p>
                  Review the class details below. You can reject with feedback or set pricing to publish.
                </p>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <p className="text-sm text-slate-600">{t("admin.shared.loadingClass")}</p>
        ) : detail ? (
          <div className="space-y-4 text-sm">
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 space-y-2">
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">{t("admin.shared.title")}</span>
                <span className="font-medium text-slate-900 text-right">{detail.title}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">{t("admin.shared.lecturer")}</span>
                <span className="text-slate-800 text-right">{detail.lecturer?.fullName ?? "—"}</span>
              </div>
              <div className="flex justify-between gap-4 items-center">
                <span className="text-slate-500">{t("common.status")}</span>
                <CourseStatusBadge status={detail.status} />
              </div>
              {detail.rejectionReason ? (
                <div className="flex justify-between gap-4 items-start">
                  <span className="text-slate-500 shrink-0">{t("admin.components.courseReviewDialog.fields.lastRejection")}</span>
                  <span className="text-slate-800 text-right line-clamp-6">{detail.rejectionReason}</span>
                </div>
              ) : null}
              {detail.scheduleRejectionNote ? (
                <div className="flex justify-between gap-4 items-start">
                  <span className="text-slate-500 shrink-0">{t("admin.components.courseReviewDialog.fields.scheduleRejection")}</span>
                  <span className="text-slate-800 text-right line-clamp-6">{detail.scheduleRejectionNote}</span>
                </div>
              ) : null}
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">{t("admin.shared.category")}</span>
                <span className="text-slate-800 text-right">{detail.category}</span>
              </div>
              <div className="flex justify-between gap-4 items-start">
                <span className="text-slate-500 shrink-0">{t("admin.courses.detail.description")}</span>
                <span className="text-slate-800 text-right line-clamp-6">{detail.description || "—"}</span>
              </div>
            </div>

            {isReviewable ? (
              <>
                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="admin-course-price">Catalog price ({DEFAULT_CURRENCY}) — admin only</Label>
                  <Input
                    id="admin-course-price"
                    type="text"
                    inputMode="decimal"
                    placeholder={t("admin.components.courseReviewDialog.fields.catalogPricePlaceholder")}
                    value={priceInput}
                    onChange={(e) => setPriceInput(e.target.value)}
                    className="bg-white font-mono tabular-nums"
                  />
                  <p className="text-xs text-slate-500">
                    Teachers do not set this. Persisted in-browser until the billing API stores class fees.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin-course-referral">{t("admin.components.courseReviewDialog.fields.referralCode")}</Label>
                  <Input
                    id="admin-course-referral"
                    type="text"
                    placeholder={t("admin.components.courseReviewDialog.fields.referralPlaceholder")}
                    value={referralInput}
                    onChange={(e) => setReferralInput(e.target.value)}
                    className="bg-white font-mono text-sm"
                    maxLength={64}
                    autoComplete="off"
                  />
                  <p className="text-xs text-slate-500">
                    Students enter this at enrollment or checkout. Pair with a discount below so the code has a clear
                    benefit.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin-course-discount">{t("admin.components.courseReviewDialog.fields.discountPercent")}</Label>
                  <Input
                    id="admin-course-discount"
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    value={discountInput}
                    onChange={(e) => setDiscountInput(e.target.value)}
                    className="bg-white font-mono tabular-nums max-w-[120px]"
                  />
                  <p className="text-xs text-slate-500">
                    Percent off the catalog price when the referral code is applied (0–100).
                  </p>
                </div>

                {pricePreview && pricePreview.discountPct > 0 ? (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50/90 px-3 py-3 space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-900/90">{t("admin.components.courseReviewDialog.pricePreview.title")}</p>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-sm text-emerald-900/80">{t("admin.courses.detail.fields.discountedPrice")}</span>
                      <span className="text-lg font-semibold tabular-nums text-emerald-950">
                        {formatMoney(pricePreview.discounted, DEFAULT_CURRENCY)}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-emerald-900/75">
                      <span>
                        Catalog: <span className="tabular-nums font-medium">{formatMoney(pricePreview.catalog, DEFAULT_CURRENCY)}</span>
                      </span>
                      <span>
                        −{pricePreview.discountPct}% →{" "}
                        <span className="tabular-nums font-medium">{formatMoney(pricePreview.discounted, DEFAULT_CURRENCY)}</span>
                      </span>
                    </div>
                    {pricePreview.saved > 0 ? (
                      <p className="text-xs text-emerald-800/90">
                        Student saves <span className="font-semibold tabular-nums">{formatMoney(pricePreview.saved, DEFAULT_CURRENCY)}</span> vs catalog
                      </p>
                    ) : null}
                  </div>
                ) : pricePreview && pricePreview.discountPct === 0 ? (
                  <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-xs text-slate-600">
                    <span className="font-medium text-slate-700">Discounted price: </span>
                    <span className="tabular-nums font-semibold text-slate-900">
                      {formatMoney(pricePreview.catalog, DEFAULT_CURRENCY)}
                    </span>
                    <span className="text-slate-500"> (no discount — full catalog price)</span>
                  </div>
                ) : null}
              </>
            ) : null}

            {canReject ? (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="admin-course-rejection">{t("admin.components.courseReviewDialog.fields.rejectionReason")}</Label>
                  <Textarea
                    id="admin-course-rejection"
                    value={rejectionInput}
                    onChange={(e) => setRejectionInput(e.target.value)}
                    placeholder={t("admin.components.courseReviewDialog.fields.rejectionPlaceholder")}
                    rows={3}
                    className="bg-white"
                  />
                  <p className="text-xs text-slate-500">{t("admin.components.courseReviewDialog.fields.rejectionHint")}</p>
                </div>
              </>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-slate-600">{t("admin.components.courseReviewDialog.loadError")}</p>
        )}

        {(canReject || isReviewable) && detail ? (
          <AdminActionCodeField
            id="course-review-admin-code"
            value={adminActionCode}
            onChange={setAdminActionCode}
          />
        ) : null}

        <DialogFooter className="gap-2 sm:gap-0 flex-col sm:flex-row">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {canReject ? (
            <Button
              type="button"
              variant="destructive"
              disabled={!detail || reviewMutation.isPending}
              onClick={() => reviewMutation.mutate("REJECT")}
            >
              {reviewMutation.isPending ? t("admin.shared.submitting") : t("admin.components.courseReviewDialog.rejectClass")}
            </Button>
          ) : null}
          <Button
            type="button"
            className={isReviewable ? "bg-emerald-700 hover:bg-emerald-800" : "bg-slate-900 hover:bg-slate-800"}
            disabled={!detail || reviewMutation.isPending || needsScheduleFirst}
            title={
              needsScheduleFirst
                ? detail?.status === "SCHEDULE_PENDING"
                  ? "Publishing is blocked until the instructor approves the proposed schedule."
                  : "Propose a class schedule first."
                : undefined
            }
            onClick={() => reviewMutation.mutate("APPROVE")}
          >
            {reviewMutation.isPending
              ? isReviewable
                ? "Publishing…"
                : "Saving…"
              : isReviewable
                ? "Approve & publish"
                : t("admin.components.courseReviewDialog.saveCatalog")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
