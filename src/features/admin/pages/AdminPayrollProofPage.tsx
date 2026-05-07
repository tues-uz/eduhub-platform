import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { PayrollInstructorProofPanel } from "@/features/admin/components/PayrollInstructorProofPanel";
import { Button } from "@/components/ui/button";
import { useAdminPayments } from "@/features/admin/data/adminPaymentsStore";

function decodeParam(v: string | null): string {
  if (v == null || v === "") return "";
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

const INSTRUCTOR_SHARE = 0.7;

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

export default function AdminPayrollProofPage() {
  const [searchParams] = useSearchParams();
  const section = decodeParam(searchParams.get("section"));
  const course = decodeParam(searchParams.get("course"));
  const instructor = decodeParam(searchParams.get("instructor"));
  const instructorEmail = decodeParam(searchParams.get("instructorEmail"));

  const payments = useAdminPayments();

  const sectionPayments = useMemo(
    () => payments.filter((p) => p.className === section && p.course === course),
    [payments, section, course],
  );

  const payrollSummary = useMemo(() => {
    if (sectionPayments.length === 0) {
      return "No tuition rows for this class in the current payment list.";
    }
    const collected = new Map<string, number>();
    const outstanding = new Map<string, number>();
    for (const p of sectionPayments) {
      if (p.status === "paid") {
        collected.set(p.currency, (collected.get(p.currency) ?? 0) + p.amount);
      } else {
        outstanding.set(p.currency, (outstanding.get(p.currency) ?? 0) + p.amount);
      }
    }
    const lines = (m: Map<string, number>) =>
      Array.from(m.entries())
        .map(([c, a]) => formatMoney(a, c))
        .join(", ") || "—";
    const payout =
      Array.from(collected.entries())
        .map(([c, a]) => formatMoney(Math.round(a * INSTRUCTOR_SHARE), c))
        .join(", ") || "—";
    return `Collected ${lines(collected)}. Outstanding ${lines(outstanding)}. Est. instructor share (${Math.round(INSTRUCTOR_SHARE * 100)}% of collected) ${payout}.`;
  }, [sectionPayments]);

  const valid = section.length > 0 && course.length > 0;

  return (
    <AdminLayout>
      <div className="container mx-auto max-w-2xl px-6">
        <Link
          to="/dashboard/admin/payroll"
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to payroll
        </Link>

        {!valid ? (
          <>
            <AdminPageHeader
              title="Instructor payout proof"
              description="Open this page from Payroll — pick a class card and use “Upload proof”."
            />
            <Button asChild variant="outline" size="sm">
              <Link to="/dashboard/admin/payroll">Go to payroll</Link>
            </Button>
          </>
        ) : (
          <>
            <AdminPageHeader
              title="Instructor payout proof"
              description="Attach bank transfer confirmation. Submit records the payout, logs it for admins, and notifies the instructor when their email is on file."
            />

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <dl className="space-y-2 text-sm">
                <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
                  <dt className="text-slate-500 shrink-0 w-24">Class</dt>
                  <dd className="font-medium text-slate-900">{section}</dd>
                </div>
                <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
                  <dt className="text-slate-500 shrink-0 w-24">Course</dt>
                  <dd className="text-slate-800">{course}</dd>
                </div>
                {instructor ? (
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
                    <dt className="text-slate-500 shrink-0 w-24">Instructor</dt>
                    <dd className="text-slate-800">{instructor}</dd>
                  </div>
                ) : null}
                {instructorEmail ? (
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
                    <dt className="text-slate-500 shrink-0 w-24">Email</dt>
                    <dd className="text-slate-800">{instructorEmail}</dd>
                  </div>
                ) : (
                  <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-md px-3 py-2">
                    No lecturer email on this link — add <span className="font-medium">lecturer email</span> to payment
                    rows so the instructor gets an in-app notification.
                  </p>
                )}
              </dl>

              <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 text-xs text-slate-600">
                <span className="font-medium text-slate-700">Payment summary for notification: </span>
                {payrollSummary}
              </div>

              <div className="mt-6">
                <PayrollInstructorProofPanel
                  className={section}
                  course={course}
                  embedded={false}
                  instructorName={instructor || undefined}
                  instructorEmail={instructorEmail || undefined}
                  payrollSummary={payrollSummary}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
