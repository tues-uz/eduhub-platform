import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Mail, MoreHorizontal, UserCheck, UserX } from "@/lib/icons";
import { toast } from "sonner";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { StudentStatusBadge } from "@/features/admin/components/AdminStatusBadges";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { eduhubAdmin } from "@/api/eduhubClient";
import type { StudentStatus, UserResponse } from "@/api/eduhubTypes";

interface StudentRow {
  id: string;
  name: string;
  email: string;
  studentStatus: StudentStatus;
  enabled: boolean;
  coursesCount: number;
  registeredAt: string;
}

export default function AdminStudentsPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const res = await eduhubAdmin.listUsers({ role: "STUDENT", size: 100 });
        const mapped: StudentRow[] = (res.content || []).map((u: UserResponse) => ({
          id: u.id,
          name: u.fullName,
          email: u.email,
          studentStatus: u.enabled ? "active" : "inactive",
          enabled: u.enabled,
          coursesCount: u.coursesCount ?? 0,
          registeredAt: u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—",
        }));
        setStudents(mapped);
      } catch (err: unknown) {
        toast.error((err as Error).message || t("admin.students.toast.loadFailed"));
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const handleToggleStatus = async (id: string, currentEnabled: boolean) => {
    try {
      await eduhubAdmin.setUserStatus(id, !currentEnabled);
      setStudents((prev) =>
        prev.map((s) =>
          s.id === id
            ? { ...s, enabled: !currentEnabled, studentStatus: !currentEnabled ? "active" : "inactive" }
            : s
        )
      );
      toast.success(currentEnabled ? t("admin.students.toast.deactivated") : "Student activated");
    } catch (err: unknown) {
      toast.error((err as Error).message || t("admin.students.toast.updateFailed"));
    }
  };

  const rows = useMemo(() => {
    return students.filter((r) => {
      const q = search.trim().toLowerCase();
      const matchSearch = !q || r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q);
      const matchStatus = statusFilter === "all" || r.studentStatus === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [students, search, statusFilter]);

  const selectedIds = Object.keys(selected).filter((id) => selected[id]);
  const toggleAll = (checked: boolean) => {
    const next: Record<string, boolean> = {};
    if (checked) rows.forEach((r) => (next[r.id] = true));
    setSelected(next);
  };

  return (
      <div className="container mx-auto px-6">

        <AdminPageHeader
          title={t("adminNav.studentsRegistrations")}
          description={t("admin.students.description")}
          actions={
            <>
              <Button
                variant="outline"
                size="sm"
                disabled={selectedIds.length === 0}
                onClick={() => toast.message(t("admin.students.remindQueuedDemo"), { description: `${selectedIds.length} student(s)` })}
              >
                <Mail className="h-4 w-4 mr-2" />
                Remind selected
              </Button>
            </>
          }
        />

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <Input
            placeholder={t("admin.shared.searchNameEmail")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md bg-white"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px] bg-white">
              <SelectValue placeholder={t("admin.students.statusPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("admin.shared.allStatuses")}</SelectItem>
              <SelectItem value="active">{t("admin.shared.active")}</SelectItem>
              <SelectItem value="inactive">{t("admin.shared.inactive")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-10">
                  <Checkbox
                    checked={rows.length > 0 && rows.every((r) => selected[r.id])}
                    onCheckedChange={(v) => toggleAll(!!v)}
                  />
                </TableHead>
                <TableHead>{t("admin.shared.student")}</TableHead>
                <TableHead>{t("common.status")}</TableHead>
                <TableHead>{t("admin.students.table.classes")}</TableHead>
                <TableHead>{t("admin.students.table.registered")}</TableHead>
                <TableHead className="text-right">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                    {t("admin.students.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Checkbox
                        checked={!!selected[r.id]}
                        onCheckedChange={(v) => setSelected((s) => ({ ...s, [r.id]: !!v }))}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-slate-900">{r.name}</div>
                      <div className="text-sm text-slate-500">{r.email}</div>
                    </TableCell>
                    <TableCell>
                      <StudentStatusBadge status={r.studentStatus} />
                    </TableCell>
                    <TableCell>{r.coursesCount}</TableCell>
                    <TableCell className="text-slate-600">{r.registeredAt}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link to="/dashboard/admin/enrollment-applications">{t("admin.students.actions.viewEnrollments")}</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleStatus(r.id, r.enabled)}>
                            {r.enabled ? (
                              <>
                                <UserX className="h-4 w-4 mr-2" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <UserCheck className="h-4 w-4 mr-2" />
                                Activate
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
