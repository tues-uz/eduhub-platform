import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuthSession } from "@/features/auth/context";
import {
  clearTeacherClassChecklist,
  DEFAULT_TEACHER_CLASS_CHECKLIST_ITEMS,
  getTeacherClassChecklist,
  instructorVerifyItemId,
  setTeacherClassChecklistItem,
  TEACHER_CLASS_CHECKLIST_CHANGED,
  TEACHER_CLASS_CHECKLIST_STORAGE_KEY,
  teacherClassChecklistUserKey,
} from "@/features/teacher/data/teacherClassChecklistStorage";

export function useTeacherClassChecklist(courseId: string | undefined) {
  const { user } = useAuthSession();
  const userKey = useMemo(
    () => teacherClassChecklistUserKey(user.id, user.email),
    [user.id, user.email],
  );
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const reload = useCallback(() => {
    if (!courseId || !userKey) {
      setChecked({});
      return;
    }
    setChecked(getTeacherClassChecklist(userKey, courseId));
  }, [courseId, userKey]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    const bump = () => reload();
    window.addEventListener(TEACHER_CLASS_CHECKLIST_CHANGED, bump);
    const onStorage = (e: StorageEvent) => {
      if (e.key === TEACHER_CLASS_CHECKLIST_STORAGE_KEY) bump();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(TEACHER_CLASS_CHECKLIST_CHANGED, bump);
      window.removeEventListener("storage", onStorage);
    };
  }, [reload]);

  const toggle = useCallback(
    (itemId: string, value: boolean) => {
      if (!courseId || !userKey) return;
      setTeacherClassChecklistItem(userKey, courseId, itemId, value);
      setChecked((prev) => {
        const next = { ...prev };
        if (value) next[itemId] = true;
        else delete next[itemId];
        return next;
      });
    },
    [courseId, userKey],
  );

  const reset = useCallback(() => {
    if (!courseId || !userKey) return;
    clearTeacherClassChecklist(userKey, courseId);
    setChecked({});
  }, [courseId, userKey]);

  return {
    items: DEFAULT_TEACHER_CLASS_CHECKLIST_ITEMS,
    checked,
    toggle,
    reset,
    ready: Boolean(courseId && userKey),
    verifyItemId: instructorVerifyItemId,
  };
}
