import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
  ChevronRight,
  Megaphone,
  Clipboard,
  ClipboardCheck,
  Film,
  Sparkle,
  CalendarRange,
  Home,
  Menu,
  X,
} from "lucide-react";
import famepassLogo from "@/assets/famepass-logo.png";

type NavItem = { to: string; icon: any; label: string; badge?: string };
type NavGroup = { label?: string; items: NavItem[]; badge?: string };

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
      { to: "/admin/redemptions", icon: ClipboardCheck, label: "Offer Attendance" },
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
      { to: "/admin/cultural-events", icon: CalendarRange, label: "Cultural Events" },
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
      { to: "/venue", icon: BarChart3, label: "Reports" },
      { to: "/venue/content", icon: Film, label: "Content" },
      { to: "/venue/campaigns", icon: Megaphone, label: "Campaigns" },
      { to: "/venue/bookings", icon: Clipboard, label: "Bookings" },
    ],
  },
  {
    label: "Ad Studio",
    badge: "NEW",
    items: [
      { to: "/venue/briefs", icon: Sparkle, label: "Briefs" },
    ],
  },
  {
    items: [
      { to: "/venue/locations", icon: MapPin, label: "Locations" },
      { to: "/venue/settings", icon: Settings, label: "Settings" },
    ],
  },
];

const influencerGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { to: "/influencer", icon: LayoutDashboard, label: "Dashboard" },
      { to: "/influencer/home", icon: Home, label: "Home" },
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

  const initials = (user?.email ?? "U").split("@")[0].slice(0, 2).toUpperCase();

  // Mobile sidebar (influencer only)
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  // Onboarding progress (venue only): instagram connected? has a campaign?
  const [onboarding, setOnboarding] = useState<{ done: number; total: number; next: string } | null>(null);
  const [venueName, setVenueName] = useState<string>("");

  useEffect(() => {
    if (type !== "venue" || !user) return;
    (async () => {
      const { data: venue } = await supabase.from("venues").select("id, name").eq("owner_id", user.id).order("created_at", { ascending: true }).limit(1).maybeSingle();
      if (!venue) return;
      setVenueName(venue.name);
      const [ig, camp] = await Promise.all([
        supabase.from("social_integrations").select("id", { head: true, count: "exact" }).eq("venue_id", venue.id).eq("platform", "instagram").eq("status", "connected"),
        supabase.from("campaigns").select("id", { head: true, count: "exact" }).eq("venue_id", venue.id),
      ]);
      const steps = [
        { label: "Connect Instagram", done: (ig.count ?? 0) > 0 },
        { label: "Create your first campaign", done: (camp.count ?? 0) > 0 },
      ];
      const done = steps.filter(s => s.done).length;
      const next = steps.find(s => !s.done)?.label ?? "All set";
      setOnboarding({ done, total: steps.length, next });
    })();
  }, [type, user, location.pathname]);

  const isInfluencer = type === "influencer";

  return (
    <div className="dashboard-shell flex min-h-screen">
      {/* Mobile backdrop (influencer only) */}
      {isInfluencer && mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-40 h-screen w-[220px] flex flex-col overflow-hidden transition-transform duration-300 bg-white border-r border-[hsl(42_15%_90%)] ${
          isInfluencer
            ? (mobileOpen ? "translate-x-0" : "-translate-x-full") + " md:translate-x-0"
            : ""
        }`}
      >
        <div className="flex items-center gap-2 px-4 py-5">
          <span className="font-display text-xl font-semibold tracking-tight text-neutral-900">
            Fame<span className="italic text-[hsl(38_60%_38%)]">Pass</span>
          </span>
          <span className="ml-auto text-[10px] uppercase tracking-[0.15em] text-neutral-500">{panelLabel}</span>
        </div>

        {/* Workspace switcher */}
        <div className="px-3 pb-3">
          <button className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 hover:bg-[hsl(42_35%_95%)] transition-colors">
            <span className="w-7 h-7 rounded-md bg-[hsl(42_35%_92%)] text-[hsl(38_60%_38%)] text-xs font-semibold flex items-center justify-center">
              {(venueName || initials).slice(0, 2).toUpperCase()}
            </span>
            <span className="flex-1 text-left text-sm font-medium text-neutral-800 truncate">
              {venueName || user?.email?.split("@")[0] || "workspace"}
            </span>
            <ChevronDown className="w-4 h-4 text-neutral-400" />
          </button>
        </div>

        <nav className="flex-1 min-h-0 overflow-y-auto px-3 space-y-5 pb-4">
          {groups.map((group, gi) => (
            <div key={group.label ?? `g${gi}`}>
              {group.label && (
                <div className="px-2.5 mb-1.5 flex items-center gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-neutral-500">
                    {group.label}
                  </p>
                  {group.badge && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded text-neutral-900" style={{ background: "#e6c878" }}>
                      {group.badge}
                    </span>
                  )}
                </div>
              )}
              <div className="space-y-0.5">
                {group.items.map(({ to, icon: Icon, label, badge }) => {
                  const isActive = location.pathname === to || (to !== "/venue" && to !== "/admin" && to !== "/influencer" && location.pathname.startsWith(to));
                  const exactActive = location.pathname === to;
                  return (
                    <NavLink
                      key={to}
                      to={to}
                      end={to === "/admin" || to === "/venue" || to === "/influencer"}
                      className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                        exactActive || isActive
                          ? "text-[hsl(38_60%_28%)]"
                          : "text-neutral-700 hover:text-neutral-900 hover:bg-[hsl(42_35%_95%)]"
                      }`}
                      style={exactActive ? { background: "hsl(42 65% 50% / 0.14)" } : undefined}
                    >
                      <Icon className="w-[15px] h-[15px]" />
                      <span className="flex-1">{label}</span>
                      {badge && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded text-neutral-900" style={{ background: "#e6c878" }}>
                          {badge}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Onboarding progress card (venue) */}
        {type === "venue" && onboarding && onboarding.done < onboarding.total && (
          <div className="mx-3 mb-3 rounded-xl p-3 border border-[hsl(42_15%_88%)]" style={{ background: "hsl(42 35% 95%)" }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] text-neutral-600">{onboarding.total - onboarding.done} steps to go</p>
              <p className="text-[11px] text-neutral-400">{onboarding.done}/{onboarding.total}</p>
            </div>
            <div className="h-1 rounded-full bg-white mb-3 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${(onboarding.done / onboarding.total) * 100}%`, background: "#b8923a" }} />
            </div>
            <p className="text-[12px] text-neutral-800 mb-2.5 leading-tight">Next: {onboarding.next}</p>
            <NavLink to="/venue/settings" className="block text-center text-[12px] font-semibold py-1.5 rounded-lg text-neutral-900" style={{ background: "#e6c878" }}>
              View Steps
            </NavLink>
          </div>
        )}

        {/* User profile */}
        <div className="p-3 border-t border-[hsl(42_15%_90%)]">
          <button onClick={signOut} className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-[hsl(42_35%_95%)] transition-colors text-left">
            <span className="w-8 h-8 rounded-full text-neutral-900 text-xs font-semibold flex items-center justify-center" style={{ background: "linear-gradient(135deg, #e6c878, #b8923a)" }}>
              {initials}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium text-neutral-800 truncate">{user?.email?.split("@")[0]}</p>
              <p className="text-[10px] text-neutral-500 truncate">{user?.email}</p>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
          </button>
        </div>
      </aside>

      {/* Main */}
      <main
        className={`flex-1 min-w-0 ${isInfluencer ? "md:ml-[220px]" : "ml-[220px]"}`}
        style={{ background: "#f7f5f0" }}
      >
        <header className="sticky top-0 z-30 h-14 border-b border-[hsl(42_15%_90%)] bg-white/80 backdrop-blur flex items-center justify-between px-4 md:px-6">
          {isInfluencer ? (
            <button
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg border border-[hsl(42_15%_90%)] bg-white text-neutral-800 hover:border-[hsl(42_65%_50%)] hover:text-[hsl(38_60%_38%)] transition-all"
            >
              <Menu className="w-5 h-5" />
            </button>
          ) : null}
          <div className="hidden md:block" />
          <button
            onClick={signOut}
            className="ml-auto inline-flex items-center gap-2 rounded-lg border border-[hsl(42_15%_90%)] bg-white px-3 py-1.5 text-sm font-medium text-neutral-800 hover:border-[hsl(42_65%_50%)] hover:text-[hsl(38_60%_38%)] transition-all"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </header>
        <div className="p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
};

export default DashboardLayout;
