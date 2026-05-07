import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { StudentStatusBadge } from "@/features/admin/components/AdminStatusBadges";
import { mockAdminStudents } from "@/features/admin/data/adminOperationalMock";
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
import { Badge } from "@/components/ui/badge";

export default function AdminStudentsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const rows = useMemo(() => {
    return mockAdminStudents.filter((r) => {
      const q = search.trim().toLowerCase();
      const matchSearch = !q || r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q);
      const matchStatus = statusFilter === "all" || r.studentStatus === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [search, statusFilter]);

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
          description="Directory, trial usage (1×), and flags such as unpaid but attending. Connects to enrollment and payment workflows."
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
              <SelectItem value="trial">Trial</SelectItem>
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
                <TableHead>Trial used</TableHead>
                <TableHead>Classes</TableHead>
                <TableHead>Registered</TableHead>
                <TableHead>Flags</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
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
                  <TableCell>{r.trialUsed ? "Yes" : "No"}</TableCell>
                  <TableCell>{r.coursesCount}</TableCell>
                  <TableCell className="text-slate-600">{r.registeredAt}</TableCell>
                  <TableCell>
                    {r.unpaidButAttending ? (
                      <Badge variant="destructive" className="font-normal">
                        Unpaid · attending
                      </Badge>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </TableCell>
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
                        <DropdownMenuItem onClick={() => toast.message("Open student detail (demo)")}>View profile</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminLayout>
  );
}
