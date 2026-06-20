import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthSession } from "@/features/auth/context";
import { getDefaultAdminActionCode } from "@/features/admin/adminStaffCode";
import { cn } from "@/lib/utils";

type Props = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

export function AdminActionCodeField({ id, value, onChange, className }: Props) {
  const { user } = useAuthSession();
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    if (seeded || value.trim()) return;
    const defaultCode = user.adminCode || getDefaultAdminActionCode(user.email);
    if (defaultCode) {
      onChange(defaultCode);
    }
    setSeeded(true);
  }, [seeded, user.email, user.adminCode, value, onChange]);

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>Your admin code</Label>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        placeholder="e.g. AF01"
        className="bg-white font-mono text-sm uppercase max-w-[180px]"
        maxLength={16}
        autoComplete="off"
        spellCheck={false}
        required
      />
      <p className="text-xs text-slate-500">
        Short ID for audit trail — records who approved or rejected this action when several admins share the account.
      </p>
    </div>
  );
}

export function useAdminActionCodeState(): [string, (value: string) => void] {
  const { user } = useAuthSession();
  const [adminActionCode, setAdminActionCode] = useState(() => user.adminCode || getDefaultAdminActionCode(user.email));

  useEffect(() => {
    setAdminActionCode((prev) => (prev.trim() ? prev : (user.adminCode || getDefaultAdminActionCode(user.email))));
  }, [user.email, user.adminCode]);

  return [adminActionCode, setAdminActionCode];
}
