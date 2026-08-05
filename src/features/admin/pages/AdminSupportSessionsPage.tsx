import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { mockAdminSupportSessions } from "@/features/admin/data/adminOperationalMock";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

export default function AdminSupportSessionsPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [courseFilter, setCourseFilter] = useState("all");

  const courseOptions = useMemo(() => {
    const names = new Set(mockAdminSupportSessions.map((s) => s.course));
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return mockAdminSupportSessions.filter((s) => {
      if (statusFilter === "requested" && s.status !== "requested") return false;
      if (statusFilter === "scheduled" && s.status !== "scheduled") return false;
      if (courseFilter !== "all" && s.course !== courseFilter) return false;
      if (!q) return true;
      return [s.studentName, s.course, s.topic, s.requestedAt].join(" ").toLowerCase().includes(q);
    });
  }, [search, statusFilter, courseFilter]);

  const hasActiveFilters =
    search.trim() !== "" || statusFilter !== "all" || courseFilter !== "all";

  return (
      <div className="container mx-auto px-6">

        <AdminPageHeader
          title={t("admin.supportSessions.title")}
          description={t("admin.supportSessions.description")}
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center mb-4">
          <Input
            placeholder={t("admin.supportSessions.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md bg-white"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px] bg-white">
              <SelectValue placeholder={t("common.status")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("admin.shared.allStatuses")}</SelectItem>
              <SelectItem value="requested">{t("admin.payroll.requests.table.requested")}</SelectItem>
              <SelectItem value="scheduled">{t("admin.supportSessions.scheduled")}</SelectItem>
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
                <TableHead>{t("admin.shared.student")}</TableHead>
                <TableHead>{t("admin.shared.class")}</TableHead>
                <TableHead>{t("admin.supportSessions.table.topic")}</TableHead>
                <TableHead>{t("admin.payroll.requests.table.requested")}</TableHead>
                <TableHead>{t("common.status")}</TableHead>
                <TableHead className="text-right">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                    {t("admin.supportSessions.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium text-slate-900">{s.studentName}</TableCell>
                    <TableCell>{s.course}</TableCell>
                    <TableCell className="max-w-[220px]">{s.topic}</TableCell>
                    <TableCell className="text-slate-600">{s.requestedAt}</TableCell>
                    <TableCell>
                      {s.status === "scheduled" ? (
                        <Badge variant="outline" className="text-emerald-700 border-emerald-200">
                          Scheduled
                        </Badge>
                      ) : (
                        <Badge variant="secondary">{t("admin.payroll.requests.table.requested")}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {s.status === "requested" ? (
                        <Button size="sm" onClick={() => toast.success(t("admin.supportSessions.toast.approvedDemo"))}>
                          Approve & schedule
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => toast.message(t("admin.supportSessions.toast.viewSlotDemo"))}>
                          View slot
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
  );
}
