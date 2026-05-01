import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { mockAdminTeachers, type AdminTeacherRow } from "@/features/admin/data/adminOperationalMock";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function AdminTeachersPage() {
  const [profileTeacher, setProfileTeacher] = useState<AdminTeacherRow | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loadFilter, setLoadFilter] = useState<string>("all");

  const filteredTeachers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return mockAdminTeachers.filter((t) => {
      if (statusFilter === "active" && t.status !== "Active") return false;
      if (statusFilter === "inactive" && t.status !== "Inactive") return false;
      if (loadFilter === "with_courses" && t.coursesTaught.length <= 0) return false;
      if (loadFilter === "no_courses" && t.coursesTaught.length > 0) return false;
      if (!q) return true;
      const haystack = [
        t.name,
        t.email,
        String(t.coursesTaught.length),
        String(t.totalStudents),
        t.status,
        t.coursesTaught.map((c) => c.title).join(" "),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [search, statusFilter, loadFilter]);

  const hasActiveFilters =
    search.trim() !== "" || statusFilter !== "all" || loadFilter !== "all";

  return (
    <AdminLayout>
      <div className="container mx-auto px-6">
        <Link to="/dashboard/admin" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        <AdminPageHeader title="Teachers" description="Lecturer accounts and class load (demo data until admin user API exists)." />

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center mb-4">
          <Input
            placeholder="Search name, email, classes, students…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md bg-white"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[160px] bg-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Select value={loadFilter} onValueChange={setLoadFilter}>
            <SelectTrigger className="w-full sm:w-[190px] bg-white">
              <SelectValue placeholder="Class load" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any course load</SelectItem>
              <SelectItem value="with_courses">With assigned classes</SelectItem>
              <SelectItem value="no_courses">No classes (0)</SelectItem>
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
                setLoadFilter("all");
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
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Classes</TableHead>
                <TableHead className="text-right tabular-nums">Total students</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right w-[140px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTeachers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                    No teachers match your search or filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredTeachers.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium text-slate-900">{t.name}</TableCell>
                    <TableCell>{t.email}</TableCell>
                    <TableCell>{t.coursesTaught.length}</TableCell>
                    <TableCell className="text-right tabular-nums text-slate-800">{t.totalStudents}</TableCell>
                    <TableCell>
                      {t.status === "Active" ? (
                        <Badge variant="outline" className="text-emerald-800 border-emerald-200 bg-emerald-50/50">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button type="button" variant="outline" size="sm" onClick={() => setProfileTeacher(t)}>
                        View profile
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <Dialog open={profileTeacher != null} onOpenChange={(open) => !open && setProfileTeacher(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Teacher profile</DialogTitle>
              {profileTeacher ? (
                <DialogDescription>Lecturer account · {profileTeacher.email}</DialogDescription>
              ) : null}
            </DialogHeader>
            {profileTeacher ? (
              <div className="space-y-3 text-sm">
                <div className="rounded-md border border-slate-200 bg-slate-50 p-3 space-y-2">
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">Name</span>
                    <span className="font-medium text-slate-900 text-right">{profileTeacher.name}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">Email</span>
                    <span className="text-slate-800 text-right break-all">{profileTeacher.email}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">Assigned courses</span>
                    <span className="text-slate-800">{profileTeacher.coursesTaught.length}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">Total students</span>
                    <span className="text-slate-800 tabular-nums">{profileTeacher.totalStudents}</span>
                  </div>
                  <div className="flex justify-between gap-4 items-center">
                    <span className="text-slate-500">Status</span>
                    {profileTeacher.status === "Active" ? (
                      <Badge variant="outline" className="text-emerald-800 border-emerald-200 bg-emerald-50/50">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-700 uppercase tracking-wide mb-2">Classes taught</p>
                  {profileTeacher.coursesTaught.length === 0 ? (
                    <p className="text-sm text-slate-500 rounded-md border border-dashed border-slate-200 bg-slate-50/80 px-3 py-2">
                      No classes assigned.
                    </p>
                  ) : (
                    <ul className="rounded-md border border-slate-200 divide-y divide-slate-200 max-h-56 overflow-y-auto">
                      {profileTeacher.coursesTaught.map((course) => (
                        <li
                          key={`${profileTeacher.id}-${course.id}`}
                          className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"
                        >
                          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                            <span className="text-slate-800 truncate">{course.title}</span>
                            <Badge
                              variant="outline"
                              title="Enrolled / capacity"
                              className="shrink-0 rounded-full border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-normal tabular-nums text-slate-600 sm:text-sm"
                            >
                              {course.enrolled}/{course.capacity}
                            </Badge>
                          </div>
                          <Button asChild variant="outline" size="sm" className="shrink-0 h-8">
                            <Link
                              to={`/dashboard/admin/courses?q=${encodeURIComponent(course.title)}&courseId=${encodeURIComponent(course.id)}`}
                              onClick={() => setProfileTeacher(null)}
                            >
                              View details
                            </Link>
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <p className="text-xs text-slate-500">
                  Full bio, contracts, and payroll integrate here when the lecturer admin API is available.
                </p>
              </div>
            ) : null}
            <DialogFooter>
              <Button type="button" onClick={() => setProfileTeacher(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
