import DashboardLayout from "@/components/DashboardLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Users, Star, MapPin, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface InfluencerProfile {
  user_id: string;
  full_name: string | null;
  instagram_handle: string | null;
  tiktok_handle: string | null;
  followers_count: number | null;
  tiktok_followers: number | null;
  engagement_rate: number | null;
  influencer_score: number | null;
  niche: string[] | null;
  bio: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  badge: string | null;
}

const VenueDiscover = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<InfluencerProfile[]>([]);
  const [filtered, setFiltered] = useState<InfluencerProfile[]>([]);
  const [search, setSearch] = useState("");
  const [nicheFilter, setNicheFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [minFollowers, setMinFollowers] = useState("");
  const [venueId, setVenueId] = useState<string | null>(null);
  const [offers, setOffers] = useState<{ id: string; title: string }[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [selectedInfluencer, setSelectedInfluencer] = useState<string | null>(null);
  const [inviteForm, setInviteForm] = useState({ offer_id: "", message: "", scheduled_at: "" });
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [cities, setCities] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      const { data: venue } = await supabase.from("venues").select("id").eq("owner_id", user.id).maybeSingle();
      if (venue) {
        setVenueId(venue.id);
        const { data: offData } = await supabase.from("offers").select("id, title").eq("venue_id", venue.id).eq("is_active", true);
        setOffers(offData ?? []);
      }

      const [rolesRes, catRes, locRes] = await Promise.all([
        supabase.from("user_roles").select("user_id").eq("role", "influencer"),
        supabase.from("categories").select("id, name").eq("is_active", true).order("name"),
        supabase.from("service_locations").select("city").eq("is_active", true).order("city"),
      ]);

      setCategories((catRes.data as any) ?? []);
      setCities((locRes.data ?? []).map((l: any) => l.city));

      const ids = (rolesRes.data ?? []).map(r => r.user_id);
      if (ids.length === 0) return;

      const { data } = await supabase.from("profiles")
        .select("user_id, full_name, instagram_handle, tiktok_handle, followers_count, tiktok_followers, engagement_rate, influencer_score, niche, bio, avatar_url, is_verified, badge")
        .in("user_id", ids)
        .eq("is_suspended", false);
      setProfiles((data as InfluencerProfile[]) ?? []);
    };
    fetchData();
  }, [user]);

  useEffect(() => {
    let result = profiles;
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(p =>
        (p.full_name || "").toLowerCase().includes(s) ||
        (p.instagram_handle || "").toLowerCase().includes(s) ||
        (p.niche || []).some(n => n.toLowerCase().includes(s))
      );
    }
    if (nicheFilter !== "all") {
      result = result.filter(p => (p.niche || []).some(n => n.toLowerCase() === nicheFilter.toLowerCase()));
    }
    if (categoryFilter !== "all") {
      result = result.filter(p => (p.niche || []).some(n => n.toLowerCase() === categoryFilter.toLowerCase()));
    }
    if (verifiedOnly) {
      result = result.filter(p => p.is_verified);
    }
    if (minFollowers) {
      result = result.filter(p => (p.followers_count || 0) >= Number(minFollowers));
    }
    setFiltered(result);
  }, [profiles, search, nicheFilter, categoryFilter, cityFilter, verifiedOnly, minFollowers]);

  const allNiches = [...new Set(profiles.flatMap(p => p.niche || []))].sort();

  const handleInvite = async () => {
    if (!venueId || !selectedInfluencer) return;
    const { error } = await supabase.from("invitations").insert({
      venue_id: venueId,
      influencer_id: selectedInfluencer,
      offer_id: inviteForm.offer_id || null,
      message: inviteForm.message || null,
      scheduled_at: inviteForm.scheduled_at || null,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Invitation sent!" });
      setInviteOpen(false);
      setInviteForm({ offer_id: "", message: "", scheduled_at: "" });
    }
  };

  return (
    <DashboardLayout type="venue">
      <div className="animate-fade-in">
        <h1 className="text-3xl font-display font-bold text-foreground mb-2">
          Discover <span className="text-gold">Influencers</span>
        </h1>
        <p className="text-muted-foreground mb-6">Find and invite influencers for your campaigns</p>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search name, handle, niche..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 bg-secondary border-border" />
          </div>
          <Select value={nicheFilter} onValueChange={setNicheFilter}>
            <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="All Niches" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Niches</SelectItem>
              {allNiches.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={cityFilter} onValueChange={setCityFilter}>
            <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="City" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cities</SelectItem>
              {cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Input placeholder="Min followers" type="number" value={minFollowers} onChange={e => setMinFollowers(e.target.value)} className="bg-secondary border-border" />
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">{filtered.length} influencers found</p>
          <Button variant={verifiedOnly ? "default" : "outline"} size="sm" onClick={() => setVerifiedOnly(!verifiedOnly)} className={verifiedOnly ? "gradient-gold text-accent-foreground" : "border-border"}>
            <Star className="w-4 h-4 mr-2" /> Verified Only
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(p => (
            <div key={p.user_id} className="gradient-card rounded-xl border border-border p-6 hover:border-gold/20 transition-all">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-14 h-14 rounded-full bg-secondary border border-border flex items-center justify-center text-gold font-display font-bold text-xl overflow-hidden">
                  {p.avatar_url ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" /> : (p.full_name?.[0] || "?")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-bold text-foreground truncate">{p.full_name || "Unknown"}</h3>
                    {p.is_verified && <Badge className="bg-gold/20 text-gold border-gold/30 text-xs">Verified</Badge>}
                  </div>
                  {p.instagram_handle && <p className="text-sm text-muted-foreground">@{p.instagram_handle}</p>}
                  {p.tiktok_handle && <p className="text-xs text-muted-foreground">TikTok: @{p.tiktok_handle}</p>}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                <div className="bg-secondary/50 rounded-lg p-2">
                  <p className="text-xs text-muted-foreground">Followers</p>
                  <p className="font-bold text-foreground">{(p.followers_count || 0).toLocaleString()}</p>
                </div>
                <div className="bg-secondary/50 rounded-lg p-2">
                  <p className="text-xs text-muted-foreground">Engagement</p>
                  <p className="font-bold text-foreground">{p.engagement_rate ? `${p.engagement_rate}%` : "—"}</p>
                </div>
                <div className="bg-secondary/50 rounded-lg p-2">
                  <p className="text-xs text-muted-foreground">Score</p>
                  <p className="font-bold text-gold">{p.influencer_score || 0}</p>
                </div>
              </div>

              {(p.niche || []).length > 0 && (
                <div className="flex flex-wrap gap-1 mb-4">
                  {(p.niche || []).map(n => <Badge key={n} variant="secondary" className="text-xs">{n}</Badge>)}
                </div>
              )}

              {p.bio && <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{p.bio}</p>}

              <Button onClick={() => { setSelectedInfluencer(p.user_id); setInviteOpen(true); }} className="w-full gradient-gold text-accent-foreground font-semibold" size="sm">
                <Send className="w-4 h-4 mr-2" /> Invite
              </Button>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full text-center p-12 text-muted-foreground">No influencers found matching your criteria</div>
          )}
        </div>

        {/* Invite Dialog */}
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogContent className="bg-card border-border max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display text-foreground">Send Invitation</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label className="text-muted-foreground">Attach Offer (Optional)</Label>
                <Select value={inviteForm.offer_id} onValueChange={val => setInviteForm(f => ({ ...f, offer_id: val }))}>
                  <SelectTrigger className="bg-secondary border-border mt-1"><SelectValue placeholder="Select an offer" /></SelectTrigger>
                  <SelectContent>{offers.map(o => <SelectItem key={o.id} value={o.id}>{o.title}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-muted-foreground">Scheduled Date (Optional)</Label>
                <Input type="datetime-local" value={inviteForm.scheduled_at} onChange={e => setInviteForm(f => ({ ...f, scheduled_at: e.target.value }))} className="bg-secondary border-border mt-1" />
              </div>
              <div>
                <Label className="text-muted-foreground">Message</Label>
                <Textarea value={inviteForm.message} onChange={e => setInviteForm(f => ({ ...f, message: e.target.value }))} placeholder="We'd love to have you..." className="bg-secondary border-border mt-1" />
              </div>
              <Button onClick={handleInvite} className="w-full gradient-gold text-accent-foreground font-semibold">Send Invitation</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default VenueDiscover;
