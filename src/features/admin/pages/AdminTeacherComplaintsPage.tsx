import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { Badge } from "@/components/ui/badge";
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
import {
  listTeacherComplaints,
  markTeacherComplaintReviewed,
  moodEmoji,
  TEACHER_COMPLAINTS_CHANGED_EVENT,
  type TeacherComplaint,
  type TeacherComplaintStatus,
} from "@/features/student/teacherComplaintStore";

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export default function AdminTeacherComplaintsPage() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<TeacherComplaint[]>(() => listTeacherComplaints());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | TeacherComplaintStatus>("all");

  useEffect(() => {
    const refresh = () => setRows(listTeacherComplaints());
    window.addEventListener(TEACHER_COMPLAINTS_CHANGED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(TEACHER_COMPLAINTS_CHANGED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (!q) return true;
      return (
        row.courseTitle.toLowerCase().includes(q) ||
        row.teacherName.toLowerCase().includes(q) ||
        row.studentName.toLowerCase().includes(q) ||
        row.studentEmail.toLowerCase().includes(q) ||
        row.message.toLowerCase().includes(q)
      );
    });
  }, [rows, search, statusFilter]);

  const markReviewed = (id: string) => {
    markTeacherComplaintReviewed(id);
    toast.success(t("admin.teacherComplaints.markedReviewed"));
  };

  return (
    <div className="container mx-auto space-y-6 px-6">
      <AdminPageHeader
        title={t("adminNav.teacherComplaints")}
        description={t("admin.teacherComplaints.description")}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("admin.teacherComplaints.searchPlaceholder")}
          className="max-w-md"
        />
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as "all" | TeacherComplaintStatus)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("admin.teacherComplaints.filterAll")}</SelectItem>
            <SelectItem value="open">{t("admin.teacherComplaints.statusOpen")}</SelectItem>
            <SelectItem value="reviewed">{t("admin.teacherComplaints.statusReviewed")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("admin.teacherComplaints.colWhen")}</TableHead>
              <TableHead>{t("admin.teacherComplaints.colStudent")}</TableHead>
              <TableHead>{t("admin.teacherComplaints.colTeacher")}</TableHead>
              <TableHead>{t("admin.teacherComplaints.colClass")}</TableHead>
              <TableHead>{t("admin.teacherComplaints.colMood")}</TableHead>
              <TableHead>{t("admin.teacherComplaints.colCategory")}</TableHead>
              <TableHead>{t("admin.teacherComplaints.colMessage")}</TableHead>
              <TableHead>{t("admin.teacherComplaints.colStatus")}</TableHead>
              <TableHead className="text-right">{t("admin.teacherComplaints.colActions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-sm text-slate-500">
                  {t("admin.teacherComplaints.empty")}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="whitespace-nowrap text-sm tabular-nums text-slate-700">
                    {formatWhen(row.createdAt)}
                  </TableCell>
                  <TableCell className="text-sm">
                    <div className="font-medium text-slate-900">{row.studentName}</div>
                    <div className="text-xs text-slate-500">{row.studentEmail || "—"}</div>
                  </TableCell>
                  <TableCell className="text-sm text-slate-800">{row.teacherName}</TableCell>
                  <TableCell className="text-sm text-slate-800">{row.courseTitle}</TableCell>
                  <TableCell className="text-center text-xl" title={String(row.mood ?? "")}>
                    {moodEmoji(row.mood)}
                  </TableCell>
                  <TableCell className="text-sm capitalize text-slate-700">
                    {t(`admin.teacherComplaints.category.${row.category}`)}
                  </TableCell>
                  <TableCell className="max-w-xs text-sm text-slate-700">
                    <p className="line-clamp-3 whitespace-pre-wrap">{row.message}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={row.status === "open" ? "default" : "secondary"}>
                      {row.status === "open"
                        ? t("admin.teacherComplaints.statusOpen")
                        : t("admin.teacherComplaints.statusReviewed")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {row.status === "open" ? (
                      <Button size="sm" variant="outline" onClick={() => markReviewed(row.id)}>
                        {t("admin.teacherComplaints.markReviewed")}
                      </Button>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
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
