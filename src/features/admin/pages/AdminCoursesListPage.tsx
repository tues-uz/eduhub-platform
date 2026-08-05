import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ExternalLink } from "@/lib/icons";
import { useQuery } from "@tanstack/react-query";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { AdminReferralDiscountDialog } from "@/features/admin/components/AdminReferralDiscountDialog";
import { eduhubCourses } from "@/api/eduhubClient";
import type { CourseSummaryResponse } from "@/api/eduhubTypes";
import { CourseStatusBadge } from "@/features/admin/components/AdminStatusBadges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

function formatAdminCoursesLoadError(err: unknown): string {
  if (!(err instanceof Error)) return "Could not load classes.";
  const m = err.message;
  if (/failed to fetch|networkerror|load failed/i.test(m)) {
    return "Could not reach the API. In Brave (or strict blockers), try Shields down for this site, or confirm you are logged in here (tokens are per-browser).";
  }
  if (/access denied/i.test(m)) {
    return `${m} Sign out and sign in again if your session was refreshed in another tab.`;
  }
  return m;
}

export default function AdminCoursesListPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [referralDialogOpen, setReferralDialogOpen] = useState(false);

  const highlightCourseId = searchParams.get("courseId");

  useEffect(() => {
    const q = searchParams.get("q");
    if (q != null && q !== "") setSearch(q);
  }, [searchParams]);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["admin", "courses", "list"],
    queryFn: fetchMergedAdminCourses,
    retry(failureCount, err) {
      if (failureCount >= 2) return false;
      if (err instanceof Error && /access denied/i.test(err.message)) return false;
      return true;
    },
    retryDelay: (attempt) => Math.min(750 * 2 ** attempt, 4000),
  });

  const categories = useMemo(() => {
    if (!data?.length) return [] as string[];
    const cats = new Set<string>();
    data.forEach((c) => {
      if (c.category) cats.add(c.category);
    });
    return Array.from(cats).sort((a, b) => a.localeCompare(b));
  }, [data]);

  const filteredCourses = useMemo(() => {
    if (!data?.length) return [] as CourseSummaryResponse[];
    const q = search.trim().toLowerCase();
    return data.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (categoryFilter !== "all" && (c.category ?? "") !== categoryFilter) return false;
      if (!q) return true;
      const ref = c.pricing?.referralCode ?? "";
      const disc = c.pricing?.discountPercent != null ? `${c.pricing.discountPercent}%` : "";
      const hay = [c.title, c.category ?? "", c.lecturerName ?? "", c.status ?? "", ref, disc, c.createdAt]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [data, search, statusFilter, categoryFilter]);

  const hasActiveFilters =
    search.trim() !== "" || statusFilter !== "all" || categoryFilter !== "all";

  return (
      <div className="container mx-auto px-6">

        <AdminPageHeader
          title={t("admin.shared.allClasses")}
          description={t("admin.courses.list.description")}
          actions={
            <Button
              type="button"
              size="sm"
              className="bg-slate-900 text-white hover:bg-slate-800"
              onClick={() => setReferralDialogOpen(true)}
            >
              {t("admin.courses.list.referralCodesButton")}
            </Button>
          }
        />

        <AdminReferralDiscountDialog
          open={referralDialogOpen}
          onOpenChange={setReferralDialogOpen}
          courses={data ?? []}
        />

        {!isLoading && !error ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center mb-4">
            <Input
              placeholder={t("admin.courses.list.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-md bg-white"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[200px] bg-white">
                <SelectValue placeholder={t("common.status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("admin.shared.allStatuses")}</SelectItem>
                <SelectItem value="DRAFT">{t("admin.courses.list.statusDraft")}</SelectItem>
                <SelectItem value="PUBLISHED">{t("admin.courses.list.statusPublished")}</SelectItem>
                <SelectItem value="REJECTED">{t("admin.shared.rejected")}</SelectItem>
                <SelectItem value="ARCHIVED">{t("admin.courses.list.statusArchived")}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[200px] bg-white">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("admin.shared.allCategories")}</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasActiveFilters ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-slate-600"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                  setCategoryFilter("all");
                }}
              >
                Clear filters
              </Button>
            ) : null}
          </div>
        ) : null}

        {isLoading ? (
          <p className="text-sm text-slate-600">{t("admin.shared.loadingClasses")}</p>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-800 space-y-2">
            <p>{formatAdminCoursesLoadError(error)}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-red-300 bg-white"
              disabled={isFetching}
              onClick={() => void refetch()}
            >
              {isFetching ? t("admin.shared.retrying") : t("admin.shared.tryAgain")}
            </Button>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>{t("admin.shared.title")}</TableHead>
                  <TableHead>{t("admin.shared.lecturer")}</TableHead>
                  <TableHead>{t("common.status")}</TableHead>
                  <TableHead className="w-[140px]">{t("common.actions")}</TableHead>
                  <TableHead>{t("admin.shared.category")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!data?.length ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-slate-500">
                      No classes returned.
                    </TableCell>
                  </TableRow>
                ) : filteredCourses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-slate-500">
                      {t("admin.classesRosters.empty")}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCourses.map((c) => (
                    <TableRow
                      key={c.id}
                      className={
                        highlightCourseId && c.id === highlightCourseId
                          ? "bg-amber-50/90 hover:bg-amber-50"
                          : undefined
                      }
                    >
                      <TableCell className="font-medium text-slate-900 max-w-[220px]">
                        <span className="line-clamp-2" title={c.title}>
                          {c.title}
                        </span>
                      </TableCell>
                      <TableCell className="text-slate-800">{c.lecturerName ?? "—"}</TableCell>
                      <TableCell>
                        <CourseStatusBadge status={c.status} />
                      </TableCell>
                      <TableCell>
                        <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5" asChild>
                          <Link to={`/dashboard/admin/courses/${c.id}`} title={t("admin.courses.list.detailsTitle")}>
                            <ExternalLink className="h-3.5 w-3.5" />
                            Details
                          </Link>
                        </Button>
                      </TableCell>
                      <TableCell className="text-slate-700">{c.category ?? "—"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
  );
}
