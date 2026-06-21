import {
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, Search } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatDisplayPersonName } from "@/lib/formatPersonName";
import { useStudentBrowseableCourses } from "@/features/student/hooks/useStudentBrowseableCourses";
import {
  filterStudentBrowseableCourses,
  resolveStudentBrowseableCourseHref,
  resolveStudentClassSearchListHref,
} from "@/features/student/studentClassSearch";

import { studentHeaderIconButtonClass } from "@/components/studentDashboardHeaderStyles";

type DashboardClassSearchProps = {
  className?: string;
  compact?: boolean;
  variant?: "default" | "header";
};

export function DashboardClassSearch({
  className,
  compact = false,
  variant = "default",
}: DashboardClassSearchProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [open, setOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const { data: courses = [], isLoading } = useStudentBrowseableCourses();

  useEffect(() => {
    setQuery(searchParams.get("q") ?? "");
  }, [searchParams]);

  const trimmedQuery = query.trim();
  const results = useMemo(
    () => filterStudentBrowseableCourses(courses, query),
    [courses, query],
  );
  const showDropdown = open && trimmedQuery.length > 0;
  const listHref = resolveStudentClassSearchListHref(pathname, query);

  useEffect(() => {
    if (!showDropdown && !panelOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      setOpen(false);
      setActiveIndex(-1);
      setPanelOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [panelOpen, showDropdown]);

  useEffect(() => {
    setActiveIndex(-1);
  }, [trimmedQuery]);

  useEffect(() => {
    if (panelOpen) {
      inputRef.current?.focus();
    }
  }, [panelOpen]);

  useEffect(() => {
    if (variant !== "header" || compact) return;

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      event.preventDefault();
      inputRef.current?.focus();
      setOpen(true);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [compact, variant]);

  const navigateToCourse = (href: string) => {
    setOpen(false);
    setPanelOpen(false);
    setActiveIndex(-1);
    navigate(href);
  };

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (activeIndex >= 0 && results[activeIndex]) {
      navigateToCourse(resolveStudentBrowseableCourseHref(results[activeIndex]));
      return;
    }
    setOpen(false);
    setPanelOpen(false);
    navigate(listHref);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
      setPanelOpen(false);
      return;
    }

    if (!showDropdown) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, results.length - 1));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, -1));
      return;
    }

    if (event.key === "Enter" && activeIndex >= 0 && results[activeIndex]) {
      event.preventDefault();
      navigateToCourse(resolveStudentBrowseableCourseHref(results[activeIndex]));
    }
  };

  const isHeaderVariant = variant === "header";

  const searchForm = (
    <form onSubmit={handleSearchSubmit}>
      <Search
        className={cn(
          "pointer-events-none absolute top-1/2 z-10 -translate-y-1/2 text-zinc-400",
          isHeaderVariant ? "left-3 h-4 w-4 text-foreground/40" : "left-3 size-5 text-zinc-400",
        )}
        aria-hidden
      />
      <Input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={t("classSearch.placeholder")}
        aria-label={t("classSearch.ariaLabel")}
        aria-expanded={showDropdown}
        aria-controls="dashboard-class-search-results"
        aria-autocomplete="list"
        role="combobox"
        autoComplete="off"
        className={cn(
          "h-10 border-zinc-200 bg-white text-sm text-foreground shadow-none placeholder:text-zinc-500 focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-zinc-300 focus-visible:ring-offset-0",
          isHeaderVariant
            ? "h-11 rounded-xl border-gray-200 pl-10 pr-14"
            : "rounded-full pl-9 pr-4 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        )}
      />
      {isHeaderVariant ? (
        <span className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 items-center sm:flex">
          <kbd className="inline-flex min-h-5 min-w-5 items-center justify-center rounded border border-zinc-200 bg-zinc-50 px-1 font-sans text-[10px] font-medium text-zinc-500">
            /
          </kbd>
        </span>
      ) : null}
    </form>
  );

  const resultsDropdown = showDropdown ? (
    <div
      id="dashboard-class-search-results"
      role="listbox"
      className={cn(
        "z-50 overflow-hidden rounded-xl border border-zinc-200 bg-white p-2 shadow-lg",
        compact
          ? "absolute left-0 right-0 top-[calc(100%+0.375rem)]"
          : isHeaderVariant
            ? "absolute left-0 right-0 top-[calc(100%+0.375rem)]"
            : "absolute right-0 top-[calc(100%+0.375rem)] w-[min(20rem,calc(100vw-2rem))]",
      )}
    >
      {isLoading ? (
        <div className="flex items-center gap-2 px-4 py-3 text-sm text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          {t("classSearch.loading")}
        </div>
      ) : results.length > 0 ? (
        <ul className="max-h-72 overflow-y-auto py-1">
          {results.map((course, index) => {
            const href = resolveStudentBrowseableCourseHref(course);
            const isActive = index === activeIndex;
            return (
              <li key={course.linkId} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                    isActive ? "bg-zinc-100" : "hover:bg-zinc-50",
                  )}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => navigateToCourse(href)}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-zinc-900">
                      {course.title}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-zinc-500">
                      {formatDisplayPersonName(course.instructor)} · {course.category}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                      course.isEnrolled
                        ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/80"
                        : "bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200/80",
                    )}
                  >
                    {course.isEnrolled ? t("classSearch.myClass") : t("classSearch.browse")}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="px-4 py-3 text-sm text-zinc-500">{t("classSearch.noMatch", { query: trimmedQuery })}</div>
      )}

      <button
        type="button"
        className="w-full border-t border-zinc-100 px-4 py-2.5 text-right text-sm font-medium text-[#3954d0] hover:bg-zinc-50"
        onClick={() => navigateToCourse(listHref)}
      >
        {t("classSearch.viewAllResults")}
      </button>
    </div>
  ) : null;

  if (compact) {
    return (
      <>
        <Button
          ref={triggerRef}
          type="button"
          variant="ghost"
          size="icon"
          className={studentHeaderIconButtonClass}
          aria-label={t("classSearch.ariaLabel")}
          onClick={() => setPanelOpen(true)}
        >
          <Search className="h-5 w-5" aria-hidden />
        </Button>
        {panelOpen
          ? createPortal(
              <div className="fixed left-0 right-0 top-14 z-[60] border-b border-gray-200 bg-white/95 px-4 py-2 backdrop-blur-md lg:hidden">
                <div ref={containerRef} className="relative w-full">
                  {searchForm}
                  {resultsDropdown}
                </div>
              </div>,
              document.body,
            )
          : null}
      </>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full shrink-0",
        isHeaderVariant ? "max-w-none" : "max-w-[15rem] sm:max-w-xs",
        className,
      )}
    >
      {searchForm}
      {resultsDropdown}
    </div>
  );
}
