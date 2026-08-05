import { describe, expect, it } from "vitest";
import { dashboardApi, coursesApi } from "@/api/client";

describe("api client", () => {
  it("returns student and admin dashboard payloads", async () => {
    const student = await dashboardApi.getStudentOverview();
    const admin = await dashboardApi.getAdminOverview();

    expect(student.stats.length).toBeGreaterThan(0);
    expect(admin.stats.length).toBeGreaterThan(0);
  });

  it("returns enrolled student courses array", async () => {
    const courses = await coursesApi.getStudentCourses();
    expect(Array.isArray(courses)).toBe(true);
  });
});
