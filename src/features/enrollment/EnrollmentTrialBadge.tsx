import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export function EnrollmentTrialBadge({ className }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <span
      className={cn(
        "inline-flex shrink-0 rounded-full bg-violet-50 px-2.5 py-0.5 text-[11px] font-medium text-violet-800 ring-1 ring-violet-200/80",
        className,
      )}
    >
      {t("payment.trial.badge")}
    </span>
  );
}
