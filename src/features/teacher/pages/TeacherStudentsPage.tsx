import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import DashboardSidebar from "@/components/DashboardSidebar";
import { eduhubCourses, eduhubLecturer } from "@/api/eduhubClient";
import { useAuthSession } from "@/features/auth/context";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type StudentRow = {
  id: string;
  name: string;
  email: string;
  course: string;
  enrolledDate: string;
};

const TeacherStudentsPage = () => {
  const { user } = useAuthSession();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() =>
    localStorage.getItem("sidebarCollapsed") === "true"
  );
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = () => setIsSidebarCollapsed(localStorage.getItem("sidebarCollapsed") === "true");
    check();
    const id = setInterval(check, 100);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    async function load() {
      if (!user.id) return;
      setLoading(true);
      try {
        const coursesRes = await eduhubCourses.getByLecturer(user.id, { page: 0, size: 100 });
        const allStudents: StudentRow[] = [];
        for (const course of coursesRes.content || []) {
          try {
            const studentsData = await eduhubCourses.getEnrolledStudents(course.id, 0, 100);
            for (const s of studentsData.content || []) {
              allStudents.push({
                id: s.id,
                name: s.fullName,
                email: s.email,
                course: course.title,
                enrolledDate: course.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0],
              });
            }
          } catch {
            // Skip courses that fail
          }
        }
        setStudents(allStudents);
      } catch {
        setStudents([]);
      }
      setLoading(false);
    }
    load();
  }, [user.id]);

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Geist Sans', sans-serif" }}>
      <DashboardSidebar />
      <main
        className={`pt-16 lg:pt-6 pb-20 transition-all duration-300 ${isSidebarCollapsed ? "lg:pl-6 lg:ml-20" : "lg:pl-6 lg:ml-64"}`}
      >
        <div className="container mx-auto px-6">
          <Link
            to="/dashboard/teacher"
            className="inline-flex items-center gap-2 text-sm text-foreground/70 hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Teacher Dashboard
          </Link>

          <div className="mb-8">
            <h1
              className="text-2xl font-bold text-foreground"
              style={{ fontFamily: "'Geist Sans', sans-serif", fontWeight: 400, letterSpacing: "0.5px" }}
            >
              Students
            </h1>
            <p className="text-foreground/60 text-sm mt-1">
              Students registered to your courses.
            </p>
          </div>

          {loading ? (
            <p className="text-sm text-foreground/60">Loading…</p>
          ) : (
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Enrolled date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                        No students registered yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    students.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{row.name}</TableCell>
                        <TableCell>{row.email}</TableCell>
                        <TableCell>{row.course}</TableCell>
                        <TableCell>{row.enrolledDate}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default TeacherStudentsPage;
