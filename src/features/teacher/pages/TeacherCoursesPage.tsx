import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, BookOpen, Plus, Pencil, Trash2, FileText, Video } from "lucide-react";
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
import { teacherCoursesStore } from "../data/teacherCoursesStore";
import type { TeacherCourse } from "../types";

const TeacherCoursesPage = () => {
  const [courses, setCourses] = useState<TeacherCourse[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
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
    setCourses(teacherCoursesStore.getAll());
  }, []);

  const handleDelete = (id: string) => {
    teacherCoursesStore.delete(id);
    setCourses(teacherCoursesStore.getAll());
    setDeleteId(null);
  };

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Comfortaa', cursive" }}>
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
                style={{ fontFamily: "'Fredoka One', cursive", fontWeight: 400, letterSpacing: "0.5px" }}
              >
                My Courses
              </h1>
              <p className="text-foreground/60 text-sm mt-1">
                Manage your courses and add lessons with PDF or video content.
              </p>
            </div>
            <Button asChild className="rounded-full shrink-0" style={{ backgroundColor: "#FF2D73" }}>
              <Link to="/dashboard/teacher/courses/new" className="inline-flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add course
              </Link>
            </Button>
          </div>

          {courses.length === 0 ? (
            <Card className="border-dashed border-2">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <BookOpen className="h-14 w-14 text-foreground/30 mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-1">No courses yet</h3>
                <p className="text-sm text-foreground/60 mb-6 max-w-sm">
                  Create your first course and add lessons with PDF materials or video links.
                </p>
                <Button asChild className="rounded-full" style={{ backgroundColor: "#FF2D73" }}>
                  <Link to="/dashboard/teacher/courses/new" className="inline-flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add your first course
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {courses.map((course) => (
                <Card key={course.id} className="flex flex-col">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg line-clamp-2">{course.title}</CardTitle>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                          <Link to={`/dashboard/teacher/courses/${course.id}/edit`} title="Edit">
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => setDeleteId(course.id)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {course.description && (
                      <CardDescription className="line-clamp-2">{course.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="pt-0 mt-auto">
                    <div className="flex flex-wrap gap-2 text-xs text-foreground/60">
                      <span className="flex items-center gap-1">
                        <FileText className="h-3.5 w-3.5" />
                        {course.lessons.filter((l) => l.contentType === "pdf").length} PDF
                      </span>
                      <span className="flex items-center gap-1">
                        <Video className="h-3.5 w-3.5" />
                        {course.lessons.filter((l) => l.contentType === "video").length} Video
                      </span>
                      <span>{course.lessons.length} lessons</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete course?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this course and all its lessons. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
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
