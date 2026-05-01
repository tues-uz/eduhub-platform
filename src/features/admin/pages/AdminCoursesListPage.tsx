import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Eye } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { AdminCourseReviewDialog } from "@/features/admin/components/AdminCourseReviewDialog";
import { eduhubCourses } from "@/api/eduhubClient";
import type { CourseSummaryResponse } from "@/api/eduhubTypes";
import { CourseStatusBadge } from "@/features/admin/components/AdminStatusBadges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

/** List API `createdAt` — when the lecturer first created the class (draft). */
function formatLecturerSubmittedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(d);
}

async function fetchMergedAdminCourses(): Promise<CourseSummaryResponse[]> {
  const main = await eduhubCourses.getAll({ page: 0, size: 100 });
  let drafts: CourseSummaryResponse[] = [];
  try {
    drafts = await eduhubCourses.getAll({ page: 0, size: 100, status: "DRAFT" });
  } catch {
    drafts = [];
  }
  const byId = new Map<string, CourseSummaryResponse>();
  for (const c of [...main, ...drafts]) {
    byId.set(c.id, c);
  }
  return Array.from(byId.values());
}

export default function AdminCoursesListPage() {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [reviewCourseId, setReviewCourseId] = useState<string | null>(null);
  const [reviewCourseTitle, setReviewCourseTitle] = useState("");

  const highlightCourseId = searchParams.get("courseId");

  useEffect(() => {
    const q = searchParams.get("q");
    if (q != null && q !== "") setSearch(q);
  }, [searchParams]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "courses", "list"],
    queryFn: fetchMergedAdminCourses,
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
    <AdminLayout>
      <div className="container mx-auto px-6">
        <Link
          to="/dashboard/admin"
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        <AdminPageHeader
          title="All classes"
          description="Teachers create classes as drafts. Set catalog price, referral code, and discount (% off) for that code, then approve and publish. Stored in-browser until the API supports pricing and referrals."
        />

        {!isLoading && !error ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center mb-4">
            <Input
              placeholder="Search title, category, lecturer, referral code…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-md bg-white"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[200px] bg-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="DRAFT">Draft (pending review)</SelectItem>
                <SelectItem value="PUBLISHED">Published</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
                <SelectItem value="ARCHIVED">Archived</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[200px] bg-white">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
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
          <p className="text-sm text-slate-600">Loading classes…</p>
        ) : error ? (
          <p className="text-sm text-red-600">Could not load classes. Check API access.</p>
        ) : (
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Lecturer</TableHead>
                  <TableHead className="min-w-[140px] whitespace-nowrap">Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="tabular-nums">Catalog price</TableHead>
                  <TableHead className="font-mono text-xs max-w-[140px]">Referral</TableHead>
                  <TableHead className="tabular-nums w-[90px]">Discount</TableHead>
                  <TableHead className="tabular-nums min-w-[110px]">Discounted price</TableHead>
                  <TableHead className="text-right w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!data?.length ? (
                  <TableRow>
                    <TableCell colSpan={10} className="h-24 text-center text-slate-500">
                      No classes returned.
                    </TableCell>
                  </TableRow>
                ) : filteredCourses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="h-24 text-center text-slate-500">
                      No classes match your search or filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCourses.map((c) => {
                    const meta = c.pricing;
                    return (
                      <TableRow
                        key={c.id}
                        className={
                          highlightCourseId && c.id === highlightCourseId
                            ? "bg-amber-50/90 hover:bg-amber-50"
                            : undefined
                        }
                      >
                        <TableCell className="font-medium text-slate-900">{c.title}</TableCell>
                        <TableCell>{c.category ?? "—"}</TableCell>
                        <TableCell>{c.lecturerName ?? "—"}</TableCell>
                        <TableCell
                          className="text-slate-700 tabular-nums whitespace-nowrap"
                          title={c.createdAt}
                        >
                          {formatLecturerSubmittedAt(c.createdAt)}
                        </TableCell>
                        <TableCell>
                          <CourseStatusBadge status={c.status} />
                        </TableCell>
                        <TableCell className="text-slate-700 tabular-nums">
                          {meta ? formatMoney(meta.amount, meta.currency) : "—"}
                        </TableCell>
                        <TableCell className="text-slate-700 font-mono max-w-[140px] truncate" title={meta?.referralCode || undefined}>
                          {meta?.referralCode ? meta.referralCode : "—"}
                        </TableCell>
                        <TableCell className="text-slate-700 tabular-nums">
                          {meta && meta.discountPercent > 0 ? `${meta.discountPercent}%` : "—"}
                        </TableCell>
                        <TableCell className="text-slate-800 tabular-nums font-medium">
                          {meta && meta.discountPercent > 0
                            ? formatMoney(meta.discountedAmount, meta.currency)
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {c.status === "DRAFT" || c.status === "REJECTED" ? (
                            <Button
                              type="button"
                              size="icon"
                              variant="default"
                              className="h-8 w-8 rounded-full bg-slate-900 hover:bg-slate-800"
                              title="Review class"
                              aria-label={`Review class: ${c.title}`}
                              onClick={() => {
                                setReviewCourseId(c.id);
                                setReviewCourseTitle(c.title);
                              }}
                            >
                              <Eye />
                              <span className="sr-only">Review</span>
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 rounded-full border-0 shadow-none text-slate-600 hover:!bg-slate-100 hover:!text-slate-900 focus-visible:ring-slate-400"
                              title="View class"
                              aria-label={`View class: ${c.title}`}
                              onClick={() => {
                                setReviewCourseId(c.id);
                                setReviewCourseTitle(c.title);
                              }}
                            >
                              <Eye />
                              <span className="sr-only">View</span>
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

        <AdminCourseReviewDialog
          courseId={reviewCourseId}
          courseTitle={reviewCourseTitle}
          open={reviewCourseId !== null}
          onOpenChange={(open) => {
            if (!open) {
              setReviewCourseId(null);
              setReviewCourseTitle("");
            }
          }}
        />
      </div>
    </AdminLayout>
  );
}
