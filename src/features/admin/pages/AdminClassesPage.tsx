import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { ClassStatusBadge, PaymentStatusBadge } from "@/features/admin/components/AdminStatusBadges";
import { eduhubAdmin, eduhubAdminClasses, eduhubAdminPayments, eduhubCourses } from "@/api/eduhubClient";
import type {
  ClassStatus,
  AdminClassRowResponse as AdminClassRow,
  AdminClassRosterRowResponse as RosterRow,
  AdminPaymentRowResponse,
  PaymentStatus,
  UserResponse,
} from "@/api/eduhubTypes";
import { formatDisplayPersonName } from "@/lib/formatPersonName";

function resolveClassTeacherName(row: AdminClassRow): string {
  const raw = row.teacherName?.trim() || row.lecturerName?.trim() || row.instructorName?.trim() || "";
  return raw ? formatDisplayPersonName(raw) : "";
}
import { Loader2, UserPlus, ArrowLeftRight, Trash2, Users } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

function parsePaymentStatus(value: string | undefined): PaymentStatus | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "paid" || normalized === "pending" || normalized === "overdue") {
    return normalized;
  }
  return null;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function paymentMatchesClass(payment: AdminPaymentRowResponse, classRow: AdminClassRow): boolean {
  const className = classRow.name.trim().toLowerCase();
  const course = classRow.course.trim().toLowerCase();
  const paymentClass = payment.className.trim().toLowerCase();
  const paymentCourse = payment.course.trim().toLowerCase();
  return (
    paymentClass === className ||
    paymentCourse === course ||
    paymentClass === course ||
    paymentCourse === className
  );
}

const PAYMENT_STATUS_PRIORITY: Record<PaymentStatus, number> = {
  overdue: 3,
  pending: 2,
  paid: 1,
};

function resolvePaymentStatusFromPayments(
  studentEmail: string,
  classRow: AdminClassRow,
  payments: AdminPaymentRowResponse[],
): PaymentStatus | null {
  const email = normalizeEmail(studentEmail);
  const matching = payments.filter(
    (payment) => normalizeEmail(payment.studentEmail) === email && paymentMatchesClass(payment, classRow),
  );
  if (matching.length === 0) return null;

  let best: PaymentStatus | null = null;
  let bestPriority = 0;
  for (const payment of matching) {
    const status = parsePaymentStatus(payment.status);
    if (!status) continue;
    const priority = PAYMENT_STATUS_PRIORITY[status];
    if (priority > bestPriority) {
      bestPriority = priority;
      best = status;
    }
  }
  return best;
}

export default function AdminClassesPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [courseFilter, setCourseFilter] = useState("all");
  const [classList, setClassList] = useState<AdminClassRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Roster Modal state
  const [activeClass, setActiveClass] = useState<AdminClassRow | null>(null);
  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [rosterPayments, setRosterPayments] = useState<AdminPaymentRowResponse[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [students, setStudents] = useState<UserResponse[]>([]);
  const [selectedStudentToAssign, setSelectedStudentToAssign] = useState<string>("");
  const [assigning, setAssigning] = useState(false);
  const [switchingStudentId, setSwitchingStudentId] = useState<string | null>(null);
  const [targetCourseId, setTargetCourseId] = useState<string>("");
  const [switching, setSwitching] = useState(false);

  const fetchClasses = useCallback(async () => {
    setLoading(true);
    try {
      const [data, published, drafts] = await Promise.all([
        eduhubAdminClasses.listAll(),
        eduhubCourses.getAll({ page: 0, size: 100 }).catch(() => []),
        eduhubCourses.getAll({ page: 0, size: 100, status: "DRAFT" }).catch(() => []),
      ]);
      const courses = [...(published || []), ...(drafts || [])];

      const teacherByCourseId = new Map<string, string>();
      const teacherByTitle = new Map<string, string>();
      for (const course of courses) {
        const name = course.lecturerName?.trim();
        if (!name) continue;
        teacherByCourseId.set(course.id, name);
        teacherByTitle.set(course.title.trim().toLowerCase(), name);
      }

      setClassList(
        (data || []).map((row) => {
          if (resolveClassTeacherName(row)) return row;
          const fromId = teacherByCourseId.get(row.id);
          const fromTitle =
            teacherByTitle.get(row.course.trim().toLowerCase()) ||
            teacherByTitle.get(row.name.trim().toLowerCase());
          const teacherName = fromId || fromTitle;
          return teacherName ? { ...row, teacherName } : row;
        }),
      );
    } catch {
      setClassList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  // Load available students list when roster modal opens
  useEffect(() => {
    if (activeClass) {
      eduhubAdmin
        .listUsers({ role: "STUDENT", size: 100 })
        .then((res) => setStudents(res.content || []))
        .catch(() => setStudents([]));
    }
  }, [activeClass]);

  const loadRoster = useCallback(async (classRow: AdminClassRow) => {
    setLoadingRoster(true);
    try {
      const [rosterData, paymentsData] = await Promise.all([
        eduhubAdminClasses.getRoster(classRow.id),
        eduhubAdminPayments.listAll().catch(() => [] as AdminPaymentRowResponse[]),
      ]);
      setRoster(rosterData || []);
      setRosterPayments(paymentsData || []);
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to load class roster");
      setRoster([]);
      setRosterPayments([]);
    } finally {
      setLoadingRoster(false);
    }
  }, []);

  const handleOpenRoster = (c: AdminClassRow) => {
    setActiveClass(c);
    setSelectedStudentToAssign("");
    setSwitchingStudentId(null);
    setTargetCourseId("");
    loadRoster(c);
  };

  const handleAssignStudent = async () => {
    if (!activeClass || !selectedStudentToAssign) return;
    setAssigning(true);
    try {
      await eduhubAdminClasses.assignStudent(activeClass.id, selectedStudentToAssign);
      toast.success("Student assigned to class successfully");
      setSelectedStudentToAssign("");
      await loadRoster(activeClass);
      await fetchClasses();
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to assign student");
    } finally {
      setAssigning(false);
    }
  };

  const handleSwitchStudent = async (studentId: string) => {
    if (!activeClass || !targetCourseId) return;
    setSwitching(true);
    try {
      await eduhubAdminClasses.switchStudent({
        studentId,
        fromCourseId: activeClass.id,
        toCourseId: targetCourseId,
      });
      toast.success("Student switched to new class cohort successfully");
      setSwitchingStudentId(null);
      setTargetCourseId("");
      await loadRoster(activeClass);
      await fetchClasses();
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to switch class");
    } finally {
      setSwitching(false);
    }
  };

  const handleRemoveStudent = async (studentId: string, studentName: string) => {
    if (!activeClass) return;
    if (!confirm(`Are you sure you want to remove ${studentName} from ${activeClass.name}?`)) return;
    try {
      await eduhubAdminClasses.removeStudent(activeClass.id, studentId);
      toast.success(`Removed ${studentName} from roster`);
      await loadRoster(activeClass);
      await fetchClasses();
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to remove student from class");
    }
  };

  const courseOptions = useMemo(() => {
    const names = new Set(classList.map((c) => c.course));
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [classList]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return classList.filter((c) => {
      if (statusFilter !== "all" && c.status !== (statusFilter as ClassStatus)) return false;
      if (courseFilter !== "all" && c.course !== courseFilter) return false;
      if (!q) return true;
      return [c.name, c.course, c.schedule, resolveClassTeacherName(c)]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [search, statusFilter, courseFilter, classList]);

  const hasActiveFilters =
    search.trim() !== "" || statusFilter !== "all" || courseFilter !== "all";

  // Filter students not already in the active roster
  const assignableStudents = useMemo(() => {
    const enrolledStudentIds = new Set(roster.map((r) => r.studentId));
    return students.filter((s) => !enrolledStudentIds.has(s.id));
  }, [students, roster]);

  const rosterPaymentStatusByStudentId = useMemo(() => {
    if (!activeClass) return new Map<string, PaymentStatus>();
    const map = new Map<string, PaymentStatus>();
    for (const row of roster) {
      const fromApi = parsePaymentStatus(row.paymentStatus);
      const fromPayments = resolvePaymentStatusFromPayments(row.studentEmail, activeClass, rosterPayments);
      const status = fromApi ?? fromPayments;
      if (status) map.set(row.studentId, status);
    }
    return map;
  }, [activeClass, roster, rosterPayments]);

  return (
    <div className="container mx-auto px-6">
      <AdminPageHeader
        title={t("adminNav.classesRosters")}
        description={t("admin.classesRosters.description")}
      />

      <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <Input
          placeholder={t("admin.classesRosters.searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md bg-white"
        />
        <div className="flex flex-row flex-nowrap items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[170px] shrink-0 bg-white">
              <SelectValue placeholder={t("admin.classesRosters.classStatusPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("admin.shared.allClassStatuses")}</SelectItem>
              <SelectItem value="active">{t("admin.shared.active")}</SelectItem>
              <SelectItem value="waiting">{t("admin.shared.waiting")}</SelectItem>
              <SelectItem value="completed">{t("admin.shared.completed")}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={courseFilter} onValueChange={setCourseFilter}>
            <SelectTrigger className="w-[220px] shrink-0 bg-white">
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
      </div>

      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>{t("admin.classesRosters.table.class")}</TableHead>
              <TableHead>{t("admin.classesRosters.table.teacher")}</TableHead>
              <TableHead>{t("admin.courses.detail.schedule")}</TableHead>
              <TableHead>{t("admin.classesRosters.table.capacity")}</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead>{t("admin.classesRosters.table.sessionQuota")}</TableHead>
              <TableHead className="text-right">{t("admin.classesRosters.table.roster")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-slate-500">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading class cohorts...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-slate-500">
                  {t("admin.classesRosters.empty")}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium text-slate-900">
                    {c.name?.trim() || c.course}
                  </TableCell>
                  <TableCell className="text-slate-800">
                    {resolveClassTeacherName(c) || "—"}
                  </TableCell>
                  <TableCell className="text-slate-600">{c.schedule}</TableCell>
                  <TableCell>
                    <span className="font-semibold">{c.filled}</span>/{c.capacity}
                  </TableCell>
                  <TableCell>
                    <ClassStatusBadge status={c.status} />
                  </TableCell>
                  <TableCell className="min-w-[140px]">
                    <div className="flex items-center gap-2 text-xs text-slate-600 mb-1">
                      <span>
                        {c.sessionQuota.used}/{c.sessionQuota.total} sessions
                      </span>
                    </div>
                    <Progress value={(c.sessionQuota.used / c.sessionQuota.total) * 100} className="h-1.5" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => handleOpenRoster(c)}>
                      <Users className="h-4 w-4 mr-1.5" />
                      Open roster
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Class Roster Dialog Modal */}
      <Dialog open={!!activeClass} onOpenChange={(open) => !open && setActiveClass(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-900">
              <Users className="h-5 w-5 text-indigo-600" />
              {activeClass?.name} Roster
            </DialogTitle>
            <DialogDescription>
              Schedule: {activeClass?.schedule} | Enrolled: {roster.length} / {activeClass?.capacity}
            </DialogDescription>
          </DialogHeader>

          {/* Quick Add Student Section */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex-1">
              <Select value={selectedStudentToAssign} onValueChange={setSelectedStudentToAssign}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Select a student to assign to this class cohort..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {assignableStudents.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No unassigned students found
                    </SelectItem>
                  ) : (
                    assignableStudents.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.fullName} ({s.email})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleAssignStudent}
              disabled={!selectedStudentToAssign || assigning}
              className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0"
            >
              {assigning ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <UserPlus className="h-4 w-4 mr-1.5" />}
              Assign Student
            </Button>
          </div>

          {/* Roster Table */}
          <div className="border rounded-md overflow-hidden bg-white max-h-[380px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Student Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Enrolled Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>{t("admin.classesRosters.rosterDialog.paidStatus")}</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingRoster ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Loading roster...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : roster.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                      No students enrolled in this class yet. Select a student above to assign them.
                    </TableCell>
                  </TableRow>
                ) : (
                  roster.map((r) => {
                    const paidStatus =
                      parsePaymentStatus(r.paymentStatus) ??
                      rosterPaymentStatusByStudentId.get(r.studentId) ??
                      null;
                    return (
                    <TableRow key={r.enrollmentId || r.studentId}>
                      <TableCell className="font-medium text-slate-900">{r.studentName}</TableCell>
                      <TableCell className="text-slate-600 text-sm">{r.studentEmail}</TableCell>
                      <TableCell className="text-slate-500 text-xs">
                        {r.enrolledAt ? new Date(r.enrolledAt).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                          {r.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        {paidStatus ? (
                          <PaymentStatusBadge status={paidStatus} />
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {switchingStudentId === r.studentId ? (
                            <div className="flex items-center gap-1">
                              <Select value={targetCourseId} onValueChange={setTargetCourseId}>
                                <SelectTrigger className="w-[180px] h-8 text-xs bg-white">
                                  <SelectValue placeholder="Target Class..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {classList
                                    .filter((c) => c.id !== activeClass?.id)
                                    .map((c) => (
                                      <SelectItem key={c.id} value={c.id}>
                                        {c.name}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                              <Button
                                size="sm"
                                variant="default"
                                className="h-8 px-2 text-xs bg-indigo-600"
                                onClick={() => handleSwitchStudent(r.studentId)}
                                disabled={!targetCourseId || switching}
                              >
                                {switching ? <Loader2 className="h-3 w-3 animate-spin" /> : "Confirm"}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 px-2 text-xs"
                                onClick={() => {
                                  setSwitchingStudentId(null);
                                  setTargetCourseId("");
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs"
                                title="Switch Class Cohort"
                                onClick={() => {
                                  setSwitchingStudentId(r.studentId);
                                  setTargetCourseId("");
                                }}
                              >
                                <ArrowLeftRight className="h-3.5 w-3.5 mr-1" />
                                Switch Class
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="Remove from Roster"
                                onClick={() => handleRemoveStudent(r.studentId, r.studentName)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

