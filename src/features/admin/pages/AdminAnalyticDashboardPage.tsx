import { useCallback, useMemo, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import {
  ArrowRight,
  Banknotes,
  BarChart3,
  BookOpen,
  CircleDollarSign,
  ClipboardList,
  FileSpreadsheet,
  GraduationCap,
  UserCheck,
  UserPlus,
  Users,
  UserX,
} from "@/lib/icons";
import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthSession } from "@/features/auth/context";
import { useAdminOverviewQuery } from "@/features/admin/hooks/useAdminQueries";
import { useAdminPayments } from "@/features/admin/data/adminPaymentsStore";
import {
  mockAdminAttendance,
  mockAdminEnrollments,
  mockAdminStudents,
  mockAdminTeachers,
  mockAdminTransactions,
  type AdminPaymentRow,
} from "@/features/admin/data/adminOperationalMock";
import { useInstructorPayrollRequests } from "@/features/teacher/data/instructorPayrollRequestStore";
import {
  INSTRUCTOR_REVENUE_SHARE,
  sumAmountsForStatuses,
} from "@/features/payroll/classPayrollAggregate";
import { formatDisplayPersonName } from "@/lib/formatPersonName";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type AnalyticTab = "overview" | "students" | "teachers" | "finance" | "payroll";

function parseAnalyticTab(value: string | null): AnalyticTab {
  if (value === "students" || value === "teachers" || value === "finance" || value === "payroll") {
    return value;
  }
  return "overview";
}

const QUICK_ACTIONS = [
  {
    labelKey: "adminNav.teachers",
    path: "/dashboard/admin/teachers",
    icon: GraduationCap,
  },
  {
    labelKey: "adminNav.payroll",
    path: "/dashboard/admin/payroll",
    icon: Banknotes,
  },
  {
    labelKey: "adminNav.reports",
    path: "/dashboard/admin/reports",
    icon: BarChart3,
  },
  {
    labelKey: "adminNav.attendanceProgress",
    path: "/dashboard/admin/attendance",
    icon: UserCheck,
  },
  {
    labelKey: "adminNav.transactions",
    path: "/dashboard/admin/transactions",
    icon: ClipboardList,
  },
] as const;

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatMoneyLines(lines: { currency: string; amount: number; formatted: string }[], empty = "—") {
  return lines.length > 0 ? lines.map((l) => l.formatted).join(", ") : empty;
}

function isInflowType(type: string) {
  const normalized = type.trim().toLowerCase();
  return normalized !== "refund";
}

function instructorKey(email?: string, name?: string) {
  const e = email?.trim().toLowerCase();
  if (e) return e;
  return name?.trim().toLowerCase() ?? "";
}

function paymentMatchesInstructor(payment: AdminPaymentRow, email: string, name: string) {
  const paymentKey = instructorKey(payment.lecturerEmail, payment.lecturerName);
  const teacherKey = instructorKey(email, name);
  if (paymentKey && teacherKey && paymentKey === teacherKey) return true;
  return payment.lecturerName.trim().toLowerCase() === name.trim().toLowerCase();
}

type TeacherMoneyRow = {
  id: string;
  name: string;
  email: string;
  status: string;
  classCount: number;
  totalStudents: number;
  currency: string;
  tuitionCollected: number;
  tuitionOutstanding: number;
  estInstructorPayout: number;
  payrollPending: number;
  payrollApproved: number;
};

function OverviewMetric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-slate-100 last:border-0">
      <div className="min-w-0">
        <p className="text-sm text-slate-600">{label}</p>
        {hint ? <p className="text-xs text-slate-400 mt-0.5">{hint}</p> : null}
      </div>
      <p className="text-sm font-semibold text-slate-900 tabular-nums shrink-0 text-right">{value}</p>
    </div>
  );
}

function OverviewPanel({
  title,
  icon: Icon,
  iconClassName,
  children,
}: {
  title: string;
  icon: typeof Users;
  iconClassName: string;
  children: ReactNode;
}) {
  return (
    <div className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconClassName}`}>
          <Icon className="h-4 w-4" aria-hidden />
        </div>
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      </div>
      <div>{children}</div>
    </div>
  );
}

type AnalyticStatCardConfig = {
  label: string;
  value: string;
  icon: typeof Users;
  color: string;
  bgColor: string;
  borderColor: string;
};

function AnalyticStatCard({ label, value, icon: Icon, color, bgColor, borderColor }: AnalyticStatCardConfig) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 hover:border-slate-300 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className={`${bgColor} p-2.5 rounded-md border ${borderColor}`}>
          <Icon className={`h-5 w-5 ${color}`} aria-hidden />
        </div>
      </div>
      <p className="text-3xl font-bold text-slate-900 mb-1 tabular-nums">{value}</p>
      <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">{label}</p>
    </div>
  );
}

function AnalyticStatCardGrid({ cards }: { cards: AnalyticStatCardConfig[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((stat) => (
        <AnalyticStatCard key={stat.label} {...stat} />
      ))}
    </div>
  );
}

export default function AdminAnalyticDashboardPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = parseAnalyticTab(searchParams.get("tab"));
  const { user } = useAuthSession();
  const { data: overview } = useAdminOverviewQuery();
  const payments = useAdminPayments();
  const payrollRequests = useInstructorPayrollRequests();
  const isStaffAnalytic = user.staffRole === "ADMIN_ANALYTIC";

  const studentTotals = useMemo(() => {
    const active = mockAdminStudents.filter((s) => s.studentStatus === "active").length;
    const trial = mockAdminStudents.filter((s) => s.studentStatus === "trial").length;
    const inactive = mockAdminStudents.filter((s) => s.studentStatus === "inactive").length;
    return { total: mockAdminStudents.length, active, trial, inactive };
  }, []);

  const teacherTotals = useMemo(() => {
    const active = mockAdminTeachers.filter((teacher) => teacher.status === "Active").length;
    const inactive = mockAdminTeachers.filter((teacher) => teacher.status === "Inactive").length;
    const classesTaught = mockAdminTeachers.reduce(
      (sum, teacher) => sum + teacher.coursesTaught.length,
      0,
    );
    const studentsTaught = mockAdminTeachers.reduce(
      (sum, teacher) => sum + teacher.totalStudents,
      0,
    );
    return {
      total: mockAdminTeachers.length,
      active,
      inactive,
      classesTaught,
      studentsTaught,
    };
  }, []);

  const overviewStudentCount = useMemo(() => {
    const studentsStat = overview?.stats?.find((s) =>
      s.label.toLowerCase().includes("student"),
    );
    if (!studentsStat) return null;
    const parsed = Number.parseInt(studentsStat.value.replace(/[^\d]/g, ""), 10);
    return Number.isFinite(parsed) ? parsed : null;
  }, [overview?.stats]);

  const activeEnrollments = useMemo(
    () => mockAdminEnrollments.filter((e) => e.enrollmentStatus === "enrolled").length,
    [],
  );

  const overduePayments = useMemo(
    () => mockAdminEnrollments.filter((e) => e.paymentStatus === "overdue").length,
    [],
  );

  const moneyFlow = useMemo(() => {
    const currency = mockAdminTransactions[0]?.currency ?? "UZS";
    let inflow = 0;
    let outflow = 0;
    const byType = new Map<string, number>();

    for (const txn of mockAdminTransactions) {
      if (isInflowType(txn.type)) {
        inflow += txn.amount;
        byType.set(txn.type, (byType.get(txn.type) ?? 0) + txn.amount);
      } else {
        outflow += txn.amount;
        byType.set(txn.type, (byType.get(txn.type) ?? 0) - txn.amount);
      }
    }

    return {
      currency,
      inflow,
      outflow,
      net: inflow - outflow,
      byType: Array.from(byType.entries()).sort((a, b) => a[0].localeCompare(b[0])),
    };
  }, []);

  const tuitionCollectedLines = useMemo(
    () => sumAmountsForStatuses(payments, ["paid"]),
    [payments],
  );
  const tuitionOutstandingLines = useMemo(
    () => sumAmountsForStatuses(payments, ["pending", "overdue"]),
    [payments],
  );

  const estInstructorPayrollTotal = useMemo(() => {
    const currency = tuitionCollectedLines[0]?.currency ?? "UZS";
    const amount = tuitionCollectedLines.reduce((sum, line) => sum + line.amount, 0);
    return {
      currency,
      amount: Math.round(amount * INSTRUCTOR_REVENUE_SHARE),
    };
  }, [tuitionCollectedLines]);

  const pendingPayrollCount = useMemo(
    () => payrollRequests.filter((request) => request.status === "pending").length,
    [payrollRequests],
  );

  const teacherMoneyRows = useMemo((): TeacherMoneyRow[] => {
    const payrollCounts = new Map<string, { pending: number; approved: number }>();

    for (const request of payrollRequests) {
      const key = instructorKey(request.instructorEmailNorm, request.instructorName);
      const current = payrollCounts.get(key) ?? { pending: 0, approved: 0 };
      if (request.status === "pending") current.pending += 1;
      if (request.status === "approved") current.approved += 1;
      payrollCounts.set(key, current);
    }

    return mockAdminTeachers.map((teacher) => {
      const currency = payments[0]?.currency ?? "UZS";
      let tuitionCollected = 0;
      let tuitionOutstanding = 0;

      for (const payment of payments) {
        if (!paymentMatchesInstructor(payment, teacher.email, teacher.name)) continue;
        if (payment.status === "paid") tuitionCollected += payment.amount;
        else tuitionOutstanding += payment.amount;
      }

      const payroll = payrollCounts.get(instructorKey(teacher.email, teacher.name)) ?? {
        pending: 0,
        approved: 0,
      };

      return {
        id: teacher.id,
        name: teacher.name,
        email: teacher.email,
        status: teacher.status,
        classCount: teacher.coursesTaught.length,
        totalStudents: teacher.totalStudents,
        currency,
        tuitionCollected,
        tuitionOutstanding,
        estInstructorPayout: Math.round(tuitionCollected * INSTRUCTOR_REVENUE_SHARE),
        payrollPending: payroll.pending,
        payrollApproved: payroll.approved,
      };
    });
  }, [payments, payrollRequests]);

  const payrollRequestsSorted = useMemo(
    () => [...payrollRequests].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)),
    [payrollRequests],
  );

  const atRiskCount = useMemo(
    () => mockAdminAttendance.filter((row) => row.atRisk).length,
    [],
  );

  const atRiskRows = useMemo(
    () => mockAdminAttendance.filter((row) => row.atRisk).slice(0, 5),
    [],
  );

  const recentTransactions = useMemo(
    () =>
      [...mockAdminTransactions].sort((a, b) =>
        b.recordedAt.localeCompare(a.recordedAt),
      ),
    [],
  );

  const displayStudentTotal = overviewStudentCount ?? studentTotals.total;
  const tuitionCollectedFormatted = formatMoneyLines(tuitionCollectedLines);
  const tuitionOutstandingFormatted = formatMoneyLines(tuitionOutstandingLines);

  const studentStatCards = useMemo(
    () => [
      {
        label: t("admin.analyticDashboard.stats.totalStudents"),
        value: String(displayStudentTotal),
        icon: Users,
        color: "text-slate-600",
        bgColor: "bg-slate-50",
        borderColor: "border-slate-200",
      },
      {
        label: t("admin.analyticDashboard.students.active"),
        value: String(studentTotals.active),
        icon: UserCheck,
        color: "text-emerald-700",
        bgColor: "bg-emerald-50",
        borderColor: "border-emerald-200",
      },
      {
        label: t("admin.analyticDashboard.students.trial"),
        value: String(studentTotals.trial),
        icon: UserPlus,
        color: "text-sky-700",
        bgColor: "bg-sky-50",
        borderColor: "border-sky-200",
      },
      {
        label: t("admin.analyticDashboard.students.inactive"),
        value: String(studentTotals.inactive),
        icon: UserX,
        color: "text-slate-500",
        bgColor: "bg-slate-50",
        borderColor: "border-slate-200",
      },
    ],
    [t, displayStudentTotal, studentTotals.active, studentTotals.trial, studentTotals.inactive],
  );

  const teacherStatCards = useMemo(
    () => [
      {
        label: t("admin.analyticDashboard.stats.totalTeachers"),
        value: String(teacherTotals.total),
        icon: GraduationCap,
        color: "text-violet-700",
        bgColor: "bg-violet-50",
        borderColor: "border-violet-200",
      },
      {
        label: t("admin.analyticDashboard.teachers.active"),
        value: String(teacherTotals.active),
        icon: UserCheck,
        color: "text-emerald-700",
        bgColor: "bg-emerald-50",
        borderColor: "border-emerald-200",
      },
      {
        label: t("admin.analyticDashboard.teachers.classesTaught"),
        value: String(teacherTotals.classesTaught),
        icon: BookOpen,
        color: "text-sky-700",
        bgColor: "bg-sky-50",
        borderColor: "border-sky-200",
      },
      {
        label: t("admin.analyticDashboard.teachers.studentsTaught"),
        value: String(teacherTotals.studentsTaught),
        icon: Users,
        color: "text-indigo-700",
        bgColor: "bg-indigo-50",
        borderColor: "border-indigo-200",
      },
    ],
    [
      t,
      teacherTotals.total,
      teacherTotals.active,
      teacherTotals.classesTaught,
      teacherTotals.studentsTaught,
    ],
  );

  const setActiveTab = (tab: AnalyticTab) => {
    setSearchParams(tab === "overview" ? {} : { tab }, { replace: true });
  };

  const exportToExcel = useCallback(() => {
    const summaryRows = [
      [t("adminNav.analytics"), format(new Date(), "yyyy-MM-dd HH:mm")],
      [],
      [t("admin.analyticDashboard.stats.totalStudents"), displayStudentTotal],
      [t("admin.analyticDashboard.stats.totalTeachers"), teacherTotals.total],
      [t("admin.analyticDashboard.stats.totalClassesTaught"), teacherTotals.classesTaught],
      [t("admin.analyticDashboard.stats.activeEnrollments"), activeEnrollments],
      [t("admin.analyticDashboard.stats.tuitionCollected"), tuitionCollectedLines[0]?.amount ?? 0],
      [t("admin.analyticDashboard.stats.tuitionOutstanding"), tuitionOutstandingLines[0]?.amount ?? 0],
      [t("admin.analyticDashboard.stats.estInstructorPayroll"), estInstructorPayrollTotal.amount],
      [t("admin.analyticDashboard.stats.payrollPending"), pendingPayrollCount],
      [t("admin.analyticDashboard.stats.moneyIn"), moneyFlow.inflow],
      [t("admin.analyticDashboard.stats.moneyOut"), moneyFlow.outflow],
      [t("admin.analyticDashboard.stats.netFlow"), moneyFlow.net],
      [t("admin.analyticDashboard.stats.overduePayments"), overduePayments],
      [t("admin.analyticDashboard.stats.atRiskAttendance"), atRiskCount],
      [],
      [t("admin.analyticDashboard.students.title")],
      [t("admin.analyticDashboard.students.active"), studentTotals.active],
      [t("admin.analyticDashboard.students.trial"), studentTotals.trial],
      [t("admin.analyticDashboard.students.inactive"), studentTotals.inactive],
      [],
      [t("admin.analyticDashboard.teachers.title")],
      [t("admin.analyticDashboard.teachers.active"), teacherTotals.active],
      [t("admin.analyticDashboard.teachers.inactive"), teacherTotals.inactive],
      [t("admin.analyticDashboard.teachers.classesTaught"), teacherTotals.classesTaught],
      [t("admin.analyticDashboard.teachers.studentsTaught"), teacherTotals.studentsTaught],
      [],
      [t("admin.analyticDashboard.moneyFlow.byType")],
      ...moneyFlow.byType.map(([type, amount]) => [type, amount]),
    ];

    const transactionHeaders = [
      t("admin.transactions.table.reference"),
      t("admin.shared.student"),
      t("admin.transactions.table.type"),
      t("admin.shared.amount"),
      t("admin.transactions.table.method"),
      t("admin.transactions.table.recorded"),
    ];
    const transactionRows = mockAdminTransactions.map((txn) => [
      txn.ref,
      txn.studentName,
      txn.type,
      txn.amount,
      txn.method,
      txn.recordedAt,
    ]);

    const studentHeaders = [
      t("admin.shared.student"),
      t("admin.shared.email"),
      t("admin.students.table.status"),
      t("admin.students.table.classes"),
      t("admin.students.table.registered"),
    ];
    const studentRows = mockAdminStudents.map((s) => [
      s.name,
      s.email,
      s.studentStatus,
      s.coursesCount,
      s.registeredAt,
    ]);

    const enrollmentHeaders = [
      t("admin.shared.student"),
      t("admin.shared.course"),
      t("admin.enrollments.table.enrollment"),
      t("admin.enrollments.table.payment"),
    ];
    const enrollmentRows = mockAdminEnrollments.map((e) => [
      e.studentName,
      e.course,
      e.enrollmentStatus,
      e.paymentStatus,
    ]);

    const teacherHeaders = [
      t("admin.teachers.table.name"),
      t("admin.teachers.table.email"),
      t("admin.teachers.table.classes"),
      t("admin.teachers.table.totalStudents"),
      t("admin.teachers.table.status"),
      t("admin.analyticDashboard.teachers.moneyTable.tuitionCollected"),
      t("admin.analyticDashboard.teachers.moneyTable.tuitionOutstanding"),
      t("admin.analyticDashboard.teachers.moneyTable.estPayout"),
      t("admin.analyticDashboard.teachers.moneyTable.payrollPending"),
      t("admin.analyticDashboard.teachers.moneyTable.payrollApproved"),
    ];
    const teacherRows = teacherMoneyRows.map((row) => [
      row.name,
      row.email,
      row.classCount,
      row.totalStudents,
      row.status,
      row.tuitionCollected,
      row.tuitionOutstanding,
      row.estInstructorPayout,
      row.payrollPending,
      row.payrollApproved,
    ]);

    const payrollHeaders = [
      t("admin.analyticDashboard.payroll.fields.instructor"),
      t("admin.analyticDashboard.payroll.fields.class"),
      t("admin.analyticDashboard.payroll.fields.course"),
      t("admin.analyticDashboard.payroll.fields.requested"),
      t("admin.analyticDashboard.payroll.fields.status"),
      t("admin.analyticDashboard.payroll.fields.submitted"),
    ];
    const payrollRows = payrollRequestsSorted.map((request) => [
      request.instructorName,
      request.classSection,
      request.course,
      request.requestedPayout,
      request.status,
      request.submittedAt,
    ]);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryRows), "Summary");
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([teacherHeaders, ...teacherRows]),
      "Teachers",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([payrollHeaders, ...payrollRows]),
      "Payroll",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([transactionHeaders, ...transactionRows]),
      "Transactions",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([studentHeaders, ...studentRows]),
      "Students",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([enrollmentHeaders, ...enrollmentRows]),
      "Enrollments",
    );

    const fileName = `eduhub-analytics-${format(new Date(), "yyyy-MM-dd")}.xlsx`;
    XLSX.writeFile(wb, fileName);
  }, [
    t,
    moneyFlow,
    displayStudentTotal,
    teacherTotals,
    activeEnrollments,
    tuitionCollectedLines,
    tuitionOutstandingLines,
    estInstructorPayrollTotal.amount,
    pendingPayrollCount,
    overduePayments,
    atRiskCount,
    studentTotals,
    teacherMoneyRows,
    payrollRequestsSorted,
  ]);

  return (
    <AdminLayout>
      <div className="container mx-auto px-6 max-w-6xl">
        {isStaffAnalytic ? (
          <div className="mb-8 pb-6 border-b border-slate-200">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-semibold text-slate-900 mb-1.5 tracking-tight">
                  {formatDisplayPersonName(user.name)}
                </h1>
                <p className="text-slate-600 text-sm font-medium">
                  {t("admin.analyticDashboard.subtitle")}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-800 text-xs font-semibold rounded-md uppercase tracking-wide border border-indigo-200">
                  <BarChart3 className="h-3.5 w-3.5" aria-hidden />
                  {t("admin.addUserRole.roles.adminAnalytic")}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-lg bg-white"
                  onClick={exportToExcel}
                  title={t("admin.analyticDashboard.exportTitle")}
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" aria-hidden />
                  {t("admin.analyticDashboard.exportButton")}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <AdminPageHeader
            title={t("adminNav.analytics")}
            description={t("admin.analyticDashboard.subtitle")}
            actions={
              <Button
                type="button"
                variant="outline"
                className="rounded-lg bg-white"
                onClick={exportToExcel}
                title={t("admin.analyticDashboard.exportTitle")}
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" aria-hidden />
                {t("admin.analyticDashboard.exportButton")}
              </Button>
            }
          />
        )}

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(parseAnalyticTab(value))} className="w-full">
          <TabsList className="mb-6 h-11 w-full justify-start overflow-x-auto bg-slate-100/90 p-1 rounded-xl border border-slate-200/80">
            <TabsTrigger value="overview" className="rounded-lg px-4 data-[state=active]:shadow-sm shrink-0">
              {t("admin.analyticDashboard.tabs.overview")}
            </TabsTrigger>
            <TabsTrigger value="students" className="rounded-lg px-4 data-[state=active]:shadow-sm shrink-0">
              {t("admin.analyticDashboard.tabs.students")}
            </TabsTrigger>
            <TabsTrigger value="teachers" className="rounded-lg px-4 data-[state=active]:shadow-sm shrink-0">
              {t("admin.analyticDashboard.tabs.teachers")}
            </TabsTrigger>
            <TabsTrigger value="finance" className="rounded-lg px-4 data-[state=active]:shadow-sm shrink-0">
              {t("admin.analyticDashboard.tabs.finance")}
            </TabsTrigger>
            <TabsTrigger value="payroll" className="rounded-lg px-4 gap-2 data-[state=active]:shadow-sm shrink-0">
              {t("admin.analyticDashboard.tabs.payroll")}
              {pendingPayrollCount > 0 ? (
                <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-amber-200 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-amber-950">
                  {pendingPayrollCount}
                </span>
              ) : null}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-0 focus-visible:outline-none focus-visible:ring-0 space-y-8">
            <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 bg-slate-50/80">
                <p className="text-sm font-semibold text-slate-900">
                  {t("admin.analyticDashboard.overview.title")}
                </p>
                <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                  {t("admin.shared.demo")}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                <OverviewPanel
                  title={t("admin.analyticDashboard.overview.people")}
                  icon={Users}
                  iconClassName="bg-indigo-50 text-indigo-700"
                >
                  <OverviewMetric
                    label={t("admin.analyticDashboard.stats.totalStudents")}
                    value={String(displayStudentTotal)}
                    hint={`${studentTotals.active} ${t("admin.shared.active").toLowerCase()}`}
                  />
                  <OverviewMetric
                    label={t("admin.analyticDashboard.stats.totalTeachers")}
                    value={String(teacherTotals.total)}
                    hint={`${teacherTotals.classesTaught} ${t("admin.teachers.table.classes").toLowerCase()}`}
                  />
                  <OverviewMetric
                    label={t("admin.analyticDashboard.stats.activeEnrollments")}
                    value={String(activeEnrollments)}
                  />
                </OverviewPanel>

                <OverviewPanel
                  title={t("admin.analyticDashboard.overview.finance")}
                  icon={CircleDollarSign}
                  iconClassName="bg-emerald-50 text-emerald-700"
                >
                  <OverviewMetric
                    label={t("admin.analyticDashboard.stats.tuitionCollected")}
                    value={tuitionCollectedFormatted}
                  />
                  <OverviewMetric
                    label={t("admin.analyticDashboard.stats.tuitionOutstanding")}
                    value={tuitionOutstandingFormatted}
                  />
                  <OverviewMetric
                    label={t("admin.analyticDashboard.stats.estInstructorPayroll")}
                    value={formatMoney(estInstructorPayrollTotal.amount, estInstructorPayrollTotal.currency)}
                  />
                </OverviewPanel>

                <OverviewPanel
                  title={t("admin.analyticDashboard.overview.attention")}
                  icon={UserCheck}
                  iconClassName="bg-amber-50 text-amber-700"
                >
                  <OverviewMetric
                    label={t("admin.analyticDashboard.stats.payrollPending")}
                    value={String(pendingPayrollCount)}
                  />
                  <OverviewMetric
                    label={t("admin.analyticDashboard.stats.overduePayments")}
                    value={String(overduePayments)}
                  />
                  <OverviewMetric
                    label={t("admin.analyticDashboard.stats.atRiskAttendance")}
                    value={String(atRiskCount)}
                  />
                </OverviewPanel>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">
                {t("admin.analyticDashboard.quickActions")}
              </h2>
              <div className="flex flex-wrap gap-2">
                {QUICK_ACTIONS.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Button key={action.path} variant="outline" className="rounded-lg bg-white" asChild>
                      <Link to={action.path}>
                        <Icon className="h-4 w-4 mr-2" aria-hidden />
                        {t(action.labelKey)}
                      </Link>
                    </Button>
                  );
                })}
              </div>
            </section>
          </TabsContent>

          <TabsContent value="students" className="mt-0 focus-visible:outline-none focus-visible:ring-0 space-y-8">
            <AnalyticStatCardGrid cards={studentStatCards} />

            <section className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <h2 className="text-base font-semibold text-slate-900">
                  {t("adminNav.enrollmentsWaitlist")}
                </h2>
                <Button variant="ghost" size="sm" className="h-8 text-slate-600" asChild>
                  <Link to="/dashboard/admin/enrollments">
                    {t("common.viewAll")}
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>{t("admin.shared.student")}</TableHead>
                    <TableHead>{t("admin.shared.course")}</TableHead>
                    <TableHead>{t("admin.enrollments.table.enrollment")}</TableHead>
                    <TableHead>{t("admin.enrollments.table.payment")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockAdminEnrollments.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium text-slate-900">{row.studentName}</TableCell>
                      <TableCell>{row.course}</TableCell>
                      <TableCell className="capitalize">{row.enrollmentStatus}</TableCell>
                      <TableCell className="capitalize">{row.paymentStatus}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <h2 className="text-base font-semibold text-slate-900">
                  {t("admin.analyticDashboard.workQueue.atRiskAttendance")}
                </h2>
                <Button variant="ghost" size="sm" className="h-8 text-slate-600" asChild>
                  <Link to="/dashboard/admin/attendance">
                    {t("common.viewAll")}
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
              {atRiskRows.length === 0 ? (
                <p className="px-5 py-8 text-sm text-slate-500">
                  {t("admin.analyticDashboard.workQueue.emptyAtRisk")}
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {mockAdminAttendance
                    .filter((row) => row.atRisk)
                    .map((row) => (
                      <li key={row.id} className="px-5 py-3.5">
                        <p className="text-sm font-medium text-slate-900">{row.studentName}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {row.course} · {row.attendancePct}% attendance
                        </p>
                      </li>
                    ))}
                </ul>
              )}
            </section>
          </TabsContent>

          <TabsContent value="teachers" className="mt-0 focus-visible:outline-none focus-visible:ring-0 space-y-8">
            <AnalyticStatCardGrid cards={teacherStatCards} />

            <section className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <h2 className="text-base font-semibold text-slate-900">
                  {t("admin.analyticDashboard.teachers.overviewTable.title")}
                </h2>
                <Button variant="ghost" size="sm" className="h-8 text-slate-600" asChild>
                  <Link to="/dashboard/admin/teachers">
                    {t("common.viewAll")}
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>{t("admin.teachers.table.name")}</TableHead>
                    <TableHead>{t("admin.teachers.table.email")}</TableHead>
                    <TableHead>{t("admin.teachers.table.classes")}</TableHead>
                    <TableHead>{t("admin.teachers.table.totalStudents")}</TableHead>
                    <TableHead>{t("admin.teachers.table.status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teacherMoneyRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-slate-500">
                        {t("admin.analyticDashboard.teachers.overviewTable.empty")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    teacherMoneyRows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium text-slate-900">{row.name}</TableCell>
                        <TableCell className="text-slate-600">{row.email}</TableCell>
                        <TableCell className="tabular-nums">{row.classCount}</TableCell>
                        <TableCell className="tabular-nums">{row.totalStudents}</TableCell>
                        <TableCell>{row.status}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <h2 className="text-base font-semibold text-slate-900">
                  {t("admin.analyticDashboard.teachers.moneyTable.title")}
                </h2>
                <Button variant="ghost" size="sm" className="h-8 text-slate-600" asChild>
                  <Link to="/dashboard/admin/payroll">
                    {t("common.viewAll")}
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>{t("admin.teachers.table.name")}</TableHead>
                      <TableHead>{t("admin.analyticDashboard.teachers.moneyTable.classes")}</TableHead>
                      <TableHead>{t("admin.analyticDashboard.teachers.moneyTable.tuitionCollected")}</TableHead>
                      <TableHead>{t("admin.analyticDashboard.teachers.moneyTable.tuitionOutstanding")}</TableHead>
                      <TableHead>{t("admin.analyticDashboard.teachers.moneyTable.estPayout")}</TableHead>
                      <TableHead>{t("admin.analyticDashboard.teachers.moneyTable.payrollPending")}</TableHead>
                      <TableHead>{t("admin.analyticDashboard.teachers.moneyTable.payrollApproved")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teacherMoneyRows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium text-slate-900">{row.name}</TableCell>
                        <TableCell className="tabular-nums">{row.classCount}</TableCell>
                        <TableCell className="tabular-nums">
                          {formatMoney(row.tuitionCollected, row.currency)}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {formatMoney(row.tuitionOutstanding, row.currency)}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {formatMoney(row.estInstructorPayout, row.currency)}
                        </TableCell>
                        <TableCell className="tabular-nums">{row.payrollPending}</TableCell>
                        <TableCell className="tabular-nums">{row.payrollApproved}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>
          </TabsContent>

          <TabsContent value="finance" className="mt-0 focus-visible:outline-none focus-visible:ring-0 space-y-8">
            <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4">
                <h2 className="text-base font-semibold text-slate-900">
                  {t("admin.analyticDashboard.moneyFlow.title")}
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 border-b border-slate-100">
                {[
                  {
                    label: t("admin.analyticDashboard.moneyFlow.inflow"),
                    value: formatMoney(moneyFlow.inflow, moneyFlow.currency),
                    tone: "text-emerald-700",
                  },
                  {
                    label: t("admin.analyticDashboard.moneyFlow.outflow"),
                    value: formatMoney(moneyFlow.outflow, moneyFlow.currency),
                    tone: "text-rose-700",
                  },
                  {
                    label: t("admin.analyticDashboard.moneyFlow.net"),
                    value: formatMoney(moneyFlow.net, moneyFlow.currency),
                    tone: moneyFlow.net >= 0 ? "text-emerald-700" : "text-rose-700",
                  },
                ].map((item) => (
                  <div key={item.label} className="px-5 py-4 text-center">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-1">
                      {item.label}
                    </p>
                    <p className={`text-lg font-bold tabular-nums ${item.tone}`}>{item.value}</p>
                  </div>
                ))}
              </div>
              <ul className="divide-y divide-slate-100">
                {moneyFlow.byType.map(([type, amount]) => (
                  <li key={type} className="flex items-center justify-between gap-3 px-5 py-3.5">
                    <p className="text-sm text-slate-700">{type}</p>
                    <p className="text-sm font-semibold text-slate-900 tabular-nums">
                      {formatMoney(Math.abs(amount), moneyFlow.currency)}
                    </p>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <h2 className="text-base font-semibold text-slate-900">
                  {t("admin.analyticDashboard.recentTransactions.title")}
                </h2>
                <Button variant="ghost" size="sm" className="h-8 text-slate-600" asChild>
                  <Link to="/dashboard/admin/transactions">
                    {t("common.viewAll")}
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>{t("admin.transactions.table.reference")}</TableHead>
                    <TableHead>{t("admin.shared.student")}</TableHead>
                    <TableHead>{t("admin.transactions.table.type")}</TableHead>
                    <TableHead>{t("admin.shared.amount")}</TableHead>
                    <TableHead>{t("admin.transactions.table.method")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-slate-500">
                        {t("admin.analyticDashboard.recentTransactions.empty")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentTransactions.map((txn) => (
                      <TableRow key={txn.id}>
                        <TableCell className="font-mono text-xs text-slate-700">{txn.ref}</TableCell>
                        <TableCell className="font-medium text-slate-900">{txn.studentName}</TableCell>
                        <TableCell>{txn.type}</TableCell>
                        <TableCell className="tabular-nums">
                          {formatMoney(txn.amount, txn.currency)}
                        </TableCell>
                        <TableCell>{txn.method}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </section>
          </TabsContent>

          <TabsContent value="payroll" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
            <section className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <h2 className="text-base font-semibold text-slate-900">
                  {t("admin.analyticDashboard.payroll.title")}
                </h2>
                <Button variant="ghost" size="sm" className="h-8 text-slate-600" asChild>
                  <Link to="/dashboard/admin/payroll">
                    {t("common.viewAll")}
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>{t("admin.analyticDashboard.payroll.fields.instructor")}</TableHead>
                      <TableHead>{t("admin.analyticDashboard.payroll.fields.class")}</TableHead>
                      <TableHead>{t("admin.analyticDashboard.payroll.fields.course")}</TableHead>
                      <TableHead>{t("admin.analyticDashboard.payroll.fields.requested")}</TableHead>
                      <TableHead>{t("admin.analyticDashboard.payroll.fields.status")}</TableHead>
                      <TableHead>{t("admin.analyticDashboard.payroll.fields.submitted")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payrollRequestsSorted.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                          {t("admin.analyticDashboard.payroll.empty")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      payrollRequestsSorted.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell className="font-medium text-slate-900">{request.instructorName}</TableCell>
                          <TableCell>{request.classSection}</TableCell>
                          <TableCell>{request.course}</TableCell>
                          <TableCell>{request.requestedPayout || "—"}</TableCell>
                          <TableCell className="capitalize">{request.status}</TableCell>
                          <TableCell className="text-slate-600">
                            {format(new Date(request.submittedAt), "MMM d, yyyy")}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </section>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
