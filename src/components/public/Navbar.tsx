import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Menu, X, ArrowRight } from "lucide-react";
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
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/70">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 flex items-center justify-between h-20">
        <Link to="/" className="flex items-center">
          <span className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
            Fame<span className="italic text-[hsl(var(--gold-dark))]">Pass</span>
          </span>
        </Link>

        <div className="hidden lg:flex items-center gap-8">
          {navLinks.map((l) => (
            <Link
              key={l.label}
              to={l.href}
              className={`text-sm font-medium transition-colors ${
                location.pathname === l.href
                  ? "text-foreground"
                  : "text-neutral-600 hover:text-foreground"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Link
            to={user ? dashboardPath : "/welcome"}
            className="group hidden sm:inline-flex items-center gap-2 rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-neutral-800 hover:shadow-md"
          >
            {user ? "Dashboard" : "Sign In"}
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[hsl(var(--gold))] text-neutral-900 transition-transform group-hover:translate-x-0.5">
              <ArrowRight className="h-3 w-3" />
            </span>
          </Link>
          <button className="lg:hidden p-2 text-foreground" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden border-t border-border bg-background/95 backdrop-blur-lg">
          <div className="px-4 py-4 space-y-1">
            {navLinks.map((l) => (
              <Link
                key={l.label}
                to={l.href}
                onClick={() => setMobileOpen(false)}
                className={`block text-sm font-medium py-2.5 px-3 rounded-lg transition-colors ${
                  location.pathname === l.href
                    ? "text-foreground bg-muted"
                    : "text-neutral-600 hover:text-foreground hover:bg-muted"
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
