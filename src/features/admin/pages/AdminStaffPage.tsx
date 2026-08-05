import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { eduhubAdmin } from "@/api/eduhubClient";
import type { UserResponse } from "@/api/eduhubTypes";
import { Loader2 } from "@/lib/icons";
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

interface StaffRow {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "Active" | "Inactive";
}

function formatRoleDisplay(role: string): string {
  const u = role.trim().toUpperCase().replace(/\s+/g, "_");
  if (u === "ADMIN") return "Admin";
  if (u.startsWith("ADMIN_")) {
    const rest = u
      .slice("ADMIN_".length)
      .split("_")
      .filter(Boolean)
      .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
      .join(" ");
    return rest ? `Admin ${rest}` : "Admin";
  }
  return role;
}

export default function AdminStaffPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [staffList, setStaffList] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    eduhubAdmin
      .listUsers({ size: 100 })
      .then((res) => {
        const users = res.content || [];
        const staffUsers: StaffRow[] = users
          .filter((u) => u.role.startsWith("ADMIN"))
          .map((u) => ({
            id: u.id,
            name: u.fullName,
            email: u.email,
            role: formatRoleDisplay(u.role),
            status: u.enabled ? "Active" : "Inactive",
          }));
        setStaffList(staffUsers);
      })
      .catch(() => setStaffList([]))
      .finally(() => setLoading(false));
  }, []);

  const roleOptions = useMemo(() => {
    const roles = new Set(staffList.map((s) => s.role));
    return Array.from(roles).sort((a, b) => a.localeCompare(b));
  }, [staffList]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return staffList.filter((s) => {
      if (roleFilter !== "all" && s.role !== roleFilter) return false;
      if (statusFilter === "active" && s.status !== "Active") return false;
      if (statusFilter === "inactive" && s.status !== "Inactive") return false;
      if (!q) return true;
      return [s.name, s.email, s.role, s.status].join(" ").toLowerCase().includes(q);
    });
  }, [search, roleFilter, statusFilter, staffList]);

  const hasActiveFilters =
    search.trim() !== "" || roleFilter !== "all" || statusFilter !== "all";

  return (
      <div className="container mx-auto px-6">

        <AdminPageHeader title={t("adminNav.staff")} description={t("admin.staff.description")} />

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center mb-4">
          <Input
            placeholder={t("admin.staff.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md bg-white"
          />
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-[180px] bg-white">
              <SelectValue placeholder={t("admin.shared.role")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("admin.shared.allRoles")}</SelectItem>
              {roleOptions.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[160px] bg-white">
              <SelectValue placeholder={t("common.status")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("admin.shared.allStatuses")}</SelectItem>
              <SelectItem value="active">{t("admin.shared.active")}</SelectItem>
              <SelectItem value="inactive">{t("admin.shared.inactive")}</SelectItem>
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
                setRoleFilter("all");
                setStatusFilter("all");
              }}
            >
              {t("admin.shared.clearFilters")}
            </Button>
          ) : null}
        </div>

        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>{t("common.name")}</TableHead>
                <TableHead>{t("admin.shared.email")}</TableHead>
                <TableHead>{t("admin.shared.role")}</TableHead>
                <TableHead>{t("common.status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin inline mr-2 text-slate-400" />
                    {t("common.loading", "Loading...")}
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-slate-500">
                    {t("admin.staff.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium text-slate-900">{s.name}</TableCell>
                    <TableCell>{s.email}</TableCell>
                    <TableCell>{s.role}</TableCell>
                    <TableCell>
                      {s.status === "Active" ? (
                        <Badge variant="outline" className="text-emerald-800 border-emerald-200 bg-emerald-50/50">
                          {t("admin.shared.active")}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">{t("admin.shared.inactive")}</Badge>
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
