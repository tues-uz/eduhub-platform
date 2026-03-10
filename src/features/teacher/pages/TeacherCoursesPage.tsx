import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, BookOpen, Plus, Pencil, Trash2, FileText, Video, Clock, Eye, EyeOff, Archive, ArchiveRestore } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import DashboardSidebar from "@/components/DashboardSidebar";
import { useAuthSession } from "@/features/auth/context";
import { teacherCoursesStore } from "../data/teacherCoursesStore";
import { eduhubCourses } from "@/api/eduhubClient";
import { isUuid } from "@/api/utils";
import type { TeacherCourse } from "../types";

function parseDurationMinutes(duration?: string): number {
  if (!duration?.trim()) return 0;
  const m = duration.trim().match(/^(\d+)\s*min/i);
  return m ? parseInt(m[1], 10) : 0;
}

function formatTotalDuration(minutes: number): string {
  if (minutes <= 0) return "";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m} min` : `${h}h`;
}

const TeacherCoursesPage = () => {
  const { user } = useAuthSession();
  const [courses, setCourses] = useState<TeacherCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebarCollapsed");
    return saved === "true";
  });

  useEffect(() => {
    const check = () => setIsSidebarCollapsed(localStorage.getItem("sidebarCollapsed") === "true");
    check();
    const id = setInterval(check, 100);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const local = teacherCoursesStore.getAll();
      if (user.id) {
        try {
          const res = await eduhubCourses.getByLecturer(user.id);
          const apiCourses: TeacherCourse[] = (res.content || []).map((c) => ({
            id: c.id,
            title: c.title,
            description: "",
            instructorName: c.lecturerName,
            lessons: [],
            createdAt: c.createdAt,
            updatedAt: c.createdAt,
            status: c.status as "DRAFT" | "PUBLISHED",
          }));
          if (!cancelled) setCourses([...apiCourses, ...local]);
        } catch {
          if (!cancelled) setCourses(local);
        }
      } else {
        if (!cancelled) setCourses(local);
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [user.id]);

  const handleDelete = async (id: string) => {
    if (isUuid(id)) {
      try {
        await eduhubCourses.delete(id);
      } catch {
        return;
      }
    } else {
      teacherCoursesStore.delete(id);
    }
    setCourses((prev) => prev.filter((c) => c.id !== id));
    setDeleteId(null);
  };

  const handlePublish = async (id: string) => {
    if (!isUuid(id)) return;
    setPublishingId(id);
    try {
      await eduhubCourses.publish(id);
      setCourses((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, status: c.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED" } : c
        )
      );
    } catch {
      // ignore
    }
    setPublishingId(null);
  };

  const handleArchive = async (id: string) => {
    if (!isUuid(id)) return;
    setPublishingId(id);
    try {
      await eduhubCourses.archive(id);
      setCourses((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, status: c.status === "ARCHIVED" ? "PUBLISHED" : "ARCHIVED" } : c
        )
      );
    } catch {
      // ignore
    }
    setPublishingId(null);
  };

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Geist Sans', sans-serif" }}>
      <DashboardSidebar />
      <main
        className={`pt-16 lg:pt-6 pb-20 transition-all duration-300 ${isSidebarCollapsed ? "lg:pl-20" : "lg:pl-64"}`}
      >
        <div className="container mx-auto px-6">
          <Link
            to="/dashboard/teacher"
            className="inline-flex items-center gap-2 text-sm text-foreground/70 hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Teacher Dashboard
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1
                className="text-2xl font-bold text-foreground"
                style={{ fontFamily: "'Geist Sans', sans-serif", fontWeight: 400, letterSpacing: "0.5px" }}
              >
                My Courses
              </h1>
              <p className="text-foreground/60 text-sm mt-1">
                Manage your courses and add lessons with PDF or video content.
              </p>
            </div>
            <Button asChild className="rounded-full shrink-0" style={{ backgroundColor: "#1e40af" }}>
              <Link to="/dashboard/teacher/courses/new" className="inline-flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add course
              </Link>
            </Button>
          </div>

          {loading ? (
            <Card className="teacher-course-card border-dashed border-2" style={{ fontFamily: "'Geist Sans', sans-serif" }}>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-sm text-foreground/60">Loading courses…</p>
              </CardContent>
            </Card>
          ) : courses.length === 0 ? (
            <Card className="teacher-course-card border-dashed border-2" style={{ fontFamily: "'Geist Sans', sans-serif" }}>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <BookOpen className="h-14 w-14 text-foreground/30 mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-1">No courses yet</h3>
                <p className="text-sm text-foreground/60 mb-6 max-w-sm">
                  Create your first course and add lessons with PDF materials or video links.
                </p>
                <Button asChild className="rounded-full" style={{ backgroundColor: "#1e40af" }}>
                  <Link to="/dashboard/teacher/courses/new" className="inline-flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add your first course
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {courses.map((course) => {
                const pdfCount = course.lessons.filter((l) => l.contentType === "pdf" || l.contentType === "pdf_upload").length;
                const videoCount = course.lessons.filter((l) => l.contentType === "video" || l.contentType === "video_upload").length;
                const totalMin = course.lessons.reduce((sum, l) => sum + parseDurationMinutes(l.duration), 0);
                const durationStr = formatTotalDuration(totalMin);
                return (
                <Link
                  key={course.id}
                  to={`/dashboard/teacher/courses/${course.id}/edit`}
                  className="block"
                >
                  <Card
                    className="teacher-course-card group relative flex flex-col overflow-hidden rounded-xl border border-gray-100 bg-gray-50/30 cursor-pointer transition-shadow hover:shadow-md"
                    style={{ fontFamily: "'Geist Sans', sans-serif" }}
                  >
                    <div className="flex flex-1 flex-col p-5 pt-4">
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-gray-200/80">
                          <BookOpen className="h-5 w-5 text-[#1e40af]/80" />
                        </div>
                        {course.status && (
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                              course.status === "PUBLISHED"
                                ? "bg-green-100 text-green-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {course.status}
                          </span>
                        )}
                      </div>
                      <CardTitle className="text-base font-semibold text-foreground line-clamp-2">
                        {course.title}
                      </CardTitle>
                      {course.description ? (
                        <CardDescription className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
                          {course.description}
                        </CardDescription>
                      ) : null}

                      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <FileText className="h-3 w-3 shrink-0 opacity-70" />
                          <span>{pdfCount} PDF</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Video className="h-3 w-3 shrink-0 opacity-70" />
                          <span>{videoCount} Video</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <BookOpen className="h-3 w-3 shrink-0 opacity-70" />
                          <span>{course.lessons.length} lessons</span>
                        </div>
                        {durationStr ? (
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3 w-3 shrink-0 opacity-70" />
                            <span>{durationStr}</span>
                          </div>
                        ) : null}
                      </dl>

                      <div
                        className="mt-4 flex w-full items-center gap-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {isUuid(course.id) && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`h-8 w-8 shrink-0 rounded-md border border-gray-200 bg-white hover:bg-gray-100 ${
                                course.status === "PUBLISHED"
                                  ? "text-green-600 hover:text-green-700"
                                  : "text-muted-foreground hover:text-foreground"
                              }`}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handlePublish(course.id);
                              }}
                              disabled={publishingId === course.id}
                              title={course.status === "PUBLISHED" ? "Unpublish" : "Publish"}
                            >
                              {course.status === "PUBLISHED" ? (
                                <Eye className="h-3.5 w-3.5 shrink-0" />
                              ) : (
                                <EyeOff className="h-3.5 w-3.5 shrink-0" />
                              )}
                            </Button>
                            {course.status !== "DRAFT" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className={`h-8 w-8 shrink-0 rounded-md border border-gray-200 bg-white hover:bg-gray-100 ${
                                  course.status === "ARCHIVED"
                                    ? "text-amber-600 hover:text-amber-700"
                                    : "text-orange-600 hover:text-orange-700"
                                }`}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleArchive(course.id);
                                }}
                                disabled={publishingId === course.id}
                                title={course.status === "ARCHIVED" ? "Unarchive" : "Archive"}
                              >
                                {course.status === "ARCHIVED" ? (
                                  <ArchiveRestore className="h-3.5 w-3.5 shrink-0" />
                                ) : (
                                  <Archive className="h-3.5 w-3.5 shrink-0" />
                                )}
                              </Button>
                            )}
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 rounded-md border border-gray-200 bg-white text-muted-foreground hover:bg-gray-100 hover:text-red-600"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setDeleteId(course.id);
                          }}
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5 shrink-0" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 flex-1 rounded-md border border-gray-200 bg-white text-muted-foreground hover:bg-gray-100 hover:text-foreground"
                          asChild
                        >
                          <Link to={`/dashboard/teacher/courses/${course.id}/edit`} className="inline-flex items-center justify-center gap-1.5 w-full" title="Edit">
                            <Pencil className="h-3.5 w-3.5 shrink-0" />
                            Edit
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </Card>
                </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this course?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this course and all its lessons. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) {
                  handleDelete(deleteId);
                  setDeleteId(null);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TeacherCoursesPage;
