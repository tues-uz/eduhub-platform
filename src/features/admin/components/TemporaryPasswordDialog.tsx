import { useState } from "react";
import { Check, Square2Stack } from "@/lib/icons";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface TemporaryPasswordDialogProps {
  temporaryPassword: string;
  email: string;
  onClose: () => void;
}

export function TemporaryPasswordDialog({
  temporaryPassword,
  email,
  onClose,
}: TemporaryPasswordDialogProps) {
  const { t } = useTranslation();
  const [hasCopied, setHasCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(temporaryPassword);
      setHasCopied(true);
      toast.success(t("admin.addUserRole.toast.passwordCopied"));
    } catch {
      toast.error(t("admin.addUserRole.toast.copyFailed"));
    }
  };

  return (
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
            {t("admin.addUserRole.tempPasswordDialog.description", { email })}
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
            <Button type="button" variant="outline" onClick={handleCopy} className="min-h-10 gap-2">
              {hasCopied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Square2Stack className="h-4 w-4" aria-hidden="true" />}
              {hasCopied ? t("admin.shared.copied") : t("admin.shared.copy")}
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" onClick={onClose}>
            {t("admin.addUserRole.tempPasswordDialog.storedSecurely")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
