import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "@/lib/icons";
import { toast } from "sonner";
import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { ClassStatusBadge, PaymentStatusBadge } from "@/features/admin/components/AdminStatusBadges";
import { mockAdminEnrollments } from "@/features/admin/data/adminOperationalMock";
import type { ClassStatus, PaymentStatus } from "@/features/admin/data/adminOperationalMock";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

export default function AdminEnrollmentsPage() {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [enrollmentFilter, setEnrollmentFilter] = useState("all");
  const [classStatusFilter, setClassStatusFilter] = useState("all");

  const filteredEnrollments = useMemo(() => {
    const q = search.trim().toLowerCase();
    return mockAdminEnrollments.filter((e) => {
      if (paymentFilter !== "all" && e.paymentStatus !== (paymentFilter as PaymentStatus)) return false;
      if (enrollmentFilter !== "all" && e.enrollmentStatus !== enrollmentFilter) return false;
      if (classStatusFilter !== "all" && e.classStatus !== (classStatusFilter as ClassStatus)) return false;
      if (!q) return true;
      return [e.studentName, e.course, e.className].join(" ").toLowerCase().includes(q);
    });
  }, [search, paymentFilter, enrollmentFilter, classStatusFilter]);

  const waitlistRowsInView = useMemo(
    () => filteredEnrollments.filter((e) => e.waitlistPosition != null),
    [filteredEnrollments],
  );

  const selectedWaitlist = Object.keys(selected).filter(
    (id) => selected[id] && waitlistRowsInView.some((w) => w.id === id),
  );

  const hasActiveFilters =
    search.trim() !== "" ||
    paymentFilter !== "all" ||
    enrollmentFilter !== "all" ||
    classStatusFilter !== "all";

  return (
    <AdminLayout>
      <div className="container mx-auto px-6">
        <Link to="/dashboard/admin" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-6">
          <ArrowLeft className="h-4 w-4" />
          {t("admin.shared.backToDashboard")}
        </Link>

        <AdminPageHeader
          title={t("adminNav.enrollmentsWaitlist")}
          description={t("admin.enrollments.description")}
          actions={
            <Button
              size="sm"
              disabled={selectedWaitlist.length === 0}
              onClick={() => toast.success(t("admin.enrollments.promotionSentDemo"), { description: `${selectedWaitlist.length} row(s)` })}
            >
              Promote selected from waitlist
            </Button>
          }
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center mb-4">
          <Input
            placeholder={t("admin.shared.searchStudentClass")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md bg-white"
          />
          <Select value={paymentFilter} onValueChange={setPaymentFilter}>
            <SelectTrigger className="w-full sm:w-[160px] bg-white">
              <SelectValue placeholder="Payment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("admin.shared.allPayments")}</SelectItem>
              <SelectItem value="pending">{t("admin.shared.pending")}</SelectItem>
              <SelectItem value="paid">{t("admin.shared.paid")}</SelectItem>
              <SelectItem value="overdue">{t("admin.shared.overdue")}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={enrollmentFilter} onValueChange={setEnrollmentFilter}>
            <SelectTrigger className="w-full sm:w-[180px] bg-white">
              <SelectValue placeholder="Enrollment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("admin.shared.allEnrollments")}</SelectItem>
              <SelectItem value="enrolled">{t("admin.enrollments.enrolled")}</SelectItem>
              <SelectItem value="waiting">{t("admin.shared.waiting")}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={classStatusFilter} onValueChange={setClassStatusFilter}>
            <SelectTrigger className="w-full sm:w-[170px] bg-white">
              <SelectValue placeholder="Class status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("admin.shared.allClassStatuses")}</SelectItem>
              <SelectItem value="active">{t("admin.shared.active")}</SelectItem>
              <SelectItem value="waiting">{t("admin.shared.waiting")}</SelectItem>
              <SelectItem value="completed">{t("admin.shared.completed")}</SelectItem>
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
                setPaymentFilter("all");
                setEnrollmentFilter("all");
                setClassStatusFilter("all");
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
                <TableHead className="w-10">
                  <Checkbox
                    checked={
                      waitlistRowsInView.length > 0 &&
                      waitlistRowsInView.every((w) => selected[w.id])
                    }
                    onCheckedChange={(v) => {
                      setSelected((prev) => {
                        const next = { ...prev };
                        waitlistRowsInView.forEach((w) => {
                          next[w.id] = !!v;
                        });
                        return next;
                      });
                    }}
                  />
                </TableHead>
                <TableHead>{t("admin.shared.student")}</TableHead>
                <TableHead>{t("admin.shared.class")}</TableHead>
                <TableHead>{t("admin.shared.class")}</TableHead>
                <TableHead>{t("admin.enrollments.table.waitlistNumber")}</TableHead>
                <TableHead>{t("admin.enrollments.enrollmentPlaceholder")}</TableHead>
                <TableHead>{t("admin.enrollments.paymentPlaceholder")}</TableHead>
                <TableHead>{t("admin.classesRosters.classStatusPlaceholder")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEnrollments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-slate-500">
                    {t("admin.enrollments.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                filteredEnrollments.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>
                      {e.waitlistPosition != null ? (
                        <Checkbox
                          checked={!!selected[e.id]}
                          onCheckedChange={(v) => setSelected((s) => ({ ...s, [e.id]: !!v }))}
                        />
                      ) : (
                        <span className="inline-block w-4" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium text-slate-900">{e.studentName}</TableCell>
                    <TableCell>{e.course}</TableCell>
                    <TableCell>{e.className}</TableCell>
                    <TableCell>{e.waitlistPosition ?? "—"}</TableCell>
                    <TableCell className="capitalize">{e.enrollmentStatus}</TableCell>
                    <TableCell>
                      <PaymentStatusBadge status={e.paymentStatus} />
                    </TableCell>
                    <TableCell>
                      <ClassStatusBadge status={e.classStatus} />
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
