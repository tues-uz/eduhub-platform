import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BookOpen, Search, User, Clock, Layers, DollarSign, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthSession } from "@/features/auth/context";
import { useStudentCoursesQuery } from "@/features/student/hooks/useStudentQueries";
import { teacherCoursesStore } from "@/features/teacher/data/teacherCoursesStore";
import { eduhubCourses } from "@/api/eduhubClient";
import type { CourseSummaryResponse } from "@/api/eduhubTypes";
import { EnrollmentStatusBadge } from "@/features/enrollment/EnrollmentStatusBadge";
import {
  resolveStudentCourseEnrollmentDisplayStatus,
  type StudentCourseEnrollmentDisplayStatus,
} from "@/features/enrollment/studentCourseEnrollmentStatus";
import { useMyEnrollmentApplicationsByCourse } from "@/features/enrollment/useMyEnrollmentApplicationsByCourse";

type AvailableCourseItem = {
  id: string;
  /** For teacher local courses this is teacher_${id}; for API courses same as id */
  linkId: string;
  title: string;
  instructor: string;
  category: string;
  duration: string;
  modules: number;
  price: number | undefined;
  currency?: string;
  enrollmentStatus: StudentCourseEnrollmentDisplayStatus;
  progress?: number;
  status?: string;
  nextLesson?: string;
  /** Cover image from API or teacher form upload */
  thumbnailUrl?: string;
};

function formatPrice(price: number | undefined, currency = "USD"): string {
  if (price == null || price <= 0) return "Free";
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(price);
}

const StudentAvailableCourses = () => {
  const navigate = useNavigate();
  const { user } = useAuthSession();
  const emailNorm = user.email.trim().toLowerCase();
  const { data: enrolledCourses = [] } = useStudentCoursesQuery();
  const { byCourse: applicationsByCourse } = useMyEnrollmentApplicationsByCourse(emailNorm);
  const [searchQuery, setSearchQuery] = useState("");
  const [courses, setCourses] = useState<AvailableCourseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrollmentStoreTick, setEnrollmentStoreTick] = useState(0);

  useEffect(() => {
    const bump = () => setEnrollmentStoreTick((n) => n + 1);
    window.addEventListener("eduhub-enrollment-applications-changed", bump);
    window.addEventListener("storage", bump);
    return () => {
      window.removeEventListener("eduhub-enrollment-applications-changed", bump);
      window.removeEventListener("storage", bump);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const enrolledIds = new Set(enrolledCourses.map((c) => String(c.id)));
    const enrolledByLinkId = new Map(enrolledCourses.map((c) => [String(c.id), c]));

    const enrollmentStatusFor = (linkId: string): StudentCourseEnrollmentDisplayStatus =>
      resolveStudentCourseEnrollmentDisplayStatus(
        linkId,
        emailNorm,
        enrolledIds.has(linkId),
        applicationsByCourse.get(linkId),
      );

    async function load() {
      setLoading(true);
      const localTeacher = teacherCoursesStore.getAll();
      const localItems: AvailableCourseItem[] = localTeacher.map((c) => {
        const linkId = `teacher_${c.id}`;
        const enrolledData = enrolledByLinkId.get(linkId);
        const moduleCount = c.lessons?.length ?? 0;
        const duration = moduleCount ? `${moduleCount} lessons` : "—";
        return {
          id: c.id,
          linkId,
          title: c.title,
          instructor: c.instructorName,
          category: "Class",
          duration,
          modules: moduleCount,
          price: c.price,
          thumbnailUrl: c.thumbnailUrl?.trim() || undefined,
          enrollmentStatus: enrollmentStatusFor(linkId),
          progress: enrolledData?.progress,
          status: enrolledData?.status,
          nextLesson: enrolledData?.nextLesson,
        };
      });

      const mapApiToItem = (c: CourseSummaryResponse) => {
        const enrolledData = enrolledByLinkId.get(c.id);
        const price = c.pricing?.discountedAmount ?? c.pricing?.amount;
        return {
          id: c.id,
          linkId: c.id,
          title: c.title,
          instructor: c.lecturerName,
          category: c.category ?? "Class",
          duration: "—",
          modules: 0,
          price: price as number | undefined,
          currency: c.pricing?.currency,
          thumbnailUrl: c.thumbnailUrl?.trim() || undefined,
          enrollmentStatus: enrollmentStatusFor(c.id),
          progress: enrolledData?.progress,
          status: enrolledData?.status,
          nextLesson: enrolledData?.nextLesson,
        };
      };

      try {
        const seenIds = new Set<string>();
        const apiItems: AvailableCourseItem[] = [];

        // 1) GET /courses = getAllPublishedCourses (Swagger): lecturer-created courses that are PUBLISHED. Students explore these.
        try {
          const pubRes = await eduhubCourses.getAll({ page: 0, size: 100 });
          pubRes.forEach((c) => {
            if (!seenIds.has(c.id)) {
              seenIds.add(c.id);
              apiItems.push(mapApiToItem(c));
            }
          });
        } catch {
          // API down or auth issue
        }

        const localOnly = localItems.filter((c) => !seenIds.has(c.id));
        if (!cancelled) {
          setCourses([...apiItems, ...localOnly]);
        }
      } catch {
        if (!cancelled) setCourses(localItems);
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [enrolledCourses, enrollmentStoreTick, emailNorm, applicationsByCourse]);

  // Show all courses (API + teacher-created) so students can see and take teacher courses
  const filteredCourses = courses.filter((course) => {
    const q = searchQuery.toLowerCase();
    return (
      course.title.toLowerCase().includes(q) ||
      course.instructor.toLowerCase().includes(q) ||
      course.category.toLowerCase().includes(q)
    );
  });

  return (
    <div className="container mx-auto px-0 pt-4">
          <div className="mb-8">
            <h1
              className="mb-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
              style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.02em" }}
            >
              Available Classes
            </h1>
            <p className="mb-4 text-sm text-foreground/70">
              Browse and enroll in classes offered on EduHub. Prices shown where set by instructors.
            </p>
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
              <Input
                type="search"
                placeholder="Search by class name, instructor, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-11 rounded-lg border-gray-200 pl-10"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-foreground/40" />
            </div>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-foreground/60">
                  {filteredCourses.length} class{filteredCourses.length !== 1 ? "es" : ""} found
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                {filteredCourses.map((course) => (
                  <div
                    key={course.linkId}
                    role="link"
                    tabIndex={0}
                    onClick={() =>
                      navigate(`/dashboard/available-courses/class/${encodeURIComponent(course.linkId)}`)
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        navigate(`/dashboard/available-courses/class/${encodeURIComponent(course.linkId)}`);
                      }
                    }}
                    className="flex cursor-pointer flex-col overflow-hidden rounded-xl border border-gray-200/50 bg-white/80 shadow-sm backdrop-blur-sm transition-all hover:border-gray-300/50 hover:shadow-md"
                  >
                    <div className="relative h-40 w-full shrink-0 bg-gray-200 sm:h-44">
                      {course.thumbnailUrl ? (
                        <img
                          src={course.thumbnailUrl}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center" aria-hidden>
                          <BookOpen className="h-10 w-10 text-gray-400/90" />
                        </div>
                      )}
                      <div
                        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent"
                        aria-hidden
                      />
                      <EnrollmentStatusBadge
                        status={course.enrollmentStatus}
                        className="absolute right-2 top-2"
                      />
                    </div>

                    <div className="flex flex-1 flex-col p-4">
                    <div className="mb-4 flex items-start gap-4">
                      <div className="min-w-0 flex-1">
                        {course.category && (
                          <span className="text-xs font-medium uppercase tracking-wide text-foreground/60">
                            {course.category}
                          </span>
                        )}
                        <h3
                          className="mt-0.5 mb-1 font-bold text-foreground"
                          style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.3px" }}
                        >
                          {course.title}
                        </h3>
                        <div className="flex items-center gap-1.5 text-sm text-foreground/60">
                          <User className="h-3.5 w-3.5 flex-shrink-0" />
                          <span>{course.instructor}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mb-4 flex flex-wrap gap-3 text-xs text-foreground/60">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {course.duration}
                      </span>
                      <span className="flex items-center gap-1">
                        <Layers className="h-3.5 w-3.5" />
                        {course.modules} modules
                      </span>
                    </div>

                    <div className="mb-4 flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-foreground/60" />
                      <span className="font-semibold text-foreground">{formatPrice(course.price, course.currency)}</span>
                    </div>

                    <div className="mt-auto border-t border-gray-100 pt-4">
                      {course.enrollmentStatus === "enrolled" ? (
                        <Link
                          to={`/dashboard/courses/${course.linkId}`}
                          className="block"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            size="sm"
                            className="w-full rounded-full"
                            style={{ backgroundColor: "#3954d0" }}
                          >
                            Continue
                          </Button>
                        </Link>
                      ) : course.enrollmentStatus === "pending_review" ? (
                        <Link
                          to={`/dashboard/available-courses/enroll/${encodeURIComponent(course.linkId)}/success`}
                          className="block"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full rounded-full border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
                          >
                            View application
                          </Button>
                        </Link>
                      ) : (
                        <Link
                          to={`/dashboard/available-courses/enroll/${encodeURIComponent(course.linkId)}`}
                          className="block"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            size="sm"
                            className="w-full rounded-full"
                            style={{ backgroundColor: "#3954d0" }}
                          >
                            {course.enrollmentStatus === "rejected" ? "Apply again" : "Join Class"}
                          </Button>
                        </Link>
                      )}
                    </div>
                    </div>
                  </div>
                ))}
              </div>

              {filteredCourses.length === 0 && (
                <div className="rounded-xl border border-gray-200/50 bg-white/50 py-16 text-center">
                  <BookOpen className="mx-auto mb-4 h-12 w-12 text-foreground/30" />
                  <p className="font-medium text-foreground/70">
                    {courses.length === 0
                      ? "No classes available yet. Teachers can create classes from their dashboard."
                      : "No classes match your search."}
                  </p>
                  <p className="mt-1 text-sm text-foreground/50">
                    {courses.length === 0 ? "Check back later or ask your teacher to publish a class." : "Try a different search."}
                  </p>
                  <div className="mt-4 flex flex-wrap justify-center gap-3">
                    {courses.length === 0 && (
                      <Link to="/dashboard/courses">
                        <Button className="rounded-full" style={{ backgroundColor: "#3954d0" }}>
                          My Class
                        </Button>
                      </Link>
                    )}
                    {searchQuery && (
                      <Button variant="outline" className="rounded-full" onClick={() => setSearchQuery("")}>
                        Clear search
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
    </div>
  );
};

export default StudentAvailableCourses;
