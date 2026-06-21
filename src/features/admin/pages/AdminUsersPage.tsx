import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "@/lib/icons";
import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
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
import { eduhubAdmin } from "@/api/eduhubClient";
import { useToast } from "@/hooks/use-toast";

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
}

export default function AdminUsersPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [users, setUsers] = useState<UserItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const loadUsers = async () => {
      setIsLoading(true);
      try {
        const res = await eduhubAdmin.listUsers({ size: 100 });
        const mapped: UserItem[] = (res.content || []).map((u: any) => ({
          id: u.id,
          name: u.fullName,
          email: u.email,
          role: u.role,
          status: u.enabled ? "Active" : "Inactive",
        }));
        setUsers(mapped);
      } catch (err: any) {
        toast({ title: t("admin.users.toast.loadFailedTitle"), description: err.message || t("admin.users.toast.loadFailed"), variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    loadUsers();
  }, []);

  const roleOptions = useMemo(() => {
    const roles = new Set(users.map((u) => u.role));
    return Array.from(roles).sort((a, b) => a.localeCompare(b));
  }, [users]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (statusFilter === "active" && u.status !== "Active") return false;
      if (statusFilter === "inactive" && u.status !== "Inactive") return false;
      if (!q) return true;
      return [u.name, u.email, u.role, u.status].join(" ").toLowerCase().includes(q);
    });
  }, [users, search, roleFilter, statusFilter]);

  const hasActiveFilters =
    search.trim() !== "" || roleFilter !== "all" || statusFilter !== "all";

  return (
    <AdminLayout>
      <div className="container mx-auto px-6">
        <Link to="/dashboard/admin" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-6">
          <ArrowLeft className="h-4 w-4" />
          {t("admin.shared.backToDashboard")}
        </Link>

        <AdminPageHeader title={t("adminNav.users")} description={t("admin.users.description")} />

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center mb-4">
          <Input
            placeholder={t("admin.shared.searchNameEmailRole")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md bg-white"
          />
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-[160px] bg-white">
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
              Clear filters
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
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-slate-500">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-slate-500">
                    {t("admin.users.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium text-slate-900">{u.name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{u.role}</TableCell>
                    <TableCell>
                      {u.status === "Active" ? (
                        <Badge variant="outline" className="text-emerald-800 border-emerald-200 bg-emerald-50/50">
                          Active
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
    </AdminLayout>
  );
}
