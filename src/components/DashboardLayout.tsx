import ConnectAccountsGate from "@/components/influencer/ConnectAccountsGate";
import VenueReferralCard from "@/components/venue/VenueReferralCard";
import "@/venue-workspace.css";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminPermissions, hasAdminPermission } from "@/hooks/useAdminPermissions";
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
  Search,
  Plus,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";



type NavItem = { to: string; icon: any; label: string; badge?: string; managerOnly?: boolean; permission?: string; roles?: string[] };
type NavGroup = { label?: string; items: NavItem[]; badge?: string };

const adminGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { to: "/admin", icon: LayoutDashboard, label: "Dashboard" },
      { to: "/admin/analytics", icon: BarChart3, label: "Analytics", permission: "manage_analytics" },
      { to: "/sales", icon: CalendarDays, label: "My day" },
      { to: "/sales/dashboard", icon: TrendingUp, label: "Sales" },
    ],
  },
  {
    label: "Marketplace",
    items: [
      { to: "/sales/leads", icon: Target, label: "Leads" },
      { to: "/admin/venues", icon: Building2, label: "Venues", permission: "manage_venues" },
      { to: "/admin/influencers", icon: Users, label: "Influencers", permission: "manage_influencers" },
      { to: "/admin/offers", icon: Tag, label: "Offers", permission: "manage_offers" },
      { to: "/admin/events", icon: CalendarDays, label: "Events", permission: "manage_events" },
    ],
  },
  {
    label: "Operations",
    items: [
      { to: "/admin/creator-ops", icon: Sparkles, label: "Creator Ops", permission: "manage_influencers" },
      { to: "/admin/redemptions", icon: ClipboardCheck, label: "Offer Attendance", permission: "manage_offers" },
      { to: "/admin/event-attendees", icon: Users, label: "Event Attendees", permission: "manage_events" },
      { to: "/admin/moderation", icon: ShieldAlert, label: "Moderation", permission: "manage_moderation" },
      { to: "/admin/billing", icon: CreditCard, label: "Billing", permission: "manage_billing" },
      { to: "/admin/broadcast", icon: Megaphone, label: "Broadcast", permission: "manage_influencers" },
      { to: "/admin/messages", icon: MessageCircle, label: "Messages" },
    ],
  },
  {
    label: "Configuration",
    items: [
      { to: "/admin/categories", icon: FolderTree, label: "Categories", permission: "manage_categories" },
      { to: "/admin/locations", icon: MapPin, label: "Locations", permission: "manage_locations" },
      { to: "/admin/cultural-events", icon: CalendarRange, label: "Cultural Events", permission: "manage_events" },
      { to: "/admin/users", icon: Users, label: "Admin Users", permission: "manage_users" },
      { to: "/admin/audit-log", icon: ShieldAlert, label: "Audit Log", permission: "manage_users" },
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
      { to: "/venue/discover", icon: Search, label: "Discover" },
      { to: "/venue/reports", icon: BarChart3, label: "Reports" },
      { to: "/venue/content", icon: Film, label: "Content" },
      { to: "/venue/campaigns", icon: Megaphone, label: "Offers" },
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
      // A18: account_manager shares this panel (my_day/sales_dashboard in
      // the staff_permissions matrix) but has no "leads" or "config" area —
      // Leads and Scoring & targets stay sales_rep/sales_manager-only.
      { to: "/sales/leads", icon: Target, label: "Leads", roles: ["sales_rep", "sales_manager", "admin"] },
      { to: "/sales/dashboard", icon: TrendingUp, label: "Sales dashboard", roles: ["sales_manager", "admin", "account_manager"] },
      { to: "/sales/config", icon: Settings, label: "Scoring & targets", roles: ["sales_manager", "admin"] },
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

// IP60: the 5 destinations a creator reaches for most, pinned to a bottom
// tab bar on mobile instead of hidden behind the hamburger drawer. Everything
// else (Invitations, Reviews, Earnings, Rewards, Settings) stays in the drawer.
const influencerTabBarItems: NavItem[] = [
  { to: "/influencer/home", icon: Home, label: "Home" },
  { to: "/influencer/explore", icon: MapPin, label: "Explore" },
  { to: "/influencer/bookings", icon: CalendarDays, label: "Bookings" },
  { to: "/influencer/messages", icon: MessageCircle, label: "Messages" },
  { to: "/influencer/profile", icon: Users, label: "My Profile" },
];

const DashboardLayout = ({ children, type }: { children: React.ReactNode; type: "admin" | "venue" | "influencer" | "sales" }) => {
  const { signOut, user, role } = useAuth();
  const location = useLocation();
  const { t } = useTranslation();
  const rawGroups = type === "admin" ? adminGroups : type === "venue" ? venueGroups : type === "sales" ? salesGroups : influencerGroups;
  // A rep shouldn't see links that ProtectedRoute would only bounce them off.
  const isManager = role === "admin" || role === "sales_manager";
  // Adnan, recap A19: each admin sees only the tabs their admin_user_permissions cover.
  const adminPermissions = useAdminPermissions();
  const [hasLiveOffer, setHasLiveOffer] = useState(false);
  const groups = (isManager
    ? rawGroups
    : rawGroups.map((g) => ({ ...g, items: g.items.filter((i) => !i.managerOnly) }))
  )
    .map((g) => ({ ...g, items: g.items.filter((i) => !i.roles || i.roles.includes(role as string)) }))
    .map((g) => ({ ...g, items: g.items.filter((i) => !i.permission || hasAdminPermission(adminPermissions, i.permission)) }))
    .filter((g) => g.items.length > 0)
    .filter((g) => g.label !== "Ad Studio" || hasLiveOffer);
  const panelLabel = type === "admin" ? (role === "account_manager" ? "Account Manager" : "Admin") : type === "venue" ? "Venue" : type === "sales" ? "Sales" : "Creator";

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  // Adnan, "Creator Page fixes" #7: the sidebar showed the email's local part
  // as if it were a username. Show the real full name, with the handle
  // underneath, everywhere a name is shown — same query as avatar_url.
  const [fullName, setFullName] = useState<string | null>(null);
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("avatar_url, full_name").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => { setAvatarUrl((data as any)?.avatar_url ?? null); setFullName((data as any)?.full_name ?? null); });
  }, [user]);
  const initials = (fullName || user?.email || "U").trim().slice(0, 2).toUpperCase();

  // Mobile sidebar (influencer only)
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  // Onboarding progress (venue only): instagram connected? has a campaign?
  const [onboarding, setOnboarding] = useState<{ done: number; total: number; next: string; steps: { label: string; done: boolean; to: string }[] } | null>(null);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const [venueName, setVenueName] = useState<string>("");
  const [venueLogo, setVenueLogo] = useState<string | null>(null);
  // Adnan, Venue Portal item 13: hide Ad Studio until there's at least one live offer.

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
  const mobileNav = isInfluencer || type === "sales" || type === "venue";

  return (
    <div className={`dashboard-shell flex min-h-screen ${type === "venue" ? "venue-workspace" : ""}`}>
      {/* Mobile backdrop (influencer only) */}
      {mobileNav && mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-40 h-screen w-[220px] flex flex-col overflow-hidden transition-transform duration-300 bg-card border-r border-border ${
          mobileNav
            ? (mobileOpen ? "translate-x-0" : "-translate-x-full") + " md:translate-x-0"
            : ""
        }`}
      >
        <div className="flex items-center gap-2 px-4 py-5">
          <span className="font-display text-xl font-semibold tracking-tight text-card-foreground">
            Fame<span className="italic text-primary">Pass</span>
          </span>
          <span className="ml-auto text-[10px] uppercase tracking-[0.15em] text-card-foreground/50">{panelLabel}</span>
        </div>

        {/* Workspace switcher */}
        <div className="px-3 pb-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 hover:bg-secondary transition-colors">
                {venueLogo ? (
                  <img src={venueLogo} alt={`${venueName || "Venue"} logo`} className="w-7 h-7 rounded-md object-cover bg-white border border-border" />
                ) : (
                  <span className="w-7 h-7 rounded-md bg-secondary text-primary text-xs font-semibold flex items-center justify-center">
                    {(venueName || initials).slice(0, 2).toUpperCase()}
                  </span>
                )}
                <span className="flex-1 text-left text-sm font-medium text-card-foreground truncate">
                  {venueName || fullName || user?.email?.split("@")[0] || "workspace"}
                </span>
                <ChevronDown className="w-4 h-4 text-card-foreground/40" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[196px] bg-card">
              <DropdownMenuLabel className="text-[11px] uppercase tracking-wide text-card-foreground/50">
                {panelLabel} workspace
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {type === "venue" && (
                <>
                  <DropdownMenuItem asChild>
                    <NavLink to="/venue/settings"><Settings className="w-4 h-4 mr-2" /> {t("nav.venueSettings")}</NavLink>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <NavLink to="/venue/locations"><MapPin className="w-4 h-4 mr-2" /> Locations</NavLink>
                  </DropdownMenuItem>
                </>
              )}
              {type === "admin" && role === "admin" && (
                <DropdownMenuItem asChild>
                  <NavLink to="/admin/settings"><Settings className="w-4 h-4 mr-2" /> {t("nav.platformSettings")}</NavLink>
                </DropdownMenuItem>
              )}
              {type === "influencer" && (
                <DropdownMenuItem asChild>
                  <NavLink to="/influencer/profile"><Users className="w-4 h-4 mr-2" /> {t("nav.profile")}</NavLink>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => { void signOut(); }}>
                <LogOut className="w-4 h-4 mr-2" /> {t("nav.logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>


        {type === "venue" && (
          <div className="px-4 pb-5">
            <Button asChild className="w-full justify-start h-11 font-semibold">
              <NavLink to="/venue/campaigns/new"><Plus /> Create an offer</NavLink>
            </Button>
          </div>
        )}
        <nav className="flex-1 min-h-0 overflow-y-auto px-3 space-y-5 pb-4">
          {groups.map((group, gi) => (
            <div key={group.label ?? `g${gi}`}>
              {group.label && (
                <div className="px-2.5 mb-1.5 flex items-center gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-card-foreground/50">
                    {t(`navLabel.${group.label}`, group.label)}
                  </p>
                  {group.badge && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary text-primary-foreground">
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
                          ? "text-primary"
                          : "text-card-foreground/70 hover:text-card-foreground hover:bg-secondary"
                      }`}
                      style={exactActive ? { background: "hsl(var(--primary) / 0.14)" } : undefined}
                    >
                      <Icon className="w-[15px] h-[15px]" />
                      <span className="flex-1">{t(`navLabel.${label}`, label)}</span>
                      {badge && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary text-primary-foreground">
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

        {type === "venue" && <VenueReferralCard />}

        {/* User profile */}
        <div className="p-3 border-t border-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-secondary transition-colors text-left">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" onError={() => setAvatarUrl(null)} />
                ) : (
                  <span className="w-8 h-8 rounded-full text-primary-foreground text-xs font-semibold flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(var(--gold-light)), hsl(var(--gold-dark)))" }}>
                    {initials}
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-card-foreground truncate">{fullName || user?.email}</p>
                  <p className="text-[10px] text-card-foreground/50 truncate">{user?.email}</p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-card-foreground/40" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top" className="w-[196px] bg-card">
              {type === "influencer" && (
                <DropdownMenuItem asChild>
                  <NavLink to="/influencer/profile"><Users className="w-4 h-4 mr-2" /> {t("nav.profile")}</NavLink>
                </DropdownMenuItem>
              )}
              {(type === "venue" || type === "influencer") && (
                <DropdownMenuItem asChild>
                  <NavLink to={type === "venue" ? "/venue/settings" : "/influencer/settings"}>
                    <Settings className="w-4 h-4 mr-2" /> {t("nav.settings")}
                  </NavLink>
                </DropdownMenuItem>
              )}
              {type === "admin" && role === "admin" && (
                <DropdownMenuItem asChild>
                  <NavLink to="/admin/settings"><Settings className="w-4 h-4 mr-2" /> {t("nav.platformSettings")}</NavLink>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => { void signOut(); }}>
                <LogOut className="w-4 h-4 mr-2" /> {t("nav.logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

      </aside>

      {/* Main */}
      <main
        className={`flex-1 min-w-0 bg-background ${mobileNav ? "md:ml-[220px]" : "ml-[220px]"}`}
      >
        {maintenance && (
          <div className="bg-yellow-100 border-b border-yellow-300 text-yellow-900 text-sm px-4 py-2 text-center">
            🛠 FamePass is currently undergoing maintenance. Some features may be temporarily unavailable.
          </div>
        )}
        <header className="sticky top-0 z-30 h-14 border-b border-border bg-card/80 backdrop-blur flex items-center justify-between px-4 md:px-6">
          {mobileNav ? (
            <button
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg border border-border bg-card text-card-foreground hover:border-primary hover:text-primary transition-all"
            >
              <Menu className="w-5 h-5" />
            </button>
          ) : null}
          <div className="hidden md:block text-sm font-semibold text-foreground">
            {type === "venue" ? venueName || "Venue workspace" : ""}
          </div>
          {type === "venue" && (
            <DropdownMenu open={notifOpen} onOpenChange={setNotifOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  aria-label="Notifications"
                  className="relative ml-auto mr-2 inline-flex items-center justify-center w-9 h-9 rounded-lg border border-border bg-card text-card-foreground hover:border-primary hover:text-primary transition-all"
                >
                  <Bell className="w-4 h-4" />
                  {notifItems.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">
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
          {/* Adnan, "Creator Page fixes" #12: this duplicated the "Log out"
              item already in the sidebar's user-profile dropdown for creators. */}
          {type !== "influencer" && (
            <button
              onClick={signOut}
              data-allow-without-link
              className={`inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-card-foreground hover:border-primary hover:text-primary transition-all ${type === "venue" ? "" : "ml-auto"}`}
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          )}
        </header>

        {/* Onboarding banner (venue): Adnan, Venue Portal item 24 — full-width,
            at the top of every page, until setup is complete. */}
        {type === "venue" && onboarding && onboarding.done < onboarding.total && (
          <div className="px-4 md:px-8 pt-4 md:pt-6">
            <div className="venue-onboarding p-5 md:p-6">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <p className="font-display text-lg">
                  You're {onboarding.total - onboarding.done} step{onboarding.total - onboarding.done > 1 ? "s" : ""} away from receiving creators
                </p>
                <p className="text-sm opacity-70">{onboarding.done}/{onboarding.total} done</p>
              </div>
              <div className="venue-onboarding-progress h-1 rounded-full mb-4 overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${(onboarding.done / onboarding.total) * 100}%`, background: "hsl(var(--gold))" }} />
              </div>
              <div className="flex flex-wrap gap-3">
                {onboarding.steps.map((s) => (
                  <div key={s.label} className="venue-onboarding-step flex items-center gap-2.5 rounded-md px-3 py-2">
                    <span className={`text-sm ${s.done ? "opacity-60 line-through" : ""}`}>{s.label}</span>
                    {!s.done && (
                      <NavLink to={s.to} className="text-xs font-semibold px-3 py-1.5 rounded-lg text-primary-foreground" style={{ background: "hsl(var(--gold))" }}>
                        {s.label}
                      </NavLink>
                    )}
                    {s.done && <ChevronRight className="w-3.5 h-3.5 rotate-45" />}
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

        <div className={`p-4 md:p-8 ${type === "venue" ? "venue-page" : ""} ${isInfluencer ? "pb-24 md:pb-8" : ""}`}>
          {isInfluencer && !location.pathname.startsWith("/influencer/settings") && <ConnectAccountsGate />}
          {children}
        </div>
      </main>

      {/* Bottom tab bar (influencer, mobile only) */}
      {isInfluencer && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-stretch justify-between border-t border-border bg-card/95 backdrop-blur md:hidden pb-[env(safe-area-inset-bottom)]">
          {influencerTabBarItems.map(({ to, icon: Icon, label }) => {
            const isActive = location.pathname === to || location.pathname.startsWith(to + "/");
            return (
              <NavLink
                key={to}
                to={to}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${
                  isActive ? "text-primary" : "text-card-foreground/60"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{t(`navLabel.${label}`, label)}</span>
              </NavLink>
            );
          })}
        </nav>
      )}
    </div>
  );
};

export default DashboardLayout;
