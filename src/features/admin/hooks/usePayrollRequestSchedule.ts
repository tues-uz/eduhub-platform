import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { eduhubCourses, eduhubSchedule } from "@/api/eduhubClient";
import {
  buildPayrollResolvedCourse,
  evaluatePayrollMonthCompletion,
  pickBestPayrollCourseMatch,
  resolvePayrollScheduleSlots,
} from "@/features/payroll/payrollScheduleEligibility";

type Args = {
  classSection: string;
  course: string;
  periodLabel: string;
  submittedAt: string;
};

export function usePayrollRequestSchedule({
  classSection,
  course,
  periodLabel,
  submittedAt,
}: Args) {
  const apiMatchQuery = useQuery({
    queryKey: ["admin", "payroll-course-match", classSection, course],
    queryFn: async () => {
      const section = classSection.trim();
      const title = course.trim();
      const searchTerm = title || section;
      try {
        const [searchRes, allRes] = await Promise.all([
          searchTerm ? eduhubCourses.getAll({ page: 0, size: 100, search: searchTerm }) : Promise.resolve([]),
          eduhubCourses.getAll({ page: 0, size: 100 }),
        ]);
        const merged = new Map<string, (typeof allRes)[number]>();
        [...allRes, ...searchRes].forEach((c) => {
          if (c?.id) merged.set(c.id, c);
        });
        return pickBestPayrollCourseMatch(Array.from(merged.values()), section, title);
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  const courseId = apiMatchQuery.data?.id;

  const scheduleQuery = useQuery({
    queryKey: ["admin", "payroll-course-schedule", courseId],
    queryFn: async () => {
      if (!courseId) return null;
      const [detail, proposal] = await Promise.all([
        eduhubCourses.getById(courseId),
        eduhubSchedule.getProposal(courseId).catch(() => null),
      ]);
      return buildPayrollResolvedCourse(courseId, detail, proposal);
    },
    enabled: Boolean(courseId),
    staleTime: 60 * 1000,
  });

  const resolved = scheduleQuery.data;

  const slots = useMemo(() => {
    if (!courseId) return [];
    return resolvePayrollScheduleSlots(resolved?.courseId ?? courseId, resolved?.apiCourse ?? null, resolved?.scheduleProposal ?? null);
  }, [courseId, resolved]);

  const monthCompletion = useMemo(() => {
    if (!courseId) {
      return evaluatePayrollMonthCompletion([], periodLabel, submittedAt, "");
    }
    return evaluatePayrollMonthCompletion(slots, periodLabel, submittedAt, courseId);
  }, [courseId, slots, periodLabel, submittedAt]);

  return {
    courseId,
    loading: apiMatchQuery.isLoading || (Boolean(courseId) && scheduleQuery.isLoading),
    slots,
    monthCompletion,
    apiCourse: resolved?.apiCourse ?? null,
    scheduleProposal: resolved?.scheduleProposal ?? null,
  };
}
