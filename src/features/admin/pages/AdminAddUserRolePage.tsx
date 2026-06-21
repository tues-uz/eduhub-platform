import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Phone, Square2Stack, User } from "@/lib/icons";
import { toast } from "sonner";
import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
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
import { eduhubAdmin, eduhubCategories } from "@/api/eduhubClient";
import { adminTeachersStore } from "@/features/admin/data/adminTeachersStore";
import {
  isValidAdminActionCode,
  normalizeAdminCode,
  registerAdminStaffCode,
} from "@/features/admin/adminStaffCode";

/** Values are sent to `POST /admin/users`. Align with your API’s role enum (e.g. Spring `Role` names). */
const ADD_USER_ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: "LECTURER", label: "Teacher" },
  { value: "ADMIN_FINANCE", label: "Admin Finance" },
  { value: "ADMIN_CONTENT", label: "Admin Content" },
  { value: "ADMIN_SUPPORT", label: "Admin Support" },
  { value: "ADMIN_ANALYTIC", label: "Admin Analytic" },
];

export default function AdminAddUserRolePage() {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [createdAccountEmail, setCreatedAccountEmail] = useState("");
  const [hasCopiedPassword, setHasCopiedPassword] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    role: "",
    adminCode: "",
    teacherCategory: "",
  });
  const [categories, setCategories] = useState<string[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await eduhubCategories.getAll();
        setCategories((res || []).map((c) => c.name));
      } catch (err) {
        console.error("Failed to load categories", err);
      }
    };
    loadCategories();
  }, []);

  const isTeacherRole = formData.role === "LECTURER";
  const isAdminRole = formData.role !== "" && !isTeacherRole;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.email || !formData.phoneNumber || !formData.role) {
      toast.error(t("admin.addUserRole.toast.fillAllFields"));
      return;
    }
    if (isTeacherRole && !formData.teacherCategory) {
      toast.error(t("admin.addUserRole.toast.selectCategory"));
      return;
    }
    if (isAdminRole && !isValidAdminActionCode(formData.adminCode)) {
      toast.error(t("admin.addUserRole.toast.invalidAdminCode"));
      return;
    }

    setIsLoading(true);
    try {
      const adminCode = isAdminRole ? normalizeAdminCode(formData.adminCode) : undefined;
      const res = await eduhubAdmin.createUser({
        fullName: formData.fullName,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        role: formData.role,
        adminCode,
        category: isTeacherRole ? formData.teacherCategory : undefined,
      });
      if (isAdminRole && adminCode) {
        registerAdminStaffCode(formData.email, adminCode);
      }
      if (isTeacherRole) {
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
      toast.success(`${formData.role} account created successfully`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create user");
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
    navigate("/dashboard/admin");
  };

  return (
    <AdminLayout>
      <div className="container mx-auto px-6 max-w-lg">
        <Link to="/dashboard/admin" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-6">
          <ArrowLeft className="h-4 w-4" />
          {t("admin.shared.backToDashboard")}
        </Link>

        <AdminPageHeader
          title={t("adminNav.addUserRole")}
          description={t("admin.addUserRole.description")}
        />

        <form
          className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 space-y-4"
          onSubmit={handleSubmit}
        >
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

          <div className="space-y-2">
            <Label>{t("admin.shared.role")}</Label>
            <Select
              required
              value={formData.role}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  role: value,
                  adminCode: value === "LECTURER" ? "" : formData.adminCode,
                  teacherCategory: value === "LECTURER" ? formData.teacherCategory : "",
                })
              }
            >
              <SelectTrigger className="bg-white">
                <SelectValue placeholder={t("admin.addUserRole.form.selectRole")} />
              </SelectTrigger>
              <SelectContent>
                {ADD_USER_ROLE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isTeacherRole ? (
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

          {isAdminRole ? (
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
              <p className="text-xs text-slate-500">
                Short ID used on approve/reject actions so you can tell which admin handled a request.
              </p>
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
                Share this password securely with {createdAccountEmail}. It will not be shown again.
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
                I have stored it securely
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
