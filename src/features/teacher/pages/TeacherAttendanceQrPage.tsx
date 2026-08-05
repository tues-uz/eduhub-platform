import { TeacherAttendanceSessionPanel } from "@/features/teacher/components/TeacherAttendanceSessionPanel";
import { useTranslation } from "react-i18next";

export default function TeacherAttendanceQrPage() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex flex-col gap-4 px-4 lg:px-6 md:gap-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {t("teacher.attendanceQr.title")}
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            {t("teacher.attendanceQr.description")}
          </p>
        </div>

        <TeacherAttendanceSessionPanel />
      </div>
    </div>
  );
}
