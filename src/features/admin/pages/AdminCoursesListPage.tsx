import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
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
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

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
          description="Quick list by title, lecturer, category, and status. Open a class for pricing, schedule workflow, and review."
        />

        {!isLoading && !error ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center mb-4">
            <Input
              placeholder="Search title, category, lecturer…"
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
              {isFetching ? "Retrying…" : "Try again"}
            </Button>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Title</TableHead>
                  <TableHead>Lecturer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[140px]">Actions</TableHead>
                  <TableHead>Category</TableHead>
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
                      No classes match your search or filters.
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
                          <Link to={`/dashboard/admin/courses/${c.id}`} title="View class details">
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
    </AdminLayout>
  );
}
