import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import EduHub from "./pages/EduHub";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import DashboardRedirect from "./pages/DashboardRedirect";
import StudentDashboard from "./pages/StudentDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import TeacherDashboard from "./pages/TeacherDashboard";
import AdminPlaceholder from "./pages/AdminPlaceholder";
import TeacherPlaceholder from "./pages/TeacherPlaceholder";
import DashboardPlaceholder from "./pages/DashboardPlaceholder";
import StudentCourses from "./pages/StudentCourses";
import StudentCourseDetail from "./pages/StudentCourseDetail";
import StudentLessonPage from "./pages/StudentLessonPage";
import StudentAssignments from "./pages/StudentAssignments";
import StudentCertificates from "./pages/StudentCertificates";
import StudentProgress from "./pages/StudentProgress";
import StudentSchedule from "./pages/StudentSchedule";
import StudentSettings from "./pages/StudentSettings";
import StudentNotifications from "./pages/StudentNotifications";
import StudentQuiz from "./pages/StudentQuiz";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
    <QueryClientProvider client={queryClient}>
        <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
                <Routes>
                    {/* EduHub landing */}
                    <Route path="/" element={<EduHub />} />
                    {/* Auth */}
                    <Route path="/signin" element={<SignIn />} />
                    <Route path="/register" element={<SignUp />} />
                    {/* Dashboard redirect */}
                    <Route path="/dashboard" element={<DashboardRedirect />} />
                    {/* Admin */}
                    <Route path="/dashboard/admin" element={<AdminDashboard />} />
                    <Route path="/dashboard/admin/students" element={<AdminPlaceholder />} />
                    <Route path="/dashboard/admin/teachers" element={<AdminPlaceholder />} />
                    <Route path="/dashboard/admin/staff" element={<AdminPlaceholder />} />
                    <Route path="/dashboard/admin/courses" element={<AdminPlaceholder />} />
                    <Route path="/dashboard/admin/add-user-role" element={<AdminPlaceholder />} />
                    <Route path="/dashboard/admin/transactions" element={<AdminPlaceholder />} />
                    <Route path="/dashboard/admin/reports" element={<AdminPlaceholder />} />
                    <Route path="/dashboard/admin/users" element={<AdminPlaceholder />} />
                    <Route path="/dashboard/admin/analytics" element={<AdminPlaceholder />} />
                    <Route path="/dashboard/admin/settings" element={<AdminPlaceholder />} />
                    {/* Teacher */}
                    <Route path="/dashboard/teacher" element={<TeacherDashboard />} />
                    <Route path="/dashboard/teacher/courses" element={<TeacherPlaceholder />} />
                    <Route path="/dashboard/teacher/courses/new" element={<TeacherPlaceholder />} />
                    <Route path="/dashboard/teacher/placement-test" element={<TeacherPlaceholder />} />
                    <Route path="/dashboard/teacher/assignments" element={<TeacherPlaceholder />} />
                    <Route path="/dashboard/teacher/students" element={<TeacherPlaceholder />} />
                    <Route path="/dashboard/teacher/schedule" element={<TeacherPlaceholder />} />
                    <Route path="/dashboard/teacher/settings" element={<TeacherPlaceholder />} />
                    {/* Student */}
                    <Route path="/dashboard/courses" element={<StudentCourses />} />
                    <Route path="/dashboard/courses/:courseId" element={<StudentCourseDetail />} />
                    <Route path="/dashboard/courses/:courseId/lessons/:lessonId" element={<StudentLessonPage />} />
                    <Route path="/dashboard/assignments" element={<StudentAssignments />} />
                    <Route path="/dashboard/certificates" element={<StudentCertificates />} />
                    <Route path="/dashboard/progress" element={<StudentProgress />} />
                    <Route path="/dashboard/schedule" element={<StudentSchedule />} />
                    <Route path="/dashboard/settings" element={<StudentSettings />} />
                    <Route path="/dashboard/notifications" element={<StudentNotifications />} />
                    <Route path="/dashboard/quiz" element={<StudentQuiz />} />
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                </Routes>
            </BrowserRouter>
        </TooltipProvider>
    </QueryClientProvider>
);

export default App;
