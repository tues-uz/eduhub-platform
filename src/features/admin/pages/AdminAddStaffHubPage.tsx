import { Link } from "react-router-dom";
import { ChevronRight, GraduationCap, BarChart3, Heart, CircleDollarSign, BookOpen } from "@/lib/icons";
import { useTranslation } from "react-i18next";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { STAFF_ROLE_CONFIGS } from "@/features/admin/adminStaffRoles";
import type { LucideIcon } from "@/lib/icons";

const ROLE_ICONS: Record<string, LucideIcon> = {
  teacher: GraduationCap,
  "admin-finance": CircleDollarSign,
  "admin-content": BookOpen,
  "admin-support": Heart,
  "admin-analytic": BarChart3,
};

export default function AdminAddStaffHubPage() {
  const { t } = useTranslation();

  return (
      <div className="container mx-auto px-6 max-w-2xl">

        <AdminPageHeader
          title={t("adminNav.addStaff")}
          description={t("admin.addUserRole.hub.description")}
        />

        <div className="grid gap-3">
          {STAFF_ROLE_CONFIGS.map((config) => {
            const Icon = ROLE_ICONS[config.slug] ?? GraduationCap;
            return (
              <Link
                key={config.slug}
                to={`/dashboard/admin/add-user/${config.slug}`}
                className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                  <Icon className="h-5 w-5 text-slate-700" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-900">{t(config.titleKey)}</p>
                  </div>
                  <p className="mt-0.5 text-sm text-slate-600 line-clamp-2">{t(config.descriptionKey)}</p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" aria-hidden />
              </Link>
            );
          })}
        </div>
      </div>
  );
}
