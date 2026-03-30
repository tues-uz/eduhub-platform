import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { ClassStatusBadge, PaymentStatusBadge } from "@/features/admin/components/AdminStatusBadges";
import { mockAdminEnrollments } from "@/features/admin/data/adminOperationalMock";
import type { ClassStatus, PaymentStatus } from "@/features/admin/data/adminOperationalMock";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

export default function AdminEnrollmentsPage() {
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
          Back to dashboard
        </Link>

        <AdminPageHeader
          title="Enrollments & waitlist"
          description="Course enrollment, class assignment, and waitlist promotion. Server validates capacity and payment rules."
          actions={
            <Button
              size="sm"
              disabled={selectedWaitlist.length === 0}
              onClick={() => toast.success("Promotion request sent (demo)", { description: `${selectedWaitlist.length} row(s)` })}
            >
              Promote selected from waitlist
            </Button>
          }
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center mb-4">
          <Input
            placeholder="Search student, course, class…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md bg-white"
          />
          <Select value={paymentFilter} onValueChange={setPaymentFilter}>
            <SelectTrigger className="w-full sm:w-[160px] bg-white">
              <SelectValue placeholder="Payment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All payments</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
          <Select value={enrollmentFilter} onValueChange={setEnrollmentFilter}>
            <SelectTrigger className="w-full sm:w-[180px] bg-white">
              <SelectValue placeholder="Enrollment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All enrollments</SelectItem>
              <SelectItem value="enrolled">Enrolled</SelectItem>
              <SelectItem value="waiting">Waiting</SelectItem>
            </SelectContent>
          </Select>
          <Select value={classStatusFilter} onValueChange={setClassStatusFilter}>
            <SelectTrigger className="w-full sm:w-[170px] bg-white">
              <SelectValue placeholder="Class status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All class statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="waiting">Waiting</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
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
                <TableHead>Student</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Waitlist #</TableHead>
                <TableHead>Enrollment</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Class status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEnrollments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-slate-500">
                    No enrollments match your search or filters.
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
