import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ArrowLeft, FileText, Trash2, Eye, Clock, AlertCircle, Rocket, Check, Loader2 } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { eduhubAssignments, type AssignmentRequest, type AssignmentResponse, type SubmissionResponse } from "@/api/eduhubClient";
import { eduhubCourses } from "@/api/eduhubClient";
import { useAuthSession } from "@/features/auth/context";
import { useTranslation } from "react-i18next";

const TeacherAssignmentsPage = () => {
  const { t } = useTranslation();
  const { user } = useAuthSession();
  const [activeTab, setActiveTab] = useState("assignments");
  const [assignments, setAssignments] = useState<AssignmentResponse[]>([]);
  const [pendingSubmissions, setPendingSubmissions] = useState<SubmissionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  const loadAssignments = useCallback(async () => {
    if (!user.id) return;
    setLoading(true);
    try {
      const coursesRes = await eduhubCourses.getByLecturer(user.id, { page: 0, size: 100 });
      const courseAssignmentResults = await Promise.all(
        (coursesRes || []).map(async (course) => {
          try {
            return await eduhubAssignments.getByCourse(course.id, 0, 100);
          } catch {
            return [];
          }
        })
      );
      setAssignments(courseAssignmentResults.flat());
    } catch {
      setAssignments([]);
    }
    setLoading(false);
  }, [user.id]);

  const loadPendingSubmissions = useCallback(async () => {
    if (!user.id) return;
    setLoading(true);
    try {
      const submissionsRes = await eduhubAssignments.getPending(user.id, undefined, 0, 100);
      setPendingSubmissions(submissionsRes || []);
    } catch {
      setPendingSubmissions([]);
    }
    setLoading(false);
  }, [user.id]);

  useEffect(() => {
    if (activeTab === "assignments") {
      loadAssignments();
    } else {
      loadPendingSubmissions();
    }
  }, [activeTab, loadAssignments, loadPendingSubmissions]);

  const handleDelete = async (id: string) => {
    try {
      await eduhubAssignments.delete(id);
      setAssignments((prev) => prev.filter((a) => a.id !== id));
    } catch {
      // Handle error
    }
    setDeleteId(null);
  };

  const handlePublish = async (id: string) => {
    try {
      setPublishingId(id);
      await eduhubAssignments.update(id, { status: "PUBLISHED" } as AssignmentRequest);
      setAssignments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: "PUBLISHED" } : a))
      );
    } catch {
      // ignore
    } finally {
      setPublishingId(null);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "HIGH":
        return "bg-red-100 text-red-800";
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-800";
      case "LOW":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PUBLISHED":
        return "bg-blue-100 text-blue-800";
      case "DRAFT":
        return "bg-gray-100 text-gray-800";
      case "CLOSED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="container mx-auto px-6 py-4 md:py-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          <Link
            to="/dashboard/teacher"
            className="inline-flex items-center gap-2 text-sm text-foreground/70 hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4" />{t("teacherSettings.backToDashboard")}</Link>

          <div className="mb-8">
            <h1
              className="text-2xl font-bold text-foreground"
              style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400, letterSpacing: "0.5px" }}
            >{t("teacher.assignments.title")}</h1>
            <p className="text-foreground/60 text-sm mt-1">
              Manage assignments and review student submissions.
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="assignments">{t("teacher.assignments.tabs.assignments")}</TabsTrigger>
              <TabsTrigger value="submissions">{t("teacher.assignments.tabs.submissions")}</TabsTrigger>
            </TabsList>

            <TabsContent value="assignments">
              {loading ? (
                <p className="text-sm text-foreground/60">{t("common.loading")}</p>
              ) : assignments.length === 0 ? (
                <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-12 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-1">{t("teacher.assignments.empty.title")}</h3>
                  <p className="text-sm text-muted-foreground">
                    Assignments will appear here once you create them for your classes.
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("teacher.assignments.table.title")}</TableHead>
                        <TableHead>{t("teacher.dashboard.classesTable.header.class")}</TableHead>
                        <TableHead>{t("teacher.assignments.table.dueDate")}</TableHead>
                        <TableHead>{t("teacher.assignments.table.priority")}</TableHead>
                        <TableHead>{t("common.status")}</TableHead>
                        <TableHead className="text-right">{t("common.actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assignments.map((assignment) => (
                        <TableRow key={assignment.id}>
                          <TableCell className="font-medium">{assignment.title}</TableCell>
                          <TableCell>{assignment.course.title}</TableCell>
                          <TableCell>
                            {assignment.dueDate ? (
                              <div className="flex items-center gap-1 text-sm">
                                <Clock className="h-3 w-3" />
                                {format(new Date(assignment.dueDate), "MMM d, yyyy")}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getPriorityColor(
                                assignment.priority
                              )}`}
                            >
                              {assignment.priority}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(
                                assignment.status
                              )}`}
                            >
                              {assignment.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {assignment.status !== "PUBLISHED" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 rounded-lg border-green-200 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800"
                                  onClick={() => handlePublish(assignment.id)}
                                  disabled={!!publishingId}
                                >
                                  {publishingId === assignment.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <>
                                      <Rocket className="h-3 w-3 mr-1" />{t("teacher.roster.quiz.publish")}</>
                                  )}
                                </Button>
                              )}
                              <Button variant="outline" size="sm" className="h-8 rounded-lg">
                                <Eye className="h-3 w-3 mr-1" />{t("teacher.assignments.actions.view")}</Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-600 hover:bg-red-50"
                                onClick={() => setDeleteId(assignment.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="submissions">
              {loading ? (
                <p className="text-sm text-foreground/60">{t("common.loading")}</p>
              ) : pendingSubmissions.length === 0 ? (
                <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-12 text-center">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-1">{t("teacher.assignments.submissions.empty.title")}</h3>
                  <p className="text-sm text-muted-foreground">
                    All student submissions have been graded.
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("teacher.assignments.submissions.table.student")}</TableHead>
                        <TableHead>{t("teacher.assignments.submissions.table.assignment")}</TableHead>
                        <TableHead>{t("teacher.dashboard.classesTable.header.class")}</TableHead>
                        <TableHead>{t("teacher.assignments.submissions.table.submitted")}</TableHead>
                        <TableHead>{t("common.status")}</TableHead>
                        <TableHead className="text-right">{t("common.actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingSubmissions.map((submission) => (
                        <TableRow key={submission.id}>
                          <TableCell className="font-medium">{submission.student.fullName}</TableCell>
                          <TableCell>{submission.assignment.title}</TableCell>
                          <TableCell>{submission.assignment.course.title}</TableCell>
                          <TableCell>
                            {format(new Date(submission.submittedAt), "MMM d, yyyy HH:mm")}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                submission.status === "SUBMITTED"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : submission.status === "GRADED"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {submission.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="outline" size="sm" className="h-8 rounded-lg">
                              <Eye className="h-3 w-3 mr-1" />{t("teacher.assignments.actions.review")}</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("teacher.assignments.deleteDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the assignment. Students will no longer see it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteId && handleDelete(deleteId)}
            >{t("common.delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TeacherAssignmentsPage;
