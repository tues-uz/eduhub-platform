import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  LanguageSettingsSection,
  persistUiLanguagePreference,
} from "@/features/settings/LanguageSettingsSection";
import { AdminCategoriesManager } from "@/features/admin/components/AdminCategoriesManager";
import { AdminCourseLevelsManager } from "@/features/admin/components/AdminCourseLevelsManager";
import { Settings, Folder, GraduationCap } from "@/lib/icons";

export default function AdminSettingsPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get("tab") || "general";

  const handleTabChange = (val: string) => {
    setSearchParams({ tab: val });
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 max-w-5xl space-y-6 pb-12">
      <AdminPageHeader
        title={t("common.settings")}
        description={t("admin.settings.description")}
      />

      <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-6">
        <div className="border-b border-slate-200/80">
          <TabsList className="bg-transparent p-0 h-auto gap-2">
            <TabsTrigger
              value="general"
              className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm rounded-lg px-4 py-2.5 text-xs font-semibold text-slate-600 border border-transparent data-[state=active]:border-slate-200 flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              <span>{t("admin.settings.tabs.general")}</span>
            </TabsTrigger>

            <TabsTrigger
              value="categories"
              className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm rounded-lg px-4 py-2.5 text-xs font-semibold text-slate-600 border border-transparent data-[state=active]:border-slate-200 flex items-center gap-2"
            >
              <Folder className="w-4 h-4" />
              <span>{t("admin.settings.tabs.categories")}</span>
            </TabsTrigger>

            <TabsTrigger
              value="levels"
              className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm rounded-lg px-4 py-2.5 text-xs font-semibold text-slate-600 border border-transparent data-[state=active]:border-slate-200 flex items-center gap-2"
            >
              <GraduationCap className="w-4 h-4" />
              <span>{t("admin.settings.tabs.courseLevels")}</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="general" className="m-0 max-w-xl space-y-6">
          <LanguageSettingsSection
            selectId="admin-language"
            className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-6"
          />

          <div className="bg-white border border-slate-200/80 rounded-xl shadow-sm divide-y divide-slate-100 overflow-hidden">
            <div className="p-4 sm:p-5 flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="notify" className="text-sm font-semibold text-slate-900">
                  {t("admin.settings.emailAdminsOnRegistration")}
                </Label>
                <p className="text-xs text-slate-500 mt-0.5">{t("admin.settings.emailAdminsHint")}</p>
              </div>
              <Switch id="notify" defaultChecked />
            </div>
            <div className="p-4 sm:p-5 flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="strict" className="text-sm font-semibold text-slate-900">
                  {t("admin.settings.blockLmsWhenOverdue")}
                </Label>
                <p className="text-xs text-slate-500 mt-0.5">{t("admin.settings.blockLmsHint")}</p>
              </div>
              <Switch id="strict" />
            </div>
          </div>

          <Button
            className="bg-slate-900 hover:bg-slate-800 text-white shadow-sm"
            type="button"
            onClick={() => {
              persistUiLanguagePreference();
              toast.success(t("admin.settings.savedDemo"));
            }}
          >
            {t("admin.settings.saveChanges")}
          </Button>
        </TabsContent>

        <TabsContent value="categories" className="m-0">
          <AdminCategoriesManager />
        </TabsContent>

        <TabsContent value="levels" className="m-0">
          <AdminCourseLevelsManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
