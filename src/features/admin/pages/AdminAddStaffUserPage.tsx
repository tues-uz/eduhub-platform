import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Globe } from "@/lib/icons";
import { useTranslation } from "react-i18next";
import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { AdminCreateStaffUserForm } from "@/features/admin/components/AdminCreateStaffUserForm";
import { ADMIN_CONTENT_HOME, staffRoleConfigBySlug } from "@/features/admin/adminStaffRoles";
import { Button } from "@/components/ui/button";

export default function AdminAddStaffUserPage() {
  const { t } = useTranslation();
  const { roleSlug } = useParams<{ roleSlug: string }>();
  const config = roleSlug ? staffRoleConfigBySlug(roleSlug) : undefined;

  if (!config) {
    return <Navigate to="/dashboard/admin/add-user" replace />;
  }

  return (
    <AdminLayout>
      <div className="container mx-auto px-6 max-w-lg">
        <Link
          to="/dashboard/admin/add-user"
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("admin.addUserRole.hub.backToHub")}
        </Link>

        <AdminPageHeader title={t(config.titleKey)} description={t(config.descriptionKey)} />

        {config.slug === "admin-content" ? (
          <div className="mb-6 rounded-lg border border-violet-200 bg-violet-50 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-100">
                <Globe className="h-5 w-5 text-violet-700" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-violet-950">
                  {t("admin.contentHub.preview.title")}
                </p>
                <p className="mt-1 text-sm text-violet-900/80">{t("admin.contentHub.preview.description")}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" className="bg-violet-700 hover:bg-violet-800" asChild>
                    <Link to="/dashboard/admin/landing-page">
                      {t("admin.contentHub.featured.landingPage.cta")}
                      <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                  <Button size="sm" variant="outline" className="border-violet-200 bg-white" asChild>
                    <Link to={ADMIN_CONTENT_HOME}>{t("admin.contentHub.preview.openHub")}</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <AdminCreateStaffUserForm
          config={config}
          onSuccessNavigate={config.slug === "admin-content" ? ADMIN_CONTENT_HOME : undefined}
        />
      </div>
    </AdminLayout>
  );
}
