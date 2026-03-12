import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { coursesApi, dashboardApi } from "@/api/client";
import { studentKeys } from "@/api/queryKeys";
import { eduhubEnrollments } from "@/api/eduhubClient";

export function useStudentOverviewQuery() {
  return useQuery({
    queryKey: studentKeys.overview(),
    queryFn: dashboardApi.getStudentOverview,
  });
}

export function useStudentCoursesQuery() {
  return useQuery({
    queryKey: studentKeys.courses(),
    queryFn: coursesApi.getStudentCourses,
  });
}

export function useEnrollMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (courseId: string) => eduhubEnrollments.enroll({ courseId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studentKeys.courses() });
      toast.success("Successfully enrolled!", { description: "You can now access the course." });
    },
    onError: (error: Error) => {
      const message = error.message.includes("already enrolled") 
        ? "You are already enrolled in this course" 
        : error.message || "Failed to enroll";
      toast.error("Enrollment failed", { description: message });
    },
  });
}
