import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AppRoutes } from "./AppRoutes";
import { AppProviders } from "./providers";

function renderRoutes(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppProviders>
        <AppRoutes />
      </AppProviders>
    </MemoryRouter>
  );
}

describe("AppRoutes", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("renders sign in page route", () => {
    renderRoutes("/signin");

    expect(screen.getByRole("heading", { name: /welcome back|welcomeBack/i })).toBeInTheDocument();
  });

  it("renders not found for unknown route", () => {
    renderRoutes("/does-not-exist");

    expect(screen.getByText("404")).toBeInTheDocument();
  });

  it("redirects /dashboard to admin dashboard for admin role", async () => {
    localStorage.setItem("userRole", "admin");

    renderRoutes("/dashboard");

    expect(await screen.findByText(/admin dashboard|adminDashboard/i)).toBeInTheDocument();
  });

});
