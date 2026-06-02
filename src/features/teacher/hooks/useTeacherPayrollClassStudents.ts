import { useEffect, useMemo, useState } from "react";
import { eduhubCourses, eduhubLecturer } from "@/api/eduhubClient";
import { isUuid } from "@/api/utils";
import type { AdminPaymentRow, PaymentStatus } from "@/features/admin/data/adminOperationalMock";
import { enrollmentApplicationStore } from "@/features/enrollment/enrollmentApplicationStore";
import { addToCurrencyMap } from "@/features/payroll/classPayrollAggregate";
import type { TeacherCourse } from "@/features/teacher/types";
import {
  getPayrollSubmitDemoEnrolledStudents,
  isPayrollSubmitDemoCourse,
} from "@/features/payroll/payrollSubmitDemo";

export type TeacherPayrollStudentRow = {
  id: string;
  studentName: string;
  studentEmail: string;
  amount: number | null;
  currency: string;
  status: PaymentStatus | "enrolled";
  dueDate: string | null;
  paidAt: string | null;
};

type EnrolledStudent = {
  id: string;
  fullName: string;
  email: string;
  enrolledAt?: string;
};

function courseTitleNorm(title: string) {
  return title.trim().toLowerCase();
}

function listLocalEnrolledStudents(courseId: string): EnrolledStudent[] {
  const seen = new Set<string>();
  return enrollmentApplicationStore
    .list()
    .filter((application) => application.courseId === courseId && application.status === "APPROVED")
    .filter((application) => {
      const email = application.applicantEmailNorm.trim().toLowerCase();
      if (seen.has(email)) return false;
      seen.add(email);
      return true;
    })
    .map((application) => ({
      id: application.id,
      fullName: application.fullName,
      email: application.email,
      enrolledAt: application.reviewedAt ?? application.submittedAt,
    }));
}

export function buildTeacherPayrollStudentRows(
  course: TeacherCourse,
  enrolled: EnrolledStudent[],
  adminPayments: AdminPaymentRow[],
  className: string,
  courseName: string,
): TeacherPayrollStudentRow[] {
  const appsByEmail = new Map(
    enrollmentApplicationStore
      .list()
      .filter((application) => application.courseId === course.id && application.status === "APPROVED")
      .map((application) => [application.applicantEmailNorm.trim().toLowerCase(), application]),
  );

  return enrolled.map((student) => {
    const emailNorm = student.email.trim().toLowerCase();
    const payment = adminPayments.find(
      (row) =>
        row.className === className &&
        row.course === courseName &&
        row.studentEmail.trim().toLowerCase() === emailNorm,
    );
    if (payment) {
      return {
        id: student.id,
        studentName: student.fullName,
        studentEmail: student.email,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        dueDate: payment.dueDate,
        paidAt: payment.paidAt ?? null,
      };
    }

    const app = appsByEmail.get(emailNorm);
    const amount =
      app?.amountPaid ?? app?.downPaymentAmount ?? (course.price && course.price > 0 ? course.price : null);
    const currency = app?.priceCurrency ?? course.priceCurrency ?? "UZS";
    const paidAt =
      app?.receiptIssuedAt?.split("T")[0] ??
      app?.reviewedAt?.split("T")[0] ??
      student.enrolledAt?.split("T")[0] ??
      null;

    // On the official roster = enrollment approved (payment cleared to join the class).
    return {
      id: student.id,
      studentName: student.fullName,
      studentEmail: student.email,
      amount,
      currency,
      status: "paid",
      dueDate: null,
      paidAt,
    };
  });
}

export function summarizeTeacherPayrollStudentRows(rows: TeacherPayrollStudentRow[]) {
  const paidByCurrency = new Map<string, number>();
  const outstandingByCurrency = new Map<string, number>();
  let paidCount = 0;
  let unpaidCount = 0;

  for (const row of rows) {
    if (row.status === "paid") {
      paidCount += 1;
      if (row.amount != null && row.amount > 0) {
        addToCurrencyMap(paidByCurrency, row.currency, row.amount);
      }
    } else if (row.status === "pending" || row.status === "overdue") {
      unpaidCount += 1;
      if (row.amount != null && row.amount > 0) {
        addToCurrencyMap(outstandingByCurrency, row.currency, row.amount);
      }
    }
  }

  return { paidCount, unpaidCount, paidByCurrency, outstandingByCurrency };
}

export function useTeacherPayrollClassStudents(
  instructorCourses: TeacherCourse[],
  lecturerId: string | undefined,
) {
  const [lecturerStudents, setLecturerStudents] = useState<
    { id: string; fullName: string; email: string; courseTitle: string; enrolledAt: string }[]
  >([]);
  const [enrolledByCourseId, setEnrolledByCourseId] = useState<Map<string, EnrolledStudent[]>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function loadLecturerStudents() {
      if (!lecturerId) {
        if (!cancelled) setLecturerStudents([]);
        return;
      }
      try {
        const rows = await eduhubLecturer.getAllStudents(lecturerId);
        if (!cancelled) setLecturerStudents(rows ?? []);
      } catch {
        if (!cancelled) setLecturerStudents([]);
      }
    }
    void loadLecturerStudents();
    return () => {
      cancelled = true;
    };
  }, [lecturerId]);

  useEffect(() => {
    let cancelled = false;
    async function loadRosters() {
      setLoading(true);
      const uuidCourses = instructorCourses.filter((course) => isUuid(course.id));
      if (uuidCourses.length === 0) {
        if (!cancelled) {
          setEnrolledByCourseId(new Map());
          setLoading(false);
        }
        return;
      }
      const entries = await Promise.all(
        uuidCourses.map(async (course) => {
          try {
            const rows = await eduhubCourses.getEnrolledStudents(course.id, 0, 100);
            return [
              course.id,
              rows.map((row) => ({
                id: row.id,
                fullName: row.fullName,
                email: row.email,
              })),
            ] as const;
          } catch {
            return [course.id, [] as EnrolledStudent[]] as const;
          }
        }),
      );
      if (!cancelled) {
        setEnrolledByCourseId(new Map(entries));
        setLoading(false);
      }
    }
    void loadRosters();
    return () => {
      cancelled = true;
    };
  }, [instructorCourses]);

  const enrolledByCourseIdMap = useMemo(() => {
    const map = new Map<string, EnrolledStudent[]>();
    for (const course of instructorCourses) {
      let students: EnrolledStudent[] = [];

      if (isUuid(course.id)) {
        students = enrolledByCourseId.get(course.id) ?? [];
        if (students.length === 0) {
          const title = courseTitleNorm(course.title);
          students = lecturerStudents
            .filter((student) => courseTitleNorm(student.courseTitle) === title)
            .map((student) => ({
              id: student.id,
              fullName: student.fullName,
              email: student.email,
              enrolledAt: student.enrolledAt,
            }));
        }
      } else if (isPayrollSubmitDemoCourse(course)) {
        students = getPayrollSubmitDemoEnrolledStudents();
      } else {
        students = listLocalEnrolledStudents(course.id);
      }

      map.set(course.id, students);
    }
    return map;
  }, [enrolledByCourseId, instructorCourses, lecturerStudents]);

  return { enrolledByCourseId: enrolledByCourseIdMap, loading };
}
