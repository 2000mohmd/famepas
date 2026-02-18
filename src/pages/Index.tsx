import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";

const Index = () => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-gold animate-pulse font-display text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (role === "admin") return <Navigate to="/admin" replace />;
  if (role === "venue") return <Navigate to="/venue" replace />;

  // Fallback - no role assigned yet
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center glass rounded-2xl p-8 max-w-md">
        <h1 className="text-2xl font-display font-bold text-foreground mb-4">
          Welcome to Fame<span className="text-gold">Pass</span>
        </h1>
        <p className="text-muted-foreground">Your account has been created. An administrator will assign your role shortly.</p>
      </div>
    </div>
  );
};

export default Index;
