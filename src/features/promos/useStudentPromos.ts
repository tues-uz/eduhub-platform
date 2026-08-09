import { useCallback, useEffect, useMemo, useState } from "react";
import {
  filterActiveStudentPromos,
  loadStudentPromos,
  readStudentPromos,
  readStudentPromosWithDefaults,
  STUDENT_PROMOS_CHANGED_EVENT,
  type StudentPromo,
  type StudentPromoPlacement,
} from "@/features/promos/studentPromos";

export function useStudentPromos() {
  const [promos, setPromos] = useState<StudentPromo[]>(() => readStudentPromos());

  const refresh = useCallback(() => {
    setPromos(readStudentPromos());
  }, []);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === "eduhub_student_promos") refresh();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(STUDENT_PROMOS_CHANGED_EVENT, refresh);
    void loadStudentPromos();
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(STUDENT_PROMOS_CHANGED_EVENT, refresh);
    };
  }, [refresh]);

  return promos;
}

export function useActiveStudentPromos(placement: StudentPromoPlacement) {
  const promos = useStudentPromos();
  const visiblePromos = promos.length > 0 ? promos : readStudentPromosWithDefaults();
  return useMemo(() => filterActiveStudentPromos(visiblePromos, placement), [visiblePromos, placement]);
}
