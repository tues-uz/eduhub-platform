import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "@/lib/icons";
import { toast } from "sonner";
import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { ClassStatusBadge } from "@/features/admin/components/AdminStatusBadges";
import { mockAdminClasses, type ClassStatus } from "@/features/admin/data/adminOperationalMock";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
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

export default function AdminClassesPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [courseFilter, setCourseFilter] = useState("all");

  const courseOptions = useMemo(() => {
    const names = new Set(mockAdminClasses.map((c) => c.course));
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return mockAdminClasses.filter((c) => {
      if (statusFilter !== "all" && c.status !== (statusFilter as ClassStatus)) return false;
      if (courseFilter !== "all" && c.course !== courseFilter) return false;
      if (!q) return true;
      return [c.name, c.course, c.schedule].join(" ").toLowerCase().includes(q);
    });
  }, [search, statusFilter, courseFilter]);

  const hasActiveFilters =
    search.trim() !== "" || statusFilter !== "all" || courseFilter !== "all";

  return (
    <AdminLayout>
      <div className="container mx-auto px-6">
        <Link to="/dashboard/admin" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-6">
          <ArrowLeft className="h-4 w-4" />
          {t("admin.shared.backToDashboard")}
        </Link>

        <AdminPageHeader
          title={t("adminNav.classesRosters")}
          description={t("admin.classesRosters.description")}
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center mb-4">
          <Input
            placeholder={t("admin.classesRosters.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md bg-white"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[170px] bg-white">
              <SelectValue placeholder={t("admin.classesRosters.classStatusPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("admin.shared.allClassStatuses")}</SelectItem>
              <SelectItem value="active">{t("admin.shared.active")}</SelectItem>
              <SelectItem value="waiting">{t("admin.shared.waiting")}</SelectItem>
              <SelectItem value="completed">{t("admin.shared.completed")}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={courseFilter} onValueChange={setCourseFilter}>
            <SelectTrigger className="w-full sm:w-[220px] bg-white">
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
          {hasActiveFilters ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-slate-600"
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
                setCourseFilter("all");
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
                <TableHead>{t("admin.shared.class")}</TableHead>
                <TableHead>{t("admin.shared.class")}</TableHead>
                <TableHead>{t("admin.courses.detail.schedule")}</TableHead>
                <TableHead>{t("admin.classesRosters.table.capacity")}</TableHead>
                <TableHead>{t("common.status")}</TableHead>
                <TableHead>{t("admin.classesRosters.table.sessionQuota")}</TableHead>
                <TableHead className="text-right">{t("admin.classesRosters.table.roster")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-slate-500">
                    {t("admin.classesRosters.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium text-slate-900">{c.name}</TableCell>
                    <TableCell>{c.course}</TableCell>
                    <TableCell className="text-slate-600">{c.schedule}</TableCell>
                    <TableCell>
                      {c.filled}/{c.capacity}
                    </TableCell>
                    <TableCell>
                      <ClassStatusBadge status={c.status} />
                    </TableCell>
                    <TableCell className="min-w-[140px]">
                      <div className="flex items-center gap-2 text-xs text-slate-600 mb-1">
                        <span>
                          {c.sessionQuota.used}/{c.sessionQuota.total} sessions
                        </span>
                      </div>
                      <Progress value={(c.sessionQuota.used / c.sessionQuota.total) * 100} className="h-1.5" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => toast.message(t("admin.classesRosters.openRosterDemo"), { description: c.name })}>
                        Open roster
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminLayout>
  );
}
