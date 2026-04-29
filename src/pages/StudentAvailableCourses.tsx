import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Search, User, Clock, Layers, DollarSign, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DashboardSidebar from "@/components/DashboardSidebar";
import { useLayoutContext } from "@/features/layout/context";
import { useStudentCoursesQuery, useEnrollMutation } from "@/features/student/hooks/useStudentQueries";
import { teacherCoursesStore } from "@/features/teacher/data/teacherCoursesStore";
import { eduhubCourses } from "@/api/eduhubClient";

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
  enrolled: boolean;
  progress?: number;
  status?: string;
  nextLesson?: string;
};

function formatPrice(price: number | undefined, currency = "USD"): string {
  if (price == null || price <= 0) return "Free";
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(price);
}

const StudentAvailableCourses = () => {
  const { isSidebarCollapsed } = useLayoutContext();
  const { data: enrolledCourses = [] } = useStudentCoursesQuery();
  const enrollMutation = useEnrollMutation();
  const [searchQuery, setSearchQuery] = useState("");
  const [courses, setCourses] = useState<AvailableCourseItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const enrolledIds = new Set(enrolledCourses.map((c) => String(c.id)));
    const enrolledByLinkId = new Map(enrolledCourses.map((c) => [String(c.id), c]));

    async function load() {
      setLoading(true);
      const localTeacher = teacherCoursesStore.getAll();
      const localItems: AvailableCourseItem[] = localTeacher.map((c) => {
        const linkId = `teacher_${c.id}`;
        const enrolled = enrolledIds.has(linkId);
        const enrolledData = enrolledByLinkId.get(linkId);
        const moduleCount = c.lessons?.length ?? 0;
        const duration = moduleCount ? `${moduleCount} lessons` : "—";
        return {
          id: c.id,
          linkId,
          title: c.title,
          instructor: c.instructorName,
          category: "Course",
          duration,
          modules: moduleCount,
          price: c.price,
          enrolled,
          progress: enrolledData?.progress,
          status: enrolledData?.status,
          nextLesson: enrolledData?.nextLesson,
        };
      });

      const mapApiToItem = (c: { id: string; title: string; lecturerName: string; category?: string; pricing?: { amount: number; discountedAmount?: number; currency: string } }) => {
        const enrolled = enrolledIds.has(c.id);
        const enrolledData = enrolledByLinkId.get(c.id);
        const price = c.pricing?.discountedAmount ?? c.pricing?.amount;
        return {
          id: c.id,
          linkId: c.id,
          title: c.title,
          instructor: c.lecturerName,
          category: c.category ?? "Course",
          duration: "—",
          modules: 0,
          price: price as number | undefined,
          currency: c.pricing?.currency,
          enrolled,
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
  }, [enrolledCourses]);

  const handleEnroll = async (courseId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await enrollMutation.mutateAsync(courseId);
  };

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
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Comfortaa', cursive" }}>
      <DashboardSidebar />

      <main className={`pt-16 lg:pt-6 pb-20 transition-all duration-300 ${isSidebarCollapsed ? "lg:pl-20" : "lg:pl-64"}`}>
        <div className="container mx-auto px-6">
          <div className="mb-8">
            <h1 className="mb-2 font-bold text-foreground" style={{ fontFamily: "'Fredoka One', cursive", fontWeight: 400, letterSpacing: "0.5px", fontSize: "32px" }}>
              Available Courses
            </h1>
            <p className="text-foreground/70 text-sm mb-4">
              Browse and enroll in courses offered on EduHub. Prices shown where set by instructors.
            </p>
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
              <Input
                type="search"
                placeholder="Search by course name, instructor, or category..."
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
                  {filteredCourses.length} course{filteredCourses.length !== 1 ? "s" : ""} found
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredCourses.map((course) => (
                  <div
                    key={course.linkId}
                    className="flex flex-col rounded-xl border border-gray-200/50 bg-white/80 p-6 shadow-sm backdrop-blur-sm transition-all hover:border-gray-300/50 hover:shadow-md"
                  >
                    <div className="mb-4 flex items-start gap-4">
                      <div className="min-w-0 flex-1">
                        {course.category && (
                          <span className="text-xs font-medium uppercase tracking-wide text-foreground/60">
                            {course.category}
                          </span>
                        )}
                        <h3 className="mt-0.5 mb-1 font-semibold text-foreground" style={{ fontFamily: "'Fredoka One', cursive", fontWeight: 400, letterSpacing: "0.3px" }}>
                          {course.title}
                        </h3>
                        <div className="flex items-center gap-1.5 text-sm text-foreground/60">
                          <User className="h-3.5 w-3.5 flex-shrink-0" />
                          <span>{course.instructor}</span>
                        </div>
                      </div>
                      {course.enrolled && (
                        <span className="flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium bg-blue-100 text-blue-700">
                          Enrolled
                        </span>
                      )}
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
                      {course.enrolled ? (
                        <Link to={`/dashboard/courses/${course.linkId}`} className="block">
                          <Button
                            size="sm"
                            className="w-full rounded-full"
                            style={{ backgroundColor: "#3954d0" }}
                          >
                            Continue
                          </Button>
                        </Link>
                      ) : (
                        <Button
                          size="sm"
                          className="w-full rounded-full"
                          style={{ backgroundColor: "#3954d0" }}
                          onClick={(e) => handleEnroll(course.linkId, e)}
                          disabled={enrollMutation.isPending}
                        >
                          {enrollMutation.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            "Enroll"
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {filteredCourses.length === 0 && (
                <div className="rounded-xl border border-gray-200/50 bg-white/50 py-16 text-center">
                  <BookOpen className="mx-auto mb-4 h-12 w-12 text-foreground/30" />
                  <p className="font-medium text-foreground/70">
                    {courses.length === 0
                      ? "No courses available yet. Teachers can create courses from their dashboard."
                      : "No courses match your search."}
                  </p>
                  <p className="mt-1 text-sm text-foreground/50">
                    {courses.length === 0 ? "Check back later or ask your teacher to publish a course." : "Try a different search."}
                  </p>
                  <div className="mt-4 flex flex-wrap justify-center gap-3">
                    {courses.length === 0 && (
                      <Link to="/dashboard/courses">
                        <Button className="rounded-full" style={{ backgroundColor: "#3954d0" }}>
                          My Courses
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
      </main>
    </div>
  );
};

export default StudentAvailableCourses;
