import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import famepassLogo from "@/assets/famepass-logo.png";

const navLinks = [
  { label: "Venues", href: "/venues" },
  { label: "Offers", href: "/offers" },
  { label: "Categories", href: "/categories" },
  { label: "Explore Map", href: "/explore" },
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-3">
          <img src={famepassLogo} alt="FamePass" className="w-9 h-9 rounded-lg border border-gold/30" />
          <span className="font-display font-bold text-lg text-foreground">
            Fame<span className="text-gold">Pass</span>
          </span>
        </Link>

        <div className="hidden lg:flex items-center gap-6">
          {navLinks.map((l) => (
            <Link
              key={l.label}
              to={l.href}
              className={`text-sm font-medium transition-colors ${
                location.pathname === l.href ? "text-accent" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <Button asChild size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-xl">
              <Link to={dashboardPath}>Dashboard</Link>
            </Button>
          ) : (
            <Button asChild size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-xl">
              <Link to="/login">Sign In</Link>
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
                  location.pathname === l.href ? "text-accent bg-accent/10" : "text-muted-foreground hover:text-foreground hover:bg-card"
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
