import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowLeft, FileText } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { useAuthSession } from "@/features/auth/context";
import { ClassResumeArticleLayout } from "@/features/courses/ClassResumeArticleLayout";
import {
  CLASS_RESUME_CHANGED,
  CLASS_RESUME_STORAGE_KEY,
  getClassResumeById,
  type ClassResumeItem,
} from "@/features/courses/classResumeStorage";
import { enrollmentApplicationStore } from "@/features/enrollment/enrollmentApplicationStore";
import { useStudentCoursesQuery } from "@/features/student/hooks/useStudentQueries";
import { teacherCoursesStore } from "@/features/teacher/data/teacherCoursesStore";

const TEACHER_PREFIX = "teacher_";

function resolveResumeStorageKey(courseId: string): string {
  if (courseId.startsWith(TEACHER_PREFIX)) {
    return courseId.slice(TEACHER_PREFIX.length);
  }
  return courseId;
}

const StudentCourseResumePage = () => {
  const { t } = useTranslation();
  const { courseId: rawCourseId, resumeId: rawResumeId } = useParams<{
    courseId: string;
    resumeId: string;
  }>();
  const courseId = rawCourseId ? decodeURIComponent(rawCourseId) : "";
  const resumeId = rawResumeId ? decodeURIComponent(rawResumeId) : "";
  const { user } = useAuthSession();
  const emailNorm = user.email.trim().toLowerCase();
  const { data: enrolledCourses = [] } = useStudentCoursesQuery();
  const [resumeRev, setResumeRev] = useState(0);

  const isTeacherCourse = courseId.startsWith(TEACHER_PREFIX);
  const teacherCourseId = isTeacherCourse ? courseId.slice(TEACHER_PREFIX.length) : null;
  const teacherCourse = teacherCourseId ? teacherCoursesStore.getById(teacherCourseId) : null;

  const storageKey = courseId ? resolveResumeStorageKey(courseId) : "";
  const resume = useMemo((): ClassResumeItem | null => {
    void resumeRev;
    if (!storageKey || !resumeId) return null;
    return getClassResumeById(storageKey, resumeId);
  }, [storageKey, resumeId, resumeRev]);

  useEffect(() => {
    const bump = () => setResumeRev((n) => n + 1);
    window.addEventListener(CLASS_RESUME_CHANGED, bump);
    const onStorage = (e: StorageEvent) => {
      if (e.key === CLASS_RESUME_STORAGE_KEY) bump();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(CLASS_RESUME_CHANGED, bump);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const isEnrolled = enrolledCourses.some((c) => String(c.id) === courseId);
  const hasAccess =
    isEnrolled ||
    (emailNorm && enrollmentApplicationStore.isApprovedForCourse(courseId, emailNorm));

  const courseTitle =
    enrolledCourses.find((c) => String(c.id) === courseId)?.title ??
    teacherCourse?.title ??
    courseId;

  const backHref = `/dashboard/courses/${encodeURIComponent(courseId)}?tab=resume`;

  if (!courseId || !resumeId) {
    return <Navigate to="/dashboard/courses" replace />;
  }

  if (!hasAccess) {
    return <Navigate to={backHref} replace />;
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
