import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import StudentDashboardPage from "./StudentDashboardPage";
import { AppProviders } from "@/app/providers";

describe("StudentDashboardPage", () => {
  it("renders key student dashboard sections", () => {
    render(
      <MemoryRouter>
        <AppProviders>
          <StudentDashboardPage />
        </AppProviders>
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: /my courses/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /upcoming assignments/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /quick actions/i })).toBeInTheDocument();
  });
});
