import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePayrollSubmissions } from "@/features/admin/data/adminPayrollHistoryStore";

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export default function AdminPayrollSubmissionsPage() {
  const rows = usePayrollSubmissions();
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) =>
      [r.classSection, r.course, r.instructorName, r.instructorEmail ?? "", r.summary, r.notesPreview ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(s),
    );
  }, [rows, q]);

  return (
    <AdminLayout>
      <div className="container mx-auto px-6">
        <Link
          to="/dashboard/admin/payroll"
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to payroll
        </Link>

        <AdminPageHeader
          title="Payroll submission log"
          description="Recorded when an admin submits payout proof for a class (local browser storage until API replaces it)."
          actions={
            <Button variant="outline" size="sm" asChild>
              <Link to="/dashboard/admin/payroll">Payroll overview</Link>
            </Button>
          }
        />

        <div className="mb-4 max-w-md">
          <Input
            placeholder="Search class, course, instructor, email…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="bg-white"
          />
        </div>

        <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Submitted</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Instructor</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="min-w-[200px]">Summary</TableHead>
                <TableHead className="min-w-[140px]">Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-sm text-slate-500">
                    {rows.length === 0
                      ? "No submissions yet. Submit payout proof from a class card on Payroll."
                      : "No rows match your search."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs text-slate-600 whitespace-nowrap">{formatWhen(r.submittedAt)}</TableCell>
                    <TableCell className="text-sm font-medium text-slate-900">{r.classSection}</TableCell>
                    <TableCell className="text-sm text-slate-700">{r.course}</TableCell>
                    <TableCell className="text-sm text-slate-700">{r.instructorName}</TableCell>
                    <TableCell className="text-xs text-slate-600">{r.instructorEmail ?? "—"}</TableCell>
                    <TableCell className="text-xs text-slate-700 max-w-xs">{r.summary}</TableCell>
                    <TableCell className="text-xs text-slate-500 max-w-[200px]">{r.notesPreview ?? "—"}</TableCell>
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
