import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { eduhubCourseLevels, ApiError } from "@/api/eduhubClient";
import type { CourseLevelResponse, CourseLevelCreateRequest, CourseLevelUpdateRequest } from "@/api/eduhubTypes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Search, Trash2, Pencil, RefreshCw, GraduationCap, CheckCircle2, XCircle } from "@/lib/icons";

export function AdminCourseLevelsManager() {
  const { t } = useTranslation();
  const [levels, setLevels] = useState<CourseLevelResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Create modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CourseLevelCreateRequest>({
    code: "",
    name: "",
    description: "",
    sortOrder: 0,
    isActive: true,
  });
  const [creating, setCreating] = useState(false);

  // Edit modal state
  const [editTarget, setEditTarget] = useState<CourseLevelResponse | null>(null);
  const [editForm, setEditForm] = useState<CourseLevelUpdateRequest>({
    name: "",
    description: "",
    sortOrder: 0,
    isActive: true,
  });
  const [updating, setUpdating] = useState(false);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<CourseLevelResponse | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadLevels = async () => {
    try {
      setLoading(true);
      const res = await eduhubCourseLevels.getAllAdmin();
      setLevels(Array.isArray(res) ? res : []);
    } catch (err: unknown) {
      try {
        const fallbackRes = await eduhubCourseLevels.getAll();
        setLevels(Array.isArray(fallbackRes) ? fallbackRes : []);
      } catch {
        toast.error(err instanceof Error ? err.message : t("admin.courseLevels.loadError"));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLevels();
  }, []);

  const filteredLevels = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return levels;
    return levels.filter(
      (l) =>
        l.code.toLowerCase().includes(q) ||
        l.name.toLowerCase().includes(q) ||
        (l.description && l.description.toLowerCase().includes(q))
    );
  }, [levels, search]);

  const activeCount = useMemo(() => levels.filter((l) => l.isActive).length, [levels]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = createForm.code.trim().toLowerCase();
    const name = createForm.name.trim();
    if (!code) {
      toast.error(t("admin.courseLevels.codeRequired"));
      return;
    }
    if (!name) {
      toast.error(t("admin.courseLevels.nameRequired"));
      return;
    }
    if (levels.some((l) => l.code.toLowerCase() === code)) {
      toast.error(t("admin.courseLevels.alreadyExists"));
      return;
    }

    try {
      setCreating(true);
      await eduhubCourseLevels.create({
        code,
        name,
        description: createForm.description?.trim() || undefined,
        sortOrder: Number(createForm.sortOrder) || 0,
        isActive: createForm.isActive ?? true,
      });
      toast.success(t("admin.courseLevels.createSuccess"));
      setCreateForm({ code: "", name: "", description: "", sortOrder: 0, isActive: true });
      setCreateOpen(false);
      await loadLevels();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("admin.courseLevels.createError"));
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (level: CourseLevelResponse) => {
    setEditTarget(level);
    setEditForm({
      name: level.name,
      description: level.description || "",
      sortOrder: level.sortOrder,
      isActive: level.isActive,
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    const name = editForm.name?.trim();
    if (!name) {
      toast.error(t("admin.courseLevels.nameRequired"));
      return;
    }

    try {
      setUpdating(true);
      await eduhubCourseLevels.update(editTarget.id, {
        name,
        description: editForm.description?.trim() || undefined,
        sortOrder: Number(editForm.sortOrder) || 0,
        isActive: editForm.isActive,
      });
      toast.success(t("admin.courseLevels.updateSuccess"));
      setEditTarget(null);
      await loadLevels();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("admin.courseLevels.updateError"));
    } finally {
      setUpdating(false);
    }
  };

  const handleToggleActive = async (level: CourseLevelResponse, nextActive: boolean) => {
    try {
      await eduhubCourseLevels.update(level.id, {
        name: level.name,
        description: level.description,
        sortOrder: level.sortOrder,
        isActive: nextActive,
      });
      setLevels((prev) =>
        prev.map((l) => (l.id === level.id ? { ...l, isActive: nextActive } : l))
      );
      toast.success(
        nextActive
          ? t("admin.courseLevels.activatedSuccess", { name: level.name })
          : t("admin.courseLevels.deactivatedSuccess", { name: level.name })
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("admin.courseLevels.updateError"));
      await loadLevels();
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await eduhubCourseLevels.delete(deleteTarget.id);
      toast.success(t("admin.courseLevels.deleteSuccess"));
      setDeleteTarget(null);
      await loadLevels();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error(err instanceof Error ? err.message : t("admin.courseLevels.deleteError"));
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">{t("admin.courseLevels.totalLevels")}</p>
            <p className="text-xl font-bold text-slate-900">{levels.length}</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">{t("admin.courseLevels.activeLevels")}</p>
            <p className="text-xl font-bold text-slate-900">{activeCount}</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center flex-shrink-0">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">{t("admin.courseLevels.inactiveLevels")}</p>
            <p className="text-xl font-bold text-slate-900">{levels.length - activeCount}</p>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">{t("admin.courseLevels.title")}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{t("admin.courseLevels.subtitle")}</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder={t("admin.courseLevels.searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadLevels}
              disabled={loading}
              className="h-9 px-2.5 text-slate-600 hover:text-slate-900"
              title={t("common.refresh")}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setCreateForm({
                  code: "",
                  name: "",
                  description: "",
                  sortOrder: (levels.length + 1) * 10,
                  isActive: true,
                });
                setCreateOpen(true);
              }}
              className="h-9 bg-slate-900 hover:bg-slate-800 text-white gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>{t("admin.courseLevels.addLevel")}</span>
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-slate-400 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
            <span>{t("common.loading")}</span>
          </div>
        ) : filteredLevels.length === 0 ? (
          <div className="p-12 text-center">
            <GraduationCap className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-700">{t("admin.courseLevels.noLevelsFound")}</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {search ? t("admin.courseLevels.noSearchResults") : t("admin.courseLevels.createFirstLevelHint")}
            </p>
            {!search && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCreateOpen(true)}
                className="mt-4 gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                {t("admin.courseLevels.addLevel")}
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/75">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-16 text-center text-xs font-semibold text-slate-600">{t("admin.courseLevels.orderColumn")}</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">{t("admin.courseLevels.nameColumn")}</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">{t("admin.courseLevels.codeColumn")}</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">{t("admin.courseLevels.descriptionColumn")}</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 text-center">{t("admin.courseLevels.statusColumn")}</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 text-right pr-6">{t("admin.courseLevels.actionsColumn")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLevels.map((level) => (
                  <TableRow key={level.id || level.code} className="hover:bg-slate-50/50">
                    <TableCell className="text-center font-medium text-slate-500 text-xs">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-slate-100 font-mono text-slate-700">
                        {level.sortOrder}
                      </span>
                    </TableCell>
                    <TableCell className="font-semibold text-slate-900 text-sm">
                      {level.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs text-slate-600 bg-slate-50 border-slate-200">
                        {level.code}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 max-w-xs truncate">
                      {level.description || "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Switch
                          checked={level.isActive}
                          onCheckedChange={(checked) => handleToggleActive(level, checked)}
                          aria-label={t("admin.courseLevels.toggleActive")}
                        />
                        <span className={`text-[11px] font-medium ${level.isActive ? "text-emerald-700" : "text-slate-400"}`}>
                          {level.isActive ? t("common.active") : t("common.inactive")}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(level)}
                          className="text-slate-500 hover:text-slate-900 hover:bg-slate-100 h-8 w-8 p-0"
                          title={t("common.edit")}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteTarget(level)}
                          className="text-slate-400 hover:text-red-600 hover:bg-red-50 h-8 w-8 p-0"
                          title={t("common.delete")}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Create Level Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle>{t("admin.courseLevels.createModalTitle")}</DialogTitle>
              <DialogDescription>{t("admin.courseLevels.createModalDesc")}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="level-code" className="text-xs font-semibold text-slate-700">
                    {t("admin.courseLevels.codeLabel")}
                  </Label>
                  <Input
                    id="level-code"
                    placeholder="e.g. beginner_a1, grade_10"
                    value={createForm.code}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        code: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "_"),
                      })
                    }
                    maxLength={50}
                    autoFocus
                    required
                  />
                  <p className="text-[10px] text-slate-400">{t("admin.courseLevels.codeHint")}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="level-sort" className="text-xs font-semibold text-slate-700">
                    {t("admin.courseLevels.sortOrderLabel")}
                  </Label>
                  <Input
                    id="level-sort"
                    type="number"
                    value={createForm.sortOrder}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, sortOrder: parseInt(e.target.value, 10) || 0 })
                    }
                  />
                  <p className="text-[10px] text-slate-400">{t("admin.courseLevels.sortOrderHint")}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="level-name" className="text-xs font-semibold text-slate-700">
                  {t("admin.courseLevels.nameLabel")}
                </Label>
                <Input
                  id="level-name"
                  placeholder="e.g. A1 Beginner, 10th Grade, Mastery C2"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  maxLength={100}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="level-desc" className="text-xs font-semibold text-slate-700">
                  {t("admin.courseLevels.descriptionLabel")}
                </Label>
                <Input
                  id="level-desc"
                  placeholder="Brief description of target proficiency or audience"
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  maxLength={255}
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div>
                  <Label htmlFor="level-active" className="text-xs font-semibold text-slate-700">
                    {t("admin.courseLevels.activeStatusLabel")}
                  </Label>
                  <p className="text-[11px] text-slate-400">{t("admin.courseLevels.activeStatusHint")}</p>
                </div>
                <Switch
                  id="level-active"
                  checked={createForm.isActive}
                  onCheckedChange={(checked) => setCreateForm({ ...createForm, isActive: checked })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
                disabled={creating}
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="submit"
                disabled={creating || !createForm.code.trim() || !createForm.name.trim()}
                className="bg-slate-900 hover:bg-slate-800 text-white"
              >
                {creating ? t("common.saving") : t("admin.courseLevels.createButton")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Level Modal */}
      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleUpdate}>
            <DialogHeader>
              <DialogTitle>{t("admin.courseLevels.editModalTitle")}</DialogTitle>
              <DialogDescription>
                {t("admin.courseLevels.editModalDesc", { code: editTarget?.code })}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-700">{t("admin.courseLevels.codeLabel")}</Label>
                  <Input value={editTarget?.code || ""} disabled className="bg-slate-100 text-slate-500 font-mono text-xs" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-level-sort" className="text-xs font-semibold text-slate-700">
                    {t("admin.courseLevels.sortOrderLabel")}
                  </Label>
                  <Input
                    id="edit-level-sort"
                    type="number"
                    value={editForm.sortOrder}
                    onChange={(e) =>
                      setEditForm({ ...editForm, sortOrder: parseInt(e.target.value, 10) || 0 })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-level-name" className="text-xs font-semibold text-slate-700">
                  {t("admin.courseLevels.nameLabel")}
                </Label>
                <Input
                  id="edit-level-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  maxLength={100}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-level-desc" className="text-xs font-semibold text-slate-700">
                  {t("admin.courseLevels.descriptionLabel")}
                </Label>
                <Input
                  id="edit-level-desc"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  maxLength={255}
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div>
                  <Label htmlFor="edit-level-active" className="text-xs font-semibold text-slate-700">
                    {t("admin.courseLevels.activeStatusLabel")}
                  </Label>
                  <p className="text-[11px] text-slate-400">{t("admin.courseLevels.activeStatusHint")}</p>
                </div>
                <Switch
                  id="edit-level-active"
                  checked={editForm.isActive}
                  onCheckedChange={(checked) => setEditForm({ ...editForm, isActive: checked })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditTarget(null)}
                disabled={updating}
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="submit"
                disabled={updating || !editForm.name?.trim()}
                className="bg-slate-900 hover:bg-slate-800 text-white"
              >
                {updating ? t("common.saving") : t("common.saveChanges")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900">
              {t("admin.courseLevels.deleteConfirmTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600">
              {t("admin.courseLevels.deleteConfirmPrompt", { name: deleteTarget?.name, code: deleteTarget?.code })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? t("common.deleting") : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
