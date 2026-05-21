import { formatDisplayPersonName } from "@/lib/formatPersonName";

export type CourseCertificateRecord = {
  id: string;
  courseId: string;
  courseTitle: string;
  studentId: string;
  studentEmailNorm: string;
  studentName: string;
  totalFinalScore: number;
  attendanceScore?: number;
  instructorScore?: number;
  certificateNumber: string;
  issuedAt: string;
  instructorName?: string;
  publishedByEmail?: string;
};

const STORAGE_KEY = "eduhub_course_certificates_v1";
const SEQ_KEY = "eduhub_course_certificate_seq_v1";

export const COURSE_CERTIFICATES_CHANGED = "eduhub-course-certificates-changed";

function certKey(courseId: string, studentId: string): string {
  return `${encodeURIComponent(courseId)}::${encodeURIComponent(studentId)}`;
}

function loadAll(): Record<string, CourseCertificateRecord> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, CourseCertificateRecord>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveAll(map: Record<string, CourseCertificateRecord>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    window.dispatchEvent(
      new CustomEvent(COURSE_CERTIFICATES_CHANGED, { detail: {} }),
    );
  } catch {
    /* ignore */
  }
}

function nextCertificateNumber(): string {
  if (typeof window === "undefined") return `CERT.EDUHUB.${Date.now()}`;
  try {
    const yy = String(new Date().getFullYear()).slice(-2);
    const mm = String(new Date().getMonth() + 1).padStart(2, "0");
    const prefix = `${yy}${mm}`;
    const raw = localStorage.getItem(SEQ_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    const n = (parsed[prefix] ?? 0) + 1;
    parsed[prefix] = n;
    localStorage.setItem(SEQ_KEY, JSON.stringify(parsed));
    return `CERT.EDUHUB.${prefix}-${String(n).padStart(4, "0")}`;
  } catch {
    return `CERT.EDUHUB.${Date.now()}`;
  }
}

export function getCourseCertificate(
  courseId: string,
  studentId: string,
): CourseCertificateRecord | undefined {
  return loadAll()[certKey(courseId, studentId)];
}

export function listCourseCertificates(courseId: string): CourseCertificateRecord[] {
  const prefix = `${encodeURIComponent(courseId)}::`;
  return Object.entries(loadAll())
    .filter(([k]) => k.startsWith(prefix))
    .map(([, v]) => v)
    .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
}

export function listCertificatesForStudent(studentEmailNorm: string): CourseCertificateRecord[] {
  const norm = studentEmailNorm.trim().toLowerCase();
  if (!norm) return [];
  return Object.values(loadAll())
    .filter((c) => c.studentEmailNorm === norm)
    .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
}

export type IssueCourseCertificateInput = {
  courseId: string;
  courseTitle: string;
  studentId: string;
  studentEmail: string;
  studentName: string;
  totalFinalScore: number;
  attendanceScore?: number;
  instructorScore?: number;
  instructorName?: string;
  publishedByEmail?: string;
};

export function issueCourseCertificate(input: IssueCourseCertificateInput): CourseCertificateRecord {
  const map = loadAll();
  const key = certKey(input.courseId, input.studentId);
  const existing = map[key];
  if (existing) return existing;

  const record: CourseCertificateRecord = {
    id: crypto.randomUUID?.() ?? `cert-${Date.now()}`,
    courseId: input.courseId,
    courseTitle: input.courseTitle.trim() || input.courseId,
    studentId: input.studentId,
    studentEmailNorm: input.studentEmail.trim().toLowerCase(),
    studentName: formatDisplayPersonName(input.studentName.trim() || "Student"),
    totalFinalScore: input.totalFinalScore,
    attendanceScore: input.attendanceScore,
    instructorScore: input.instructorScore,
    certificateNumber: nextCertificateNumber(),
    issuedAt: new Date().toISOString(),
    instructorName: input.instructorName?.trim()
      ? formatDisplayPersonName(input.instructorName.trim())
      : undefined,
    publishedByEmail: input.publishedByEmail?.trim().toLowerCase(),
  };
  map[key] = record;
  saveAll(map);
  return record;
}
