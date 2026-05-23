import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Copy, Phone, User } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { eduhubAdmin } from "@/api/eduhubClient";
import { adminTeachersStore } from "@/features/admin/data/adminTeachersStore";

/** Values are sent to `POST /admin/users`. Align with your API’s role enum (e.g. Spring `Role` names). */
const ADD_USER_ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: "LECTURER", label: "Teacher" },
  { value: "ADMIN_FINANCE", label: "Admin Finance" },
  { value: "ADMIN_CONTENT", label: "Admin Content" },
  { value: "ADMIN_SUPPORT", label: "Admin Support" },
  { value: "ADMIN_ANALYTIC", label: "Admin Analytic" },
];

export default function AdminAddUserRolePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [createdAccountEmail, setCreatedAccountEmail] = useState("");
  const [hasCopiedPassword, setHasCopiedPassword] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    role: "",
  });
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.email || !formData.phoneNumber || !formData.role) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    try {
      const res = await eduhubAdmin.createUser(formData);
      if (formData.role === "LECTURER") {
        adminTeachersStore.upsertByEmail({
          name: formData.fullName.trim(),
          email: formData.email.trim(),
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
      toast.success("Temporary password copied");
    } catch {
      toast.error("Could not copy password. Select and copy it manually.");
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
          Back to dashboard
        </Link>

        <AdminPageHeader
          title="Add user role"
          description="Create a new staff account. A secure temporary password will be shown once after creation and the user must change it on first sign-in."
        />

        <form
          className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 space-y-4"
          onSubmit={handleSubmit}
        >
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                id="fullName"
                name="fullName"
                type="text"
                required
                placeholder="Enter full name"
                value={formData.fullName}
                onChange={handleChange}
                autoComplete="name"
                className="pl-10 bg-white"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              placeholder="user@school.com"
              value={formData.email}
              onChange={handleChange}
              autoComplete="email"
              spellCheck={false}
              className="bg-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Phone Number</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                required
                placeholder="+6281234567890"
                value={formData.phoneNumber}
                onChange={handleChange}
                autoComplete="tel"
                inputMode="tel"
                className="pl-10 bg-white"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Role</Label>
            <Select
              required
              value={formData.role}
              onValueChange={(value) => setFormData({ ...formData, role: value })}
            >
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Select role" />
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

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800"
          >
            {isLoading ? "Creating..." : "Create User"}
          </Button>
        </form>

        <Dialog
          open={Boolean(temporaryPassword)}
          onOpenChange={(open) => {
            if (!open) {
              toast.info("Store the temporary password before leaving this screen.");
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Temporary password created</DialogTitle>
              <DialogDescription>
                Share this password securely with {createdAccountEmail}. It will not be shown again.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-950">
              <p className="text-sm font-medium">The user must enter this as their current password on first sign-in.</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  value={temporaryPassword}
                  readOnly
                  className="font-mono tracking-wide bg-white"
                  aria-label="Temporary password"
                />
                <Button type="button" variant="outline" onClick={handleCopyTemporaryPassword} className="min-h-10 gap-2">
                  {hasCopiedPassword ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
                  {hasCopiedPassword ? "Copied" : "Copy"}
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
