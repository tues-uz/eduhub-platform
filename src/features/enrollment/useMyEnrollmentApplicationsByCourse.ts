import { useEffect, useState } from "react";
import { eduhubEnrollmentApplications } from "@/api/eduhubClient";
import type { EnrollmentApplicationResponse } from "@/api/eduhubTypes";
import { indexEnrollmentApplicationsByCourse } from "@/features/enrollment/studentCourseEnrollmentStatus";

export function useMyEnrollmentApplicationsByCourse(emailNorm?: string) {
  const [byCourse, setByCourse] = useState<Map<string, EnrollmentApplicationResponse>>(() => new Map());
  const [loading, setLoading] = useState(Boolean(emailNorm?.trim()));
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const bump = () => setTick((n) => n + 1);
    window.addEventListener("eduhub-enrollment-applications-changed", bump);
    window.addEventListener("storage", bump);
    return () => {
      window.removeEventListener("eduhub-enrollment-applications-changed", bump);
      window.removeEventListener("storage", bump);
    };
  }, []);

  useEffect(() => {
    const normalized = (emailNorm ?? "").trim();
    let cancelled = false;
    setLoading(true);
    eduhubEnrollmentApplications
      .getMy(normalized)
      .then((rows) => {
        if (!cancelled) setByCourse(indexEnrollmentApplicationsByCourse(rows));
      })
      .catch(() => {
        if (!cancelled) setByCourse(new Map());
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [emailNorm, tick]);

  return { byCourse, loading };
}
