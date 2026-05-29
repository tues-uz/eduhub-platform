import { useCallback, useEffect, useState } from "react";
import {
  readSpecialTuitionGrants,
  SPECIAL_TUITION_GRANTS_CHANGED_EVENT,
  type SpecialTuitionGrant,
} from "@/features/admin/data/specialTuitionGrantsStore";

export function useSpecialTuitionGrants() {
  const [grants, setGrants] = useState<SpecialTuitionGrant[]>(() => readSpecialTuitionGrants());

  const refresh = useCallback(() => {
    setGrants(readSpecialTuitionGrants());
  }, []);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === "eduhub_special_tuition_grants") refresh();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(SPECIAL_TUITION_GRANTS_CHANGED_EVENT, refresh);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(SPECIAL_TUITION_GRANTS_CHANGED_EVENT, refresh);
    };
  }, [refresh]);

  return grants;
}
