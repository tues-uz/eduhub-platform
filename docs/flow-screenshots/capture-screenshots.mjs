/**
 * Capture real EduHub page screenshots for docs/flow-map.html hover previews.
 *
 * Usage (dev server must be running on port 8081):
 *   node docs/flow-screenshots/capture-screenshots.mjs
 *
 * Optional:
 *   BASE_URL=http://localhost:8081 node docs/flow-screenshots/capture-screenshots.mjs
 */
import { mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";

const dir = dirname(fileURLToPath(import.meta.url));
const BASE_URL = process.env.BASE_URL || "http://localhost:8081";

/** @type {{ file: string; path: string; role: "student" | "teacher" | "admin"; staffRole?: string }[]} */
const pages = [
  { file: "register", path: "/register", role: "student" },
  { file: "signin", path: "/signin", role: "student" },
  { file: "student-dashboard", path: "/dashboard", role: "student" },
  { file: "available-classes", path: "/dashboard/available-courses", role: "student" },
  { file: "enrollment-form", path: "/dashboard/available-courses/enroll/preview", role: "student" },
  { file: "student-payment", path: "/dashboard/payment", role: "student" },
  { file: "student-course", path: "/dashboard/courses", role: "student" },
  { file: "student-certificates", path: "/dashboard/certificates", role: "student" },
  { file: "teacher-dashboard", path: "/dashboard/teacher", role: "teacher" },
  { file: "teacher-course-new", path: "/dashboard/teacher/courses/new", role: "teacher" },
  { file: "teacher-attendance", path: "/dashboard/teacher/attendance", role: "teacher" },
  { file: "teacher-schedule-approvals", path: "/dashboard/teacher/schedule", role: "teacher" },
  { file: "teacher-payroll", path: "/dashboard/teacher/payroll", role: "teacher" },
  { file: "admin-dashboard", path: "/dashboard/admin", role: "admin", staffRole: "ADMIN" },
  { file: "admin-add-user", path: "/dashboard/admin/add-user", role: "admin", staffRole: "ADMIN" },
  { file: "admin-course-schedule", path: "/dashboard/admin/courses", role: "admin", staffRole: "ADMIN" },
  { file: "admin-enrollment", path: "/dashboard/admin/enrollment-applications", role: "admin", staffRole: "ADMIN" },
  { file: "admin-payments", path: "/dashboard/admin/payments", role: "admin", staffRole: "ADMIN_FINANCE" },
  { file: "admin-payroll", path: "/dashboard/admin/payroll", role: "admin", staffRole: "ADMIN_FINANCE" },
  { file: "teacher-my-class", path: "/dashboard/teacher/courses", role: "teacher" },
  { file: "admin-substitute", path: "/dashboard/admin/substitute-requests", role: "admin", staffRole: "ADMIN" },
];

function mockAuthScript({ role, staffRole }) {
  sessionStorage.setItem("eduhub_at", "flow-map-screenshot-token");
  sessionStorage.removeItem("eduhub_rt");
  sessionStorage.setItem("eduhub_exp", String(Date.now() + 86_400_000));
  localStorage.setItem("userRole", role);
  localStorage.setItem("userName", "Flow Map Preview");
  localStorage.setItem("userEmail", "preview@eduhub.local");
  localStorage.setItem("userId", "flow-map-preview-user");
  if (role === "teacher") {
    localStorage.setItem("userCategory", "General English");
  } else {
    localStorage.removeItem("userCategory");
  }
  if (role === "admin" && staffRole) {
    localStorage.setItem("userStaffRole", staffRole);
  } else {
    localStorage.removeItem("userStaffRole");
  }
}

async function main() {
  mkdirSync(dir, { recursive: true });

  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
  });

  const page = await context.newPage();

  /** @type {string | null} */
  let activeRole = null;
  /** @type {string | null} */
  let activeStaffRole = null;

  for (const entry of pages) {
    const url = `${BASE_URL}${entry.path}`;
    console.log(`Capturing ${entry.file}.png ← ${url}`);

    if (entry.role !== activeRole || (entry.staffRole ?? null) !== activeStaffRole) {
      await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded", timeout: 20_000 });
      await page.evaluate(mockAuthScript, {
        role: entry.role,
        staffRole: entry.staffRole ?? null,
      });
      activeRole = entry.role;
      activeStaffRole = entry.staffRole ?? null;
    }

    try {
      await page.goto(url, { waitUntil: "networkidle", timeout: 45_000 });
      await page.waitForTimeout(1200);
      await page.screenshot({
        path: join(dir, `${entry.file}.png`),
        fullPage: false,
      });
    } catch (err) {
      console.warn(`  ⚠ Failed ${entry.file}: ${err instanceof Error ? err.message : err}`);
    }
  }

  await browser.close();
  console.log(`\nDone. PNGs saved to ${dir}`);
  console.log("Refresh docs/flow-map.html in the browser to see real page previews.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
