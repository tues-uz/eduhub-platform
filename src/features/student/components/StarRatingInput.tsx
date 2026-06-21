import { useTranslation } from "react-i18next";
import { Star } from "@/lib/icons";
import { cn } from "@/lib/utils";

type Props = {
  value: number;
  onChange: (rating: number) => void;
  disabled?: boolean;
  label: string;
};

export function StarRatingInput({ value, onChange, disabled, label }: Props) {
  const { t } = useTranslation();
  return (
    <div role="group" aria-label={label} className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= value;
        return (
          <button
            key={n}
            type="button"
            disabled={disabled}
            onClick={() => onChange(n)}
            className={cn(
              "rounded p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3954d0] focus-visible:ring-offset-1",
              disabled ? "cursor-default opacity-60" : "cursor-pointer hover:scale-105",
            )}
            aria-label={t("starRating.star", { count: n })}
          >
            <Star
              className={cn("h-8 w-8", filled ? "fill-amber-400 text-amber-400" : "text-zinc-300")}
              aria-hidden
            />
          </button>
        );
      })}
    </div>
  );
}
