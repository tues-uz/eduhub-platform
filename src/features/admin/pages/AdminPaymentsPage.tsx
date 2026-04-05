import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, FileCheck } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { PaymentStatusBadge } from "@/features/admin/components/AdminStatusBadges";
import {
  mockAdminPayments,
  type AdminPaymentRow,
} from "@/features/admin/data/adminOperationalMock";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<AdminPaymentRow[]>(() =>
    mockAdminPayments.map((p) => ({ ...p }))
  );
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [lecturerFilter, setLecturerFilter] = useState<string>("all");
  const [proofPaymentId, setProofPaymentId] = useState<string | null>(null);
  const [detailsPaymentId, setDetailsPaymentId] = useState<string | null>(null);
  const [markPaidPaymentId, setMarkPaidPaymentId] = useState<string | null>(null);

  const lecturerOptions = useMemo(() => {
    const names = new Set(payments.map((p) => p.lecturerName));
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [payments]);

  const filteredPayments = useMemo(() => {
    const q = search.trim().toLowerCase();
    return payments.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (lecturerFilter !== "all" && p.lecturerName !== lecturerFilter) return false;
      if (!q) return true;
      const haystack = [
        p.studentName,
        p.course,
        p.lecturerName,
        p.reference,
        p.studentEmail,
        formatMoney(p.amount, p.currency),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [payments, search, statusFilter, lecturerFilter]);

  const hasActiveFilters =
    search.trim() !== "" || statusFilter !== "all" || lecturerFilter !== "all";

  const selectedIds = Object.keys(selected).filter((id) => selected[id]);
  const markPaidPayment = markPaidPaymentId
    ? payments.find((p) => p.id === markPaidPaymentId)
    : undefined;
  const detailsPayment = detailsPaymentId
    ? payments.find((p) => p.id === detailsPaymentId)
    : undefined;
  const proofPayment = proofPaymentId
    ? payments.find((p) => p.id === proofPaymentId)
    : undefined;

  return (
    <AdminLayout>
      <div className="container mx-auto px-6">
        <Link to="/dashboard/admin" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        <AdminPageHeader
          title="Payments & reminders"
          description="Mark as paid, validate transfer proof, filter overdue, and send reminders. Authoritative status lives on the API."
          actions={
            <Button
              variant="outline"
              size="sm"
              disabled={selectedIds.length === 0}
              onClick={() => toast.message("Payment reminders sent (demo)", { description: `${selectedIds.length} row(s)` })}
            >
              Remind selected
            </Button>
          }
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center mb-4">
          <Input
            placeholder="Search student, course, lecturer, invoice…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md bg-white"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[160px] bg-white">
              <SelectValue placeholder="Payment status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
          <Select value={lecturerFilter} onValueChange={setLecturerFilter}>
            <SelectTrigger className="w-full sm:w-[180px] bg-white">
              <SelectValue placeholder="Lecturer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All lecturers</SelectItem>
              {lecturerOptions.map((name) => (
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
                setLecturerFilter("all");
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
                      filteredPayments.length > 0 &&
                      filteredPayments.every((p) => selected[p.id])
                    }
                    onCheckedChange={(v) => {
                      setSelected((prev) => {
                        const next = { ...prev };
                        if (v) {
                          filteredPayments.forEach((p) => {
                            next[p.id] = true;
                          });
                        } else {
                          filteredPayments.forEach((p) => {
                            delete next[p.id];
                          });
                        }
                        return next;
                      });
                    }}
                  />
                </TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Lecturer</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-slate-500">
                    No payments match your search or filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredPayments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <Checkbox
                      checked={!!selected[p.id]}
                      onCheckedChange={(v) => setSelected((s) => ({ ...s, [p.id]: !!v }))}
                    />
                  </TableCell>
                  <TableCell className="font-medium text-slate-900">{p.studentName}</TableCell>
                  <TableCell>{p.course}</TableCell>
                  <TableCell className="text-slate-700">{p.lecturerName}</TableCell>
                  <TableCell>{formatMoney(p.amount, p.currency)}</TableCell>
                  <TableCell>
                    <PaymentStatusBadge status={p.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <Button size="sm" variant="secondary" onClick={() => setDetailsPaymentId(p.id)}>
                        View details
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={p.status === "paid"}
                        onClick={() => setMarkPaidPaymentId(p.id)}
                      >
                        Mark paid
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <AlertDialog
          open={markPaidPaymentId !== null}
          onOpenChange={(open) => {
            if (!open) setMarkPaidPaymentId(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Mark payment as paid?</AlertDialogTitle>
              <AlertDialogDescription>
                Confirm this admin action only after you have verified the payment (for example, bank transfer received).
              </AlertDialogDescription>
            </AlertDialogHeader>
            {markPaidPayment ? (
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800">
                <p className="font-medium text-slate-900">{markPaidPayment.studentName}</p>
                <p className="text-slate-600">{markPaidPayment.course}</p>
                <p className="text-slate-600">Lecturer: {markPaidPayment.lecturerName}</p>
                <p className="text-slate-700 tabular-nums">
                  {formatMoney(markPaidPayment.amount, markPaidPayment.currency)} · due {markPaidPayment.dueDate}
                </p>
              </div>
            ) : null}
            <AlertDialogFooter>
              <AlertDialogCancel>No, cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  const id = markPaidPaymentId;
                  const label = markPaidPayment?.studentName;
                  if (id) {
                    const paidAt = new Date().toISOString().slice(0, 10);
                    setPayments((prev) =>
                      prev.map((p) =>
                        p.id === id ? { ...p, status: "paid", paidAt } : p
                      )
                    );
                    if (label) {
                      toast.success("Marked paid (demo)", { description: label });
                    }
                  }
                  setMarkPaidPaymentId(null);
                }}
              >
                Yes, mark as paid
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog
          open={detailsPaymentId !== null}
          onOpenChange={(open) => {
            if (!open) setDetailsPaymentId(null);
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Payment details</DialogTitle>
              {detailsPayment ? (
                <DialogDescription>
                  {detailsPayment.reference} · {detailsPayment.studentName}
                </DialogDescription>
              ) : null}
            </DialogHeader>
            {detailsPayment ? (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-1 gap-2 rounded-md border border-slate-200 bg-slate-50 p-3">
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">Student</span>
                    <span className="font-medium text-slate-900 text-right">{detailsPayment.studentName}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">Email</span>
                    <span className="text-slate-800 text-right break-all">{detailsPayment.studentEmail}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">Course</span>
                    <span className="text-slate-800 text-right">{detailsPayment.course}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">Lecturer</span>
                    <span className="text-slate-800 text-right">{detailsPayment.lecturerName}</span>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Amount</span>
                    <span className="font-semibold tabular-nums text-slate-900">
                      {formatMoney(detailsPayment.amount, detailsPayment.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Due date</span>
                    <span className="text-slate-800">{detailsPayment.dueDate}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Status</span>
                    <PaymentStatusBadge status={detailsPayment.status} />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Reference</span>
                    <span className="font-mono text-xs text-slate-800">{detailsPayment.reference}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Method</span>
                    <span className="text-slate-800">{detailsPayment.paymentMethod}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Created</span>
                    <span className="text-slate-800">{detailsPayment.createdAt}</span>
                  </div>
                  {detailsPayment.paidAt ? (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Paid at</span>
                      <span className="text-slate-800">{detailsPayment.paidAt}</span>
                    </div>
                  ) : null}
                  <div className="flex justify-between">
                    <span className="text-slate-500">Proof uploaded</span>
                    <span className="text-slate-800">{detailsPayment.proofSubmitted ? "Yes" : "No"}</span>
                  </div>
                </div>
              </div>
            ) : null}
            <DialogFooter className="gap-2 sm:gap-0">
              {detailsPayment?.proofSubmitted ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDetailsPaymentId(null);
                    setProofPaymentId(detailsPayment.id);
                  }}
                >
                  <FileCheck className="h-4 w-4 mr-2" />
                  Open proof
                </Button>
              ) : null}
              <Button type="button" onClick={() => setDetailsPaymentId(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={proofPaymentId !== null}
          onOpenChange={(open) => {
            if (!open) setProofPaymentId(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Transfer proof</DialogTitle>
              {proofPayment ? (
                <DialogDescription>
                  {proofPayment.studentName} · {proofPayment.reference}
                </DialogDescription>
              ) : null}
            </DialogHeader>
            <p className="text-sm text-slate-600">
              Preview uploaded receipt or PDF from storage. Approve to mark payment as validated and update student access.
            </p>
            <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 h-40 flex items-center justify-center text-sm text-slate-500">
              Demo: no file attached in mock data
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setProofPaymentId(null)}>
                Close
              </Button>
              <Button
                onClick={() => {
                  setProofPaymentId(null);
                  toast.success("Proof approved (demo)");
                }}
              >
                Approve proof
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
