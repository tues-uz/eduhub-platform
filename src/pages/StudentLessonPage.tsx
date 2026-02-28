import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  PlayCircle,
  Clock,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import DashboardSidebar from "@/components/DashboardSidebar";

const ENROLLED_COURSES: Record<number, { id: number; title: string; instructor: string }> = {
  1: { id: 1, title: "Introduction to Economics", instructor: "Dr. Dilshod Karimov" },
  2: { id: 2, title: "Business Management Fundamentals", instructor: "Prof. Sarah Johnson" },
  3: { id: 3, title: "Digital Marketing Essentials", instructor: "Dr. Ahmed Hassan" },
  4: { id: 4, title: "Financial Accounting", instructor: "Prof. Maria Garcia" },
  5: { id: 5, title: "English for Business", instructor: "Ms. Elena Petrova" },
  6: { id: 6, title: "Data Analysis with Excel", instructor: "Dr. James Wilson" },
};

const LESSONS_BY_COURSE: Record<number, { id: number; title: string; duration: string }[]> = {
  1: [
    { id: 1, title: "Introduction to Microeconomics", duration: "12 min" },
    { id: 2, title: "Supply and Demand", duration: "18 min" },
    { id: 3, title: "Market Structures", duration: "22 min" },
    { id: 4, title: "Monopoly and Competition", duration: "15 min" },
    { id: 5, title: "International Trade", duration: "20 min" },
  ],
  2: [
    { id: 1, title: "Introduction to Management", duration: "14 min" },
    { id: 2, title: "Strategic Planning", duration: "25 min" },
    { id: 3, title: "Organizational Behavior", duration: "18 min" },
  ],
  3: [
    { id: 1, title: "Marketing Fundamentals", duration: "16 min" },
    { id: 2, title: "Digital Channels", duration: "20 min" },
    { id: 3, title: "Final Project", duration: "—" },
  ],
  4: [
    { id: 1, title: "Accounting Basics", duration: "15 min" },
    { id: 2, title: "Balance Sheets", duration: "22 min" },
  ],
  5: [
    { id: 1, title: "Business Writing Basics", duration: "12 min" },
    { id: 2, title: "Writing Reports", duration: "18 min" },
  ],
  6: [
    { id: 1, title: "Excel Fundamentals", duration: "20 min" },
    { id: 2, title: "Data Analysis", duration: "25 min" },
  ],
};

const DUMMY_DESCRIPTION =
  "This lesson covers the key concepts and practical applications. Watch the video above and use the resources below to reinforce your learning. You can pause and rewatch any section as needed.";

const StudentLessonPage = () => {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const cid = courseId ? parseInt(courseId, 10) : NaN;
  const lid = lessonId ? parseInt(lessonId, 10) : NaN;
  const course = cid && ENROLLED_COURSES[cid];
  const lessons = (cid && LESSONS_BY_COURSE[cid]) || [];
  const lesson = lessons.find((l) => l.id === lid);
  const lessonIndex = lesson ? lessons.findIndex((l) => l.id === lid) : -1;
  const prevLesson = lessonIndex > 0 ? lessons[lessonIndex - 1] : null;
  const nextLesson = lessonIndex >= 0 && lessonIndex < lessons.length - 1 ? lessons[lessonIndex + 1] : null;

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => localStorage.getItem("sidebarCollapsed") === "true");
  const [markedComplete, setMarkedComplete] = useState(false);
  useEffect(() => {
    const check = () => setIsSidebarCollapsed(localStorage.getItem("sidebarCollapsed") === "true");
    const id = setInterval(check, 100);
    return () => clearInterval(id);
  }, []);

  if (!course || !lesson) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center" style={{ fontFamily: "'Comfortaa', cursive" }}>
        <div className="text-center">
          <p className="text-foreground/70 mb-4">Lesson not found.</p>
          <Link to="/dashboard/courses">
            <Button variant="outline" className="rounded-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to My Courses
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Comfortaa', cursive" }}>
      <DashboardSidebar />
      <main className={`pt-16 lg:pt-6 pb-20 transition-all duration-300 ${isSidebarCollapsed ? "lg:pl-20" : "lg:pl-64"}`}>
        <div className="container mx-auto px-6 max-w-4xl">
          <Link
            to={`/dashboard/courses/${cid}`}
            className="inline-flex items-center gap-2 text-sm text-foreground/70 hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to {course.title}
          </Link>

          <div className="mb-4 flex items-center gap-2 text-xs text-foreground/60">
            <BookOpen className="h-3.5 w-3.5" />
            <span>{course.title}</span>
          </div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h1 className="font-bold text-foreground" style={{ fontFamily: "'Fredoka One', cursive", fontWeight: 400, letterSpacing: "0.5px", fontSize: "26px" }}>
              {lesson.title}
            </h1>
            {markedComplete && (
              <span className="flex-shrink-0 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                Video completed
              </span>
            )}
          </div>
          {lesson.duration !== "—" && (
            <p className="flex items-center gap-1.5 text-sm text-foreground/60 mb-6">
              <Clock className="h-4 w-4" />
              {lesson.duration}
            </p>
          )}

          {/* Video player placeholder */}
          <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-gray-900 mb-6">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-white/90">
                <div className="flex justify-center mb-3">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors cursor-pointer">
                    <PlayCircle className="h-12 w-12 text-white" strokeWidth={1.5} />
                  </div>
                </div>
                <p className="text-sm font-medium">Lesson video</p>
                <p className="text-xs text-white/70 mt-1">Click to play (demo)</p>
              </div>
            </div>
            {/* Optional: use a real sample video for demo
            <video
              className="w-full h-full object-contain"
              controls
              poster=""
              src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
            >
              Your browser does not support the video tag.
            </video>
            */}
          </div>

          <div className="rounded-xl border border-gray-200/50 bg-white/80 p-6 shadow-sm mb-8">
            <h2 className="font-semibold text-foreground mb-3" style={{ fontFamily: "'Fredoka One', cursive", fontWeight: 400 }}>
              About this lesson
            </h2>
            <p className="text-sm text-foreground/80 leading-relaxed">{DUMMY_DESCRIPTION}</p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {prevLesson ? (
                <Link to={`/dashboard/courses/${cid}/lessons/${prevLesson.id}`}>
                  <Button variant="outline" size="sm" className="rounded-full">
                    <ChevronLeft className="mr-1.5 h-4 w-4" />
                    Previous
                  </Button>
                </Link>
              ) : (
                <Link to={`/dashboard/courses/${cid}`}>
                  <Button variant="outline" size="sm" className="rounded-full">
                    <ArrowLeft className="mr-1.5 h-4 w-4" />
                    Back to course
                  </Button>
                </Link>
              )}
              {nextLesson ? (
                <Link to={`/dashboard/courses/${cid}/lessons/${nextLesson.id}`}>
                  <Button size="sm" className="rounded-full" style={{ backgroundColor: "#FF2D73" }}>
                    Next lesson
                    <ChevronRight className="ml-1.5 h-4 w-4" />
                  </Button>
                </Link>
              ) : (
                <Link to={`/dashboard/courses/${cid}`}>
                  <Button size="sm" className="rounded-full" style={{ backgroundColor: "#FF2D73" }}>
                    <CheckCircle2 className="mr-1.5 h-4 w-4" />
                    Finish course
                  </Button>
                </Link>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() => setMarkedComplete(!markedComplete)}
            >
              {markedComplete ? (
                <>
                  <CheckCircle2 className="mr-1.5 h-4 w-4 text-green-600" />
                  Marked complete
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-1.5 h-4 w-4" />
                  Mark as complete
                </>
              )}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default StudentLessonPage;
