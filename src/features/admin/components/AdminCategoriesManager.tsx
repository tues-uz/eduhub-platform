import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { eduhubCategories, ApiError } from "@/api/eduhubClient";
import type { CategoryResponse } from "@/api/eduhubTypes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Plus, Search, Trash2, BookOpen, Users, Folder, RefreshCw } from "@/lib/icons";

export function AdminCategoriesManager() {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Create modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creating, setCreating] = useState(false);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<CategoryResponse | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const res = await eduhubCategories.getAllAdmin();
      setCategories(Array.isArray(res) ? res : []);
    } catch (err: unknown) {
      // Fallback to standard getAll if admin endpoint is unavailable
      try {
        const fallbackRes = await eduhubCategories.getAll();
        setCategories(Array.isArray(fallbackRes) ? fallbackRes : []);
      } catch {
        toast.error(err instanceof Error ? err.message : t("admin.categories.loadError"));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, search]);

  const totalCourses = useMemo(() => {
    return categories.reduce((sum, c) => sum + (c.coursesCount ?? 0), 0);
  }, [categories]);

  const totalTeachers = useMemo(() => {
    return categories.reduce((sum, c) => sum + (c.teachersCount ?? 0), 0);
  }, [categories]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCategoryName.trim();
    if (!name) {
      toast.error(t("admin.categories.nameRequired"));
      return;
    }
    if (categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      toast.error(t("admin.categories.alreadyExists"));
      return;
    }

    try {
      setCreating(true);
      await eduhubCategories.create(name);
      toast.success(t("admin.categories.createSuccess"));
      setNewCategoryName("");
      setCreateOpen(false);
      await loadCategories();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("admin.categories.createError"));
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await eduhubCategories.delete(deleteTarget.name);
      toast.success(t("admin.categories.deleteSuccess"));
      setDeleteTarget(null);
      await loadCategories();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error(err instanceof Error ? err.message : t("admin.categories.deleteError"));
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
            <Folder className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">{t("admin.categories.totalCategories")}</p>
            <p className="text-xl font-bold text-slate-900">{categories.length}</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">{t("admin.categories.totalCoursesTagged")}</p>
            <p className="text-xl font-bold text-slate-900">{totalCourses}</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">{t("admin.categories.totalTeachersAssigned")}</p>
            <p className="text-xl font-bold text-slate-900">{totalTeachers}</p>
          </div>
        </div>
      </div>

      {/* Main card */}
      <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">{t("admin.categories.title")}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{t("admin.categories.subtitle")}</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder={t("admin.categories.searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadCategories}
              disabled={loading}
              className="h-9 px-2.5 text-slate-600 hover:text-slate-900"
              title={t("common.refresh")}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button
              size="sm"
              onClick={() => setCreateOpen(true)}
              className="h-9 bg-slate-900 hover:bg-slate-800 text-white gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>{t("admin.categories.addCategory")}</span>
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-slate-400 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
            <span>{t("common.loading")}</span>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="p-12 text-center">
            <Folder className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-700">{t("admin.categories.noCategoriesFound")}</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {search ? t("admin.categories.noSearchResults") : t("admin.categories.createFirstCategoryHint")}
            </p>
            {!search && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCreateOpen(true)}
                className="mt-4 gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                {t("admin.categories.addCategory")}
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/75">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[45%] text-xs font-semibold text-slate-600">{t("admin.categories.nameColumn")}</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 text-center">{t("admin.categories.coursesColumn")}</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 text-center">{t("admin.categories.teachersColumn")}</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 text-right pr-6">{t("admin.categories.actionsColumn")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCategories.map((category) => {
                  const hasUsage = (category.coursesCount ?? 0) > 0 || (category.teachersCount ?? 0) > 0;
                  return (
                    <TableRow key={category.id || category.name} className="hover:bg-slate-50/50">
                      <TableCell className="font-medium text-slate-900 text-sm">
                        <div className="flex items-center gap-2.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500/80 flex-shrink-0" />
                          <span>{category.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="font-normal text-xs bg-slate-100 text-slate-700">
                          {category.coursesCount ?? 0} {t("admin.categories.coursesUnit")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="font-normal text-xs bg-slate-100 text-slate-700">
                          {category.teachersCount ?? 0} {t("admin.categories.teachersUnit")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteTarget(category)}
                          className="text-slate-400 hover:text-red-600 hover:bg-red-50 h-8 w-8 p-0"
                          title={hasUsage ? t("admin.categories.inUseWarningTooltip") : t("common.delete")}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Create Category Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle>{t("admin.categories.createModalTitle")}</DialogTitle>
              <DialogDescription>{t("admin.categories.createModalDesc")}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="category-name" className="text-xs font-semibold text-slate-700">
                  {t("admin.categories.categoryNameLabel")}
                </Label>
                <Input
                  id="category-name"
                  placeholder="e.g. General English, IELTS Preparation, Computer Science"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  maxLength={100}
                  autoFocus
                  required
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
                disabled={creating || !newCategoryName.trim()}
                className="bg-slate-900 hover:bg-slate-800 text-white"
              >
                {creating ? t("common.saving") : t("admin.categories.createButton")}
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
              {t("admin.categories.deleteConfirmTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-slate-600">
              <span>
                {t("admin.categories.deleteConfirmPrompt", { name: deleteTarget?.name })}
              </span>
              {deleteTarget && ((deleteTarget.coursesCount ?? 0) > 0 || (deleteTarget.teachersCount ?? 0) > 0) && (
                <div className="mt-2.5 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium">
                  ⚠️ {t("admin.categories.deleteBlockedHint", {
                    courses: deleteTarget.coursesCount ?? 0,
                    teachers: deleteTarget.teachersCount ?? 0,
                  })}
                </div>
              )}
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
