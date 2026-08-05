import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "@/lib/icons";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { PayrollInstructorProofPanel } from "@/features/admin/components/PayrollInstructorProofPanel";
import { Button } from "@/components/ui/button";
import { useEnrollmentInstallmentPayments } from "@/features/enrollment/enrollmentInstallmentPaymentStore";
import { aggregateInstallmentPaymentsByClass, buildPayrollSummaryText } from "@/features/payroll/classPayrollAggregate";
import { useTranslation } from "react-i18next";

function decodeParam(v: string | null): string {
  if (v == null || v === "") return "";
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

export default function AdminPayrollProofPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const section = decodeParam(searchParams.get("section"));
  const course = decodeParam(searchParams.get("course"));
  const instructor = decodeParam(searchParams.get("instructor"));
  const instructorEmail = decodeParam(searchParams.get("instructorEmail"));

  const installmentPayments = useEnrollmentInstallmentPayments();
  const valid = section.length > 0 && course.length > 0;

  const sectionPayments = useMemo(
    () => installmentPayments.filter((p) => p.courseTitle === course),
    [installmentPayments, course],
  );

  const payrollSummary = useMemo(() => {
    if (!valid) return "";
    const aggs = aggregateInstallmentPaymentsByClass(sectionPayments);
    const agg = aggs[0];
    if (!agg || agg.paymentCount === 0) {
      return "No tuition rows for this class in the current payment list.";
    }
    return buildPayrollSummaryText(agg);
  }, [sectionPayments, valid]);

  return (
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
              title={t("admin.payrollProof.title")}
              description="Open this page from Payroll — pick a class card and use “Upload proof”."
            />
            <Button asChild variant="outline" size="sm">
              <Link to="/dashboard/admin/payroll">{t("admin.payrollProof.goToPayroll")}</Link>
            </Button>
          </>
        ) : (
          <>
            <AdminPageHeader
              title={t("admin.payrollProof.title")}
              description={t("admin.payrollProof.description")}
            />

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <dl className="space-y-2 text-sm">
                <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
                  <dt className="text-slate-500 shrink-0 w-24">{t("admin.shared.class")}</dt>
                  <dd className="font-medium text-slate-900">{section}</dd>
                </div>
                <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
                  <dt className="text-slate-500 shrink-0 w-24">{t("admin.shared.course")}</dt>
                  <dd className="text-slate-800">{course}</dd>
                </div>
                {instructor ? (
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
                    <dt className="text-slate-500 shrink-0 w-24">{t("admin.shared.instructor")}</dt>
                    <dd className="text-slate-800">{instructor}</dd>
                  </div>
                ) : null}
                {instructorEmail ? (
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
                    <dt className="text-slate-500 shrink-0 w-24">{t("admin.shared.email")}</dt>
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
  );
}
