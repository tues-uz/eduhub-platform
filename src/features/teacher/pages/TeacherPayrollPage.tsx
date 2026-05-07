import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import DashboardSidebar from "@/components/DashboardSidebar";
import { useAuthSession } from "@/features/auth/context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PaymentStatusBadge } from "@/features/admin/components/AdminStatusBadges";
import type { AdminPaymentRow } from "@/features/admin/data/adminOperationalMock";
import { useAdminPayments } from "@/features/admin/data/adminPaymentsStore";
import { teacherCoursesStore } from "@/features/teacher/data/teacherCoursesStore";
import { eduhubCourses } from "@/api/eduhubClient";
import type { TeacherCourse } from "@/features/teacher/types";
import {
  aggregatePaymentsByClass,
  buildPayrollSummaryText,
  currencyMapToFormattedLines,
  estimateInstructorPayoutLines,
  formatMoney,
  INSTRUCTOR_REVENUE_SHARE,
} from "@/features/payroll/classPayrollAggregate";
import {
  instructorPayrollRequestDedupeKey,
  instructorPayrollRequestStore,
  useInstructorPayrollRequests,
  type InstructorPayrollRequestRecord,
} from "@/features/teacher/data/instructorPayrollRequestStore";

function paymentMatchesInstructor(p: AdminPaymentRow, emailNorm: string, nameNorm: string): boolean {
  const le = (p.lecturerEmail ?? "").trim().toLowerCase();
  const ln = (p.lecturerName ?? "").trim().toLowerCase();
  if (emailNorm && le && le === emailNorm) return true;
  if (nameNorm && ln && ln === nameNorm) return true;
  return false;
}

function latestRequestForClass(
  requests: InstructorPayrollRequestRecord[],
  classSection: string,
  course: string,
  emailNorm: string,
  instructorName: string,
) {
  const key = instructorPayrollRequestDedupeKey(classSection, course, emailNorm, instructorName);
  const relevant = requests.filter(
    (r) =>
      instructorPayrollRequestDedupeKey(r.classSection, r.course, r.instructorEmailNorm, r.instructorName) === key,
  );
  relevant.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  return relevant[0];
}

export default function TeacherPayrollPage() {
  const { user } = useAuthSession();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => localStorage.getItem("sidebarCollapsed") === "true");
  const [search, setSearch] = useState("");
  const [courses, setCourses] = useState<TeacherCourse[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [openSubmitKey, setOpenSubmitKey] = useState<string | null>(null);
  const [formByClass, setFormByClass] = useState<
    Record<
      string,
      {
        periodLabel: string;
        sessionsTaught: string;
        requestedPayout: string;
        payoutDetails: string;
        instructorNotes: string;
      }
    >
  >({});

  const updateForm = (
    ck: string,
    patch: Partial<{
      periodLabel: string;
      sessionsTaught: string;
      requestedPayout: string;
      payoutDetails: string;
      instructorNotes: string;
    }>,
  ) => {
    setFormByClass((prev) => ({
      ...prev,
      [ck]: {
        periodLabel: "",
        sessionsTaught: "",
        requestedPayout: "",
        payoutDetails: "",
        instructorNotes: "",
        ...(prev[ck] ?? {}),
        ...patch,
      },
    }));
  };

  useEffect(() => {
    const check = () => setIsSidebarCollapsed(localStorage.getItem("sidebarCollapsed") === "true");
    check();
    const id = setInterval(check, 100);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadClasses() {
      setCoursesLoading(true);
      const local = teacherCoursesStore.getAll();
      if (!user.id) {
        if (!cancelled) setCourses(local);
        if (!cancelled) setCoursesLoading(false);
        return;
      }
      try {
        const res = await eduhubCourses.getByLecturer(user.id);
        const apiCourses: TeacherCourse[] = (res || []).map((c) => ({
          id: c.id,
          title: c.title,
          description: "",
          instructorName: c.lecturerName,
          thumbnailUrl: c.thumbnailUrl,
          enrollmentCount: c.enrollmentCount,
          classMeetingsInSixMonths: c.classMeetingsInSixMonths,
          classMeetingSlots: c.classMeetingSlots,
          lessons: [],
          createdAt: c.createdAt,
          updatedAt: c.createdAt,
          status: c.status,
        }));
        const merged = [...apiCourses, ...local];
        // Keep this page lightweight; we don't enrich via GET /courses/{id} here.
        const dedup = new Map<string, TeacherCourse>();
        merged.forEach((c) => {
          if (!c?.id) return;
          dedup.set(c.id, c);
        });
        const out = Array.from(dedup.values());
        if (!cancelled) setCourses(out);
      } catch {
        if (!cancelled) setCourses(local);
      } finally {
        if (!cancelled) setCoursesLoading(false);
      }
    }
    loadClasses();
    return () => {
      cancelled = true;
    };
  }, [user.id]);

  const emailNorm = user.email.trim().toLowerCase();
  const nameNorm = (user.name ?? "").trim().toLowerCase();
  const instructorLabel = user.name?.trim() || "Instructor";

  const allPayments = useAdminPayments();
  const payrollRequests = useInstructorPayrollRequests();

  const payments = useMemo(() => {
    if (!emailNorm && !nameNorm) return [] as AdminPaymentRow[];
    return allPayments.filter((p) => paymentMatchesInstructor(p, emailNorm, nameNorm));
  }, [allPayments, emailNorm, nameNorm]);

  const filteredPayments = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return payments;
    return payments.filter((p) =>
      [
        p.studentName,
        p.studentEmail,
        p.className,
        p.course,
        p.reference,
        p.status,
        formatMoney(p.amount, p.currency),
      ]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [payments, search]);

  const classAggregates = useMemo(() => aggregatePaymentsByClass(filteredPayments), [filteredPayments]);

  const activeCourseTitles = useMemo(() => {
    if (coursesLoading) return [] as string[];
    const published = courses.filter((c) => c.status === "PUBLISHED");
    const base = (published.length > 0 ? published : courses).filter((c) => c.title?.trim());
    return base.map((c) => c.title.trim());
  }, [courses, coursesLoading]);

  const classCardModels = useMemo(() => {
    // Prefer payment-driven cards (best: includes real section names).
    if (classAggregates.length > 0) return classAggregates;
    // Fallback: show teacher's active classes even when there are no payment rows yet.
    return activeCourseTitles.map((title) => ({
      className: title,
      course: title,
      lecturerName: instructorLabel,
      lecturerEmail: emailNorm || undefined,
      paymentCount: 0,
      paidCount: 0,
      unpaidCount: 0,
      paidByCurrency: new Map<string, number>(),
      outstandingByCurrency: new Map<string, number>(),
    }));
  }, [activeCourseTitles, classAggregates, emailNorm, instructorLabel]);

  const totals = useMemo(() => {
    const byCurrency = new Map<string, number>();
    filteredPayments.forEach((p) => byCurrency.set(p.currency, (byCurrency.get(p.currency) ?? 0) + p.amount));
    return Array.from(byCurrency.entries()).map(([currency, amount]) => ({
      currency,
      amount,
      formatted: formatMoney(amount, currency),
    }));
  }, [filteredPayments]);

  const classCardKey = (className: string, course: string) => `${className}\t${course}`;

  const initFormIfMissing = (ck: string, suggestedPayout: string) => {
    setFormByClass((prev) => {
      if (prev[ck]) return prev;
      const d = new Date();
      const periodLabel = d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
      return {
        ...prev,
        [ck]: {
          periodLabel,
          sessionsTaught: "",
          requestedPayout: suggestedPayout,
          payoutDetails: "",
          instructorNotes: "",
        },
      };
    });
  };

  const onSubmitRequest = (className: string, course: string, summary: string, suggestedPayout: string) => {
    const ck = classCardKey(className, course);
    initFormIfMissing(ck, suggestedPayout);
    const f = formByClass[ck];
    if (!f) return;
    const instructorNotes = f.instructorNotes.trim();
    const result = instructorPayrollRequestStore.submit({
      classSection: className,
      course,
      instructorName: instructorLabel,
      instructorEmailNorm: emailNorm,
      periodLabel: f.periodLabel,
      sessionsTaught: f.sessionsTaught,
      requestedPayout: f.requestedPayout,
      payoutDetails: f.payoutDetails,
      summary,
      instructorNotes,
    });
    if (!result.ok) {
      toast.error("Could not submit", { description: result.reason });
      return;
    }
    toast.success("Payroll request sent", { description: "An admin will review it on the Payroll dashboard." });
    setOpenSubmitKey(null);
  };

  const missingProfile = !emailNorm && !nameNorm;

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
            to="/dashboard/teacher"
            className="inline-flex items-center gap-2 text-sm text-foreground/70 hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Teacher Dashboard
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground" style={{ letterSpacing: "0.5px" }}>
                Payroll
              </h1>
              <p className="text-foreground/60 text-sm mt-1 max-w-2xl">
                Your classes and student payments (demo data). Submit a payroll request per class for admin approval; after
                approval, finance may record payout proof separately.
              </p>
            </div>
            <Button asChild variant="outline" className="rounded-full w-full sm:w-auto">
              <Link to="/dashboard/teacher/payroll/submissions">My submissions</Link>
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 mb-8">
            <Card className="rounded-2xl border-slate-200/90 shadow-sm sm:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-700">Total tuition in view</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {totals.length === 0 ? (
                  <p className="text-2xl font-semibold text-slate-900 tabular-nums">—</p>
                ) : (
                  totals.map((t) => (
                    <p key={t.currency} className="text-2xl font-semibold text-slate-900 tabular-nums">
                      {t.formatted}
                    </p>
                  ))
                )}
                <p className="text-xs text-slate-500">
                  {filteredPayments.length} payment row(s) · {classAggregates.length} class section(s)
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-slate-200/90 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-700">Quick search</CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Student, class, invoice…"
                  className="bg-white"
                />
              </CardContent>
            </Card>
          </div>

          {missingProfile ? (
            <p className="text-slate-500 text-sm mb-8">Sign in with a profile so we can match your classes.</p>
          ) : classCardModels.length === 0 ? (
            <p className="text-slate-500 text-sm mb-8">
              {coursesLoading
                ? "Loading your classes…"
                : "No active classes yet. Create a class in My Class, then come back here to submit payroll."}
            </p>
          ) : (
            <div className="grid gap-6 mb-12">
              {classCardModels.map((agg) => {
                const ck = classCardKey(agg.className, agg.course);
                const paidLines = currencyMapToFormattedLines(agg.paidByCurrency);
                const outLines = currencyMapToFormattedLines(agg.outstandingByCurrency);
                const payoutLines = estimateInstructorPayoutLines(agg.paidByCurrency);
                const summaryText = buildPayrollSummaryText(agg);
                const suggestedPayout =
                  payoutLines.length === 0 ? "" : payoutLines.map((l) => l.formatted).join(", ");
                const latest = latestRequestForClass(
                  payrollRequests,
                  agg.className,
                  agg.course,
                  emailNorm,
                  instructorLabel,
                );
                const hasPending = latest?.status === "pending";
                const rows = filteredPayments.filter((p) => p.className === agg.className && p.course === agg.course);

                let statusBadge: { label: string; className: string } | null = null;
                if (hasPending) {
                  statusBadge = { label: "Pending admin review", className: "bg-amber-100 text-amber-900" };
                } else if (latest?.status === "approved") {
                  statusBadge = {
                    label: `Approved · ${latest.resolvedAt ? new Date(latest.resolvedAt).toLocaleDateString() : ""}`,
                    className: "bg-emerald-100 text-emerald-900",
                  };
                } else if (latest?.status === "rejected") {
                  statusBadge = {
                    label: `Not approved · ${latest.resolvedAt ? new Date(latest.resolvedAt).toLocaleDateString() : ""}`,
                    className: "bg-red-100 text-red-900",
                  };
                }

                return (
                  <Card key={ck} className="rounded-2xl border-slate-200/90 shadow-sm overflow-hidden">
                    <CardHeader className="pb-4 border-b border-slate-100 bg-white">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <CardTitle className="text-[18px] leading-snug text-slate-900 truncate">{agg.className}</CardTitle>
                          {agg.course && agg.course !== agg.className ? (
                            <p className="text-sm text-slate-500 mt-0.5 truncate">{agg.course}</p>
                          ) : null}
                          <p className="text-xs text-slate-500 mt-2">
                            {agg.paymentCount} invoice{agg.paymentCount === 1 ? "" : "s"} · {agg.paidCount} paid · {agg.unpaidCount} unpaid
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {statusBadge ? (
                            <span
                              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${statusBadge.className}`}
                            >
                              {statusBadge.label}
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                              Ready
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Collected</p>
                          <div className="mt-1 text-base font-semibold tabular-nums text-slate-900">
                            {paidLines.length === 0 ? (
                              <span className="text-slate-400">—</span>
                            ) : (
                              paidLines.map((l) => (
                                <p key={l.currency} className="leading-snug">
                                  {l.formatted}
                                </p>
                              ))
                            )}
                          </div>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Outstanding</p>
                          <div className="mt-1 text-base font-semibold tabular-nums text-slate-900">
                            {outLines.length === 0 ? (
                              <span className="text-slate-400">—</span>
                            ) : (
                              outLines.map((l) => (
                                <p key={l.currency} className="leading-snug">
                                  {l.formatted}
                                </p>
                              ))
                            )}
                          </div>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                            Est. payout ({Math.round(INSTRUCTOR_REVENUE_SHARE * 100)}%)
                          </p>
                          <div className="mt-1 text-base font-semibold tabular-nums text-slate-900">
                            {payoutLines.length === 0 ? (
                              <span className="text-slate-400">—</span>
                            ) : (
                              payoutLines.map((l) => (
                                <p key={l.currency} className="leading-snug">
                                  {l.formatted}
                                </p>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-5 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <p className="text-xs text-slate-500 leading-relaxed">
                          {summaryText}
                        </p>
                        <Button
                          type="button"
                          className="w-full sm:w-auto bg-[#3954d0] hover:bg-[#2f46b3]"
                          disabled={hasPending}
                          onClick={() => {
                            initFormIfMissing(ck, suggestedPayout);
                            setOpenSubmitKey(ck);
                          }}
                        >
                          {hasPending ? "Awaiting admin approval" : "Submit payroll"}
                        </Button>
                      </div>

                      <Accordion type="single" collapsible className="w-full border border-slate-200 rounded-xl px-4">
                        <AccordionItem value="students" className="border-0">
                          <AccordionTrigger className="text-sm font-medium text-slate-800 py-3 hover:no-underline">
                            View student payments ({rows.length})
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="overflow-x-auto -mx-2 pb-2">
                              <Table>
                                <TableHeader>
                                  <TableRow className="bg-slate-50">
                                    <TableHead>Student</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Due</TableHead>
                                    <TableHead>Paid</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {rows.map((p) => (
                                    <TableRow key={p.id}>
                                      <TableCell className="font-medium text-slate-900">
                                        <div className="min-w-0 max-w-[220px]">
                                          <p className="truncate">{p.studentName}</p>
                                          <p className="text-xs text-slate-500 truncate">{p.studentEmail}</p>
                                        </div>
                                      </TableCell>
                                      <TableCell className="tabular-nums">{formatMoney(p.amount, p.currency)}</TableCell>
                                      <TableCell>
                                        <PaymentStatusBadge status={p.status} />
                                      </TableCell>
                                      <TableCell className="tabular-nums text-slate-700">{p.dueDate}</TableCell>
                                      <TableCell className="tabular-nums text-slate-700">{p.paidAt ?? "—"}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>

                      {latest?.status === "rejected" && latest.adminNote ? (
                        <p className="text-sm text-red-800 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                          <span className="font-medium">Admin: </span>
                          {latest.adminNote}
                        </p>
                      ) : null}

                      <Dialog open={openSubmitKey === ck} onOpenChange={(open) => setOpenSubmitKey(open ? ck : null)}>
                        <DialogContent className="max-w-xl">
                          <DialogHeader>
                            <DialogTitle>Submit payroll for approval</DialogTitle>
                            <DialogDescription>
                              {agg.className} · {agg.course}. Admin will review and approve or reject.
                            </DialogDescription>
                          </DialogHeader>

                          <div className="grid gap-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs font-medium text-slate-700" htmlFor={`period-${ck}`}>
                                  Period
                                </label>
                                <Input
                                  id={`period-${ck}`}
                                  value={formByClass[ck]?.periodLabel ?? ""}
                                  onChange={(e) => updateForm(ck, { periodLabel: e.target.value })}
                                  placeholder="e.g. Apr 2026"
                                  className="mt-1 bg-white"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-medium text-slate-700" htmlFor={`sessions-${ck}`}>
                                  Sessions taught
                                </label>
                                <Input
                                  id={`sessions-${ck}`}
                                  value={formByClass[ck]?.sessionsTaught ?? ""}
                                  onChange={(e) => updateForm(ck, { sessionsTaught: e.target.value })}
                                  placeholder="e.g. 8/9"
                                  className="mt-1 bg-white"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="text-xs font-medium text-slate-700" htmlFor={`requested-${ck}`}>
                                Requested payout
                              </label>
                              <Input
                                id={`requested-${ck}`}
                                value={formByClass[ck]?.requestedPayout ?? ""}
                                onChange={(e) => updateForm(ck, { requestedPayout: e.target.value })}
                                placeholder="e.g. 2,100,000 UZS"
                                className="mt-1 bg-white"
                              />
                              <p className="text-[11px] text-slate-500 mt-1">
                                Suggestion (demo): {suggestedPayout || "—"}
                              </p>
                            </div>

                            <div>
                              <label className="text-xs font-medium text-slate-700" htmlFor={`payout-${ck}`}>
                                Payout details (optional)
                              </label>
                              <Input
                                id={`payout-${ck}`}
                                value={formByClass[ck]?.payoutDetails ?? ""}
                                onChange={(e) => updateForm(ck, { payoutDetails: e.target.value })}
                                placeholder="Bank account / card / reference…"
                                className="mt-1 bg-white"
                              />
                            </div>

                            <div>
                              <label className="text-xs font-medium text-slate-700" htmlFor={`notes-${ck}`}>
                                Notes to admin (optional)
                              </label>
                              <Textarea
                                id={`notes-${ck}`}
                                value={formByClass[ck]?.instructorNotes ?? ""}
                                onChange={(e) => updateForm(ck, { instructorNotes: e.target.value })}
                                placeholder="Any context for the admin…"
                                className="mt-1 bg-white min-h-[90px]"
                              />
                            </div>

                            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                              <span className="font-medium text-slate-700">System summary:</span> {summaryText}
                            </div>
                          </div>

                          <DialogFooter className="gap-2 sm:gap-2">
                            <Button type="button" variant="outline" onClick={() => setOpenSubmitKey(null)}>
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              className="bg-[#3954d0] hover:bg-[#2f46b3]"
                              onClick={() => onSubmitRequest(agg.className, agg.course, summaryText, suggestedPayout)}
                            >
                              Submit to admin
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
