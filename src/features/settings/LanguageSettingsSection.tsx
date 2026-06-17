import { useEffect, useState } from "react";
import { Globe } from "@/lib/icons";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  getUiLanguage,
  setUiLanguage,
  UI_LANGUAGE_CHANGED_EVENT,
  UI_LANGUAGE_OPTIONS,
  uiLanguageOption,
  type UiLanguageCode,
} from "@/features/settings/languagePreference";

type Props = {
  className?: string;
  selectId?: string;
  headingClassName?: string;
};

export function LanguageSettingsSection({
  className,
  selectId = "language",
  headingClassName,
}: Props) {
  const [language, setLanguage] = useState<UiLanguageCode>(() => getUiLanguage());
  const selected = uiLanguageOption(language);

  useEffect(() => {
    const sync = () => setLanguage(getUiLanguage());
    window.addEventListener(UI_LANGUAGE_CHANGED_EVENT, sync);
    return () => window.removeEventListener(UI_LANGUAGE_CHANGED_EVENT, sync);
  }, []);

  const handleLanguageChange = (value: string) => {
    const next = value as UiLanguageCode;
    setLanguage(next);
    setUiLanguage(next);
  };

  return (
    <div className={cn("rounded-xl border border-gray-200/50 bg-white/80 p-4 shadow-sm sm:p-6", className)}>
      <h2
        className={cn(
          "mb-4 flex items-center gap-2 font-semibold text-foreground",
          headingClassName,
        )}
        style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.5px" }}
      >
        <Globe className="h-5 w-5" aria-hidden />
        Language
      </h2>
      <div className="space-y-2">
        <Label htmlFor={selectId}>Display language</Label>
        <p className="text-sm text-foreground/60">
          Choose the language used across EduHub. More translations will be added over time.
        </p>
        <Select value={language} onValueChange={handleLanguageChange}>
          <SelectTrigger id={selectId} className="mt-1.5 h-11 rounded-xl border-gray-200 bg-white">
            <SelectValue placeholder="Select a language">
              {`${selected.flag} ${selected.label}`}
            </SelectValue>
          </SelectTrigger>
          <SelectContent align="start" className="rounded-2xl border-gray-200 p-2 shadow-lg">
            {UI_LANGUAGE_OPTIONS.map((option) => (
              <SelectItem key={option.code} value={option.code} className="cursor-pointer rounded-xl">
                {`${option.flag} ${option.label}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export function persistUiLanguagePreference(): UiLanguageCode {
  const language = getUiLanguage();
  setUiLanguage(language);
  return language;
}
