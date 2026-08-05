import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  COUNTRY_DIAL_CODES,
  getCountryByIso,
} from "@/features/auth/data/countryDialCodes";
import { cn } from "@/lib/utils";

type PhoneWithCountryCodeProps = {
  id: string;
  label: string;
  countryIso: string;
  nationalNumber: string;
  onCountryChange: (iso: string) => void;
  onNationalChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
  countryAriaLabel?: string;
};

export function PhoneWithCountryCode({
  id,
  label,
  countryIso,
  nationalNumber,
  onCountryChange,
  onNationalChange,
  placeholder,
  required,
  autoComplete = "tel-national",
  countryAriaLabel = "Country code",
}: PhoneWithCountryCodeProps) {
  const selected = getCountryByIso(countryIso);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div
        className={cn(
          "flex h-11 w-full items-stretch overflow-hidden rounded-xl border border-gray-200 bg-background",
          "focus-within:border-primary focus-within:ring-1 focus-within:ring-primary",
        )}
      >
        <Select value={countryIso} onValueChange={onCountryChange}>
          <SelectTrigger
            aria-label={countryAriaLabel}
            className={cn(
              "h-full w-auto shrink-0 rounded-none border-0 border-r border-gray-200 bg-transparent px-2.5 shadow-none",
              "focus:ring-0 focus:ring-offset-0 focus:outline-none",
              "[&>span]:line-clamp-none",
            )}
          >
            <SelectValue>
              <span className="flex items-center gap-1.5 text-sm">
                <span aria-hidden>{selected.flag}</span>
                <span className="tabular-nums">{selected.dial}</span>
              </span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="max-h-64">
            {COUNTRY_DIAL_CODES.map((c) => (
              <SelectItem key={c.iso} value={c.iso}>
                <span className="flex items-center gap-2">
                  <span aria-hidden>{c.flag}</span>
                  <span className="tabular-nums text-muted-foreground">{c.dial}</span>
                  <span className="truncate">{c.name}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <input
          id={id}
          name={id}
          type="tel"
          inputMode="tel"
          placeholder={placeholder}
          value={nationalNumber}
          onChange={(e) => onNationalChange(e.target.value)}
          className={cn(
            "min-w-0 flex-1 border-0 bg-transparent px-3 text-base outline-none",
            "placeholder:text-muted-foreground focus-visible:outline-none",
            "disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          )}
          required={required}
          autoComplete={autoComplete}
        />
      </div>
    </div>
  );
}
