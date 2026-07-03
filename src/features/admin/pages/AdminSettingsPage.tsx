import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "@/lib/icons";
import { toast } from "sonner";
import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  LanguageSettingsSection,
  persistUiLanguagePreference,
} from "@/features/settings/LanguageSettingsSection";

export default function AdminSettingsPage() {
  const { t } = useTranslation();

  return (
    <AdminLayout>
      <div className="container mx-auto px-6 max-w-lg">
        <Link to="/dashboard/admin" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-6">
          <ArrowLeft className="h-4 w-4" />
          {t("admin.shared.backToDashboard")}
        </Link>

        <AdminPageHeader title={t("common.settings")} description={t("admin.settings.description")} />

        <div className="space-y-6">
          <LanguageSettingsSection
            selectId="admin-language"
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
          />

          <div className="bg-white border border-slate-200 rounded-lg shadow-sm divide-y divide-slate-200">
            <div className="p-4 flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="notify" className="text-base">
                  {t("admin.settings.emailAdminsOnRegistration")}
                </Label>
                <p className="text-xs text-slate-500 mt-0.5">{t("admin.settings.emailAdminsHint")}</p>
              </div>
              <Switch id="notify" defaultChecked />
            </div>
            <div className="p-4 flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="strict" className="text-base">
                  {t("admin.settings.blockLmsWhenOverdue")}
                </Label>
                <p className="text-xs text-slate-500 mt-0.5">{t("admin.settings.blockLmsHint")}</p>
              </div>
              <Switch id="strict" />
            </div>
          </div>
        </div>

        <Button
          className="mt-6 bg-slate-900 hover:bg-slate-800"
          type="button"
          onClick={() => {
            persistUiLanguagePreference();
            toast.success(t("admin.settings.savedDemo"));
          }}
        >
          {t("admin.settings.saveChanges")}
        </Button>
      </div>
    </AdminLayout>
  );
}
