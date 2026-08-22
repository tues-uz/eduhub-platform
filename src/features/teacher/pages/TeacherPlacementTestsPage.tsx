import { useTranslation } from "react-i18next";
import { AdminPlacementTestsManager } from "@/features/admin/components/AdminPlacementTestsManager";

/**
 * A teacher's placement tests, listed here rather than under any one class — a placement test is
 * subject-wide (it gates every class in that subject, not just the class it was authored from), so
 * it can't live in a per-class roster tab.
 */
export default function TeacherPlacementTestsPage() {
  const { t } = useTranslation();

  return (
    <div className="container mx-auto px-6 py-4 md:py-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {t("teacher.quiz.placementTestsPage.title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("teacher.quiz.placementTestsPage.description")}
        </p>
      </div>
      <AdminPlacementTestsManager />
    </div>
  );
}
