import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Pencil, Plus } from "@/lib/icons";
import { eduhubCourses } from "@/api/eduhubClient";
import type { CourseSummaryResponse } from "@/api/eduhubTypes";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { AdminReferralDiscountDialog } from "@/features/admin/components/AdminReferralDiscountDialog";
import { useTranslation } from "react-i18next";
import { CourseStatusBadge } from "@/features/admin/components/AdminStatusBadges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editCourseId, setEditCourseId] = useState<string | null>(null);

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
      const trial = c.pricing?.trialCode ?? "";
      const disc = c.pricing?.discountPercent != null ? `${c.pricing.discountPercent}%` : "";
      const hay = [c.title, c.lecturerName ?? "", c.status ?? "", ref, disc, trial].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [data, search]);

  const openCreate = () => {
    setEditCourseId(null);
    setDialogOpen(true);
  };

  const openEdit = (courseId: string) => {
    setEditCourseId(courseId);
    setDialogOpen(true);
  };

  return (
      <div className="container mx-auto px-6 pb-10">

        <AdminPageHeader
          title={t("adminNav.referralCodes")}
          description={t("admin.referralCodes.description")}
          actions={
            <Button
              type="button"
              size="sm"
              className="bg-slate-900 text-white hover:bg-slate-800"
              onClick={openCreate}
            >
              <Plus className="h-4 w-4" />
              {t("admin.courses.list.referralCodesButton")}
            </Button>
          }
        />

        <div className="mb-4 max-w-md">
          <Input
            placeholder={t("admin.referralCodes.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-white"
          />
        </div>

        {isLoading ? (
          <p className="text-sm text-slate-600">{t("admin.shared.loadingClasses")}</p>
        ) : error ? (
          <p className="text-sm text-red-600">{t("admin.courses.list.loadError.default")}</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>{t("admin.shared.class")}</TableHead>
                  <TableHead>{t("common.status")}</TableHead>
                  <TableHead>{t("admin.courses.detail.fields.catalogPrice")}</TableHead>
                  <TableHead>{t("admin.courses.detail.fields.referralCode")}</TableHead>
                  <TableHead>{t("admin.courses.detail.fields.discount")}</TableHead>
                  <TableHead>{t("admin.referralCodes.addDialog.trialCode")}</TableHead>
                  <TableHead className="w-[120px]">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCourses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-slate-500">
                      {t("admin.referralCodes.empty")}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCourses.map((course) => {
                    const pricing = course.pricing;
                    const hasCatalog = pricing != null && pricing.amount >= 0;
                    const referral = pricing?.referralCode?.trim() || "";
                    const trial = pricing?.trialCode?.trim() || "";
                    const discount =
                      pricing && pricing.discountPercent > 0
                        ? `${pricing.discountPercent}%`
                        : "—";
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
                          {referral || "—"}
                        </TableCell>
                        <TableCell className="tabular-nums text-slate-800">{discount}</TableCell>
                        <TableCell className="font-mono text-xs text-slate-800">
                          {trial || "—"}
                        </TableCell>
                        <TableCell>
                          {hasCatalog ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1.5"
                              onClick={() => openEdit(course.id)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              {t("common.edit")}
                            </Button>
                          ) : (
                            <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs" asChild>
                              <Link to={`/dashboard/admin/courses/${course.id}`}>
                                {t("admin.referralCodes.setPricing")}
                              </Link>
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

        <AdminReferralDiscountDialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setEditCourseId(null);
          }}
          courses={data ?? []}
          initialCourseId={editCourseId}
        />
      </div>
  );
}
