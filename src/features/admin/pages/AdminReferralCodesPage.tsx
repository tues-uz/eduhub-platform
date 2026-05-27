import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil } from "@/lib/icons";
import { toast } from "sonner";
import { eduhubAdmin, eduhubCourses } from "@/api/eduhubClient";
import type { CourseSummaryResponse } from "@/api/eduhubTypes";
import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import {
  AdminActionCodeField,
  useAdminActionCodeState,
} from "@/features/admin/components/AdminActionCodeField";
import { CourseStatusBadge } from "@/features/admin/components/AdminStatusBadges";
import { validateAdminActionCodeOrThrow } from "@/features/admin/adminStaffCode";
import { computeDiscountedPrice } from "@/features/admin/utils/adminCourseCatalog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

async function fetchMergedAdminCourses(): Promise<CourseSummaryResponse[]> {
  const [main, drafts] = await Promise.all([
    eduhubCourses.getAll({ page: 0, size: 100 }),
    eduhubCourses.getAll({ page: 0, size: 100, status: "DRAFT" }).catch(() => [] as CourseSummaryResponse[]),
  ]);
  const byId = new Map<string, CourseSummaryResponse>();
  for (const c of [...main, ...drafts]) {
    byId.set(c.id, c);
  }
  return Array.from(byId.values());
}

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

export default function AdminReferralCodesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editCourse, setEditCourse] = useState<CourseSummaryResponse | null>(null);
  const [referralInput, setReferralInput] = useState("");
  const [discountInput, setDiscountInput] = useState("0");
  const [adminActionCode, setAdminActionCode] = useAdminActionCodeState();

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "courses", "list"],
    queryFn: fetchMergedAdminCourses,
  });

  const filteredCourses = useMemo(() => {
    if (!data?.length) return [] as CourseSummaryResponse[];
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter((c) => {
      const ref = c.pricing?.referralCode ?? "";
      const disc = c.pricing?.discountPercent != null ? `${c.pricing.discountPercent}%` : "";
      const hay = [c.title, c.lecturerName ?? "", c.status ?? "", ref, disc].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [data, search]);

  const pricePreview = useMemo(() => {
    if (!editCourse?.pricing) return null;
    const rawD = String(discountInput).replace(/\s/g, "");
    const d = Number(rawD);
    if (!Number.isFinite(d) || d < 0 || d > 100) return null;
    const catalog = editCourse.pricing.amount;
    const discounted = computeDiscountedPrice(catalog, Math.round(d));
    return {
      catalog,
      currency: editCourse.pricing.currency,
      discountPct: Math.round(d),
      discounted,
    };
  }, [discountInput, editCourse]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!editCourse?.pricing) throw new Error("Set catalog pricing on the class before adding referral codes.");
      const code = validateAdminActionCodeOrThrow(adminActionCode);
      const dp = Number(String(discountInput).replace(/\s/g, ""));
      if (!Number.isFinite(dp) || dp < 0 || dp > 100) {
        throw new Error("Discount must be between 0 and 100%.");
      }
      return eduhubAdmin.reviewCourse(editCourse.id, {
        decision: "APPROVE",
        priceAmount: editCourse.pricing.amount,
        currency: editCourse.pricing.currency,
        referralCode: referralInput.trim().slice(0, 64),
        discountPercent: Math.round(dp),
        adminActionCode: code,
      });
    },
    onSuccess: () => {
      toast.success("Referral code saved", {
        description: editCourse ? `${editCourse.title} updated.` : undefined,
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "courses", "list"] });
      setEditCourse(null);
    },
    onError: (e: Error) => {
      toast.error("Could not save referral code", { description: e.message });
    },
  });

  const openEdit = (course: CourseSummaryResponse) => {
    setEditCourse(course);
    setReferralInput(course.pricing?.referralCode ?? "");
    setDiscountInput(String(course.pricing?.discountPercent ?? 0));
  };

  return (
    <AdminLayout>
      <div className="container mx-auto px-6 pb-10">
        <Link
          to="/dashboard/admin"
          className="mb-6 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        <AdminPageHeader
          title="Referral & discount codes"
          description="Set referral codes and discount percentages per class. Students enter the code at enrollment to receive the listed discount off catalog tuition."
        />

        <div className="mb-4 max-w-md">
          <Input
            placeholder="Search class, code, lecturer…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-white"
          />
        </div>

        {isLoading ? (
          <p className="text-sm text-slate-600">Loading classes…</p>
        ) : error ? (
          <p className="text-sm text-red-600">Could not load classes.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Class</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Catalog price</TableHead>
                  <TableHead>Referral code</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCourses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                      No classes match your search.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCourses.map((course) => {
                    const pricing = course.pricing;
                    const hasCatalog = pricing != null && pricing.amount >= 0;
                    return (
                      <TableRow key={course.id}>
                        <TableCell className="max-w-[240px] font-medium text-slate-900">
                          <span className="line-clamp-2" title={course.title}>
                            {course.title}
                          </span>
                        </TableCell>
                        <TableCell>
                          <CourseStatusBadge status={course.status} />
                        </TableCell>
                        <TableCell className="tabular-nums text-slate-800">
                          {hasCatalog ? formatMoney(pricing.amount, pricing.currency) : "—"}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-slate-800">
                          {pricing?.referralCode?.trim() ? pricing.referralCode : "—"}
                        </TableCell>
                        <TableCell className="tabular-nums text-slate-800">
                          {pricing && pricing.discountPercent > 0 ? `${pricing.discountPercent}%` : "—"}
                        </TableCell>
                        <TableCell>
                          {hasCatalog ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1.5"
                              onClick={() => openEdit(course)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Edit
                            </Button>
                          ) : (
                            <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs" asChild>
                              <Link to={`/dashboard/admin/courses/${course.id}`}>Set pricing</Link>
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}

        <Dialog open={editCourse != null} onOpenChange={(open) => !open && setEditCourse(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit referral code</DialogTitle>
            </DialogHeader>
            {editCourse ? (
              <div className="space-y-4 text-sm">
                <p className="text-slate-600">
                  <span className="font-medium text-slate-900">{editCourse.title}</span>
                  {editCourse.pricing
                    ? ` · Catalog ${formatMoney(editCourse.pricing.amount, editCourse.pricing.currency)}`
                    : null}
                </p>

                <div className="space-y-2">
                  <Label htmlFor="referral-code">Referral code</Label>
                  <Input
                    id="referral-code"
                    value={referralInput}
                    onChange={(e) => setReferralInput(e.target.value)}
                    placeholder="e.g. SPRING2026"
                    className="bg-white font-mono text-sm"
                    maxLength={64}
                    autoComplete="off"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="referral-discount">Discount (%)</Label>
                  <Input
                    id="referral-discount"
                    value={discountInput}
                    onChange={(e) => setDiscountInput(e.target.value)}
                    inputMode="decimal"
                    className="max-w-[120px] bg-white font-mono tabular-nums"
                  />
                  <p className="text-xs text-slate-500">Percent off catalog price when the code matches (0–100).</p>
                </div>

                {pricePreview ? (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-2.5 text-xs text-emerald-900">
                    With code:{" "}
                    <span className="font-semibold tabular-nums">
                      {formatMoney(pricePreview.discounted, pricePreview.currency)}
                    </span>
                    {pricePreview.discountPct > 0 ? (
                      <span className="text-emerald-800/80"> (−{pricePreview.discountPct}%)</span>
                    ) : null}
                  </div>
                ) : null}

                <AdminActionCodeField
                  id="referral-admin-code"
                  value={adminActionCode}
                  onChange={setAdminActionCode}
                />
              </div>
            ) : null}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setEditCourse(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-slate-900 hover:bg-slate-800"
                disabled={!editCourse?.pricing || saveMutation.isPending}
                onClick={() => saveMutation.mutate()}
              >
                {saveMutation.isPending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
