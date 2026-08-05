import { useMemo, useState } from "react";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { mockAdminAttendance, type AdminAttendanceRow } from "@/features/admin/data/adminOperationalMock";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
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

function sessionStatusBadge(
  status: AdminAttendanceRow["sessionLog"][0]["status"],
  t: (key: string) => string,
) {
  switch (status) {
    case "present":
      return <Badge className="bg-emerald-600 font-normal">{t("admin.attendance.sessionStatus.present")}</Badge>;
    case "late":
      return <Badge variant="secondary" className="font-normal">{t("admin.attendance.sessionStatus.late")}</Badge>;
    case "excused":
      return <Badge variant="outline" className="font-normal">{t("admin.attendance.sessionStatus.excused")}</Badge>;
    case "absent":
    default:
      return <Badge variant="destructive" className="font-normal">{t("admin.attendance.sessionStatus.absent")}</Badge>;
  }
}

export default function AdminAttendancePage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState<string>("all");
  const [lecturerFilter, setLecturerFilter] = useState<string>("all");
  const [detailRow, setDetailRow] = useState<AdminAttendanceRow | null>(null);

  const lecturerOptions = useMemo(() => {
    const names = new Set(mockAdminAttendance.map((a) => a.lecturerName));
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, []);

  const filteredAttendance = useMemo(() => {
    const q = search.trim().toLowerCase();
    return mockAdminAttendance.filter((a) => {
      if (riskFilter === "at_risk" && !a.atRisk) return false;
      if (riskFilter === "on_track" && a.atRisk) return false;
      if (lecturerFilter !== "all" && a.lecturerName !== lecturerFilter) return false;
      if (!q) return true;
      const haystack = [a.studentName, a.course, a.lecturerName, a.className].join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [search, riskFilter, lecturerFilter]);

  const hasActiveFilters =
    search.trim() !== "" || riskFilter !== "all" || lecturerFilter !== "all";

  return (
      <div className="container mx-auto px-6">

        <AdminPageHeader
          title={t("adminNav.attendanceProgress")}
          description={t("admin.attendance.description")}
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center mb-4">
          <Input
            placeholder={t("admin.shared.searchStudentClassLecturer")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md bg-white"
          />
          <Select value={riskFilter} onValueChange={setRiskFilter}>
            <SelectTrigger className="w-full sm:w-[170px] bg-white">
              <SelectValue placeholder="Risk" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("admin.shared.allRiskLevels")}</SelectItem>
              <SelectItem value="at_risk">{t("admin.attendance.atRiskOnly")}</SelectItem>
              <SelectItem value="on_track">{t("admin.attendance.onTrackOnly")}</SelectItem>
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
                setRiskFilter("all");
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
                <TableHead>{t("admin.attendance.table.attendance")}</TableHead>
                <TableHead>{t("admin.attendance.table.progress")}</TableHead>
                <TableHead>{t("admin.attendance.riskPlaceholder")}</TableHead>
                <TableHead className="text-right w-[140px]">{t("admin.shared.details")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAttendance.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-slate-500">
                    No rows match your search or filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredAttendance.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium text-slate-900">{a.studentName}</TableCell>
                  <TableCell>{a.course}</TableCell>
                  <TableCell className="text-slate-700">{a.lecturerName}</TableCell>
                  <TableCell className="min-w-[120px]">
                    <div className="text-xs text-slate-600 mb-1">{a.attendancePct}%</div>
                    <Progress value={a.attendancePct} className="h-1.5" />
                  </TableCell>
                  <TableCell className="min-w-[120px]">
                    <div className="text-xs text-slate-600 mb-1">{a.progressPct}%</div>
                    <Progress value={a.progressPct} className="h-1.5" />
                  </TableCell>
                  <TableCell>
                    {a.atRisk ? (
                      <Badge variant="destructive">{t("admin.attendance.atRisk")}</Badge>
                    ) : (
                      <Badge variant="outline" className="text-emerald-700 border-emerald-200">
                        On track
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button type="button" variant="outline" size="sm" onClick={() => setDetailRow(a)}>
                      View details
                    </Button>
                  </TableCell>
                </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <Dialog open={detailRow != null} onOpenChange={(open) => !open && setDetailRow(null)}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            {detailRow ? (
              <>
                <DialogHeader>
                  <DialogTitle>{t("admin.attendance.detailDialog.title")}</DialogTitle>
                  <DialogDescription>
                    {detailRow.studentName} · {detailRow.course}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 text-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                      <p className="text-xs text-slate-500 uppercase tracking-wide">{t("admin.shared.class")}</p>
                      <p className="font-medium text-slate-900">{detailRow.className}</p>
                    </div>
                    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                      <p className="text-xs text-slate-500 uppercase tracking-wide">{t("admin.shared.lecturer")}</p>
                      <p className="font-medium text-slate-900">{detailRow.lecturerName}</p>
                    </div>
                    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                      <p className="text-xs text-slate-500 uppercase tracking-wide">{t("admin.attendance.detailDialog.sessions")}</p>
                      <p className="font-medium text-slate-900">
                        {detailRow.sessionsPresent} / {detailRow.sessionsTotal} attended
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500 mb-2">{t("admin.attendance.detailDialog.overall")}</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="flex justify-between text-xs text-slate-600 mb-1">
                          <span>{t("admin.attendance.table.attendance")}</span>
                          <span>{detailRow.attendancePct}%</span>
                        </div>
                        <Progress value={detailRow.attendancePct} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs text-slate-600 mb-1">
                          <span>{t("admin.attendance.detailDialog.classProgress")}</span>
                          <span>{detailRow.progressPct}%</span>
                        </div>
                        <Progress value={detailRow.progressPct} className="h-2" />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">{t("admin.attendance.detailDialog.lastActivity")}</span>
                    <span className="font-medium text-slate-900">{detailRow.lastActivity}</span>
                  </div>

                  <Separator />

                  <div>
                    <p className="text-sm font-medium text-slate-900 mb-2">{t("admin.attendance.detailDialog.recentSessions")}</p>
                    <div className="rounded-md border border-slate-200 overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50">
                            <TableHead className="w-[110px]">{t("admin.shared.date")}</TableHead>
                            <TableHead>{t("admin.attendance.detailDialog.session")}</TableHead>
                            <TableHead className="text-right w-[100px]">{t("common.status")}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {detailRow.sessionLog.map((s, i) => (
                            <TableRow key={`${detailRow.id}-${s.date}-${i}`}>
                              <TableCell className="text-slate-600 whitespace-nowrap">{s.date}</TableCell>
                              <TableCell>{s.label}</TableCell>
                              <TableCell className="text-right">{sessionStatusBadge(s.status, t)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
  );
}
