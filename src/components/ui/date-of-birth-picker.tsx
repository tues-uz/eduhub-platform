import { useEffect, useMemo, useState } from "react";
import { format, startOfDay, startOfMonth, subYears } from "date-fns";
import { Calendar as CalendarIcon } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MIN_BIRTH_YEAR = 1940;
const MIN_BIRTH_DATE = startOfMonth(new Date(MIN_BIRTH_YEAR, 0, 1));

const MONTHS = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
] as const;

const selectTriggerClass =
  "h-9 rounded-lg border-gray-200 bg-white text-sm focus:ring-primary focus:ring-offset-0";

function parseIsoDate(value: string): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function toIsoDate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function clampViewMonth(month: Date, maxDate: Date): Date {
  const min = MIN_BIRTH_DATE.getTime();
  const max = startOfMonth(maxDate).getTime();
  const time = startOfMonth(month).getTime();
  if (time < min) return MIN_BIRTH_DATE;
  if (time > max) return startOfMonth(maxDate);
  return startOfMonth(month);
}

export type DateOfBirthPickerProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
};

export function DateOfBirthPicker({
  id,
  value,
  onChange,
  required,
  disabled,
  className,
}: DateOfBirthPickerProps) {
  const [open, setOpen] = useState(false);
  const today = useMemo(() => startOfDay(new Date()), []);
  const selected = useMemo(() => parseIsoDate(value), [value]);
  const defaultMonth = useMemo(() => selected ?? subYears(today, 18), [selected, today]);
  const [viewMonth, setViewMonth] = useState(defaultMonth);
  const maxYear = today.getFullYear();

  const years = useMemo(
    () => Array.from({ length: maxYear - MIN_BIRTH_YEAR + 1 }, (_, i) => String(maxYear - i)),
    [maxYear],
  );

  const viewMonthValue = String(viewMonth.getMonth() + 1);
  const viewYearValue = String(viewMonth.getFullYear());

  useEffect(() => {
    if (open) setViewMonth(clampViewMonth(defaultMonth, today));
  }, [open, defaultMonth, today]);

  const setMonthYear = (month: string, year: string) => {
    setViewMonth(clampViewMonth(new Date(Number(year), Number(month) - 1, 1), today));
  };

  const displayLabel = selected ? format(selected, "dd/MM/yyyy") : "";

  return (
    <div className={cn("relative", className)}>
      <CalendarIcon
        className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-foreground/40"
        aria-hidden
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            id={id}
            disabled={disabled}
            aria-required={required}
            aria-haspopup="dialog"
            aria-label={displayLabel ? `Date of birth: ${displayLabel}` : "Select date of birth"}
            className={cn(
              "flex h-12 w-full items-center rounded-xl border border-gray-200 bg-background pl-10 pr-3 text-left text-base transition-colors md:text-sm",
              "hover:border-gray-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-0",
              "disabled:cursor-not-allowed disabled:opacity-50",
              displayLabel ? "text-foreground" : "text-muted-foreground",
            )}
          >
            <span className="truncate">{displayLabel || "dd/mm/yyyy"}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[18.5rem] rounded-xl border-gray-200 p-0 shadow-lg"
          align="start"
          sideOffset={4}
        >
          <div className="grid grid-cols-2 gap-2 border-b border-gray-100 p-3">
            <Select
              value={viewMonthValue}
              onValueChange={(month) => setMonthYear(month, viewYearValue)}
            >
              <SelectTrigger className={selectTriggerClass} aria-label="Month">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-56 rounded-xl border-gray-200">
                {MONTHS.map(({ value: monthValue, label }) => (
                  <SelectItem key={monthValue} value={monthValue} className="rounded-lg">
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={viewYearValue}
              onValueChange={(year) => setMonthYear(viewMonthValue, year)}
            >
              <SelectTrigger className={selectTriggerClass} aria-label="Year">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-56 rounded-xl border-gray-200">
                {years.map((year) => (
                  <SelectItem key={year} value={year} className="rounded-lg">
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Calendar
            mode="single"
            month={viewMonth}
            onMonthChange={(month) => setViewMonth(clampViewMonth(month, today))}
            selected={selected}
            fromDate={MIN_BIRTH_DATE}
            toDate={today}
            disableNavigation
            showOutsideDays={false}
            disabled={(date) => startOfDay(date) > today}
            onSelect={(date) => {
              if (!date) return;
              onChange(toIsoDate(date));
              setOpen(false);
            }}
            className="p-0"
            classNames={{
              months: "p-3 pt-2",
              month: "space-y-2",
              caption: "hidden",
              nav: "hidden",
              table: "w-full",
              head_row: "flex w-full",
              row: "flex w-full mt-1",
              day: "h-9 w-9 rounded-lg p-0 text-sm",
              day_selected:
                "bg-[#1e40af] text-white hover:bg-[#1e40af] hover:text-white focus:bg-[#1e40af] focus:text-white",
              day_today: "bg-[#1e40af]/10 font-medium text-[#1e40af]",
              day_outside: "hidden",
              day_disabled: "text-muted-foreground opacity-40",
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      {required && (
        <input
          tabIndex={-1}
          aria-hidden
          className="sr-only"
          value={value}
          required={required}
          onChange={() => {}}
        />
      )}
    </div>
  );
}
