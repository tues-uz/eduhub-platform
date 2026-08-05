import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { BarChart3 } from "@/lib/icons";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { eduhubAdminOverview } from "@/api/eduhubClient";

export default function AdminReportsPage() {
  const { t } = useTranslation();
  const [metrics, setMetrics] = useState<{ activeEnrollments?: number; overduePayments?: number; certificates30d?: number }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    eduhubAdminOverview.getOverview()
      .then((res: any) => {
        if (res) {
          setMetrics({
            activeEnrollments: res.totalStudents ?? res.activeEnrollments ?? 0,
            overduePayments: res.overduePayments ?? 0,
            certificates30d: res.certificatesIssued ?? res.certificates30d ?? 0,
          });
        }
      })
      .catch(() => {
        setMetrics({ activeEnrollments: 0, overduePayments: 0, certificates30d: 0 });
      })
      .finally(() => setLoading(false));
  }, []);

  const kpis = [
    { labelKey: "admin.reports.kpis.activeEnrollments", value: loading ? "..." : String(metrics.activeEnrollments ?? 0) },
    { labelKey: "admin.reports.kpis.overduePayments", value: loading ? "..." : String(metrics.overduePayments ?? 0) },
    { labelKey: "admin.reports.kpis.certificates30d", value: loading ? "..." : String(metrics.certificates30d ?? 0) },
  ];

  return (
    <div className="container mx-auto px-6">
      <AdminPageHeader
        title={t("adminNav.reports")}
        description={t("admin.reports.description")}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {kpis.map((k) => (
          <div key={k.labelKey} className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500 mb-2">
              <BarChart3 className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">{t("adminNav.reports")}</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{k.value}</p>
            <p className="text-sm text-slate-600 mt-1">{t(k.labelKey)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
