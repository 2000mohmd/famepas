import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

const NotFound = () => {
  const location = useLocation();
  const { user, role } = useAuth();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  // Signed-in users go back to their own dashboard, not out of the app.
  const home =
    user && role === "admin"
      ? "/admin"
      : user && role === "venue"
        ? "/venue/campaigns"
        : user && role === "influencer"
          ? "/influencer"
          : "/welcome";
  const label = user ? "Back to my dashboard" : "Return to Home";

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Oops! Page not found</p>
        <Link to={home} className="text-primary underline hover:text-primary/90">
          {label}
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
