import { describe, expect, it } from "vitest";
import { appRoutes, dashboardHomeByRole } from "@/app/routes";
import { adminMenuItems, studentMenuItems, teacherMenuItems } from "./navigation";

describe("navigation config", () => {
  it("maps dashboard home by role", () => {
    expect(dashboardHomeByRole("student")).toBe(appRoutes.dashboard);
    expect(dashboardHomeByRole("admin")).toBe(appRoutes.dashboardAdmin);
    expect(dashboardHomeByRole("teacher")).toBe(appRoutes.dashboardTeacher);
  });

  it("includes core dashboard entries for each role", () => {
    expect(studentMenuItems.some((item) => item.path === appRoutes.dashboard)).toBe(true);
    expect(adminMenuItems.some((item) => item.path === appRoutes.dashboardAdmin)).toBe(true);
    expect(teacherMenuItems.some((item) => "path" in item && item.path === appRoutes.dashboardTeacher)).toBe(true);
  });
});
