import DashboardLayout from "@/components/DashboardLayout";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Search, Heart, Instagram, Music2, Users, Send, ArrowUpRight, MapPin, BadgeCheck } from "lucide-react";

/**
 * Adnan, "More dashboard info COLLABSTer" (E2): venues had no way to browse
 * creators — /venue/discover just redirected to /venue. Search + filters +
 * sort over get_discoverable_creators(), filtered client-side the same way
 * InfluencerExplore.tsx already filters offers, plus a save/shortlist
 * (E5) via the new saved_creators table.
 */
type Creator = {
  user_id: string; full_name: string; avatar_url: string | null; bio: string | null;
  city: string | null; country: string | null; niche: string[] | null;
  instagram_handle: string | null; tiktok_handle: string | null;
  followers_count: number | null; tiktok_followers: number | null;
  instagram_verified: boolean | null; is_verified: boolean | null;
};

const FOLLOWER_TIERS = [
  { key: "all", label: "Any size", min: 0 },
  { key: "nano", label: "Nano (1K-10K)", min: 1000 },
  { key: "micro", label: "Micro (10K-50K)", min: 10000 },
  { key: "mid", label: "Mid (50K-250K)", min: 50000 },
  { key: "macro", label: "Macro (250K+)", min: 250000 },
];

const VenueDiscover = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [venueId, setVenueId] = useState<string | null>(null);
  // Adnan, recap E4: direct 1-to-1 invite from a creator's card to one of
  // this venue's live offers, reusing the invitations table the creator's
  // own Invitations page already reads from.
  const [inviteTarget, setInviteTarget] = useState<Creator | null>(null);
  const [inviteOfferId, setInviteOfferId] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [sendingInvite, setSendingInvite] = useState(false);
  const [search, setSearch] = useState("");
  const [selNiches, setSelNiches] = useState<string[]>([]);
  const [selPlatforms, setSelPlatforms] = useState<string[]>([]);
  const [showAllNiches, setShowAllNiches] = useState(false);
  const [savedOnly, setSavedOnly] = useState(false);
  const [tier, setTier] = useState("all");
  const [city, setCity] = useState("all");
  const [sortBy, setSortBy] = useState<"followers" | "newest" | "name">("followers");
  const [niches, setNiches] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("venues").select("id").eq("owner_id", user.id).order("created_at", { ascending: true }).limit(1).maybeSingle()
      .then(({ data }) => setVenueId((data as any)?.id ?? null));
    supabase.from("niches" as any).select("id, name").eq("is_active", true).order("name")
      .then(({ data }) => setNiches((data as any[]) ?? []));
  }, [user]);

  const { data: creators, isLoading } = useQuery({
    queryKey: ["discoverable-creators"],
    queryFn: async () => {
      const { data } = await (supabase as any).rpc("get_discoverable_creators");
      return (data ?? []) as Creator[];
    },
  });

  const { data: savedIds } = useQuery({
    queryKey: ["saved-creators", venueId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("saved_creators").select("influencer_id").eq("venue_id", venueId);
      return new Set((data ?? []).map((r: any) => r.influencer_id)) as Set<string>;
    },
    enabled: !!venueId,
  });

  const toggleSave = useMutation({
    mutationFn: async ({ influencerId, isSaved }: { influencerId: string; isSaved: boolean }) => {
      if (!venueId) return;
      if (isSaved) await (supabase as any).from("saved_creators").delete().eq("venue_id", venueId).eq("influencer_id", influencerId);
      else await (supabase as any).from("saved_creators").insert({ venue_id: venueId, influencer_id: influencerId });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["saved-creators", venueId] }),
  });

  const { data: liveOffers } = useQuery({
    queryKey: ["venue-live-offers", venueId],
    queryFn: async () => {
      const { data } = await supabase.from("offers").select("id, title").eq("venue_id", venueId).eq("is_active", true);
      return data ?? [];
    },
    enabled: !!venueId,
  });

  const openInvite = (c: Creator) => {
    setInviteTarget(c);
    setInviteOfferId("");
    setInviteMessage("");
  };

  const sendInvite = async () => {
    if (!venueId || !inviteTarget || !inviteOfferId) return;
    setSendingInvite(true);
    const { error } = await (supabase as any).from("invitations").insert({
      venue_id: venueId, influencer_id: inviteTarget.user_id, offer_id: inviteOfferId,
      message: inviteMessage.trim() || null, status: "pending",
    });
    setSendingInvite(false);
    if (error) { toast({ title: "Couldn't send invite", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Invite sent", description: `${inviteTarget.full_name} will see it in their Invitations.` });
    setInviteTarget(null);
  };

  const cities = useMemo(() => [...new Set((creators ?? []).map((c) => c.city).filter(Boolean))] as string[], [creators]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = (creators ?? []).filter((c) => {
      const maxFollowers = Math.max(c.followers_count ?? 0, c.tiktok_followers ?? 0);
      if (q && !c.full_name?.toLowerCase().includes(q) && !c.instagram_handle?.toLowerCase().includes(q) && !c.tiktok_handle?.toLowerCase().includes(q)) return false;
      if (selNiches.length && !(c.niche ?? []).some((n) => selNiches.includes(n))) return false;
      if (selPlatforms.length && !selPlatforms.some((p) => (p === "instagram" ? c.instagram_handle : c.tiktok_handle))) return false;
      if (savedOnly && !savedIds?.has(c.user_id)) return false;
      if (city !== "all" && c.city !== city) return false;
      const tierDef = FOLLOWER_TIERS.find((t) => t.key === tier);
      if (tierDef && tierDef.min > 0 && maxFollowers < tierDef.min) return false;
      return true;
    });
    if (sortBy === "followers") rows = [...rows].sort((a, b) => Math.max(b.followers_count ?? 0, b.tiktok_followers ?? 0) - Math.max(a.followers_count ?? 0, a.tiktok_followers ?? 0));
    else if (sortBy === "name") rows = [...rows].sort((a, b) => (a.full_name ?? "").localeCompare(b.full_name ?? ""));
    return rows;
  }, [creators, search, selNiches, selPlatforms, savedOnly, savedIds, tier, city, sortBy]);

  const topCreators = useMemo(
    () => [...(creators ?? [])].filter((c) => c.avatar_url)
      .sort((a, b) => Math.max(b.followers_count ?? 0, b.tiktok_followers ?? 0) - Math.max(a.followers_count ?? 0, a.tiktok_followers ?? 0))
      .slice(0, 12),
    [creators],
  );
  const toggle = (list: string[], set: (v: string[]) => void, v: string) => set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const tierLabel = (f: number) => (f >= 250000 ? "Macro" : f >= 50000 ? "Mid" : f >= 10000 ? "Micro" : f >= 1000 ? "Nano" : "Rising");
  const compact = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M` : n >= 1000 ? `${Math.round(n / 1000)}K` : String(n));

  return (
    <DashboardLayout type="venue">
      <div className="animate-fade-in space-y-10">
        {/* Hero */}
        <section className="rounded-[2rem] p-6 md:p-10 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-8 overflow-hidden" style={{ background: "hsl(var(--venue-brand))", color: "hsl(var(--venue-brand-foreground))" }}>
          <div className="min-w-0">
            <h1 className="font-extrabold tracking-tight leading-[0.95] text-5xl md:text-7xl" style={{ color: "hsl(var(--venue-brand-foreground))" }}>
              <span className="inline-flex items-center gap-4 flex-wrap">
                Find
                <span className="inline-flex items-center justify-center rounded-full border-2 h-14 md:h-20 px-8 md:px-10" style={{ borderColor: "hsl(var(--primary))" }}>
                  <Search className="w-6 h-6 md:w-8 md:h-8" />
                </span>
                Creators
              </span>
              {topCreators.length > 0 && (
                <span className="flex my-4">
                  {topCreators.slice(0, 3).map((c, i) => (
                    <img key={c.user_id} src={c.avatar_url!} alt="" className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover border-4" style={{ marginLeft: i ? -14 : 0, borderColor: "hsl(var(--venue-brand))" }} />
                  ))}
                </span>
              )}
              <span className="block">to collaborate with</span>
            </h1>
            <div className="relative mt-8 max-w-2xl">
              <Input
                aria-label="Search creators"
                placeholder="Search by name or handle"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-16 rounded-2xl pl-6 pr-20 text-base border-0"
                style={{ background: "hsl(var(--venue-brand-foreground) / .12)", color: "hsl(var(--venue-brand-foreground))" }}
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "hsl(var(--primary))", color: "hsl(var(--venue-brand))" }}>
                <Search className="w-5 h-5" />
              </span>
            </div>
          </div>
          <div className="hidden xl:flex relative rounded-[1.75rem] p-8 flex-col justify-between overflow-hidden" style={{ background: "hsl(var(--primary))", color: "hsl(var(--venue-brand))" }}>
            <span aria-hidden className="absolute -right-24 -top-24 w-80 h-80 rounded-full border" style={{ borderColor: "hsl(var(--venue-brand) / .3)" }} />
            <span aria-hidden className="absolute -right-10 top-32 w-80 h-80 rounded-full border" style={{ borderColor: "hsl(var(--venue-brand) / .3)" }} />
            <span className="relative w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "hsl(var(--venue-brand))", color: "hsl(var(--primary))" }}>
              <Send className="w-6 h-6" />
            </span>
            <p className="relative text-4xl font-extrabold leading-tight">Invite creators directly</p>
          </div>
        </section>

        {/* Top creators */}
        {topCreators.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-foreground mb-4">Top creators</h2>
            <div className="flex gap-6 overflow-x-auto pb-2">
              {topCreators.map((c) => (
                <Link key={c.user_id} to={`/venue/creator/${c.user_id}`} className="shrink-0 w-24 text-center group">
                  <span className="block w-24 h-24 rounded-full p-[3px] mx-auto" style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--venue-brand)))" }}>
                    <img src={c.avatar_url!} alt={c.full_name} loading="lazy" className="w-full h-full rounded-full object-cover border-[3px] border-background group-hover:scale-[1.03] transition" />
                  </span>
                  <span className="block mt-2 text-sm text-foreground truncate">{c.full_name.split(" ")[0]}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Filters + results */}
        <section className="rounded-[2rem] bg-card border border-border p-5 md:p-10 grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)] gap-10">
          <aside aria-label="Creator filters" className="space-y-8">
            <h2 className="text-2xl font-extrabold text-foreground">Filters</h2>
            {niches.length > 0 && (
              <fieldset>
                <legend className="text-base font-bold text-foreground mb-3">Content niche</legend>
                <div className="space-y-3">
                  {(showAllNiches ? niches : niches.slice(0, 6)).map((n) => (
                    <label key={n.id} className="flex items-center gap-3 text-[15px] text-foreground cursor-pointer">
                      <Checkbox checked={selNiches.includes(n.name)} onCheckedChange={() => toggle(selNiches, setSelNiches, n.name)} />
                      {n.name}
                    </label>
                  ))}
                </div>
                {niches.length > 6 && (
                  <button type="button" onClick={() => setShowAllNiches((v) => !v)} className="mt-3 text-sm font-semibold" style={{ color: "hsl(var(--venue-brand))" }}>
                    {showAllNiches ? "Show less" : "Show all"}
                  </button>
                )}
              </fieldset>
            )}
            <fieldset className="border-t border-border pt-6">
              <legend className="text-base font-bold text-foreground mb-3">Platform</legend>
              <div className="space-y-3">
                {[["instagram", "Instagram"], ["tiktok", "TikTok"]].map(([v, l]) => (
                  <label key={v} className="flex items-center gap-3 text-[15px] text-foreground cursor-pointer">
                    <Checkbox checked={selPlatforms.includes(v)} onCheckedChange={() => toggle(selPlatforms, setSelPlatforms, v)} />
                    {l}
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset className="border-t border-border pt-6 space-y-3">
              <legend className="text-base font-bold text-foreground mb-3">Audience size</legend>
              <Select value={tier} onValueChange={setTier}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FOLLOWER_TIERS.map((t) => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </fieldset>
            {cities.length > 0 && (
              <fieldset className="border-t border-border pt-6">
                <legend className="text-base font-bold text-foreground mb-3">Location</legend>
                <Select value={city} onValueChange={setCity}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any city</SelectItem>
                    {cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </fieldset>
            )}
            {venueId && (
              <label className="flex items-center gap-3 text-[15px] text-foreground cursor-pointer border-t border-border pt-6">
                <Checkbox checked={savedOnly} onCheckedChange={(v) => setSavedOnly(!!v)} />
                <Heart className="w-4 h-4" /> Saved only
              </label>
            )}
          </aside>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <h2 className="text-3xl md:text-4xl font-extrabold text-foreground">
                Creators <span className="text-base font-medium text-muted-foreground">{isLoading ? "" : filtered.length}</span>
              </h2>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Sort by:</span>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                  <SelectTrigger className="w-[170px] h-11 rounded-xl font-semibold"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="followers">Top followers</SelectItem>
                    <SelectItem value="name">Name A-Z</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-5">
              {isLoading && <p className="col-span-full py-12 text-muted-foreground">Loading creators…</p>}
              {filtered.map((c) => {
                const isSaved = !!savedIds?.has(c.user_id);
                const f = Math.max(c.followers_count ?? 0, c.tiktok_followers ?? 0);
                return (
                  <article key={c.user_id} className="rounded-3xl border border-border bg-card p-3 hover:shadow-[0_12px_32px_-16px_hsl(0_35%_16%/.35)] transition">
                    <div className="relative rounded-2xl overflow-hidden aspect-[4/5] bg-muted">
                      <Link to={`/venue/creator/${c.user_id}`} aria-label={`View ${c.full_name}`} className="block w-full h-full">
                        {c.avatar_url
                          ? <img src={c.avatar_url} alt={c.full_name} loading="lazy" className="w-full h-full object-cover hover:scale-[1.03] transition duration-300" style={{ objectPosition: "center 25%" }} />
                          : <span className="w-full h-full flex items-center justify-center text-5xl font-bold text-muted-foreground">{(c.full_name || "FP").slice(0, 2).toUpperCase()}</span>}
                      </Link>
                      <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold" style={{ background: "hsl(var(--venue-brand))", color: "hsl(var(--venue-brand-foreground))" }}>
                        {c.is_verified ? <><BadgeCheck className="w-3.5 h-3.5" /> Verified</> : tierLabel(f)}
                      </span>
                      {venueId && (
                        <button
                          type="button"
                          aria-label={isSaved ? "Remove from saved" : "Save creator"}
                          onClick={() => toggleSave.mutate({ influencerId: c.user_id, isSaved })}
                          className="absolute right-3 top-3 w-10 h-10 rounded-full flex items-center justify-center bg-black/35 backdrop-blur text-white hover:bg-black/50 transition"
                        >
                          <Heart className={`w-5 h-5 ${isSaved ? "fill-current" : ""}`} />
                        </button>
                      )}
                    </div>
                    <div className="px-2 pt-4 pb-2">
                      <Link to={`/venue/creator/${c.user_id}`} className="block text-lg font-extrabold text-foreground truncate">{c.full_name}</Link>
                      <p className="text-sm text-muted-foreground truncate mt-0.5">
                        {[c.city || c.country, (c.niche ?? [])[0]].filter(Boolean).join(" · ") || "FamePass creator"}
                      </p>
                      <div className="flex items-end justify-between gap-3 mt-4">
                        <div>
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            {c.instagram_handle && <Instagram className="w-4 h-4" />}
                            {c.tiktok_handle && <Music2 className="w-4 h-4" />}
                          </div>
                          <p className="text-2xl font-extrabold text-foreground leading-tight">{compact(f)} <span className="text-xs font-medium text-muted-foreground">followers</span></p>
                        </div>
                        <div className="flex gap-2">
                          {venueId && (
                            <Button size="icon" variant="outline" className="rounded-full h-11 w-11" aria-label={`Invite ${c.full_name}`} onClick={() => openInvite(c)}>
                              <Send className="w-4 h-4" />
                            </Button>
                          )}
                          <Button asChild className="rounded-full h-11 px-6 font-bold" style={{ background: "hsl(var(--venue-brand))", color: "hsl(var(--venue-brand-foreground))" }}>
                            <Link to={`/venue/creator/${c.user_id}`}>View</Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
              {!isLoading && filtered.length === 0 && (
                <div className="col-span-full text-center py-16 text-muted-foreground">No creators match your filters.</div>
              )}
            </div>
          </div>
        </section>

        <Dialog open={!!inviteTarget} onOpenChange={(o) => !o && setInviteTarget(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite {inviteTarget?.full_name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {(liveOffers ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">You don't have a live offer to invite them to yet — create one first.</p>
              ) : (
                <>
                  <Select value={inviteOfferId} onValueChange={setInviteOfferId}>
                    <SelectTrigger><SelectValue placeholder="Choose an offer" /></SelectTrigger>
                    <SelectContent>
                      {(liveOffers ?? []).map((o: any) => <SelectItem key={o.id} value={o.id}>{o.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input placeholder="Optional personal note" value={inviteMessage} onChange={(e) => setInviteMessage(e.target.value)} />
                  <Button className="w-full" onClick={sendInvite} disabled={!inviteOfferId || sendingInvite}>
                    {sendingInvite ? "Sending..." : "Send invite"}
                  </Button>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default VenueDiscover;
