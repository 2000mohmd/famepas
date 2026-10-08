import ConnectAccountsGate from "@/components/influencer/ConnectAccountsGate";
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
  Bell,
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
  MessageCircle,
  Target,
  TrendingUp,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";



type NavItem = { to: string; icon: any; label: string; badge?: string; managerOnly?: boolean };
type NavGroup = { label?: string; items: NavItem[]; badge?: string };

const adminGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { to: "/admin", icon: LayoutDashboard, label: "Dashboard" },
      { to: "/admin/analytics", icon: BarChart3, label: "Analytics" },
      { to: "/sales", icon: CalendarDays, label: "My day" },
      { to: "/sales/dashboard", icon: TrendingUp, label: "Sales" },
    ],
  },
  {
    label: "Marketplace",
    items: [
      { to: "/sales/leads", icon: Target, label: "Leads" },
      { to: "/admin/venues", icon: Building2, label: "Venues" },
      { to: "/admin/influencers", icon: Users, label: "Influencers" },
      { to: "/admin/offers", icon: Tag, label: "Offers" },
      { to: "/admin/events", icon: CalendarDays, label: "Events" },
    ],
  },
  {
    label: "Operations",
    items: [
      { to: "/admin/creator-ops", icon: Sparkles, label: "Creator Ops" },
      { to: "/admin/redemptions", icon: ClipboardCheck, label: "Offer Attendance" },
      { to: "/admin/event-attendees", icon: Users, label: "Event Attendees" },
      { to: "/admin/moderation", icon: ShieldAlert, label: "Moderation" },
      { to: "/admin/billing", icon: CreditCard, label: "Billing" },
      { to: "/admin/broadcast", icon: Megaphone, label: "Broadcast" },
      { to: "/admin/messages", icon: MessageCircle, label: "Messages" },
    ],
  },
  {
    label: "Configuration",
    items: [
      { to: "/admin/categories", icon: FolderTree, label: "Categories" },
      { to: "/admin/locations", icon: MapPin, label: "Locations" },
      { to: "/admin/cultural-events", icon: CalendarRange, label: "Cultural Events" },
      { to: "/admin/users", icon: Users, label: "Admin Users" },
      { to: "/admin/audit-log", icon: ShieldAlert, label: "Audit Log" },
      { to: "/admin/sales-team", icon: Target, label: "Sales Team" },
      { to: "/admin/sales-config", icon: TrendingUp, label: "Sales Scoring" },
      { to: "/admin/chatbot", icon: Bot, label: "Train Chatbot" },
      { to: "/admin/settings", icon: Settings, label: "Settings" },
    ],
  },
];

const venueGroups: NavGroup[] = [
  {
    items: [
      { to: "/venue", icon: Home, label: "Home" },
    ],
  },
  {
    label: "Influencer Marketing",
    items: [
      { to: "/venue/reports", icon: BarChart3, label: "Reports" },
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
      { to: "/venue/messages", icon: MessageCircle, label: "Messages" },
      { to: "/venue/settings", icon: Settings, label: "Settings" },
    ],
  },
];

const salesGroups: NavGroup[] = [
  {
    items: [
      { to: "/sales", icon: CalendarDays, label: "My day" },
      { to: "/sales/leads", icon: Target, label: "Leads" },
      { to: "/sales/dashboard", icon: TrendingUp, label: "Sales dashboard", managerOnly: true },
      { to: "/sales/config", icon: Settings, label: "Scoring & targets", managerOnly: true },
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
      { to: "/influencer/messages", icon: MessageCircle, label: "Messages" },
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

const DashboardLayout = ({ children, type }: { children: React.ReactNode; type: "admin" | "venue" | "influencer" | "sales" }) => {
  const { signOut, user, role } = useAuth();
  const location = useLocation();
  const rawGroups = type === "admin" ? adminGroups : type === "venue" ? venueGroups : type === "sales" ? salesGroups : influencerGroups;
  // A rep shouldn't see links that ProtectedRoute would only bounce them off.
  const isManager = role === "admin" || role === "sales_manager";
  const groups = (isManager
    ? rawGroups
    : rawGroups.map((g) => ({ ...g, items: g.items.filter((i) => !i.managerOnly) }))
  ).filter((g) => g.label !== "Ad Studio" || hasLiveOffer);
  const panelLabel = type === "admin" ? "Admin" : type === "venue" ? "Venue" : type === "sales" ? "Sales" : "Creator";

  const initials = (user?.email ?? "U").split("@")[0].slice(0, 2).toUpperCase();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("avatar_url").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setAvatarUrl((data as any)?.avatar_url ?? null));
  }, [user]);

  // Mobile sidebar (influencer only)
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  // Onboarding progress (venue only): instagram connected? has a campaign?
  const [onboarding, setOnboarding] = useState<{ done: number; total: number; next: string; steps: { label: string; done: boolean; to: string }[] } | null>(null);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const [venueName, setVenueName] = useState<string>("");
  const [venueLogo, setVenueLogo] = useState<string | null>(null);
  // Adnan, Venue Portal item 13: hide Ad Studio until there's at least one live offer.
  const [hasLiveOffer, setHasLiveOffer] = useState(false);

  // Adnan, Venue Portal item 2: a notifications bell — new applications and
  // content awaiting review. Computed live from existing data rather than a
  // new notifications table with its own read/unread tracking.
  const [notifItems, setNotifItems] = useState<{ id: string; label: string; to: string; at: string }[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  useEffect(() => {
    if (type !== "venue" || !user) return;
    (async () => {
      const { data: venues } = await supabase.from("venues").select("id").eq("owner_id", user.id);
      const venueIds = (venues ?? []).map((v: any) => v.id);
      if (!venueIds.length) return;
      const { data: offerRows } = await supabase.from("offers").select("id, title").in("venue_id", venueIds);
      const offerMap = new Map((offerRows ?? []).map((o: any) => [o.id, o.title]));
      const offerIds = [...offerMap.keys()];
      if (!offerIds.length) { setNotifItems([]); return; }

      const [apps, bookingRows] = await Promise.all([
        supabase.from("offer_redemptions").select("id, offer_id, created_at").in("offer_id", offerIds).eq("status", "pending")
          .order("created_at", { ascending: false }).limit(5),
        supabase.from("bookings").select("id").in("venue_id", venueIds),
      ]);
      const bookingIds = (bookingRows.data ?? []).map((b: any) => b.id);
      const { data: content } = bookingIds.length
        ? await supabase.from("deliverables").select("id, booking_id, submitted_at").in("booking_id", bookingIds).eq("status", "submitted")
            .order("submitted_at", { ascending: false }).limit(5)
        : { data: [] as any[] };

      const items = [
        ...(apps.data ?? []).map((a: any) => ({
          id: `app-${a.id}`, label: `New application: ${offerMap.get(a.offer_id) ?? "an offer"}`,
          to: "/venue/bookings", at: a.created_at,
        })),
        ...(content ?? []).map((c: any) => ({
          id: `content-${c.id}`, label: "New content submitted for review",
          to: "/venue/content", at: c.submitted_at,
        })),
      ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
      setNotifItems(items);
    })();
  }, [type, user, location.pathname]);

  useEffect(() => {
    if (type !== "venue" || !user) return;
    (async () => {
      const { data: venue } = await supabase.from("venues").select("id, name, logo_url").eq("owner_id", user.id).order("created_at", { ascending: true }).limit(1).maybeSingle();
      if (!venue) return;
      setVenueName(venue.name);
      setVenueLogo((venue as any).logo_url ?? null);
      const [ig, camp, liveOffers] = await Promise.all([
        supabase.from("social_integrations").select("id", { head: true, count: "exact" }).eq("venue_id", venue.id).eq("platform", "instagram").eq("status", "connected"),
        supabase.from("campaigns").select("id", { head: true, count: "exact" }).eq("venue_id", venue.id),
        supabase.from("offers").select("id", { head: true, count: "exact" }).eq("venue_id", venue.id).eq("is_active", true),
      ]);
      setHasLiveOffer((liveOffers.count ?? 0) > 0);
      const steps = [
        // Adnan, Venue Portal item 6: "Connect Instagram" implied a real OAuth
        // flow that doesn't exist — the Settings page itself already labels
        // this "Instagram (Manual)". Relabeled to match; it's otherwise the
        // same step (saving a handle there does satisfy it).
        { label: "Add your Instagram handle", done: (ig.count ?? 0) > 0, to: "/venue/settings?tab=integrations" },
        { label: "Create your first offer", done: (camp.count ?? 0) > 0, to: "/venue/campaigns/new" },
      ];
      const done = steps.filter(s => s.done).length;
      const next = steps.find(s => !s.done)?.label ?? "All set";
      setOnboarding({ done, total: steps.length, next, steps });
    })();
  }, [type, user, location.pathname]);

  // Maintenance mode banner (all dashboards)
  const [maintenance, setMaintenance] = useState(false);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("get_public_platform_settings");
      const v = (data ?? []).find((r: any) => r.key === "maintenance_mode")?.value as any;
      setMaintenance(v === true || v === "true");
    })();
  }, [location.pathname]);

  const isInfluencer = type === "influencer";
  // Reps work from phones, so the sales panel gets the same collapsible
  // sidebar the creator panel has rather than the desktop-only fixed one.
  const mobileNav = isInfluencer || type === "sales";

  return (
    <div className="dashboard-shell flex min-h-screen">
      {/* Mobile backdrop (influencer only) */}
      {mobileNav && mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-40 h-screen w-[220px] flex flex-col overflow-hidden transition-transform duration-300 bg-white border-r border-[hsl(42_15%_90%)] ${
          mobileNav
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 hover:bg-[hsl(42_35%_95%)] transition-colors">
                {venueLogo ? (
                  <img src={venueLogo} alt={`${venueName || "Venue"} logo`} className="w-7 h-7 rounded-md object-cover bg-white border border-[hsl(42_35%_88%)]" />
                ) : (
                  <span className="w-7 h-7 rounded-md bg-[hsl(42_35%_92%)] text-[hsl(38_60%_38%)] text-xs font-semibold flex items-center justify-center">
                    {(venueName || initials).slice(0, 2).toUpperCase()}
                  </span>
                )}
                <span className="flex-1 text-left text-sm font-medium text-neutral-800 truncate">
                  {venueName || user?.email?.split("@")[0] || "workspace"}
                </span>
                <ChevronDown className="w-4 h-4 text-neutral-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[196px] bg-white">
              <DropdownMenuLabel className="text-[11px] uppercase tracking-wide text-neutral-500">
                {panelLabel} workspace
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {type === "venue" && (
                <>
                  <DropdownMenuItem asChild>
                    <NavLink to="/venue/settings"><Settings className="w-4 h-4 mr-2" /> Venue settings</NavLink>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <NavLink to="/venue/locations"><MapPin className="w-4 h-4 mr-2" /> Locations</NavLink>
                  </DropdownMenuItem>
                </>
              )}
              {type === "admin" && (
                <DropdownMenuItem asChild>
                  <NavLink to="/admin/settings"><Settings className="w-4 h-4 mr-2" /> Platform settings</NavLink>
                </DropdownMenuItem>
              )}
              {type === "influencer" && (
                <DropdownMenuItem asChild>
                  <NavLink to="/influencer/profile"><Users className="w-4 h-4 mr-2" /> My profile</NavLink>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => { void signOut(); }}>
                <LogOut className="w-4 h-4 mr-2" /> Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
                  const isRoot = to === "/venue" || to === "/admin" || to === "/influencer" || to === "/sales";
                  const isActive = location.pathname === to || (!isRoot && location.pathname.startsWith(to));
                  const exactActive = location.pathname === to;
                  return (
                    <NavLink
                      key={to}
                      to={to}
                      end={isRoot}
                      className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                        exactActive || isActive
                          ? type === "sales" ? "text-[hsl(262_42%_28%)]" : "text-[hsl(38_60%_28%)]"
                          : "text-neutral-700 hover:text-neutral-900 hover:bg-[hsl(42_35%_95%)]"
                      }`}
                      style={exactActive ? { background: type === "sales" ? "hsl(262 42% 32% / 0.12)" : "hsl(42 65% 50% / 0.14)" } : undefined}
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

        {/* User profile */}
        <div className="p-3 border-t border-[hsl(42_15%_90%)]">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-[hsl(42_35%_95%)] transition-colors text-left">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" onError={() => setAvatarUrl(null)} />
                ) : (
                  <span className="w-8 h-8 rounded-full text-neutral-900 text-xs font-semibold flex items-center justify-center" style={{ background: "linear-gradient(135deg, #e6c878, #b8923a)" }}>
                    {initials}
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-neutral-800 truncate">{user?.email?.split("@")[0]}</p>
                  <p className="text-[10px] text-neutral-500 truncate">{user?.email}</p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top" className="w-[196px] bg-white">
              {type === "influencer" && (
                <DropdownMenuItem asChild>
                  <NavLink to="/influencer/profile"><Users className="w-4 h-4 mr-2" /> My profile</NavLink>
                </DropdownMenuItem>
              )}
              {(type === "venue" || type === "influencer") && (
                <DropdownMenuItem asChild>
                  <NavLink to={type === "venue" ? "/venue/settings" : "/influencer/settings"}>
                    <Settings className="w-4 h-4 mr-2" /> Settings
                  </NavLink>
                </DropdownMenuItem>
              )}
              {type === "admin" && (
                <DropdownMenuItem asChild>
                  <NavLink to="/admin/settings"><Settings className="w-4 h-4 mr-2" /> Platform settings</NavLink>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => { void signOut(); }}>
                <LogOut className="w-4 h-4 mr-2" /> Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

      </aside>

      {/* Main */}
      <main
        className={`flex-1 min-w-0 ${mobileNav ? "md:ml-[220px]" : "ml-[220px]"}`}
        style={{ background: "#f7f5f0" }}
      >
        {maintenance && (
          <div className="bg-yellow-100 border-b border-yellow-300 text-yellow-900 text-sm px-4 py-2 text-center">
            🛠 FamePass is currently undergoing maintenance. Some features may be temporarily unavailable.
          </div>
        )}
        <header className="sticky top-0 z-30 h-14 border-b border-[hsl(42_15%_90%)] bg-white/80 backdrop-blur flex items-center justify-between px-4 md:px-6">
          {mobileNav ? (
            <button
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg border border-[hsl(42_15%_90%)] bg-white text-neutral-800 hover:border-[hsl(42_65%_50%)] hover:text-[hsl(38_60%_38%)] transition-all"
            >
              <Menu className="w-5 h-5" />
            </button>
          ) : null}
          <div className="hidden md:block" />
          {type === "venue" && (
            <DropdownMenu open={notifOpen} onOpenChange={setNotifOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  aria-label="Notifications"
                  className="relative ml-auto mr-2 inline-flex items-center justify-center w-9 h-9 rounded-lg border border-[hsl(42_15%_90%)] bg-white text-neutral-800 hover:border-[hsl(42_65%_50%)] hover:text-[hsl(38_60%_38%)] transition-all"
                >
                  <Bell className="w-4 h-4" />
                  {notifItems.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#b8923a] text-white text-[10px] flex items-center justify-center">
                      {notifItems.length > 9 ? "9+" : notifItems.length}
                    </span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifItems.length === 0 ? (
                  <p className="px-2 py-4 text-sm text-muted-foreground text-center">Nothing new</p>
                ) : notifItems.map((n) => (
                  <DropdownMenuItem key={n.id} asChild>
                    <NavLink to={n.to} onClick={() => setNotifOpen(false)}>{n.label}</NavLink>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <button
            onClick={signOut}
            data-allow-without-link
            className={`inline-flex items-center gap-2 rounded-lg border border-[hsl(42_15%_90%)] bg-white px-3 py-1.5 text-sm font-medium text-neutral-800 hover:border-[hsl(42_65%_50%)] hover:text-[hsl(38_60%_38%)] transition-all ${type === "venue" ? "" : "ml-auto"}`}
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </header>

        {/* Onboarding banner (venue): Adnan, Venue Portal item 24 — full-width,
            at the top of every page, until setup is complete. */}
        {type === "venue" && onboarding && onboarding.done < onboarding.total && (
          <div className="px-4 md:px-8 pt-4 md:pt-6">
            <div className="rounded-2xl p-5 md:p-6" style={{ background: "linear-gradient(135deg, #2a1a08, #4a2f0f)" }}>
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <p className="text-white font-display text-lg">
                  You're {onboarding.total - onboarding.done} step{onboarding.total - onboarding.done > 1 ? "s" : ""} away from receiving creators
                </p>
                <p className="text-sm text-white/70">{onboarding.done}/{onboarding.total} done</p>
              </div>
              <div className="h-2 rounded-full bg-white/20 mb-4 overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${(onboarding.done / onboarding.total) * 100}%`, background: "#e6c878" }} />
              </div>
              <div className="flex flex-wrap gap-3">
                {onboarding.steps.map((s) => (
                  <div key={s.label} className={`flex items-center gap-2.5 rounded-xl px-3 py-2 ${s.done ? "bg-white/10" : "bg-white/15"}`}>
                    <span className={`text-sm ${s.done ? "text-white/60 line-through" : "text-white"}`}>{s.label}</span>
                    {!s.done && (
                      <NavLink to={s.to} className="text-xs font-semibold px-3 py-1.5 rounded-lg text-neutral-900" style={{ background: "#e6c878" }}>
                        {s.label}
                      </NavLink>
                    )}
                    {s.done && <ChevronRight className="w-3.5 h-3.5 text-white/40 rotate-45" />}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {type === "venue" && onboarding && onboarding.done === onboarding.total && !onboardingDismissed && (
          <div className="px-4 md:px-8 pt-4 md:pt-6">
            <div className="rounded-2xl p-4 flex items-center justify-between gap-3 border" style={{ background: "hsl(140 40% 96%)", borderColor: "hsl(140 40% 85%)" }}>
              <p className="text-sm font-medium" style={{ color: "hsl(140 50% 25%)" }}>🎉 You're live — ready to receive creators.</p>
              <button onClick={() => setOnboardingDismissed(true)} className="text-xs text-neutral-500 hover:text-neutral-800">Dismiss</button>
            </div>
          </div>
        )}

        <div className="p-4 md:p-8">{children}</div>
        {isInfluencer && !location.pathname.startsWith("/influencer/settings") && <ConnectAccountsGate />}
      </main>
    </div>
  );
};

export default DashboardLayout;
