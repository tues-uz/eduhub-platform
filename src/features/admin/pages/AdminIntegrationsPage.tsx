import { useTranslation } from "react-i18next";
import { ExternalLink } from "@/lib/icons";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const LMS_URL = "https://lms.example.com/sso";

export default function AdminIntegrationsPage() {
  const { t } = useTranslation();

  return (
      <div className="container mx-auto px-6 max-w-2xl">

        <AdminPageHeader
          title={t("adminNav.integrations")}
          description={t("admin.integrations.description")}
        />

        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="lms-url">{t("admin.integrations.lmsBaseUrl")}</Label>
            <div className="flex gap-2">
              <Input id="lms-url" readOnly value={LMS_URL} className="bg-slate-50 font-mono text-sm" />
              <Button type="button" variant="outline" size="icon" asChild>
                <a href={LMS_URL} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
            <p className="text-xs text-slate-500">{t("admin.integrations.lmsHint")}</p>
          </div>

          <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-medium text-slate-900 mb-1">{t("admin.integrations.freeTrialPolicy")}</p>
            <p>{t("admin.integrations.freeTrialDescription")}</p>
          </div>
        </div>
      </div>
  );
}
