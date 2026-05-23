import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Search } from "@/lib/icons";
import DashboardSidebar from "@/components/DashboardSidebar";
import { useAuthSession } from "@/features/auth/context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  hasPayrollProofFile,
  payrollProofKey,
  usePayrollProofMap,
} from "@/features/admin/data/adminPayrollProofStore";
import { formatThousandsInText } from "@/lib/utils";
import { useInstructorPayrollRequests } from "@/features/teacher/data/instructorPayrollRequestStore";

function formatRelativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return iso;
  const diff = Date.now() - t;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 14) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });
}

function StatusPill({ status }: { status: "pending" | "approved" | "rejected" }) {
  if (status === "approved") {
    return <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-900">Approved</span>;
  }
  if (status === "rejected") {
    return <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-900">Not approved</span>;
  }
  return <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900">Pending</span>;
}

export default function TeacherPayrollSubmissionsPage() {
  const { user } = useAuthSession();
  const emailNorm = user.email.trim().toLowerCase();
  const nameNorm = (user.name ?? "").trim().toLowerCase();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    () => localStorage.getItem("sidebarCollapsed") === "true",
  );
  const [q, setQ] = useState("");

  useEffect(() => {
    const check = () => setIsSidebarCollapsed(localStorage.getItem("sidebarCollapsed") === "true");
    check();
    const id = setInterval(check, 100);
    return () => clearInterval(id);
  }, []);

  const all = useInstructorPayrollRequests();
  const proofMap = usePayrollProofMap();

  const mine = useMemo(() => {
    return all.filter((r) => {
      const re = r.instructorEmailNorm.trim().toLowerCase();
      if (emailNorm && re && re === emailNorm) return true;
      if (!re && nameNorm && r.instructorName.trim().toLowerCase() === nameNorm) return true;
      return false;
    });
  }, [all, emailNorm, nameNorm]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return mine;
    return mine.filter((r) => {
      const hay = [
        r.classSection,
        r.course,
        r.periodLabel,
        r.sessionsTaught,
        r.requestedPayout,
        r.payoutDetails,
        r.summary,
        r.instructorNotes,
        r.adminNote ?? "",
        r.status,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(s);
    });
  }, [mine, q]);

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)),
    [filtered],
  );

  const pendingCount = useMemo(() => sorted.filter((r) => r.status === "pending").length, [sorted]);

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <DashboardSidebar />
      <main
        className={`min-h-[calc(100dvh-4rem)] lg:min-h-dvh pt-16 lg:pt-5 pb-20 transition-all duration-300 ${
          isSidebarCollapsed ? "lg:pl-20" : "lg:pl-64"
        }`}
      >
        <div className="container mx-auto px-6 max-w-5xl">
          <Link
            to="/dashboard/teacher/payroll"
            className="inline-flex items-center gap-2 text-sm text-foreground/70 hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Payroll
          </Link>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">Payroll submissions</h1>
              <p className="text-foreground/60 text-sm mt-1">
                Track your monthly submissions (pending / approved / not approved). After admin records a bank transfer,{" "}
                <span className="text-foreground/75">Transfer proof</span> shows here and you get a notification.
              </p>
            </div>
            <Button asChild variant="outline" className="rounded-full">
              <Link to="/dashboard/teacher/notifications">View notifications</Link>
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 mb-6">
            <Card className="rounded-2xl border-slate-200/90 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-700">Total submissions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-slate-900 tabular-nums">{sorted.length}</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-slate-200/90 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-700">Pending</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-slate-900 tabular-nums">{pendingCount}</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-slate-200/90 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-700">Search</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" aria-hidden />
                  <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Class, period, status…"
                    className="bg-white pl-9"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {sorted.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center text-sm text-slate-600">
              No submissions yet. Open <Link className="underline" to="/dashboard/teacher/payroll">Payroll</Link> and submit your
              class payroll to admin.
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Class</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Transfer proof</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Admin note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted.map((r) => {
                    const proofOnFile = hasPayrollProofFile(proofMap[payrollProofKey(r.classSection, r.course)]);
                    return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium text-slate-900">
                        <div className="min-w-0">
                          <p className="truncate">{r.classSection}</p>
                          <p className="text-xs text-slate-500 truncate">{r.course}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-700">{r.periodLabel || "—"}</TableCell>
                      <TableCell className="text-slate-700 tabular-nums">
                        {r.requestedPayout ? formatThousandsInText(r.requestedPayout) : "—"}
                      </TableCell>
                      <TableCell>
                        <StatusPill status={r.status} />
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {proofOnFile ? (
                          <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-900">
                            On file
                          </span>
                        ) : r.status === "approved" ? (
                          <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                            Awaiting admin
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-600">{formatRelativeTime(r.submittedAt)}</TableCell>
                      <TableCell className="text-slate-600">
                        <span className="line-clamp-2">{r.adminNote?.trim() || "—"}</span>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

