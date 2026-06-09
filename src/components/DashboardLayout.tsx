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
  CreditCard,
  ShieldAlert,
  Bot,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import famepassLogo from "@/assets/famepass-logo.png";

type NavItem = { to: string; icon: any; label: string };
type NavGroup = { label: string; items: NavItem[] };

const adminGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { to: "/admin", icon: LayoutDashboard, label: "Dashboard" },
      { to: "/admin/analytics", icon: BarChart3, label: "Analytics" },
    ],
  },
  {
    label: "Marketplace",
    items: [
      { to: "/admin/venues", icon: Building2, label: "Venues" },
      { to: "/admin/influencers", icon: Users, label: "Influencers" },
      { to: "/admin/offers", icon: Tag, label: "Offers" },
      { to: "/admin/events", icon: CalendarDays, label: "Events" },
    ],
  },
  {
    label: "Operations",
    items: [
      { to: "/admin/redemptions", icon: Tag, label: "Offer Attendance" },
      { to: "/admin/event-attendees", icon: Users, label: "Event Attendees" },
      { to: "/admin/moderation", icon: ShieldAlert, label: "Moderation" },
      { to: "/admin/billing", icon: CreditCard, label: "Billing" },
    ],
  },
  {
    label: "Configuration",
    items: [
      { to: "/admin/categories", icon: FolderTree, label: "Categories" },
      { to: "/admin/locations", icon: MapPin, label: "Locations" },
      { to: "/admin/users", icon: Users, label: "Admin Users" },
      { to: "/admin/chatbot", icon: Bot, label: "Train Chatbot" },
      { to: "/admin/settings", icon: Settings, label: "Settings" },
    ],
  },
];

const venueGroups: NavGroup[] = [
  {
    label: "Influencer Marketing",
    items: [
      { to: "/venue", icon: LayoutDashboard, label: "Reports" },
      { to: "/venue/offers", icon: Tag, label: "Campaigns" },
      { to: "/venue/analytics", icon: BarChart3, label: "Analytics" },
    ],
  },
  {
    label: "Discover",
    items: [
      { to: "/venue/discover", icon: Users, label: "Creators" },
      { to: "/venue/invitations", icon: Send, label: "Invitations" },
    ],
  },
  {
    label: "Bookings",
    items: [
      { to: "/venue/bookings", icon: CalendarDays, label: "Bookings" },
      { to: "/venue/redemptions", icon: Users, label: "Redemptions" },
      { to: "/venue/events", icon: CalendarDays, label: "Events" },
      { to: "/venue/event-attendees", icon: Users, label: "Event Attendees" },
    ],
  },
  {
    label: "Ad Studio",
    items: [{ to: "/venue/briefs", icon: Sparkles, label: "Briefs" }],
  },
  {
    label: "Account",
    items: [{ to: "/venue/settings", icon: Settings, label: "Settings" }],
  },
];

const influencerGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { to: "/influencer", icon: LayoutDashboard, label: "Dashboard" },
      { to: "/influencer/home", icon: Building2, label: "Home" },
      { to: "/influencer/explore", icon: MapPin, label: "Explore" },
    ],
  },
  {
    label: "Activity",
    items: [
      { to: "/influencer/invitations", icon: Send, label: "Invitations" },
      { to: "/influencer/bookings", icon: CalendarDays, label: "Bookings" },
      { to: "/influencer/reviews", icon: ShieldAlert, label: "Reviews" },
    ],
  },
  {
    label: "Earnings",
    items: [
      { to: "/influencer/earnings", icon: CreditCard, label: "Earnings" },
      { to: "/influencer/rewards", icon: BarChart3, label: "Rewards" },
    ],
  },
  {
    label: "Account",
    items: [
      { to: "/influencer/profile", icon: Users, label: "My Profile" },
      { to: "/influencer/settings", icon: Settings, label: "Settings" },
    ],
  },
];

const DashboardLayout = ({ children, type }: { children: React.ReactNode; type: "admin" | "venue" | "influencer" }) => {
  const { signOut, user } = useAuth();
  const location = useLocation();
  const groups = type === "admin" ? adminGroups : type === "venue" ? venueGroups : influencerGroups;
  const panelLabel = type === "admin" ? "Admin" : type === "venue" ? "Venue" : "Creator";

  const initials = (user?.email ?? "U")
    .split("@")[0]
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="dashboard-shell flex min-h-screen">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-sidebar flex flex-col overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-5 border-b border-border">
          <img src={famepassLogo} alt="Fame Pass" className="w-9 h-9 rounded-lg" />
          <div className="leading-tight">
            <h2 className="font-semibold text-foreground text-base">
              Fame<span className="text-primary">Pass</span>
            </h2>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{panelLabel} Panel</p>
          </div>
        </div>

        {/* Workspace switcher (visual) */}
        <div className="px-4 pt-4">
          <button className="w-full flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 hover:border-primary/40 transition-colors">
            <span className="w-7 h-7 rounded-full bg-secondary text-primary text-xs font-semibold flex items-center justify-center">
              {initials}
            </span>
            <span className="flex-1 text-left text-sm font-medium text-foreground truncate">
              {user?.email?.split("@")[0] ?? "workspace"}
            </span>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-5">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map(({ to, icon: Icon, label }) => {
                  const isActive = location.pathname === to;
                  return (
                    <NavLink
                      key={to}
                      to={to}
                      end={to === "/admin" || to === "/venue" || to === "/influencer"}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-secondary text-primary"
                          : "text-sidebar-foreground hover:bg-secondary/60 hover:text-foreground"
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                      {label}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-3 px-2 py-2">
            <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center">
              {initials}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{user?.email?.split("@")[0]}</p>
              <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="ml-64 flex-1 min-w-0">
        <header className="sticky top-0 z-30 h-14 border-b border-border bg-background/80 backdrop-blur flex items-center justify-end px-6">
          <button
            onClick={signOut}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:border-primary/40 hover:text-primary transition-all"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </header>
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
};

export default DashboardLayout;
