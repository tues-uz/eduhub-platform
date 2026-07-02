import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Phone, Square2Stack, User } from "@/lib/icons";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { eduhubAdmin, eduhubCategories, ApiError } from "@/api/eduhubClient";
import { adminTeachersStore } from "@/features/admin/data/adminTeachersStore";
import { dummyStaffUsersStore } from "@/features/admin/data/dummyStaffUsersStore";
import {
  isValidAdminActionCode,
  normalizeAdminCode,
  registerAdminStaffCode,
} from "@/features/admin/adminStaffCode";
import type { StaffRoleConfig } from "@/features/admin/adminStaffRoles";
import { isApiCreateUserRoleSupported, usesDummyStaffUserCreate } from "@/features/admin/adminStaffRoles";

type Props = {
  config: StaffRoleConfig;
  backPath?: string;
  onSuccessNavigate?: string;
};

export function AdminCreateStaffUserForm({ config, onSuccessNavigate = "/dashboard/admin" }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [createdAccountEmail, setCreatedAccountEmail] = useState("");
  const [hasCopiedPassword, setHasCopiedPassword] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    adminCode: "",
    teacherCategory: "",
  });
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    if (!config.isTeacher) return;
    const loadCategories = async () => {
      try {
        const res = await eduhubCategories.getAll();
        setCategories((res || []).map((c) => c.name));
      } catch (err) {
        console.error("Failed to load categories", err);
      }
    };
    void loadCategories();
  }, [config.isTeacher]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.email || !formData.phoneNumber) {
      toast.error(t("admin.addUserRole.toast.fillAllFields"));
      return;
    }
    if (config.isTeacher && !formData.teacherCategory) {
      toast.error(t("admin.addUserRole.toast.selectCategory"));
      return;
    }
    if (config.requiresAdminCode && !isValidAdminActionCode(formData.adminCode)) {
      toast.error(t("admin.addUserRole.toast.invalidAdminCode"));
      return;
    }

    setIsLoading(true);
    try {
      const adminCode = config.requiresAdminCode ? normalizeAdminCode(formData.adminCode) : undefined;

      if (usesDummyStaffUserCreate(config.apiRole)) {
        const res = dummyStaffUsersStore.create({
          fullName: formData.fullName,
          email: formData.email,
          phoneNumber: formData.phoneNumber,
          apiRole: config.apiRole,
          adminCode,
        });
        if (adminCode) registerAdminStaffCode(formData.email, adminCode);
        setTemporaryPassword(res.temporaryPassword);
        setCreatedAccountEmail(res.user.email);
        setHasCopiedPassword(false);
        toast.success(t("admin.addUserRole.toast.demoAccountCreated", { role: t(config.titleKey) }));
        return;
      }

      const res = await eduhubAdmin.createUser({
        fullName: formData.fullName,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        role: config.apiRole,
        adminCode,
        category: config.isTeacher ? formData.teacherCategory : undefined,
      });
      if (config.requiresAdminCode && adminCode) {
        registerAdminStaffCode(formData.email, adminCode);
      }
      if (config.isTeacher) {
        adminTeachersStore.upsertByEmail({
          name: formData.fullName.trim(),
          email: formData.email.trim(),
          category: formData.teacherCategory,
          coursesTaught: [],
          totalStudents: 0,
          status: "Active",
        });
      }
      setTemporaryPassword(res.temporaryPassword);
      setCreatedAccountEmail(res.user.email);
      setHasCopiedPassword(false);
      toast.success(t("admin.addUserRole.toast.accountCreated", { role: t(config.titleKey) }));
    } catch (err: unknown) {
      if (!isApiCreateUserRoleSupported(config.apiRole)) {
        toast.error(t("admin.addUserRole.toast.roleNotSupportedByApi", { role: config.apiRole }));
      } else if (err instanceof ApiError && err.status >= 500) {
        toast.error(t("admin.addUserRole.toast.serverError"));
      } else {
        toast.error(err instanceof Error ? err.message : t("admin.addUserRole.toast.createFailed"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCopyTemporaryPassword = async () => {
    try {
      await navigator.clipboard.writeText(temporaryPassword);
      setHasCopiedPassword(true);
      toast.success(t("admin.addUserRole.toast.passwordCopied"));
    } catch {
      toast.error(t("admin.addUserRole.toast.copyFailed"));
    }
  };

  const handleTemporaryPasswordStored = () => {
    setTemporaryPassword("");
    navigate(onSuccessNavigate);
  };

  return (
    <>
      <form
        className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 space-y-4"
        onSubmit={handleSubmit}
      >
        {usesDummyStaffUserCreate(config.apiRole) ? (
          <p className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-950">
            {t("admin.addUserRole.form.demoModeHint")}
          </p>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="fullName">{t("admin.addUserRole.form.fullName")}</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              id="fullName"
              name="fullName"
              type="text"
              required
              placeholder={t("admin.addUserRole.form.fullNamePlaceholder")}
              value={formData.fullName}
              onChange={handleChange}
              autoComplete="name"
              className="pl-10 bg-white"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">{t("admin.shared.email")}</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            placeholder={t("admin.addUserRole.form.emailPlaceholder")}
            value={formData.email}
            onChange={handleChange}
            autoComplete="email"
            spellCheck={false}
            className="bg-white"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phoneNumber">{t("admin.addUserRole.form.phoneNumber")}</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              id="phoneNumber"
              name="phoneNumber"
              type="tel"
              required
              placeholder={t("admin.addUserRole.form.phonePlaceholder")}
              value={formData.phoneNumber}
              onChange={handleChange}
              autoComplete="tel"
              inputMode="tel"
              className="pl-10 bg-white"
            />
          </div>
        </div>

        {config.isTeacher ? (
          <div className="space-y-2">
            <Label>{t("admin.shared.category")}</Label>
            <Select
              required
              value={formData.teacherCategory}
              onValueChange={(value) => setFormData({ ...formData, teacherCategory: value })}
            >
              <SelectTrigger className="bg-white">
                <SelectValue placeholder={t("admin.addUserRole.form.selectCategory")} />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        {config.requiresAdminCode ? (
          <div className="space-y-2">
            <Label htmlFor="adminCode">{t("admin.addUserRole.form.adminCode")}</Label>
            <Input
              id="adminCode"
              name="adminCode"
              type="text"
              required
              placeholder={t("admin.addUserRole.form.adminCodePlaceholder")}
              value={formData.adminCode}
              onChange={(e) => setFormData({ ...formData, adminCode: e.target.value.toUpperCase() })}
              className="bg-white font-mono text-sm uppercase max-w-[180px]"
              maxLength={16}
              autoComplete="off"
              spellCheck={false}
            />
            <p className="text-xs text-slate-500">{t("admin.addUserRole.form.adminCodeHint")}</p>
          </div>
        ) : null}

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800"
        >
          {isLoading ? t("admin.shared.creating") : t("admin.addUserRole.form.createUser")}
        </Button>
      </form>

      <Dialog
        open={Boolean(temporaryPassword)}
        onOpenChange={(open) => {
          if (!open) {
            toast.info(t("admin.addUserRole.tempPasswordDialog.leaveWarning"));
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.addUserRole.tempPasswordDialog.title")}</DialogTitle>
            <DialogDescription>
              {t("admin.addUserRole.tempPasswordDialog.description", { email: createdAccountEmail })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-950">
            <p className="text-sm font-medium">{t("admin.addUserRole.tempPasswordDialog.instruction")}</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={temporaryPassword}
                readOnly
                className="font-mono tracking-wide bg-white"
                aria-label={t("admin.addUserRole.tempPasswordDialog.ariaLabel")}
              />
              <Button type="button" variant="outline" onClick={handleCopyTemporaryPassword} className="min-h-10 gap-2">
                {hasCopiedPassword ? <Check className="h-4 w-4" aria-hidden="true" /> : <Square2Stack className="h-4 w-4" aria-hidden="true" />}
                {hasCopiedPassword ? t("admin.shared.copied") : t("admin.shared.copy")}
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" onClick={handleTemporaryPasswordStored}>
              {t("admin.addUserRole.tempPasswordDialog.storedSecurely")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
