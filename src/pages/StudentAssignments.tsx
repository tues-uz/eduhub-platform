import { useState, useEffect, useCallback } from "react";
import { FileText, Calendar, Loader2, AlertCircle, CheckCircle } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { eduhubAssignments, eduhubEnrollments, type AssignmentResponse, type SubmissionResponse } from "@/api/eduhubClient";

const formatDate = (dateString?: string) => {
  if (!dateString) return "No due date";
  return new Date(dateString).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const getDaysUntilDue = (dateString?: string) => {
  if (!dateString) return undefined;
  const diff = new Date(dateString).getTime() - new Date().getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

interface EnrichedAssignment extends AssignmentResponse {
  submission?: SubmissionResponse | null;
}

const StudentAssignments = () => {
  const [enrichments, setEnrichments] = useState<EnrichedAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAssignments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // 1. Get enrolled courses
      const enrollments = await eduhubEnrollments.getMy();
      const courseIds = Array.from(new Set(enrollments.map(e => e.course.id)));

      // 2. Fetch assignments for all enrolled courses in parallel
      const courseAssignmentResults = await Promise.all(
        courseIds.map(async (cid) => {
          try {
            const res = await eduhubAssignments.getByCourse(cid);
            return res.filter(a => a.status === "PUBLISHED");
          } catch (e) {
            console.warn(`Failed to fetch assignments for course ${cid}`, e);
            return [];
          }
        })
      );
      const allAssignments: AssignmentResponse[] = courseAssignmentResults.flat();

      // 3. Enrich with submission status
      const enriched: EnrichedAssignment[] = await Promise.all(
        allAssignments.map(async (a) => {
          try {
            const sub = await eduhubAssignments.getMySubmission(a.id);
            return { ...a, submission: sub };
          } catch {
            return { ...a, submission: null };
          }
        })
      );

      // Sort: Pending/Urgent first, then Submitted
      enriched.sort((a, b) => {
        // If one is submitted and other isn't, put submitted last
        if (a.submission && !b.submission) return 1;
        if (!a.submission && b.submission) return -1;
        
        // Otherwise sort by due date
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });

      setEnrichments(enriched);
    } catch (err: any) {
      setError(err.message || "Failed to load assignments");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  const activeCount = enrichments.filter(e => !e.submission).length;
  const completedCount = enrichments.filter(e => e.submission).length;

  return (
    <div className="container mx-auto" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          <div className="mb-8">
            <p className="text-foreground/70 text-sm">View and complete your class assignments.</p>
            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              <span className="rounded-full bg-amber-50 px-4 py-2 text-amber-700 font-medium">{activeCount} pending</span>
              <span className="rounded-full bg-green-50 px-4 py-2 text-green-700 font-medium">{completedCount} completed</span>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-foreground/40">
              <Loader2 className="h-8 w-8 animate-spin mb-4" />
              <p>Loading your assignments...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 text-red-500">
              <AlertCircle className="h-8 w-8 mb-4" />
              <p>{error}</p>
              <Button variant="outline" className="mt-4 rounded-full" onClick={fetchAssignments}>Retry</Button>
            </div>
          ) : enrichments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 p-20 text-center">
              <FileText className="mx-auto h-12 w-12 text-foreground/20 mb-4" />
              <p className="text-foreground/40 font-medium">No assignments found in your enrolled classes.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {enrichments.map((a) => {
                const days = getDaysUntilDue(a.dueDate);
                const isUrgent = !a.submission && days !== undefined && days <= 3 && days >= 0;
                const isOverdue = !a.submission && days !== undefined && days < 0;
                
                return (
                  <div
                    key={a.id}
                    className={`rounded-xl border p-6 transition-shadow hover:shadow-md ${
                      a.submission 
                        ? "border-gray-100 bg-gray-50/50 opacity-80" 
                        : isOverdue 
                          ? "border-red-200 bg-red-50/20" 
                          : isUrgent 
                            ? "border-red-200 bg-red-50/30" 
                            : "border-gray-200/50 bg-white/80"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${a.submission ? "bg-green-100" : "bg-purple-100"}`}>
                          {a.submission ? <CheckCircle className="h-6 w-6 text-green-600" /> : <FileText className="h-6 w-6 text-purple-600" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-foreground" style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400 }}>
                              {a.title}
                            </h3>
                            {a.submission && (
                              <span className="bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded">
                                {a.submission.status === "GRADED" ? "Graded" : "Submitted"}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-foreground/60 mt-0.5">{a.course.title}</p>
                          <div className="mt-2 flex items-center gap-2 text-sm text-foreground/60">
                            <Calendar className="h-4 w-4" />
                            {a.submission ? `Submitted ${formatDate(a.submission.submittedAt)}` : `Due ${formatDate(a.dueDate)}`}
                            {!a.submission && days !== undefined && (
                              <span className={isUrgent || isOverdue ? "text-red-600 font-medium" : "text-foreground/70"}>
                                ({isOverdue ? "Overdue" : `${days} ${days === 1 ? "day" : "days"} left`})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                            a.priority === "HIGH" ? "bg-red-100 text-red-700" : a.priority === "MEDIUM" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {a.priority}
                        </span>
                        {a.submission ? (
                          <Button size="sm" variant="outline" className="rounded-full border-green-200 text-green-700 hover:bg-green-50">
                            View Submission
                          </Button>
                        ) : (
                          <Button 
                            size="sm" 
                            className="rounded-full" 
                            style={{ backgroundColor: "#3954d0" }}
                            disabled={isOverdue}
                          >
                            {isOverdue ? "Closed" : "Start"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
    </div>
  );
};

export default StudentAssignments;
