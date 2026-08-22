import { createContext, useContext, type RefObject } from "react";
import type { ClassMeetingSlot, TeacherLesson } from "../types";

export type TeacherCourseFormContextValue = {
  isEdit: boolean;
  courseId: string | undefined;
  /** e.g. `/dashboard/teacher/courses/new` or `.../courses/uuid/edit` */
  basePath: string;
  title: string;
  setTitle: (v: string) => void;
  category: string;
  level: string;
  setLevel: (v: string) => void;
  /** Placement-test subject this class belongs to (e.g. "Russian"), for level-gated enrollment. Optional. */
  subject: string;
  setSubject: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  classMeetingsInSixMonths: string;
  setClassMeetingsInSixMonths: (v: string) => void;
  /** Per session: title + optional date/time; length tracks “Sessions in 6 months”. */
  classMeetingSlots: ClassMeetingSlot[];
  setClassMeetingSlots: React.Dispatch<React.SetStateAction<ClassMeetingSlot[]>>;
  updateMeetingSlot: (index: number, patch: Partial<ClassMeetingSlot>) => void;
  thumbnailUrl: string;
  setThumbnailUrl: React.Dispatch<React.SetStateAction<string>>;
  thumbnailUploading: boolean;
  thumbnailInputRef: RefObject<HTMLInputElement | null>;
  handleThumbnailUpload: (file: File) => Promise<void>;
  instructorDisplayName: string;
  lessons: TeacherLesson[];
  setLessons: React.Dispatch<React.SetStateAction<TeacherLesson[]>>;
  addLesson: () => void;
  removeLesson: (index: number) => void;
  updateLesson: (index: number, updates: Partial<TeacherLesson>) => void;
  handleAddLessonClick: () => void;
  handleFileUpload: (index: number, file: File) => Promise<void>;
  handleGetDurationFromUrl: (index: number) => Promise<void>;
  handleGetPdfReadingTime: (index: number) => Promise<void>;
  uploadingIndex: number | null;
  uploadError: string | null;
  durationLoadingIndex: number | null;
  collapsedLessonIds: Set<string>;
  setCollapsedLessonIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  saving: boolean;
  error: string;
  setError: (v: string) => void;
  validateDetailsStep: () => boolean;
  validateScheduleStep: () => boolean;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  showAddLessonModal: boolean;
  setShowAddLessonModal: (v: boolean) => void;
  lessonToRemoveIndex: number | null;
  setLessonToRemoveIndex: (v: number | null) => void;
};

const TeacherCourseFormContext = createContext<TeacherCourseFormContextValue | null>(null);

export function useTeacherCourseForm(): TeacherCourseFormContextValue {
  const ctx = useContext(TeacherCourseFormContext);
  if (!ctx) throw new Error("useTeacherCourseForm must be used within TeacherCourseFormLayout");
  return ctx;
}

export { TeacherCourseFormContext };
