import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, GripVertical, FileText, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DashboardSidebar from "@/components/DashboardSidebar";
import { useAuthSession } from "@/features/auth/context";
import { teacherCoursesStore, createEmptyLesson } from "../data/teacherCoursesStore";
import type { TeacherCourse, TeacherLesson, LessonContentType } from "../types";

const TeacherCourseFormPage = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthSession();
  const isEdit = !!courseId;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [lessons, setLessons] = useState<TeacherLesson[]>([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebarCollapsed");
    return saved === "true";
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const check = () => setIsSidebarCollapsed(localStorage.getItem("sidebarCollapsed") === "true");
    check();
    const id = setInterval(check, 100);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (isEdit && courseId) {
      const course = teacherCoursesStore.getById(courseId);
      if (course) {
        setTitle(course.title);
        setDescription(course.description);
        setLessons(
          course.lessons.length > 0
            ? [...course.lessons].sort((a, b) => a.order - b.order)
            : [createEmptyLesson(0)]
        );
      } else {
        setError("Course not found.");
      }
    } else {
      setLessons([createEmptyLesson(0)]);
    }
  }, [courseId, isEdit]);

  const addLesson = () => {
    setLessons((prev) => [...prev, createEmptyLesson(prev.length)]);
  };

  const removeLesson = (index: number) => {
    setLessons((prev) => prev.filter((_, i) => i !== index));
  };

  const updateLesson = (index: number, updates: Partial<TeacherLesson>) => {
    setLessons((prev) =>
      prev.map((l, i) => (i === index ? { ...l, ...updates, order: i } : { ...l, order: i }))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Course title is required.");
      return;
    }
    const validLessons = lessons
      .map((l, i) => ({ ...l, title: l.title.trim(), order: i }))
      .filter((l) => l.title || l.contentUrl);
    if (validLessons.length === 0) {
      setError("Add at least one lesson with a title and PDF or video URL.");
      return;
    }

    setSaving(true);
    try {
      const instructorName = user.name?.trim() || "Teacher";
      if (isEdit && courseId) {
        teacherCoursesStore.update(courseId, {
          title: trimmedTitle,
          description: description.trim(),
          instructorName,
          lessons: validLessons,
        });
      } else {
        teacherCoursesStore.create({
          title: trimmedTitle,
          description: description.trim(),
          instructorName,
          lessons: validLessons,
        });
      }
      navigate("/dashboard/teacher/courses");
    } catch (err) {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Comfortaa', cursive" }}>
      <DashboardSidebar />
      <main
        className={`pt-16 lg:pt-6 pb-20 transition-all duration-300 ${isSidebarCollapsed ? "lg:pl-20" : "lg:pl-64"}`}
      >
        <div className="container mx-auto px-6 max-w-3xl">
          <Link
            to="/dashboard/teacher/courses"
            className="inline-flex items-center gap-2 text-sm text-foreground/70 hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to My Courses
          </Link>

          <h1
            className="text-2xl font-bold text-foreground mb-6"
            style={{ fontFamily: "'Fredoka One', cursive", fontWeight: 400, letterSpacing: "0.5px" }}
          >
            {isEdit ? "Edit course" : "Add new course"}
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Course details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Course title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Introduction to Economics"
                    className="rounded-lg"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of the course"
                    rows={3}
                    className="rounded-lg"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="instructor">Instructor</Label>
                  <Input
                    id="instructor"
                    value={user.name || "Teacher"}
                    readOnly
                    className="rounded-lg bg-muted/50 cursor-not-allowed border-muted"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Lessons (PDF or video link)</CardTitle>
                <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={addLesson}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add lesson
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {lessons.map((lesson, index) => (
                  <div
                    key={lesson.id}
                    className="rounded-lg border border-gray-200 bg-gray-50/50 p-4 space-y-3"
                  >
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-foreground/40" />
                      <span className="text-sm font-medium text-foreground/70">Lesson {index + 1}</span>
                      {lessons.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="ml-auto h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => removeLesson(index)}
                          title="Remove lesson"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="sm:col-span-2 space-y-2">
                        <Label>Lesson title</Label>
                        <Input
                          value={lesson.title}
                          onChange={(e) => updateLesson(index, { title: e.target.value })}
                          placeholder="e.g. Supply and Demand"
                          className="rounded-lg"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Content type</Label>
                        <Select
                          value={lesson.contentType}
                          onValueChange={(v: LessonContentType) => updateLesson(index, { contentType: v })}
                        >
                          <SelectTrigger className="rounded-lg">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="video" className="flex items-center gap-2">
                              <Video className="h-4 w-4" />
                              Video link
                            </SelectItem>
                            <SelectItem value="pdf" className="flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              PDF
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>
                          {lesson.contentType === "video" ? "Video URL" : "PDF URL"}
                        </Label>
                        <Input
                          value={lesson.contentUrl}
                          onChange={(e) => updateLesson(index, { contentUrl: e.target.value })}
                          placeholder={
                            lesson.contentType === "video"
                              ? "https://youtube.com/... or direct video URL"
                              : "https://... or direct PDF link"
                          }
                          type="url"
                          className="rounded-lg"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Duration (optional)</Label>
                      <Input
                        value={lesson.duration ?? ""}
                        onChange={(e) => updateLesson(index, { duration: e.target.value })}
                        placeholder="e.g. 12 min"
                        className="rounded-lg max-w-[140px]"
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="flex flex-wrap gap-3">
              <Button
                type="submit"
                disabled={saving}
                className="rounded-full"
                style={{ backgroundColor: "#FF2D73" }}
              >
                {saving ? "Saving…" : isEdit ? "Save changes" : "Create course"}
              </Button>
              <Button type="button" variant="outline" className="rounded-full" asChild>
                <Link to="/dashboard/teacher/courses">Cancel</Link>
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default TeacherCourseFormPage;
