import { useTranslation } from "react-i18next";
import { Link, Navigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, FileText } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { ClassResumeArticleLayout } from "@/features/courses/ClassResumeArticleLayout";
import { useStudentCoursesQuery } from "@/features/student/hooks/useStudentQueries";
import { eduhubClassResumes } from "@/api/eduhubClient";
import { isUuid } from "@/api/utils";

const StudentCourseResumePage = () => {
  const { t } = useTranslation();
  const { courseId: rawCourseId, resumeId: rawResumeId } = useParams<{
    courseId: string;
    resumeId: string;
  }>();
  const courseId = rawCourseId ? decodeURIComponent(rawCourseId) : "";
  const resumeId = rawResumeId ? decodeURIComponent(rawResumeId) : "";
  const { data: enrolledCourses = [] } = useStudentCoursesQuery();

  const isApiCourse = Boolean(courseId) && isUuid(courseId);

  const apiResumeQuery = useQuery({
    queryKey: ["student", "resume", courseId, resumeId],
    queryFn: () => eduhubClassResumes.get(courseId, resumeId),
    enabled: isApiCourse && Boolean(resumeId),
    retry: false,
  });

  const resume = apiResumeQuery.data ?? null;

  const hasAccess = enrolledCourses.some((c) => String(c.id) === courseId);

  const courseTitle = enrolledCourses.find((c) => String(c.id) === courseId)?.title ?? courseId;

  const backHref = `/dashboard/courses/${encodeURIComponent(courseId)}?tab=resume`;

  if (!courseId || !resumeId) {
    return <Navigate to="/dashboard/courses" replace />;
  }

  if (!hasAccess) {
    return <Navigate to={backHref} replace />;
  }

  if (isApiCourse && apiResumeQuery.isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <p className="text-stone-500">{t("courseResume.loading")}</p>
      </div>
    );
  }

  if (!resume) {
    return (
      <div
        className="flex min-h-[50vh] items-center justify-center bg-zinc-100/90 px-6 py-16 text-center"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        <div>
          <FileText className="mx-auto h-10 w-10 text-stone-400" aria-hidden />
          <p className="mt-4 text-stone-600">{t("courseResume.notFound")}</p>
          <Button asChild variant="outline" className="mt-6 rounded-full border-stone-300">
            <Link to={backHref}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("courseResume.backToClass")}
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ClassResumeArticleLayout resume={resume} courseTitle={courseTitle} backHref={backHref} />
    </div>
  );
};

export default StudentCourseResumePage;
