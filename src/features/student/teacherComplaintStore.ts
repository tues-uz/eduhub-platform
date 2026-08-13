export const TEACHER_COMPLAINTS_CHANGED_EVENT = "eduhub-teacher-complaints-changed";

export type TeacherComplaintCategory = "teacher" | "class" | "other";
export type TeacherComplaintStatus = "open" | "reviewed";
/** 1 = very sad … 5 = very happy */
export type TeacherComplaintMood = 1 | 2 | 3 | 4 | 5;

export const TEACHER_COMPLAINT_MOODS: readonly {
  value: TeacherComplaintMood;
  emoji: string;
}[] = [
  { value: 1, emoji: "😢" },
  { value: 2, emoji: "😕" },
  { value: 3, emoji: "😐" },
  { value: 4, emoji: "🙂" },
  { value: 5, emoji: "😊" },
] as const;

export function moodEmoji(mood: TeacherComplaintMood | undefined): string {
  return TEACHER_COMPLAINT_MOODS.find((m) => m.value === mood)?.emoji ?? "—";
}

export type TeacherComplaint = {
  id: string;
  courseId: string;
  courseTitle: string;
  teacherName: string;
  teacherId?: string;
  studentId?: string;
  studentName: string;
  studentEmail: string;
  category: TeacherComplaintCategory;
  /** How the student feels (sad → happy). */
  mood: TeacherComplaintMood;
  message: string;
  status: TeacherComplaintStatus;
  createdAt: string;
  reviewedAt?: string;
};

export type TeacherComplaintInput = {
  courseId: string;
  courseTitle: string;
  teacherName: string;
  teacherId?: string;
  studentId?: string;
  studentName: string;
  studentEmail: string;
  category: TeacherComplaintCategory;
  mood: TeacherComplaintMood;
  message: string;
};

const STORAGE_KEY = "eduhub_teacher_complaints_v1";

function notifyChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(TEACHER_COMPLAINTS_CHANGED_EVENT));
  }
}

function readAll(): TeacherComplaint[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TeacherComplaint[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(rows: TeacherComplaint[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
    notifyChanged();
  } catch {
    // Ignore quota / private mode.
  }
}

export function listTeacherComplaints(): TeacherComplaint[] {
  return readAll().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function submitTeacherComplaint(input: TeacherComplaintInput): TeacherComplaint {
  const message = input.message.trim();
  if (!message) throw new Error("Message is required");
  if (!input.courseId.trim()) throw new Error("Course is required");
  if (![1, 2, 3, 4, 5].includes(input.mood)) throw new Error("Mood is required");

  const row: TeacherComplaint = {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `complaint-${Date.now()}`,
    courseId: input.courseId.trim(),
    courseTitle: input.courseTitle.trim() || "Class",
    teacherName: input.teacherName.trim() || "Instructor",
    teacherId: input.teacherId?.trim() || undefined,
    studentId: input.studentId?.trim() || undefined,
    studentName: input.studentName.trim() || "Student",
    studentEmail: input.studentEmail.trim().toLowerCase(),
    category: input.category,
    mood: input.mood,
    message,
    status: "open",
    createdAt: new Date().toISOString(),
  };

  writeAll([row, ...readAll()]);
  return row;
}

export function markTeacherComplaintReviewed(id: string): TeacherComplaint | null {
  const all = readAll();
  const idx = all.findIndex((r) => r.id === id);
  if (idx < 0) return null;
  const next = {
    ...all[idx]!,
    status: "reviewed" as const,
    reviewedAt: new Date().toISOString(),
  };
  all[idx] = next;
  writeAll(all);
  return next;
}
