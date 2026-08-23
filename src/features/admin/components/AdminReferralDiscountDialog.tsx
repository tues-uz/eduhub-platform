import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { eduhubAdmin, eduhubReferralCodes } from "@/api/eduhubClient";
import type { CourseSummaryResponse, GeneralReferralCodeResponse } from "@/api/eduhubTypes";
import {
  AdminActionCodeField,
  useAdminActionCodeState,
} from "@/features/admin/components/AdminActionCodeField";
import { validateAdminActionCodeOrThrow } from "@/features/admin/adminStaffCode";
import {
  computeDiscountedPrice,
} from "@/features/admin/utils/adminCourseCatalog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const GENERAL_CODE_QUERY_KEY = ["promo", "general-code"];

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

type ScopeTab = "class" | "general" | "trial";
type TrialScope = "class" | "general";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courses: CourseSummaryResponse[];
  /** When set, locks class pickers to this class. */
  initialCourseId?: string | null;
};

export function AdminReferralDiscountDialog({
  open,
  onOpenChange,
  courses,
  initialCourseId = null,
}: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [scope, setScope] = useState<ScopeTab>("class");
  const [courseId, setCourseId] = useState("");
  const [referralInput, setReferralInput] = useState("");
  const [discountInput, setDiscountInput] = useState("0");
  const [trialScope, setTrialScope] = useState<TrialScope>("class");
  const [trialCourseId, setTrialCourseId] = useState("");
  const [trialInput, setTrialInput] = useState("");
  const [adminActionCode, setAdminActionCode] = useAdminActionCodeState();

  const { data: generalCodes } = useQuery<GeneralReferralCodeResponse | null>({
    queryKey: GENERAL_CODE_QUERY_KEY,
    queryFn: () => eduhubReferralCodes.getGeneral().catch(() => null),
    enabled: open,
    staleTime: 30_000,
  });

  const pricedCourses = useMemo(
    () => courses.filter((c) => c.pricing != null && c.pricing.amount >= 0),
    [courses],
  );

  const selected = useMemo(
    () => pricedCourses.find((c) => c.id === courseId) ?? null,
    [pricedCourses, courseId],
  );

  const trialSelected = useMemo(
    () => pricedCourses.find((c) => c.id === trialCourseId) ?? null,
    [pricedCourses, trialCourseId],
  );

  const courseLocked = Boolean(initialCourseId);

  useEffect(() => {
    if (!open) return;
    const preferred =
      (initialCourseId && pricedCourses.find((c) => c.id === initialCourseId)?.id) ||
      pricedCourses[0]?.id ||
      "";
    setScope("class");
    setCourseId(preferred);
    setTrialCourseId(preferred);
    setTrialScope(initialCourseId ? "class" : "class");
  }, [open, initialCourseId, pricedCourses]);

  useEffect(() => {
    if (!open) return;
    if (scope === "general") {
      setReferralInput(generalCodes?.referralCode ?? "");
      setDiscountInput(String(generalCodes?.discountPercent ?? 0));
      return;
    }
    if (scope === "class") {
      if (!selected?.pricing) {
        setReferralInput("");
        setDiscountInput("0");
        return;
      }
      setReferralInput(selected.pricing.referralCode ?? "");
      setDiscountInput(String(selected.pricing.discountPercent ?? 0));
    }
  }, [open, scope, selected, generalCodes]);

  useEffect(() => {
    if (!open || scope !== "trial") return;
    if (trialScope === "general") {
      setTrialInput(generalCodes?.trialCode ?? "");
      return;
    }
    setTrialInput(trialSelected?.pricing?.trialCode ?? "");
  }, [open, scope, trialScope, trialSelected, generalCodes]);

  const pricePreview = useMemo(() => {
    if (scope !== "class" || !selected?.pricing) return null;
    const d = Number(String(discountInput).replace(/\s/g, ""));
    if (!Number.isFinite(d) || d < 0 || d > 100) return null;
    const catalog = selected.pricing.amount;
    const discountPct = Math.round(d);
    return {
      catalog,
      currency: selected.pricing.currency,
      discountPct,
      discounted: computeDiscountedPrice(catalog, discountPct),
    };
  }, [discountInput, scope, selected]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const code = validateAdminActionCodeOrThrow(adminActionCode);

      if (scope === "trial") {
        const trialCode = trialInput.trim().slice(0, 64);
        if (trialScope === "general") {
          await eduhubReferralCodes.updateGeneral({
            trialCode,
            adminActionCode: code,
          });
          return { kind: "trialGeneral" as const };
        }

        if (!trialSelected?.pricing) {
          throw new Error(t("admin.referralCodes.toast.pricingRequired"));
        }
        const referralCode = trialSelected.pricing.referralCode ?? "";
        const discountPercent = trialSelected.pricing.discountPercent ?? 0;

        await eduhubAdmin.updateCoursePricing(trialSelected.id, {
          referralCode: referralCode || undefined,
          discountPercent,
          trialCode: trialCode || undefined,
          adminActionCode: code,
        });

        return { kind: "trialClass" as const, title: trialSelected.title };
      }

      const dp = Number(String(discountInput).replace(/\s/g, ""));
      if (!Number.isFinite(dp) || dp < 0 || dp > 100) {
        throw new Error(t("admin.referralCodes.toast.discountRange"));
      }
      const referralCode = referralInput.trim().slice(0, 64);
      const discountPercent = Math.round(dp);

      if (scope === "general") {
        await eduhubReferralCodes.updateGeneral({
          referralCode,
          discountPercent,
          adminActionCode: code,
        });
        return { kind: "general" as const };
      }

      if (!selected?.pricing) {
        throw new Error(t("admin.referralCodes.toast.pricingRequired"));
      }

      const trialCode = selected.pricing.trialCode ?? "";

      await eduhubAdmin.updateCoursePricing(selected.id, {
        referralCode: referralCode || undefined,
        discountPercent,
        trialCode: trialCode || undefined,
        adminActionCode: code,
      });

      return { kind: "class" as const, title: selected.title };
    },
    onSuccess: (result) => {
      if (result.kind === "general") {
        toast.success(t("admin.referralCodes.toast.generalSaved"));
      } else if (result.kind === "trialGeneral") {
        toast.success(t("admin.referralCodes.toast.trialGeneralSaved"));
      } else if (result.kind === "trialClass") {
        toast.success(t("admin.referralCodes.toast.trialSaved"), {
          description: t("admin.referralCodes.toast.savedDescription", { title: result.title }),
        });
      } else {
        toast.success(t("admin.referralCodes.toast.saved"), {
          description: t("admin.referralCodes.toast.savedDescription", { title: result.title }),
        });
      }
      queryClient.invalidateQueries({ queryKey: ["admin", "courses", "list"] });
      queryClient.invalidateQueries({ queryKey: GENERAL_CODE_QUERY_KEY });
      onOpenChange(false);
    },
    onError: (e: Error) => {
      toast.error(t("admin.referralCodes.toast.saveFailed"), { description: e.message });
    },
  });

  const canSave = (() => {
    if (saveMutation.isPending) return false;
    if (scope === "general") return true;
    if (scope === "trial") {
      if (trialScope === "general") return true;
      return Boolean(trialSelected?.pricing);
    }
    return Boolean(selected?.pricing);
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(90dvh,720px)] max-w-md flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-slate-100 px-6 pb-4 pt-8 pr-12">
          <DialogTitle>{t("admin.referralCodes.addDialog.title")}</DialogTitle>
          <DialogDescription>{t("admin.referralCodes.addDialog.description")}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4">
          <Tabs
            value={scope}
            onValueChange={(v) => setScope(v as ScopeTab)}
            className="w-full"
          >
            <TabsList className="sticky top-0 z-[1] grid h-auto w-full grid-cols-3 bg-slate-100 p-1">
              <TabsTrigger
                value="class"
                className="text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                {t("admin.referralCodes.addDialog.tabClass")}
              </TabsTrigger>
              <TabsTrigger
                value="general"
                className="text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm"
                disabled={courseLocked}
              >
                {t("admin.referralCodes.addDialog.tabGeneral")}
              </TabsTrigger>
              <TabsTrigger
                value="trial"
                className="text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                {t("admin.referralCodes.addDialog.tabTrial")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="class" className="mt-4 space-y-4 text-sm focus-visible:outline-none">
              {pricedCourses.length === 0 ? (
                <p className="text-slate-600">{t("admin.referralCodes.toast.pricingRequired")}</p>
              ) : (
                <>
                  <ClassPicker
                    id="referral-discount-class"
                    locked={courseLocked}
                    selected={selected}
                    courseId={courseId}
                    onCourseIdChange={setCourseId}
                    pricedCourses={pricedCourses}
                  />
                  <ReferralDiscountFields
                    referralInput={referralInput}
                    setReferralInput={setReferralInput}
                    discountInput={discountInput}
                    setDiscountInput={setDiscountInput}
                    pricePreview={pricePreview}
                    referralHint={t("admin.referralCodes.addDialog.referralHint")}
                  />
                </>
              )}
            </TabsContent>

            <TabsContent value="general" className="mt-4 space-y-4 text-sm focus-visible:outline-none">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs leading-relaxed text-slate-600">
                {t("admin.referralCodes.addDialog.generalHint")}
              </div>
              <ReferralDiscountFields
                referralInput={referralInput}
                setReferralInput={setReferralInput}
                discountInput={discountInput}
                setDiscountInput={setDiscountInput}
                pricePreview={null}
                referralHint={t("admin.referralCodes.addDialog.generalReferralHint")}
                discountHint={t("admin.referralCodes.addDialog.generalDiscountHint")}
              />
            </TabsContent>

            <TabsContent value="trial" className="mt-4 space-y-4 text-sm focus-visible:outline-none">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs leading-relaxed text-slate-600">
                {t("admin.referralCodes.addDialog.trialTabHint")}
              </div>

              <div className="space-y-2">
                <Label>{t("admin.referralCodes.addDialog.trialAppliesTo")}</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      ["class", t("admin.referralCodes.addDialog.tabClass")],
                      ["general", t("admin.referralCodes.addDialog.tabGeneral")],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      disabled={courseLocked && id === "general"}
                      onClick={() => setTrialScope(id)}
                      className={cn(
                        "rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition-colors",
                        trialScope === id
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
                        courseLocked && id === "general" && "cursor-not-allowed opacity-50",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {trialScope === "class" ? (
                pricedCourses.length === 0 ? (
                  <p className="text-slate-600">{t("admin.referralCodes.toast.pricingRequired")}</p>
                ) : (
                  <ClassPicker
                    id="trial-class-picker"
                    locked={courseLocked}
                    selected={trialSelected}
                    courseId={trialCourseId}
                    onCourseIdChange={setTrialCourseId}
                    pricedCourses={pricedCourses}
                  />
                )
              ) : (
                <p className="text-xs text-slate-500">{t("admin.referralCodes.addDialog.generalTrialHint")}</p>
              )}

              <div className="space-y-2">
                <Label htmlFor="trial-code-field">{t("admin.referralCodes.addDialog.trialCode")}</Label>
                <Input
                  id="trial-code-field"
                  value={trialInput}
                  onChange={(e) => setTrialInput(e.target.value)}
                  placeholder={t("admin.referralCodes.addDialog.trialPlaceholder")}
                  className="bg-white font-mono text-sm"
                  maxLength={64}
                  autoComplete="off"
                />
                <p className="text-xs text-slate-500">
                  {trialScope === "general"
                    ? t("admin.referralCodes.addDialog.generalTrialHint")
                    : t("admin.referralCodes.addDialog.trialHint")}
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <div className="mt-4">
            <AdminActionCodeField
              id="referral-discount-admin-code"
              value={adminActionCode}
              onChange={setAdminActionCode}
            />
          </div>
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t border-slate-100 bg-white px-6 py-4 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            className="bg-slate-900 hover:bg-slate-800"
            disabled={!canSave}
            onClick={() => saveMutation.mutate()}
          >
            {saveMutation.isPending ? t("admin.shared.saving") : t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ClassPicker({
  id,
  locked,
  selected,
  courseId,
  onCourseIdChange,
  pricedCourses,
}: {
  id: string;
  locked: boolean;
  selected: CourseSummaryResponse | null;
  courseId: string;
  onCourseIdChange: (id: string) => void;
  pricedCourses: CourseSummaryResponse[];
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{t("admin.shared.class")}</Label>
      {locked && selected ? (
        <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-900">
          {selected.title}
        </p>
      ) : (
        <Select value={courseId} onValueChange={onCourseIdChange}>
          <SelectTrigger id={id} className="bg-white">
            <SelectValue placeholder={t("admin.specialTuition.chooseClass")} />
          </SelectTrigger>
          <SelectContent>
            {pricedCourses.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {selected?.pricing ? (
        <p className="text-xs text-slate-500">
          {t("admin.courses.detail.fields.catalogPrice")}:{" "}
          <span className="font-medium tabular-nums text-slate-700">
            {formatMoney(selected.pricing.amount, selected.pricing.currency)}
          </span>
        </p>
      ) : null}
    </div>
  );
}

function ReferralDiscountFields({
  referralInput,
  setReferralInput,
  discountInput,
  setDiscountInput,
  pricePreview,
  referralHint,
  discountHint,
}: {
  referralInput: string;
  setReferralInput: (v: string) => void;
  discountInput: string;
  setDiscountInput: (v: string) => void;
  pricePreview: {
    discounted: number;
    currency: string;
    discountPct: number;
  } | null;
  referralHint: string;
  discountHint?: string;
}) {
  const { t } = useTranslation();
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="referral-code-field">{t("admin.courses.detail.fields.referralCode")}</Label>
        <Input
          id="referral-code-field"
          value={referralInput}
          onChange={(e) => setReferralInput(e.target.value)}
          placeholder={t("admin.referralCodes.editDialog.referralPlaceholder")}
          className="bg-white font-mono text-sm"
          maxLength={64}
          autoComplete="off"
        />
        <p className="text-xs text-slate-500">{referralHint}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="referral-discount-field">
          {t("admin.referralCodes.editDialog.discountPercent")}
        </Label>
        <Input
          id="referral-discount-field"
          value={discountInput}
          onChange={(e) => setDiscountInput(e.target.value)}
          inputMode="decimal"
          className="max-w-[120px] bg-white font-mono tabular-nums"
        />
        <p className="text-xs text-slate-500">
          {discountHint ?? t("admin.referralCodes.editDialog.discountHint")}
        </p>
      </div>

      {pricePreview ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-2.5 text-xs text-emerald-900">
          {t("admin.referralCodes.editDialog.withCode")}{" "}
          <span className="font-semibold tabular-nums">
            {formatMoney(pricePreview.discounted, pricePreview.currency)}
          </span>
          {pricePreview.discountPct > 0 ? (
            <span className="text-emerald-800/80">
              {" "}
              {t("admin.referralCodes.editDialog.discountSuffix", {
                percent: pricePreview.discountPct,
              })}
            </span>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
