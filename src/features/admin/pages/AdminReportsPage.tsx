import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, BarChart3 } from "@/lib/icons";
import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";

export default function AdminReportsPage() {
  const { t } = useTranslation();

  const kpis = [
    { labelKey: "admin.reports.kpis.activeEnrollments", value: "312", hintKey: "admin.shared.demo" },
    { labelKey: "admin.reports.kpis.overduePayments", value: "18", hintKey: "admin.shared.demo" },
    { labelKey: "admin.reports.kpis.certificates30d", value: "42", hintKey: "admin.shared.demo" },
  ] as const;

  return (
    <AdminLayout>
      <div className="container mx-auto px-6">
        <Link to="/dashboard/admin" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-6">
          <ArrowLeft className="h-4 w-4" />
          {t("admin.shared.backToDashboard")}
        </Link>

        <AdminPageHeader
          title={t("adminNav.reports")}
          description={t("admin.reports.description")}
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {kpis.map((k) => (
            <div key={k.labelKey} className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500 mb-2">
                <BarChart3 className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wide">{t(k.hintKey)}</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{k.value}</p>
              <p className="text-sm text-slate-600 mt-1">{t(k.labelKey)}</p>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
