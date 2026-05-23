import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail, MoreHorizontal, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { StudentStatusBadge } from "@/features/admin/components/AdminStatusBadges";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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
import type { StudentStatus } from "@/features/admin/data/adminOperationalMock";

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
        const mapped: StudentRow[] = (res.content || []).map((u: any) => ({
          id: u.id,
          name: u.fullName,
          email: u.email,
          studentStatus: u.enabled ? "active" : "inactive",
          enabled: u.enabled,
          coursesCount: u.coursesCount ?? 0,
          registeredAt: u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—",
        }));
        setStudents(mapped);
      } catch (err: any) {
        toast.error(err.message || "Failed to load students");
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
      toast.success(currentEnabled ? "Student deactivated" : "Student activated");
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
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
    <AdminLayout>
      <div className="container mx-auto px-6">
        <Link to="/dashboard/admin" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        <AdminPageHeader
          title="Students & registrations"
          description="Directory and status of enrolled students."
          actions={
            <>
              <Button
                variant="outline"
                size="sm"
                disabled={selectedIds.length === 0}
                onClick={() => toast.message("Reminder queued (demo)", { description: `${selectedIds.length} student(s)` })}
              >
                <Mail className="h-4 w-4 mr-2" />
                Remind selected
              </Button>
            </>
          }
        />

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <Input
            placeholder="Search name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md bg-white"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px] bg-white">
              <SelectValue placeholder="Student status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
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
                <TableHead>Student</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Classes</TableHead>
                <TableHead>Registered</TableHead>
                <TableHead className="text-right">Actions</TableHead>
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
                    No students match your search or filters.
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
                            <Link to={`/dashboard/admin/enrollments?student=${r.id}`}>View enrollments</Link>
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
    </AdminLayout>
  );
}
