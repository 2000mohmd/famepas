import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import famepassLogo from "@/assets/famepass-logo.jpeg";

const Navbar = () => {
  const { user, role } = useAuth();

  const dashboardPath =
    role === "admin" ? "/admin" : role === "venue" ? "/venue" : role === "influencer" ? "/influencer" : "/login";

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-3">
          <img src={famepassLogo} alt="FamePass" className="w-9 h-9 rounded-lg border border-gold/30" />
          <span className="font-display font-bold text-lg text-foreground">
            Fame<span className="text-gold">Pass</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <a href="#categories" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Categories</a>
          <a href="#venues" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Venues</a>
          <a href="#offers" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Offers</a>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <Button asChild size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Link to={dashboardPath}>Dashboard</Link>
            </Button>
          ) : (
            <Button asChild size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Link to="/login">Sign In</Link>
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
