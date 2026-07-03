import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Megaphone, Pencil, Plus, Trash2 } from "@/lib/icons";
import { toast } from "sonner";
import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  deleteStudentPromo,
  resetStudentPromosToDefaults,
  STUDENT_PROMO_PLACEMENT_LABELS,
  upsertStudentPromo,
  type StudentPromo,
  type StudentPromoInput,
  type StudentPromoPlacement,
} from "@/features/promos/studentPromos";
import { useStudentPromos } from "@/features/promos/useStudentPromos";

const ACCENT_PRESETS = [
  { label: "EduHub blue", value: "#3954d0" },
  { label: "Teal", value: "#0f766e" },
  { label: "Amber", value: "#d97706" },
  { label: "Violet", value: "#7c3aed" },
  { label: "Slate", value: "#334155" },
];

const EMPTY_FORM: StudentPromoInput = {
  title: "",
  body: "",
  ctaLabel: "Learn more",
  ctaUrl: "/eduhub",
  imageUrl: "",
  accentColor: "#3954d0",
  placement: "my-class",
  active: true,
  sortOrder: 0,
  startsAt: null,
  endsAt: null,
};

export default function AdminPromosPage() {
  const { t } = useTranslation();
  const promos = useStudentPromos();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<StudentPromoInput>(EMPTY_FORM);

  const sortedPromos = useMemo(
    () => [...promos].sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title)),
    [promos],
  );

  const openCreate = () => {
    setForm({ ...EMPTY_FORM, sortOrder: promos.length });
    setDialogOpen(true);
  };

  const openEdit = (promo: StudentPromo) => {
    setForm({
      id: promo.id,
      title: promo.title,
      body: promo.body,
      ctaLabel: promo.ctaLabel,
      ctaUrl: promo.ctaUrl,
      imageUrl: promo.imageUrl,
      accentColor: promo.accentColor,
      placement: promo.placement,
      active: promo.active,
      sortOrder: promo.sortOrder,
      startsAt: promo.startsAt,
      endsAt: promo.endsAt,
    });
    setDialogOpen(true);
  };

  const savePromo = () => {
    if (!form.title.trim()) {
      toast.error(t("admin.promos.toast.titleRequired"));
      return;
    }
    upsertStudentPromo(form);
    toast.success(form.id ? t("admin.promos.toast.updated") : "Promotion published");
    setDialogOpen(false);
  };

  const toggleActive = (promo: StudentPromo) => {
    upsertStudentPromo({ ...promo, active: !promo.active });
    toast.success(promo.active ? t("admin.promos.toast.hidden") : "Promotion is live");
  };

  return (
    <AdminLayout>
      <div className="container mx-auto max-w-5xl px-6">
        <Link
          to="/dashboard/admin"
          className="mb-6 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("admin.shared.backToDashboard")}
        </Link>

        <AdminPageHeader
          title={t("adminNav.studentPromos")}
          description={t("admin.promos.description")}
          actions={
            <>
              <Button type="button" variant="outline" onClick={() => resetStudentPromosToDefaults()}>
                Reset samples
              </Button>
              <Button type="button" className="bg-slate-900 hover:bg-slate-800" onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Add promo
              </Button>
            </>
          }
        />

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("admin.shared.title")}</TableHead>
                <TableHead>{t("admin.promos.table.placement")}</TableHead>
                <TableHead>{t("admin.promos.table.order")}</TableHead>
                <TableHead>{t("common.status")}</TableHead>
                <TableHead className="text-right">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPromos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-slate-500">
                    No promos yet. Add one to show a carousel on My Class.
                  </TableCell>
                </TableRow>
              ) : (
                sortedPromos.map((promo) => (
                  <TableRow key={promo.id}>
                    <TableCell>
                      <div className="flex items-start gap-3">
                        <span
                          className="mt-1 inline-block h-3 w-3 shrink-0 rounded-full"
                          style={{ backgroundColor: promo.accentColor }}
                          aria-hidden
                        />
                        <div>
                          <p className="font-medium text-slate-900">{promo.title}</p>
                          <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{promo.body}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{STUDENT_PROMO_PLACEMENT_LABELS[promo.placement]}</TableCell>
                    <TableCell>{promo.sortOrder}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch checked={promo.active} onCheckedChange={() => toggleActive(promo)} />
                        <span className="text-sm text-slate-600">{promo.active ? t("admin.promos.live") : t("admin.promos.hidden")}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => openEdit(promo)}>
                          <Pencil className="mr-1 h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => {
                            deleteStudentPromo(promo.id);
                            toast.success(t("admin.promos.toast.deleted"));
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="mt-6 flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          <Megaphone className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden />
          <p>
            Students see active promos in a carousel at the top of <strong>{t("admin.promos.placements.myClass")}</strong>. Use sort order to
            control slide sequence. Optional start/end dates hide promos outside the window.
          </p>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? t("admin.promos.dialog.editTitle") : t("admin.promos.dialog.newTitle")}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="promo-title">{t("admin.shared.title")}</Label>
              <Input
                id="promo-title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder={t("admin.promos.dialog.titlePlaceholder")}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="promo-body">{t("admin.promos.dialog.messageLabel")}</Label>
              <Textarea
                id="promo-body"
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                rows={3}
                placeholder={t("admin.promos.dialog.messagePlaceholder")}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="promo-cta-label">{t("admin.promos.dialog.buttonLabel")}</Label>
                <Input
                  id="promo-cta-label"
                  value={form.ctaLabel}
                  onChange={(e) => setForm((f) => ({ ...f, ctaLabel: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="promo-cta-url">{t("admin.promos.dialog.buttonLink")}</Label>
                <Input
                  id="promo-cta-url"
                  value={form.ctaUrl}
                  onChange={(e) => setForm((f) => ({ ...f, ctaUrl: e.target.value }))}
                  placeholder={t("admin.promos.dialog.buttonLinkPlaceholder")}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="promo-image">{t("admin.promos.dialog.imageUrl")}</Label>
              <Input
                id="promo-image"
                value={form.imageUrl}
                onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                placeholder={t("admin.promos.dialog.imagePlaceholder")}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>{t("admin.promos.dialog.accentColor")}</Label>
                <Select
                  value={form.accentColor}
                  onValueChange={(value) => setForm((f) => ({ ...f, accentColor: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCENT_PRESETS.map((preset) => (
                      <SelectItem key={preset.value} value={preset.value}>
                        {preset.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>{t("admin.promos.dialog.showOn")}</Label>
                <Select
                  value={form.placement}
                  onValueChange={(value: StudentPromoPlacement) =>
                    setForm((f) => ({ ...f, placement: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STUDENT_PROMO_PLACEMENT_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="promo-order">{t("admin.promos.dialog.sortOrder")}</Label>
                <Input
                  id="promo-order"
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, sortOrder: Number.parseInt(e.target.value, 10) || 0 }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="promo-starts">{t("admin.promos.dialog.startsOptional")}</Label>
                <Input
                  id="promo-starts"
                  type="date"
                  value={form.startsAt?.slice(0, 10) ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, startsAt: e.target.value ? `${e.target.value}T00:00:00.000Z` : null }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="promo-ends">{t("admin.promos.dialog.endsOptional")}</Label>
                <Input
                  id="promo-ends"
                  type="date"
                  value={form.endsAt?.slice(0, 10) ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, endsAt: e.target.value ? `${e.target.value}T23:59:59.999Z` : null }))
                  }
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
              <div>
                <Label htmlFor="promo-active">{t("admin.promos.dialog.liveForStudents")}</Label>
                <p className="text-xs text-slate-500">{t("admin.promos.dialog.liveHint")}</p>
              </div>
              <Switch
                id="promo-active"
                checked={form.active}
                onCheckedChange={(checked) => setForm((f) => ({ ...f, active: checked }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" className="bg-slate-900 hover:bg-slate-800" onClick={savePromo}>
              {form.id ? t("admin.settings.saveChanges") : t("admin.promos.dialog.publishPromo")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
