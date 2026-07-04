import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  Banknotes,
  ClipboardList,
  CreditCard,
  FileCheck,
  Receipt,
  CircleDollarSign,
} from "@/lib/icons";
import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { useAuthSession } from "@/features/auth/context";
import { enrollmentApplicationStore } from "@/features/enrollment/enrollmentApplicationStore";
import { useEnrollmentInstallmentPayments } from "@/features/enrollment/enrollmentInstallmentPaymentStore";
import { scheduleMonthOrdinalLabel } from "@/features/enrollment/enrollmentInstallmentPayments";
import { formatDisplayPersonName } from "@/lib/formatPersonName";

const QUICK_ACTIONS = [
  {
    labelKey: "adminNav.enrollmentApplications",
    path: "/dashboard/admin/enrollment-applications",
    icon: FileCheck,
  },
  {
    labelKey: "adminNav.scheduleMonthPayments",
    path: "/dashboard/admin/installment-payments",
    icon: CreditCard,
  },
  {
    labelKey: "adminNav.paymentsReminders",
    path: "/dashboard/admin/payments",
    icon: Receipt,
  },
  {
    labelKey: "adminNav.payroll",
    path: "/dashboard/admin/payroll",
    icon: Banknotes,
  },
  {
    labelKey: "adminNav.transactions",
    path: "/dashboard/admin/transactions",
    icon: ClipboardList,
  },
] as const;

export default function AdminFinanceDashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuthSession();
  const installmentPayments = useEnrollmentInstallmentPayments();
  const [applications, setApplications] = useState(() => enrollmentApplicationStore.list());

  useEffect(() => {
    const sync = () => setApplications(enrollmentApplicationStore.list());
    window.addEventListener("eduhub-enrollment-applications-changed", sync);
    return () => window.removeEventListener("eduhub-enrollment-applications-changed", sync);
  }, []);

  const pendingApplications = useMemo(
    () => applications.filter((a) => a.status === "PENDING"),
    [applications],
  );
  const pendingInstallments = useMemo(
    () => installmentPayments.filter((p) => p.status === "PENDING"),
    [installmentPayments],
  );

  const stats = [
    {
      label: t("admin.financeDashboard.stats.pendingApplications"),
      value: pendingApplications.length,
      icon: FileCheck,
      color: "text-amber-700",
      bg: "bg-amber-50 border-amber-200",
    },
    {
      label: t("admin.financeDashboard.stats.pendingInstallments"),
      value: pendingInstallments.length,
      icon: CreditCard,
      color: "text-sky-700",
      bg: "bg-sky-50 border-sky-200",
    },
    {
      label: t("admin.financeDashboard.stats.payrollQueue"),
      value: "—",
      icon: Banknotes,
      color: "text-emerald-700",
      bg: "bg-emerald-50 border-emerald-200",
    },
  ];

  return (
    <AdminLayout>
      <div className="container mx-auto px-6 max-w-5xl">
        <div className="mb-8 pb-6 border-b border-slate-200">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold text-slate-900 mb-1.5 tracking-tight">
                {formatDisplayPersonName(user.name)}
              </h1>
              <p className="text-slate-600 text-sm font-medium">{t("admin.financeDashboard.subtitle")}</p>
            </div>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-md uppercase tracking-wide border border-emerald-200">
              <CircleDollarSign className="h-3.5 w-3.5" aria-hidden />
              {t("admin.addUserRole.roles.adminFinance")}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className={`rounded-lg border p-5 ${stat.bg}`}>
                <div className="flex items-start justify-between mb-3">
                  <Icon className={`h-5 w-5 ${stat.color}`} aria-hidden />
                </div>
                <p className="text-3xl font-bold text-slate-900 mb-1">{stat.value}</p>
                <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">{stat.label}</p>
              </div>
            );
          })}
        </div>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-3">{t("admin.financeDashboard.quickActions")}</h2>
          <div className="flex flex-wrap gap-2">
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <Button key={action.path} variant="outline" className="rounded-lg bg-white" asChild>
                  <Link to={action.path}>
                    <Icon className="h-4 w-4 mr-2" aria-hidden />
                    {t(action.labelKey)}
                  </Link>
                </Button>
              );
            })}
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h2 className="text-base font-semibold text-slate-900">
                {t("admin.financeDashboard.workQueue.applications")}
              </h2>
              <Button variant="ghost" size="sm" className="h-8 text-slate-600" asChild>
                <Link to="/dashboard/admin/enrollment-applications">
                  {t("common.viewAll")}
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
            {pendingApplications.length === 0 ? (
              <p className="px-5 py-8 text-sm text-slate-500">{t("admin.financeDashboard.workQueue.emptyApplications")}</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {pendingApplications.slice(0, 5).map((app) => (
                  <li key={app.id}>
                    <Link
                      to={`/dashboard/admin/enrollment-applications/${encodeURIComponent(app.id)}`}
                      className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-slate-50"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{app.fullName}</p>
                        <p className="text-xs text-slate-500 truncate">{app.courseTitle ?? app.courseId}</p>
                      </div>
                      <span className="shrink-0 text-xs font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full">
                        {t("admin.financeDashboard.workQueue.pending")}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h2 className="text-base font-semibold text-slate-900">
                {t("admin.financeDashboard.workQueue.installments")}
              </h2>
              <Button variant="ghost" size="sm" className="h-8 text-slate-600" asChild>
                <Link to="/dashboard/admin/installment-payments">
                  {t("common.viewAll")}
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
            {pendingInstallments.length === 0 ? (
              <p className="px-5 py-8 text-sm text-slate-500">{t("admin.financeDashboard.workQueue.emptyInstallments")}</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {pendingInstallments.slice(0, 5).map((payment) => (
                  <li key={payment.id} className="px-5 py-3.5">
                    <p className="text-sm font-medium text-slate-900">{payment.studentName}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {payment.courseTitle} · {scheduleMonthOrdinalLabel(payment.scheduleMonth)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </AdminLayout>
  );
}
