import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { eduhubAdmin, eduhubCourses } from "@/api/eduhubClient";
import { isUuid } from "@/api/utils";
import { computeDiscountedPrice } from "@/features/admin/utils/adminCourseCatalog";
import { CourseStatusBadge } from "@/features/admin/components/AdminStatusBadges";
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
  const queryClient = useQueryClient();
  const [priceInput, setPriceInput] = useState("");
  const [referralInput, setReferralInput] = useState("");
  const [discountInput, setDiscountInput] = useState("");
  const [rejectionInput, setRejectionInput] = useState("");

  const enabled = !!courseId && isUuid(courseId) && open;
  const { data: detail, isLoading } = useQuery({
    queryKey: ["admin", "course-detail", courseId],
    queryFn: () => eduhubCourses.getById(courseId!),
    enabled,
  });

  const canReject = detail?.status === "DRAFT" || detail?.status === "REJECTED";
  const isReviewable = detail?.status === "DRAFT" || detail?.status === "REJECTED";

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
      if (!courseId || !isUuid(courseId)) throw new Error("Invalid class");
      if (decision === "REJECT") {
        const rejectionReason = rejectionInput.trim();
        if (!rejectionReason) throw new Error("Enter a reason before rejecting this class.");
        return eduhubAdmin.reviewCourse(courseId, { decision, rejectionReason });
      }

      const n = Number(priceInput.replace(/\s/g, ""));
      if (!Number.isFinite(n) || n < 0) {
        throw new Error("Enter a valid catalog price (0 or greater).");
      }
      const dp = Number(String(discountInput).replace(/\s/g, ""));
      if (!Number.isFinite(dp) || dp < 0 || dp > 100) {
        throw new Error("Discount must be between 0 and 100%.");
      }
      const discountPercent = Math.round(dp);
      return eduhubAdmin.reviewCourse(courseId, {
        decision,
        priceAmount: Math.round(n),
        currency: DEFAULT_CURRENCY,
        referralCode: referralInput.trim().slice(0, 64),
        discountPercent,
      });
    },
    onSuccess: (_data, decision) => {
      if (decision === "REJECT") {
        toast.success("Class rejected", {
          description: courseTitle ? `${courseTitle} was sent back to the lecturer.` : "The lecturer can revise and resubmit.",
        });
      } else if (isReviewable) {
        toast.success("Class approved and published", {
          description: courseTitle ? `${courseTitle} is live for students.` : "The class is now published.",
        });
      } else {
        toast.success("Catalog saved", {
          description: courseTitle ? `${courseTitle}` : undefined,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["admin", "courses", "list"] });
      onOpenChange(false);
    },
    onError: (e: Error) => {
      toast.error("Class review failed", {
        description: e.message || "Try again or check API permissions.",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isReviewable ? "Review class" : "Catalog: price, referral & discount"}
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 text-sm text-muted-foreground">
              {isReviewable ? (
                <>
                  <p>
                    Teachers create classes as <strong className="text-foreground">drafts</strong> and cannot set
                    prices. You approve or reject the class and control monetization.
                  </p>
                  <ol className="list-decimal list-inside space-y-1.5 text-left border border-slate-200 rounded-md bg-slate-50/80 px-3 py-2.5">
                    <li>Check title, lecturer, and description.</li>
                    <li>Set <strong className="text-foreground">catalog price</strong> (required for publishing).</li>
                    <li>
                      Optionally add a <strong className="text-foreground">referral code</strong> and{" "}
                      <strong className="text-foreground">discount %</strong> for enrollments.
                    </li>
                    <li>
                      Click <strong className="text-foreground">Publish class</strong> to make it visible in the catalog.
                    </li>
                  </ol>
                  <p className="text-xs">Catalog price, referral code, discount, and review decision are persisted on the API.</p>
                </>
              ) : (
                <p>
                  This class is already <strong className="text-foreground">published</strong>. Update catalog price,
                  referral code, or discount here, then save. Teachers cannot edit pricing.
                </p>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <p className="text-sm text-slate-600">Loading class…</p>
        ) : detail ? (
          <div className="space-y-4 text-sm">
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 space-y-2">
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Title</span>
                <span className="font-medium text-slate-900 text-right">{detail.title}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Lecturer</span>
                <span className="text-slate-800 text-right">{detail.lecturer?.fullName ?? "—"}</span>
              </div>
              <div className="flex justify-between gap-4 items-center">
                <span className="text-slate-500">Status</span>
                <CourseStatusBadge status={detail.status} />
              </div>
              {detail.rejectionReason ? (
                <div className="flex justify-between gap-4 items-start">
                  <span className="text-slate-500 shrink-0">Last rejection</span>
                  <span className="text-slate-800 text-right line-clamp-6">{detail.rejectionReason}</span>
                </div>
              ) : null}
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Category</span>
                <span className="text-slate-800 text-right">{detail.category}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Total sessions (6 mo.)</span>
                <span className="text-slate-800 text-right tabular-nums font-medium">
                  {detail.classMeetingsInSixMonths != null ? detail.classMeetingsInSixMonths : "—"}
                </span>
              </div>
              <div className="flex justify-between gap-4 items-start">
                <span className="text-slate-500 shrink-0">Description</span>
                <span className="text-slate-800 text-right line-clamp-6">{detail.description || "—"}</span>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="admin-course-price">Catalog price ({DEFAULT_CURRENCY}) — admin only</Label>
              <Input
                id="admin-course-price"
                type="text"
                inputMode="decimal"
                placeholder="e.g. 1200000"
                value={priceInput}
                onChange={(e) => setPriceInput(e.target.value)}
                className="bg-white font-mono tabular-nums"
              />
              <p className="text-xs text-slate-500">
                Teachers do not set this. Persisted in-browser until the billing API stores class fees.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-course-referral">Referral code (optional)</Label>
              <Input
                id="admin-course-referral"
                type="text"
                placeholder="e.g. SPRING2026 or PARTNER-ALI"
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
              <Label htmlFor="admin-course-discount">Referral discount (%)</Label>
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
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-900/90">Price with referral</p>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm text-emerald-900/80">Discounted price</span>
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

            {canReject ? (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="admin-course-rejection">Rejection reason</Label>
                  <Textarea
                    id="admin-course-rejection"
                    value={rejectionInput}
                    onChange={(e) => setRejectionInput(e.target.value)}
                    placeholder="Explain what the lecturer needs to fix before approval."
                    rows={3}
                    className="bg-white"
                  />
                  <p className="text-xs text-slate-500">Required only when rejecting the class.</p>
                </div>
              </>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-slate-600">Could not load class details.</p>
        )}

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
              {reviewMutation.isPending ? "Submitting…" : "Reject class"}
            </Button>
          ) : null}
          <Button
            type="button"
            className={isReviewable ? "bg-emerald-700 hover:bg-emerald-800" : "bg-slate-900 hover:bg-slate-800"}
            disabled={!detail || reviewMutation.isPending}
            onClick={() => reviewMutation.mutate("APPROVE")}
          >
            {reviewMutation.isPending
              ? isReviewable
                ? "Publishing…"
                : "Saving…"
              : isReviewable
                ? "Approve & publish"
                : "Save catalog"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
