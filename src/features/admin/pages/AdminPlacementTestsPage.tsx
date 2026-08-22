import { useEffect, useMemo, useState } from "react";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { AdminPlacementTestsManager } from "@/features/admin/components/AdminPlacementTestsManager";
import { eduhubCourseQuizzes } from "@/api/eduhubClient";
import type { QuizResultResponse } from "@/api/eduhubClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "@/lib/icons";
import { Badge } from "@/components/ui/badge";
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

interface PlacementRow {
  id: string;
  studentName: string;
  course: string;
  lecturerName: string;
  quizTitle: string;
  scorePercent: number;
  passed: boolean;
  completedAt: string;
}

export default function AdminPlacementTestsPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [resultFilter, setResultFilter] = useState<string>("all");
  const [courseFilter, setCourseFilter] = useState<string>("all");
  const [lecturerFilter, setLecturerFilter] = useState<string>("all");
  const [resultsList, setResultsList] = useState<PlacementRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    eduhubCourseQuizzes
      .getAllMyResults()
      .then((data) => {
        const rows: PlacementRow[] = (data || []).map((r: QuizResultResponse) => ({
          id: r.id,
          studentName: r.student?.fullName || "—",
          course: "General Placement",
          lecturerName: "—",
          quizTitle: "Placement Test",
          scorePercent: r.scorePercent ?? 0,
          passed: r.passed ?? false,
          completedAt: r.completedAt ? new Date(r.completedAt).toLocaleDateString() : "—",
        }));
        setResultsList(rows);
      })
      .catch(() => setResultsList([]))
      .finally(() => setLoading(false));
  }, []);

  const courseOptions = useMemo(() => {
    const names = new Set(resultsList.map((r) => r.course));
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [resultsList]);

  const lecturerOptions = useMemo(() => {
    const names = new Set(resultsList.map((r) => r.lecturerName));
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [resultsList]);

  const filteredResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    return resultsList.filter((r) => {
      if (resultFilter === "passed" && !r.passed) return false;
      if (resultFilter === "failed" && r.passed) return false;
      if (courseFilter !== "all" && r.course !== courseFilter) return false;
      if (lecturerFilter !== "all" && r.lecturerName !== lecturerFilter) return false;
      if (!q) return true;
      const haystack = [r.studentName, r.course, r.lecturerName, r.quizTitle, String(r.scorePercent), r.completedAt]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [search, resultFilter, courseFilter, lecturerFilter, resultsList]);

  const hasActiveFilters =
    search.trim() !== "" ||
    resultFilter !== "all" ||
    courseFilter !== "all" ||
    lecturerFilter !== "all";

  return (
      <div className="container mx-auto px-6">

        <AdminPageHeader
          title={t("adminNav.placementTests")}
          description={t("admin.placementTests.description")}
        />

        <Tabs defaultValue="results">
          <TabsList className="mb-4">
            <TabsTrigger value="results">{t("admin.placementTests.tabs.results")}</TabsTrigger>
            <TabsTrigger value="manage">{t("admin.placementTests.tabs.manage")}</TabsTrigger>
          </TabsList>

          <TabsContent value="manage">
            <AdminPlacementTestsManager />
          </TabsContent>

          <TabsContent value="results">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center mb-4">
          <Input
            placeholder={t("admin.placementTests.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md bg-white"
          />
          <Select value={resultFilter} onValueChange={setResultFilter}>
            <SelectTrigger className="w-full sm:w-[160px] bg-white">
              <SelectValue placeholder="Result" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("admin.shared.allResults")}</SelectItem>
              <SelectItem value="passed">{t("admin.placementTests.passed")}</SelectItem>
              <SelectItem value="failed">{t("admin.placementTests.belowThreshold")}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={courseFilter} onValueChange={setCourseFilter}>
            <SelectTrigger className="w-full sm:w-[200px] bg-white">
              <SelectValue placeholder="Class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("admin.shared.allClasses")}</SelectItem>
              {courseOptions.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={lecturerFilter} onValueChange={setLecturerFilter}>
            <SelectTrigger className="w-full sm:w-[180px] bg-white">
              <SelectValue placeholder="Lecturer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("admin.shared.allLecturers")}</SelectItem>
              {lecturerOptions.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
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
                setResultFilter("all");
                setCourseFilter("all");
                setLecturerFilter("all");
              }}
            >
              Clear filters
            </Button>
          ) : null}
        </div>

        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>{t("admin.shared.student")}</TableHead>
                <TableHead>{t("admin.shared.class")}</TableHead>
                <TableHead>{t("admin.shared.lecturer")}</TableHead>
                <TableHead>{t("admin.placementTests.table.assessment")}</TableHead>
                <TableHead>{t("admin.placementTests.table.score")}</TableHead>
                <TableHead>{t("admin.placementTests.resultPlaceholder")}</TableHead>
                <TableHead>{t("admin.shared.completed")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin inline mr-2 text-slate-400" />
                    {t("common.loading", "Loading...")}
                  </TableCell>
                </TableRow>
              ) : filteredResults.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-slate-500">
                    No rows match your search or filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredResults.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium text-slate-900">{r.studentName}</TableCell>
                    <TableCell>{r.course}</TableCell>
                    <TableCell className="text-slate-700">{r.lecturerName}</TableCell>
                    <TableCell className="text-slate-700 max-w-[200px]">{r.quizTitle}</TableCell>
                    <TableCell>{r.scorePercent}%</TableCell>
                    <TableCell>
                      {r.passed ? (
                        <Badge className="bg-emerald-600">{t("admin.placementTests.passed")}</Badge>
                      ) : (
                        <Badge variant="secondary">{t("admin.placementTests.belowThreshold")}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-600">{r.completedAt}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
          </TabsContent>
        </Tabs>
      </div>
  );
}
