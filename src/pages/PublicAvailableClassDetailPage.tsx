import EduHubHeader from "@/components/EduHubHeader";
import StudentAvailableCourseDetailPage from "@/pages/StudentAvailableCourseDetailPage";

/** Public class detail — browse without signing in. */
export default function PublicAvailableClassDetailPage() {
  return (
    <div className="min-h-dvh bg-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <EduHubHeader />
      <main className="px-6 pb-12 pt-20">
        <StudentAvailableCourseDetailPage />
      </main>
    </div>
  );
}
