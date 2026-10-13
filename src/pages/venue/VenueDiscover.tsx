import DashboardLayout from "@/components/DashboardLayout";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  const [niche, setNiche] = useState("all");
  const [platform, setPlatform] = useState("all");
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
      if (niche !== "all" && !(c.niche ?? []).includes(niche)) return false;
      if (platform === "instagram" && !c.instagram_handle) return false;
      if (platform === "tiktok" && !c.tiktok_handle) return false;
      if (city !== "all" && c.city !== city) return false;
      const tierDef = FOLLOWER_TIERS.find((t) => t.key === tier);
      if (tierDef && tierDef.min > 0 && maxFollowers < tierDef.min) return false;
      return true;
    });
    if (sortBy === "followers") rows = [...rows].sort((a, b) => Math.max(b.followers_count ?? 0, b.tiktok_followers ?? 0) - Math.max(a.followers_count ?? 0, a.tiktok_followers ?? 0));
    else if (sortBy === "name") rows = [...rows].sort((a, b) => (a.full_name ?? "").localeCompare(b.full_name ?? ""));
    return rows;
  }, [creators, search, niche, platform, tier, city, sortBy]);

  return (
    <DashboardLayout type="venue">
      <div className="animate-fade-in">
        <div className="venue-discover-header">
          <p className="venue-eyebrow">FamePass / Creators</p>
          <h1>Find your next collaboration.</h1>
          <div className="relative venue-search">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input aria-label="Search creators" placeholder="Search creators by name or handle" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-12" />
          </div>
        </div>
        <div className="venue-discover-layout">
        <aside className="venue-filters" aria-label="Creator filters">
          <h2 className="text-base">Filters</h2>
          <div><label>Content niche</label>
          <Select value={niche} onValueChange={setNiche}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Niche" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All niches</SelectItem>
              {niches.map((n) => <SelectItem key={n.id} value={n.name}>{n.name}</SelectItem>)}
            </SelectContent>
          </Select>
          </div><div><label>Platform</label>
          <Select value={platform} onValueChange={setPlatform}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Platform" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any platform</SelectItem>
              <SelectItem value="instagram">Instagram</SelectItem>
              <SelectItem value="tiktok">TikTok</SelectItem>
            </SelectContent>
          </Select>
          </div><div><label>Audience size</label>
          <Select value={tier} onValueChange={setTier}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Follower tier" /></SelectTrigger>
            <SelectContent>
              {FOLLOWER_TIERS.map((t) => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
          </div>
          {cities.length > 0 && (
            <div><label>Location</label>
            <Select value={city} onValueChange={setCity}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="City" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any city</SelectItem>
                {cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            </div>
          )}
        </aside>
        <section aria-label="Creators">
        <div className="venue-results-toolbar">
          <h2 className="text-lg">Creators <span className="text-muted-foreground text-sm font-normal">{isLoading ? "" : `(${filtered.length})`}</span></h2>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Sort" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="followers">Top followers</SelectItem>
              <SelectItem value="name">Name A-Z</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="venue-creator-grid">
          {isLoading && <p className="col-span-full py-12 text-muted-foreground">Loading creators…</p>}
          {filtered.map((c) => {
            const isSaved = !!savedIds?.has(c.user_id);
            const maxFollowers = Math.max(c.followers_count ?? 0, c.tiktok_followers ?? 0);
            return (
              <Card key={c.user_id} className="venue-creator-card">
                <div className="venue-creator-photo">
                  <Link to={`/venue/creator/${c.user_id}`} aria-label={`View ${c.full_name}`}>
                    {c.avatar_url ? <img src={c.avatar_url} alt={c.full_name} loading="lazy" /> : <div className="creator-initials">{(c.full_name || "FP").slice(0, 2).toUpperCase()}</div>}
                  </Link>
                  {venueId && <Button size="icon" variant="ghost" aria-label={isSaved ? "Remove from shortlist" : "Save to shortlist"} title={isSaved ? "Remove from shortlist" : "Save to shortlist"} onClick={(e) => { e.stopPropagation(); toggleSave.mutate({ influencerId: c.user_id, isSaved }); }}>
                    <Heart className={`w-4 h-4 ${isSaved ? "fill-primary text-primary" : ""}`} />
                  </Button>}
                </div>
                <div className="venue-creator-detail">
                  <div className="flex items-start justify-between gap-2">
                    <Link to={`/venue/creator/${c.user_id}`}><h3>{c.full_name}</h3></Link>
                    {c.is_verified && <BadgeCheck className="w-4 h-4 shrink-0 text-primary" aria-label="Verified creator" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> {c.city || c.country || "Location not added"}</p>
                  <div className="flex items-center gap-1.5 mt-3 text-sm font-semibold"><Users className="w-4 h-4 text-muted-foreground" />{maxFollowers.toLocaleString()} <span className="font-normal text-xs text-muted-foreground">followers</span></div>
                  <div className="flex flex-wrap gap-1.5 mt-3 min-h-5">
                    {(c.niche ?? []).slice(0, 2).map((n) => <Badge key={n} variant="secondary" className="text-[10px] rounded-md">{n}</Badge>)}
                  </div>
                  <div className="venue-creator-socials">
                    {c.instagram_handle && <span><Instagram /> @{c.instagram_handle}</span>}
                    {c.tiktok_handle && <span><Music2 /> @{c.tiktok_handle}</span>}
                  </div>
                  {c.bio && <p className="text-xs text-muted-foreground mt-3 line-clamp-2">{c.bio}</p>}
                  <div className="venue-creator-actions">
                    <Button size="sm" variant="outline" asChild><Link to={`/venue/creator/${c.user_id}`}>View <ArrowUpRight /></Link></Button>
                    {venueId && <Button size="sm" onClick={() => openInvite(c)}><Send /> Invite</Button>}
                  </div>
                </div>
              </Card>
            );
          })}
          {!isLoading && filtered.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">No creators match your filters.</div>
          )}
        </div>

        </section>
        </div>

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
