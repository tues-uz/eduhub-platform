import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { MoreHorizontal } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { appRoutes } from "@/app/routes";
import { getAccessToken } from "@/api/eduhubClient";
import { useAuthSession } from "@/features/auth/context";
import {
  submitTeacherComplaint,
  TEACHER_COMPLAINT_MOODS,
  type TeacherComplaintCategory,
  type TeacherComplaintMood,
} from "@/features/student/teacherComplaintStore";
import { cn } from "@/lib/utils";

type Props = {
  courseId: string;
  courseTitle: string;
  teacherName: string;
  teacherId?: string;
};

export function ClassDetailActionsMenu({
  courseId,
  courseTitle,
  teacherName,
  teacherId,
}: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthSession();
  const signedIn = Boolean(getAccessToken());
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<TeacherComplaintCategory>("teacher");
  const [mood, setMood] = useState<TeacherComplaintMood | null>(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setCategory("teacher");
    setMood(null);
    setMessage("");
    setSubmitting(false);
  };

  const openDialog = () => {
    if (!signedIn) {
      toast.error(t("courseDetail.complaint.signInRequired"));
      navigate(
        `${appRoutes.signIn}?redirect=${encodeURIComponent(window.location.pathname)}`,
      );
      return;
    }
    setOpen(true);
  };

  const handleSubmit = () => {
    if (mood == null) {
      toast.error(t("courseDetail.complaint.moodRequired"));
      return;
    }
    const trimmed = message.trim();
    if (trimmed.length < 10) {
      toast.error(t("courseDetail.complaint.messageTooShort"));
      return;
    }
    setSubmitting(true);
    try {
      submitTeacherComplaint({
        courseId,
        courseTitle,
        teacherName,
        teacherId,
        studentId: user.id || undefined,
        studentName: user.name || "Student",
        studentEmail: user.email || "",
        category,
        mood,
        message: trimmed,
      });
      toast.success(t("courseDetail.complaint.submitted"));
      setOpen(false);
      reset();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("courseDetail.complaint.submitFailed"));
      setSubmitting(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0 rounded-full border-zinc-200 bg-white/90 text-zinc-700 shadow-sm hover:bg-zinc-50"
            aria-label={t("courseDetail.complaint.menuAria")}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem className="cursor-pointer" onSelect={openDialog}>
            {t("courseDetail.complaint.menuItem")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) reset();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("courseDetail.complaint.title")}</DialogTitle>
            <DialogDescription>
              {t("courseDetail.complaint.description", { teacher: teacherName })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">
            <div className="space-y-2">
              <Label>{t("courseDetail.complaint.mood")}</Label>
              <p className="text-xs text-muted-foreground">{t("courseDetail.complaint.moodHint")}</p>
              <div
                className="flex items-center justify-between gap-1 rounded-xl border border-zinc-200 bg-zinc-50/80 px-2 py-2.5 sm:gap-2 sm:px-3"
                role="radiogroup"
                aria-label={t("courseDetail.complaint.mood")}
              >
                {TEACHER_COMPLAINT_MOODS.map((option) => {
                  const selected = mood === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      aria-label={t(`courseDetail.complaint.moods.${option.value}`)}
                      onClick={() => setMood(option.value)}
                      className={cn(
                        "flex h-11 w-11 items-center justify-center rounded-full text-2xl transition-all sm:h-12 sm:w-12",
                        selected
                          ? "scale-110 bg-white ring-2 ring-[#3954d0] shadow-sm"
                          : "opacity-70 hover:scale-105 hover:opacity-100",
                      )}
                    >
                      <span aria-hidden>{option.emoji}</span>
                    </button>
                  );
                })}
              </div>
              <div className="flex justify-between text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                <span>{t("courseDetail.complaint.moodSad")}</span>
                <span>{t("courseDetail.complaint.moodHappy")}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("courseDetail.complaint.category")}</Label>
              <Select
                value={category}
                onValueChange={(v) => setCategory(v as TeacherComplaintCategory)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="teacher">{t("courseDetail.complaint.categories.teacher")}</SelectItem>
                  <SelectItem value="class">{t("courseDetail.complaint.categories.class")}</SelectItem>
                  <SelectItem value="other">{t("courseDetail.complaint.categories.other")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="teacher-complaint-message">{t("courseDetail.complaint.message")}</Label>
              <Textarea
                id="teacher-complaint-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t("courseDetail.complaint.messagePlaceholder")}
                rows={5}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">{t("courseDetail.complaint.adminHint")}</p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              style={{ backgroundColor: "#3954d0" }}
              className="text-white hover:opacity-90"
            >
              {t("courseDetail.complaint.submit")}
            </Button>
          </DialogFooter>
          {!signedIn ? (
            <p className="text-center text-xs text-muted-foreground">
              <Link to={appRoutes.signIn} className="text-[#3954d0] hover:underline">
                {t("courseDetail.complaint.signIn")}
              </Link>
            </p>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
