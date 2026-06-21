import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "@/lib/icons";
import { toast } from "sonner";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { eduhubAdmin } from "@/api/eduhubClient";
import type { TeacherResponse, TeacherCourseRef } from "@/api/eduhubTypes";

export default function AdminTeachersPage() {
  const { t } = useTranslation();
  const [profileTeacher, setProfileTeacher] = useState<TeacherResponse | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loadFilter, setLoadFilter] = useState<string>("all");
  const [teachers, setTeachers] = useState<TeacherResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const res = await eduhubAdmin.listTeachers();
        setTeachers(Array.isArray(res) ? res : []);
      } catch (err: any) {
        toast.error(err.message || t("admin.teachers.toast.loadFailed"));
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const filteredTeachers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return teachers.filter((t) => {
      if (statusFilter === "active" && !t.enabled) return false;
      if (statusFilter === "inactive" && t.enabled) return false;
      if (loadFilter === "with_courses" && t.courses.length <= 0) return false;
      if (loadFilter === "no_courses" && t.courses.length > 0) return false;
      if (!q) return true;
      const haystack = [
        t.fullName,
        t.email,
        t.category || "",
        String(t.courses.length),
        String(t.totalStudents),
        t.enabled ? "Active" : "Inactive",
        t.courses.map((c) => c.title).join(" "),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [search, statusFilter, loadFilter, teachers]);

  const hasActiveFilters =
    search.trim() !== "" || statusFilter !== "all" || loadFilter !== "all";

  return (
    <AdminLayout>
      <div className="container mx-auto px-6">
        <Link to="/dashboard/admin" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-6">
          <ArrowLeft className="h-4 w-4" />
          {t("admin.shared.backToDashboard")}
        </Link>

        <AdminPageHeader title={t("adminNav.teachers")} description={t("admin.teachers.description")} />

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center mb-4">
          <Input
            placeholder={t("admin.teachers.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md bg-white"
          />
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
          <Select value={loadFilter} onValueChange={setLoadFilter}>
            <SelectTrigger className="w-full sm:w-[190px] bg-white">
              <SelectValue placeholder={t("admin.teachers.classLoadPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("admin.shared.anyCourseLoad")}</SelectItem>
              <SelectItem value="with_courses">{t("admin.teachers.withAssignedClasses")}</SelectItem>
              <SelectItem value="no_courses">{t("admin.teachers.noClasses")}</SelectItem>
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
                <TableHead>{t("common.name")}</TableHead>
                <TableHead>{t("admin.shared.email")}</TableHead>
                <TableHead>{t("admin.students.table.classes")}</TableHead>
                <TableHead className="text-right tabular-nums">{t("admin.teachers.table.totalStudents")}</TableHead>
                <TableHead>{t("common.status")}</TableHead>
                <TableHead className="text-right w-[140px]">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredTeachers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                    No teachers match your search or filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredTeachers.map((teacher) => (
                  <TableRow key={teacher.id}>
                    <TableCell className="font-medium text-slate-900">{teacher.fullName}</TableCell>
                    <TableCell>{teacher.email}</TableCell>
                    <TableCell>{teacher.courses.length}</TableCell>
                    <TableCell className="text-right tabular-nums text-slate-800">{teacher.totalStudents}</TableCell>
                    <TableCell>
                      {teacher.enabled ? (
                        <Badge variant="outline" className="text-emerald-800 border-emerald-200 bg-emerald-50/50">
                          {t("admin.shared.active")}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">{t("admin.shared.inactive")}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button type="button" variant="outline" size="sm" onClick={() => setProfileTeacher(teacher)}>
                        {t("admin.teachers.viewProfile")}
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
              <DialogTitle>{t("admin.teachers.profileDialog.title")}</DialogTitle>
              {profileTeacher ? (
                <DialogDescription>Lecturer account · {profileTeacher.email}</DialogDescription>
              ) : null}
            </DialogHeader>
            {profileTeacher ? (
              <div className="space-y-3 text-sm">
                <div className="rounded-md border border-slate-200 bg-slate-50 p-3 space-y-2">
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">{t("common.name")}</span>
                    <span className="font-medium text-slate-900 text-right">{profileTeacher.fullName}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">{t("admin.shared.email")}</span>
                    <span className="text-slate-800 text-right break-all">{profileTeacher.email}</span>
                  </div>
                  {profileTeacher.category && (
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-500">{t("admin.shared.category")}</span>
                      <span className="text-slate-800 text-right">{profileTeacher.category}</span>
                    </div>
                  )}
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">{t("admin.teachers.profileDialog.assignedCourses")}</span>
                    <span className="text-slate-800">{profileTeacher.courses.length}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">{t("admin.teachers.table.totalStudents")}</span>
                    <span className="text-slate-800 tabular-nums">{profileTeacher.totalStudents}</span>
                  </div>
                  <div className="flex justify-between gap-4 items-center">
                    <span className="text-slate-500">{t("common.status")}</span>
                    {profileTeacher.enabled ? (
                      <Badge variant="outline" className="text-emerald-800 border-emerald-200 bg-emerald-50/50">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary">{t("admin.shared.inactive")}</Badge>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-700 uppercase tracking-wide mb-2">{t("admin.teachers.profileDialog.classesTaught")}</p>
                  {profileTeacher.courses.length === 0 ? (
                    <p className="text-sm text-slate-500 rounded-md border border-dashed border-slate-200 bg-slate-50/80 px-3 py-2">
                      No classes assigned.
                    </p>
                  ) : (
                    <ul className="rounded-md border border-slate-200 divide-y divide-slate-200 max-h-56 overflow-y-auto">
                      {profileTeacher.courses.map((course: TeacherCourseRef) => (
                        <li
                          key={`${profileTeacher.id}-${course.id}`}
                          className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"
                        >
                          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                            <span className="text-slate-800 truncate">{course.title}</span>
                            <Badge
                              variant="outline"
                              title={t("admin.teachers.profileDialog.enrolledCapacity")}
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
