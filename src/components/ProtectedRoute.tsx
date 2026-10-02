import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import MfaGate from "@/components/MfaGate";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: ("admin" | "venue" | "influencer" | "sales_manager" | "sales_rep" | "venue_staff")[];
}

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, role, loading } = useAuth();
  const location = useLocation();
  // Keeps deep links alive through sign-in — a door staffer who scans a
  // creator's QR while logged out lands back on that exact check-in.
  const loginUrl = `/login?next=${encodeURIComponent(location.pathname + location.search)}`;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-gold animate-pulse font-display text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) return <Navigate to={loginUrl} replace />;

  if (allowedRoles) {
    if (role === null) return <Navigate to={loginUrl} replace />;
    if (!allowedRoles.includes(role)) return <Navigate to="/" replace />;
  }

  // Adnan, "Signing In": 2FA required for admins and sales reps at minimum.
  const MFA_REQUIRED_ROLES = ["admin", "sales_manager", "sales_rep"];
  if (MFA_REQUIRED_ROLES.includes(role ?? "")) return <MfaGate required>{children}</MfaGate>;
  return <>{children}</>;
};

export default ProtectedRoute;
