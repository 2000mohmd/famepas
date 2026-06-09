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
  Film,
  Sparkle,
  CalendarRange,
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

  const initials = (user?.email ?? "U").split("@")[0].slice(0, 2).toUpperCase();

  // Onboarding progress (venue only): instagram connected? has a campaign?
  const [onboarding, setOnboarding] = useState<{ done: number; total: number; next: string } | null>(null);
  const [venueName, setVenueName] = useState<string>("");

  useEffect(() => {
    if (type !== "venue" || !user) return;
    (async () => {
      const { data: venue } = await supabase.from("venues").select("id, name").eq("owner_id", user.id).maybeSingle();
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

  return (
    <div className="dashboard-shell flex min-h-screen">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 h-screen w-[220px] flex flex-col overflow-hidden" style={{ background: "#1a1625" }}>
        <div className="flex items-center gap-2.5 px-4 py-4">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #e8547a, #f472b6)" }}>
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="leading-tight">
            <h2 className="font-semibold text-white text-[15px]">FamePass</h2>
            <p className="text-[10px] uppercase tracking-[0.15em] text-white/40">{panelLabel}</p>
          </div>
        </div>

        {/* Workspace switcher */}
        <div className="px-3 pb-3">
          <button className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 hover:bg-white/5 transition-colors">
            <span className="w-7 h-7 rounded-md bg-white/10 text-white text-xs font-semibold flex items-center justify-center">
              {(venueName || initials).slice(0, 2).toUpperCase()}
            </span>
            <span className="flex-1 text-left text-sm font-medium text-white truncate">
              {venueName || user?.email?.split("@")[0] || "workspace"}
            </span>
            <ChevronDown className="w-4 h-4 text-white/50" />
          </button>
        </div>

        <nav className="flex-1 min-h-0 overflow-y-auto px-3 space-y-5 pb-4">
          {groups.map((group, gi) => (
            <div key={group.label ?? `g${gi}`}>
              {group.label && (
                <div className="px-2.5 mb-1.5 flex items-center gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/40">
                    {group.label}
                  </p>
                  {group.badge && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded text-white" style={{ background: "#e8547a" }}>
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
                          ? "text-white"
                          : "text-white/65 hover:text-white hover:bg-white/5"
                      }`}
                      style={exactActive ? { background: "rgba(232, 84, 122, 0.18)" } : undefined}
                    >
                      <Icon className="w-[15px] h-[15px]" />
                      <span className="flex-1">{label}</span>
                      {badge && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded text-white" style={{ background: "#e8547a" }}>
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
          <div className="mx-3 mb-3 rounded-xl p-3" style={{ background: "rgba(255,255,255,0.05)" }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] text-white/60">{onboarding.total - onboarding.done} steps to go</p>
              <p className="text-[11px] text-white/40">{onboarding.done}/{onboarding.total}</p>
            </div>
            <div className="h-1 rounded-full bg-white/10 mb-3 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${(onboarding.done / onboarding.total) * 100}%`, background: "#e8547a" }} />
            </div>
            <p className="text-[12px] text-white mb-2.5 leading-tight">Next: {onboarding.next}</p>
            <NavLink to="/venue/settings" className="block text-center text-[12px] font-semibold py-1.5 rounded-lg text-white" style={{ background: "#e8547a" }}>
              View Steps
            </NavLink>
          </div>
        )}

        {/* User profile */}
        <div className="p-3 border-t border-white/10">
          <button onClick={signOut} className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors text-left">
            <span className="w-8 h-8 rounded-full text-white text-xs font-semibold flex items-center justify-center" style={{ background: "linear-gradient(135deg, #e8547a, #f472b6)" }}>
              {initials}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium text-white truncate">{user?.email?.split("@")[0]}</p>
              <p className="text-[10px] text-white/50 truncate">{user?.email}</p>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-white/40" />
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="ml-[220px] flex-1 min-w-0" style={{ background: "#fdf8f8" }}>
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
