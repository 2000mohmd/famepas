import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute";

const authState = {
  user: null as unknown,
  role: null as string | null,
  loading: false,
};

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authState,
}));

const renderAt = (path: string, allowedRoles?: ("admin" | "venue" | "influencer")[]) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<div>login page</div>} />
        <Route path="/" element={<div>home page</div>} />
        <Route path="/venue" element={<div>venue home</div>} />
        <Route path="/influencer/home" element={<div>creator home</div>} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={allowedRoles}>
              <div>admin page</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  );

describe("ProtectedRoute", () => {
  beforeEach(() => {
    authState.user = null;
    authState.role = null;
    authState.loading = false;
  });

  it("shows a loading state while auth is resolving", () => {
    authState.loading = true;
    renderAt("/admin", ["admin"]);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("redirects signed-out visitors to /login", () => {
    renderAt("/admin", ["admin"]);
    expect(screen.getByText("login page")).toBeInTheDocument();
  });

  it("redirects a signed-in user whose role has not resolved to /login", () => {
    authState.user = { id: "u1" };
    authState.role = null;
    renderAt("/admin", ["admin"]);
    expect(screen.getByText("login page")).toBeInTheDocument();
  });

  it("sends a signed-in user with the wrong role to their own home, not the landing page", () => {
    authState.user = { id: "u1" };
    authState.role = "influencer";
    renderAt("/admin", ["admin"]);
    expect(screen.getByText("creator home")).toBeInTheDocument();
  });

  it("sends a venue that lands on a stale /admin ?next= to the venue home", () => {
    authState.user = { id: "u1" };
    authState.role = "venue";
    renderAt("/admin", ["admin"]);
    expect(screen.getByText("venue home")).toBeInTheDocument();
  });

  it("renders the protected page for an allowed role", () => {
    authState.user = { id: "u1" };
    authState.role = "admin";
    renderAt("/admin", ["admin"]);
    expect(screen.getByText("admin page")).toBeInTheDocument();
  });

  it("renders for any signed-in user when no roles are required", () => {
    authState.user = { id: "u1" };
    authState.role = "venue";
    renderAt("/admin");
    expect(screen.getByText("admin page")).toBeInTheDocument();
  });
});
