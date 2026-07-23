import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AdminDashboardPage from "./AdminDashboardPage";
import { AppProviders } from "@/app/providers";

describe("AdminDashboardPage", () => {
  it("renders key admin dashboard sections", () => {
    render(
      <MemoryRouter>
        <AppProviders>
          <AdminDashboardPage />
        </AppProviders>
      </MemoryRouter>
    );

    expect(screen.getByText(/dashboard.subtitle|admin dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/recentUsers.title|recent users/i)).toBeInTheDocument();
    expect(screen.getByText(/quickActions.title|quick actions/i)).toBeInTheDocument();


  });
});
