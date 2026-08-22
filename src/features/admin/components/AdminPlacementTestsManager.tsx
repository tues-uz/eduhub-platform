import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus } from "@/lib/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { eduhubPlacementTestsAdmin } from "@/api/eduhubClient";
import type { PlacementTestAdminResponse } from "@/api/eduhubClient";
import { AdminPlacementTestEditor } from "./AdminPlacementTestEditor";

/**
 * Manage institution-wide placement tests. Each one is scoped by subject and gates enrollment
 * into every class of that subject whose level sits above the student's achieved level.
 */
export function AdminPlacementTestsManager() {
  const [tests, setTests] = useState<PlacementTestAdminResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<PlacementTestAdminResponse | null>(null);
  const [creating, setCreating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PlacementTestAdminResponse | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    eduhubPlacementTestsAdmin
      .list()
      .then((data) => setTests(data || []))
      .catch(() => setTests([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => load(), [load]);

  const closeEditor = () => {
    setCreating(false);
    setEditing(null);
  };

  const handleSaved = () => {
    closeEditor();
    load();
  };

  const togglePublished = async (test: PlacementTestAdminResponse) => {
    try {
      await eduhubPlacementTestsAdmin.setPublished(test.id, !test.isPublished);
      toast.success(test.isPublished ? "Test unpublished" : "Test published");
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not change publication status.");
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await eduhubPlacementTestsAdmin.delete(pendingDelete.id);
      toast.success("Placement test deleted");
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not delete the placement test.");
    } finally {
      setPendingDelete(null);
    }
  };

  if (creating || editing) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            {editing ? "Edit placement test" : "New placement test"}
          </h2>
          <p className="text-sm text-slate-600">
            Applies to every class in this subject, regardless of teacher.
          </p>
        </div>
        <AdminPlacementTestEditor existing={editing} onSaved={handleSaved} onCancel={closeEditor} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button
          type="button"
          size="sm"
          className="bg-slate-900 text-white hover:bg-slate-800"
          onClick={() => setCreating(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          New placement test
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Title</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Questions</TableHead>
              <TableHead>Bands</TableHead>
              <TableHead>Attempts</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-slate-500">
                  <Loader2 className="mr-2 inline h-5 w-5 animate-spin text-slate-400" />
                  Loading…
                </TableCell>
              </TableRow>
            ) : tests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-slate-500">
                  No placement tests yet. Create one to start gating class enrollment by level.
                </TableCell>
              </TableRow>
            ) : (
              tests.map((test) => (
                <TableRow key={test.id}>
                  <TableCell className="font-medium text-slate-900">{test.title}</TableCell>
                  <TableCell className="text-slate-700">{test.subject}</TableCell>
                  <TableCell className="text-slate-700">{test.questions.length}</TableCell>
                  <TableCell className="text-slate-700">
                    {test.bands.length === 0 ? (
                      <span className="text-amber-700">None — no level assigned</span>
                    ) : (
                      test.bands.length
                    )}
                  </TableCell>
                  <TableCell className="text-slate-700">{test.maxAttempts ?? "Unlimited"}</TableCell>
                  <TableCell>
                    {test.isPublished ? (
                      <Badge className="bg-emerald-600">Published</Badge>
                    ) : (
                      <Badge variant="secondary">Draft</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(test)}>
                        Edit
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => togglePublished(test)}>
                        {test.isPublished ? "Unpublish" : "Publish"}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-rose-600 hover:text-rose-700"
                        onClick={() => setPendingDelete(test)}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={Boolean(pendingDelete)} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this placement test?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.title} and its score bands will be removed. Students who already have a
              level in {pendingDelete?.subject} keep it — but nobody new can be placed until another
              test is published for this subject.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-600 hover:bg-rose-700" onClick={confirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
