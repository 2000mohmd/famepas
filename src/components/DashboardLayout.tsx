import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  Building2,
  Users,
  Tag,
  CalendarDays,
  BarChart3,
  LogOut,
  Settings,
  Send,
  FolderTree,
  MapPin,
} from "lucide-react";
import famepassLogo from "@/assets/famepass-logo.jpeg";

const adminLinks = [
  { to: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/admin/venues", icon: Building2, label: "Venues" },
  { to: "/admin/influencers", icon: Users, label: "Influencers" },
  { to: "/admin/offers", icon: Tag, label: "Offers" },
  { to: "/admin/events", icon: CalendarDays, label: "Events" },
  { to: "/admin/categories", icon: FolderTree, label: "Categories" },
  { to: "/admin/locations", icon: MapPin, label: "Locations" },
  { to: "/admin/analytics", icon: BarChart3, label: "Analytics" },
];

const venueLinks = [
  { to: "/venue", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/venue/offers", icon: Tag, label: "My Offers" },
  { to: "/venue/invitations", icon: Send, label: "Invitations" },
  { to: "/venue/redemptions", icon: Users, label: "Redemptions" },
  { to: "/venue/events", icon: CalendarDays, label: "Events" },
  { to: "/venue/settings", icon: Settings, label: "Settings" },
];

const DashboardLayout = ({ children, type }: { children: React.ReactNode; type: "admin" | "venue" }) => {
  const { signOut, user } = useAuth();
  const location = useLocation();
  const links = type === "admin" ? adminLinks : venueLinks;

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-sidebar flex flex-col">
        <div className="flex items-center gap-3 p-6 border-b border-border">
          <img src={famepassLogo} alt="Fame Pass" className="w-10 h-10 rounded-xl border border-gold/30" />
          <div>
            <h2 className="font-display font-bold text-foreground text-lg leading-tight">
              Fame<span className="text-gold">Pass</span>
            </h2>
            <p className="text-xs text-muted-foreground capitalize">{type} Panel</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {links.map(({ to, icon: Icon, label }) => {
            const isActive = location.pathname === to;
            return (
              <NavLink
                key={to}
                to={to}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-primary/20 text-gold border border-gold/20"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
                }`}
              >
                <Icon className="w-5 h-5" />
                {label}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="text-xs text-muted-foreground mb-3 truncate px-2">{user?.email}</div>
          <button
            onClick={signOut}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all w-full"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 flex-1 p-8">
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;
