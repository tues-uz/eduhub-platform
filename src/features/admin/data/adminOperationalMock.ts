/** Mock rows for admin operational UIs until backend endpoints exist. */

export type StudentStatus = "trial" | "active" | "inactive";
export type PaymentStatus = "pending" | "paid" | "overdue";
export type ClassStatus = "active" | "waiting" | "completed";

export const mockAdminStudents = [
  {
    id: "s1",
    name: "Dilnoza Karimova",
    email: "dilnoza@example.com",
    studentStatus: "active" as StudentStatus,
    trialUsed: true,
    coursesCount: 3,
    registeredAt: "2025-11-02",
    unpaidButAttending: false,
  },
  {
    id: "s2",
    name: "Jamshid Toshmatov",
    email: "jamshid@example.com",
    studentStatus: "trial" as StudentStatus,
    trialUsed: false,
    coursesCount: 1,
    registeredAt: "2026-03-01",
    unpaidButAttending: true,
  },
  {
    id: "s3",
    name: "Malika Yusupova",
    email: "malika@example.com",
    studentStatus: "inactive" as StudentStatus,
    trialUsed: true,
    coursesCount: 2,
    registeredAt: "2025-08-15",
    unpaidButAttending: false,
  },
];

export type AdminEnrollmentRow = {
  id: string;
  studentName: string;
  course: string;
  className: string;
  waitlistPosition: number | null;
  enrollmentStatus: "enrolled" | "waiting";
  paymentStatus: PaymentStatus;
  classStatus: ClassStatus;
};

export const mockAdminEnrollments: AdminEnrollmentRow[] = [
  {
    id: "e1",
    studentName: "Dilnoza Karimova",
    course: "Business English B2",
    className: "BE-B2 Mon/Wed",
    waitlistPosition: null as number | null,
    enrollmentStatus: "enrolled" as const,
    paymentStatus: "paid" as PaymentStatus,
    classStatus: "active" as ClassStatus,
  },
  {
    id: "e2",
    studentName: "Jamshid Toshmatov",
    course: "IELTS Intensive",
    className: "—",
    waitlistPosition: 2,
    enrollmentStatus: "waiting" as const,
    paymentStatus: "pending" as PaymentStatus,
    classStatus: "waiting" as ClassStatus,
  },
  {
    id: "e3",
    studentName: "Malika Yusupova",
    course: "General English A2",
    className: "GE-A2 Tue/Thu",
    waitlistPosition: null,
    enrollmentStatus: "enrolled" as const,
    paymentStatus: "overdue" as PaymentStatus,
    classStatus: "active" as ClassStatus,
  },
];

export type AdminClassRow = {
  id: string;
  name: string;
  course: string;
  schedule: string;
  capacity: number;
  filled: number;
  status: ClassStatus;
  sessionQuota: { used: number; total: number };
};

export const mockAdminClasses: AdminClassRow[] = [
  {
    id: "c1",
    name: "BE-B2 Mon/Wed",
    course: "Business English B2",
    schedule: "Mon & Wed · 18:00",
    capacity: 16,
    filled: 14,
    status: "active" as ClassStatus,
    sessionQuota: { used: 12, total: 24 },
  },
  {
    id: "c2",
    name: "IELTS Sat",
    course: "IELTS Intensive",
    schedule: "Sat · 10:00",
    capacity: 12,
    filled: 12,
    status: "waiting" as ClassStatus,
    sessionQuota: { used: 8, total: 20 },
  },
];

export type AttendanceSessionRecord = {
  date: string;
  label: string;
  status: "present" | "absent" | "late" | "excused";
};

export type AdminAttendanceRow = {
  id: string;
  studentName: string;
  course: string;
  lecturerName: string;
  className: string;
  attendancePct: number;
  progressPct: number;
  atRisk: boolean;
  sessionsPresent: number;
  sessionsTotal: number;
  lastActivity: string;
  sessionLog: AttendanceSessionRecord[];
};

export const mockAdminAttendance: AdminAttendanceRow[] = [
  {
    id: "a1",
    studentName: "Dilnoza Karimova",
    course: "Business English B2",
    lecturerName: "Dr. Karimov",
    className: "BE-B2 Mon/Wed",
    attendancePct: 92,
    progressPct: 78,
    atRisk: false,
    sessionsPresent: 11,
    sessionsTotal: 12,
    lastActivity: "2026-03-26",
    sessionLog: [
      { date: "2026-03-26", label: "Mon session", status: "present" },
      { date: "2026-03-24", label: "Wed session", status: "late" },
      { date: "2026-03-19", label: "Mon session", status: "present" },
      { date: "2026-03-17", label: "Wed session", status: "present" },
      { date: "2026-03-12", label: "Mon session", status: "present" },
    ],
  },
  {
    id: "a2",
    studentName: "Jamshid Toshmatov",
    course: "IELTS Intensive",
    lecturerName: "Sarah Johnson",
    className: "IELTS Sat",
    attendancePct: 45,
    progressPct: 30,
    atRisk: true,
    sessionsPresent: 4,
    sessionsTotal: 9,
    lastActivity: "2026-03-15",
    sessionLog: [
      { date: "2026-03-22", label: "Sat session", status: "absent" },
      { date: "2026-03-15", label: "Sat session", status: "present" },
      { date: "2026-03-08", label: "Sat session", status: "absent" },
      { date: "2026-03-01", label: "Sat session", status: "late" },
      { date: "2026-02-22", label: "Sat session", status: "absent" },
    ],
  },
];

export type AdminPaymentRow = {
  id: string;
  studentName: string;
  studentEmail: string;
  course: string;
  lecturerName: string;
  amount: number;
  currency: string;
  dueDate: string;
  status: PaymentStatus;
  proofSubmitted: boolean;
  reference: string;
  paymentMethod: string;
  createdAt: string;
  paidAt?: string;
};

export const mockAdminPayments: AdminPaymentRow[] = [
  {
    id: "p1",
    studentName: "Dilnoza Karimova",
    studentEmail: "dilnoza@example.com",
    course: "Business English B2",
    lecturerName: "Dr. Karimov",
    amount: 1_200_000,
    currency: "UZS",
    dueDate: "2026-03-15",
    status: "paid",
    proofSubmitted: true,
    reference: "INV-2026-BE-0142",
    paymentMethod: "Bank transfer",
    createdAt: "2026-02-10",
    paidAt: "2026-03-14",
  },
  {
    id: "p2",
    studentName: "Jamshid Toshmatov",
    studentEmail: "jamshid@example.com",
    course: "IELTS Intensive",
    lecturerName: "Sarah Johnson",
    amount: 2_500_000,
    currency: "UZS",
    dueDate: "2026-03-01",
    status: "pending",
    proofSubmitted: true,
    reference: "INV-2026-IELTS-0098",
    paymentMethod: "—",
    createdAt: "2026-02-20",
  },
  {
    id: "p3",
    studentName: "Malika Yusupova",
    studentEmail: "malika@example.com",
    course: "General English A2",
    lecturerName: "Dr. Karimov",
    amount: 900_000,
    currency: "UZS",
    dueDate: "2026-02-01",
    status: "overdue",
    proofSubmitted: false,
    reference: "INV-2026-GE-0031",
    paymentMethod: "—",
    createdAt: "2026-01-15",
  },
];

export type AdminTransactionRow = {
  id: string;
  ref: string;
  studentName: string;
  type: "Tuition" | "Deposit" | "Refund";
  amount: number;
  currency: string;
  recordedAt: string;
  method: string;
};

export const mockAdminTransactions: AdminTransactionRow[] = [
  {
    id: "t1",
    ref: "TXN-2026-0312-001",
    studentName: "Dilnoza Karimova",
    type: "Tuition",
    amount: 1_200_000,
    currency: "UZS",
    recordedAt: "2026-03-12T09:15:00",
    method: "Bank transfer",
  },
  {
    id: "t2",
    ref: "TXN-2026-0310-002",
    studentName: "Jamshid Toshmatov",
    type: "Deposit",
    amount: 500_000,
    currency: "UZS",
    recordedAt: "2026-03-10T14:00:00",
    method: "Payme",
  },
  {
    id: "t3",
    ref: "TXN-2026-0308-003",
    studentName: "Malika Yusupova",
    type: "Refund",
    amount: 150_000,
    currency: "UZS",
    recordedAt: "2026-03-08T11:22:00",
    method: "Bank transfer",
  },
];

export type AdminPlacementResultRow = {
  id: string;
  studentName: string;
  course: string;
  lecturerName: string;
  quizTitle: string;
  scorePercent: number;
  passed: boolean;
  completedAt: string;
};

export const mockAdminPlacementResults: AdminPlacementResultRow[] = [
  {
    id: "pt1",
    studentName: "Dilnoza Karimova",
    course: "Business English B2",
    lecturerName: "Dr. Karimov",
    quizTitle: "Placement · Grammar & reading",
    scorePercent: 82,
    passed: true,
    completedAt: "2026-02-28",
  },
  {
    id: "pt2",
    studentName: "Jamshid Toshmatov",
    course: "IELTS Intensive",
    lecturerName: "Sarah Johnson",
    quizTitle: "Placement · Full mock",
    scorePercent: 58,
    passed: false,
    completedAt: "2026-03-05",
  },
];

export type AdminCertificationRow = {
  id: string;
  studentName: string;
  course: string;
  surveyComplete: boolean;
  courseComplete: boolean;
  eligible: boolean;
};

export const mockAdminCertifications: AdminCertificationRow[] = [
  {
    id: "cert1",
    studentName: "Dilnoza Karimova",
    course: "Business English B2",
    surveyComplete: true,
    courseComplete: true,
    eligible: true,
  },
  {
    id: "cert2",
    studentName: "Jamshid Toshmatov",
    course: "IELTS Intensive",
    surveyComplete: false,
    courseComplete: false,
    eligible: false,
  },
];

export type AdminCalendarEventRow = {
  id: string;
  title: string;
  type: "class" | "test" | "review";
  start: string;
  end: string;
};

export const mockAdminCalendarEvents: AdminCalendarEventRow[] = [
  { id: "ev1", title: "BE-B2 · Speaking lab", type: "class", start: "2026-03-31T18:00:00", end: "2026-03-31T19:30:00" },
  { id: "ev2", title: "IELTS · Mock test", type: "test", start: "2026-04-02T10:00:00", end: "2026-04-02T12:00:00" },
  { id: "ev3", title: "Progress review · A2", type: "review", start: "2026-04-04T15:00:00", end: "2026-04-04T16:00:00" },
];

export type AdminSupportSessionRow = {
  id: string;
  studentName: string;
  course: string;
  topic: string;
  status: "requested" | "scheduled";
  requestedAt: string;
};

export const mockAdminSupportSessions: AdminSupportSessionRow[] = [
  {
    id: "ss1",
    studentName: "Jamshid Toshmatov",
    course: "IELTS Intensive",
    topic: "Writing task 2 feedback",
    status: "requested" as const,
    requestedAt: "2026-03-28",
  },
  {
    id: "ss2",
    studentName: "Dilnoza Karimova",
    course: "Business English B2",
    topic: "Presentation coaching",
    status: "scheduled" as const,
    requestedAt: "2026-03-20",
  },
];

export type AdminTeacherCourseRef = {
  /** Course id for links when API provides it; demo slugs are fine for routing placeholders. */
  id: string;
  title: string;
  /** Current enrollment / max seats (shown as e.g. 16/32). */
  enrolled: number;
  capacity: number;
};

export type AdminTeacherRow = {
  id: string;
  name: string;
  email: string;
  /** Courses this lecturer teaches; length is the assigned course count. */
  coursesTaught: AdminTeacherCourseRef[];
  /** Students enrolled across this lecturer's assigned courses (demo aggregate). */
  totalStudents: number;
  status: "Active" | "Inactive";
};

export const mockAdminTeachers: AdminTeacherRow[] = [
  {
    id: "te1",
    name: "Dr. Karimov",
    email: "karimov@eduhub.com",
    coursesTaught: [
      { id: "demo-be-b2", title: "Business English B2", enrolled: 16, capacity: 32 },
      { id: "demo-ge-a2", title: "General English A2", enrolled: 12, capacity: 24 },
      { id: "demo-acad-write", title: "Academic Writing", enrolled: 8, capacity: 20 },
      { id: "demo-pres-skills", title: "Presentation Skills", enrolled: 12, capacity: 16 },
    ],
    totalStudents: 48,
    status: "Active",
  },
  {
    id: "te2",
    name: "Sarah Johnson",
    email: "sarah.j@eduhub.com",
    coursesTaught: [
      { id: "demo-ielts-int", title: "IELTS Intensive", enrolled: 20, capacity: 28 },
      { id: "demo-ielts-speak", title: "IELTS Speaking lab", enrolled: 10, capacity: 14 },
    ],
    totalStudents: 22,
    status: "Active",
  },
  {
    id: "te3",
    name: "Alex Chen",
    email: "alex.chen@eduhub.com",
    coursesTaught: [],
    totalStudents: 0,
    status: "Inactive",
  },
];

export type AdminStaffRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "Active" | "Inactive";
};

export const mockAdminStaff: AdminStaffRow[] = [
  { id: "st1", name: "Operations Desk", email: "ops@eduhub.com", role: "Coordinator", status: "Active" },
  { id: "st2", name: "Front Desk", email: "front@eduhub.com", role: "Reception", status: "Inactive" },
];

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "Active" | "Inactive";
};

export const mockAdminUsers: AdminUserRow[] = [
  { id: "u1", name: "Sevinch", email: "sevinch@eduhub.com", role: "Student", status: "Active" },
  { id: "u2", name: "Admin", email: "admin@eduhub.com", role: "Admin", status: "Active" },
];
