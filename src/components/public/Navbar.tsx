import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState } from "react";


const navLinks = [
  { label: "Venues", href: "/venues" },
  { label: "Offers", href: "/offers" },
  { label: "Influencers", href: "/influencers" },
  { label: "Categories", href: "/categories" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

const Navbar = () => {
  const { user, role } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const dashboardPath =
    role === "admin" ? "/admin" : role === "venue" ? "/venue" : role === "influencer" ? "/influencer" : "/login";

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-20">
        <Link to="/" className="flex items-center">
          <span className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
            Fame<span className="gradient-text italic">Pass</span>
          </span>
        </Link>

        <div className="hidden lg:flex items-center gap-7">
          {navLinks.map((l) => (
            <Link
              key={l.label}
              to={l.href}
              className={`text-sm font-medium transition-colors ${
                location.pathname === l.href ? "text-gold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <Button asChild size="sm" className="gradient-gold text-accent-foreground hover:opacity-90 rounded-xl font-semibold">
              <Link to={dashboardPath}>Dashboard</Link>
            </Button>
          ) : (
            <Button asChild size="sm" className="gradient-gold text-accent-foreground hover:opacity-90 rounded-xl font-semibold">
              <Link to="/welcome">Sign In</Link>
            </Button>
          )}
          <button className="lg:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="w-5 h-5 text-foreground" /> : <Menu className="w-5 h-5 text-foreground" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden border-t border-border bg-card/95 backdrop-blur-lg">
          <div className="px-4 py-4 space-y-1">
            {navLinks.map((l) => (
              <Link
                key={l.label}
                to={l.href}
                onClick={() => setMobileOpen(false)}
                className={`block text-sm font-medium py-2.5 px-3 rounded-lg transition-colors ${
                  location.pathname === l.href ? "text-gold bg-accent/10" : "text-muted-foreground hover:text-foreground hover:bg-card"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
