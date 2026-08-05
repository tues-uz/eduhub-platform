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

let memoryCertMap: Record<string, CourseCertificateRecord> = {};
let seqCounter = 1000;

export const COURSE_CERTIFICATES_CHANGED = "eduhub-course-certificates-changed";

function certKey(courseId: string, studentId: string): string {
  return `${encodeURIComponent(courseId)}::${encodeURIComponent(studentId)}`;
}

function loadAll(): Record<string, CourseCertificateRecord> {
  return memoryCertMap;
}

function saveAll(map: Record<string, CourseCertificateRecord>): void {
  memoryCertMap = map;
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(COURSE_CERTIFICATES_CHANGED, { detail: {} }),
    );
  }
}

function nextCertificateNumber(): string {
  const yy = String(new Date().getFullYear()).slice(-2);
  const mm = String(new Date().getMonth() + 1).padStart(2, "0");
  const prefix = `${yy}${mm}`;
  seqCounter += 1;
  return `CERT.EDUHUB.${prefix}-${String(seqCounter).padStart(4, "0")}`;
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
