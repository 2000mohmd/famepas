import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Eye, Heart, MessageCircle, Share2, Bookmark, RefreshCw, ExternalLink, Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const fmt = (n?: number | null) => {
  const v = Number(n) || 0;
  return v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(1)}K` : `${v}`;
};

/** Venue dashboard: each delivered creator video with its live insights. */
const DeliveredVideosInsights = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [names, setNames] = useState<Record<string, any>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    const { data: venues } = await supabase.from("venues").select("id").eq("owner_id", user.id);
    const venueIds = (venues ?? []).map((v: any) => v.id);
    if (!venueIds.length) return;
    const { data: bks } = await supabase.from("bookings").select("id").in("venue_id", venueIds);
    const ids = (bks ?? []).map((b: any) => b.id);
    if (!ids.length) return;
    const { data: ds } = await supabase.from("deliverables")
      .select("id,influencer_id,platform,post_url,content_url,thumbnail_url,views,likes,comments,shares,saves,metrics_updated_at,submitted_at")
      .in("booking_id", ids).not("post_url", "is", null)
      .order("submitted_at", { ascending: false, nullsFirst: false }).limit(12);
    setItems(ds ?? []);
    const infl = [...new Set((ds ?? []).map((d: any) => d.influencer_id))];
    if (infl.length) {
      const { data: profs } = await supabase.rpc("get_public_profiles_basic", { _user_ids: infl });
      const m: any = {}; (profs ?? []).forEach((p: any) => { m[p.user_id] = p; }); setNames(m);
    }
  };

  useEffect(() => { load(); }, [user]);

  const refresh = async (d: any) => {
    setBusy(d.id);
    const { data } = await supabase.functions.invoke("fetch-post-metrics", {
      body: { deliverable_id: d.id, post_url: d.post_url },
    });
    setBusy(null);
    if (data?.success) { toast({ title: "Insights updated" }); load(); }
    else toast({ title: "Couldn't update insights", description: data?.code === "NOT_LINKED" ? "The creator needs to link this account in their Settings." : "Try again later.", variant: "destructive" });
  };

  if (!items.length) return null;

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-foreground">Delivered videos</h2>
        <Link to="/venue/content" className="text-sm text-muted-foreground hover:text-foreground">View all</Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((d) => (
          <div key={d.id} className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="aspect-video bg-muted flex items-center justify-center">
              {d.thumbnail_url ? <img src={d.thumbnail_url} alt="" className="w-full h-full object-cover" /> : <Film className="w-8 h-8 text-muted-foreground" />}
            </div>
            <div className="p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground truncate">{names[d.influencer_id]?.full_name || "Creator"}</p>
                <span className="text-xs text-muted-foreground capitalize">{d.platform || (d.post_url?.includes("tiktok") ? "tiktok" : "instagram")}</span>
              </div>
              <div className="grid grid-cols-5 gap-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1" title="Views"><Eye className="w-3 h-3" />{fmt(d.views)}</span>
                <span className="flex items-center gap-1" title="Likes"><Heart className="w-3 h-3" />{fmt(d.likes)}</span>
                <span className="flex items-center gap-1" title="Comments"><MessageCircle className="w-3 h-3" />{fmt(d.comments)}</span>
                <span className="flex items-center gap-1" title="Shares"><Share2 className="w-3 h-3" />{fmt(d.shares)}</span>
                <span className="flex items-center gap-1" title="Saves"><Bookmark className="w-3 h-3" />{fmt(d.saves)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">
                  {d.metrics_updated_at ? `Updated ${new Date(d.metrics_updated_at).toLocaleDateString()}` : "Not updated yet"}
                </span>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => refresh(d)} disabled={busy === d.id}>
                    <RefreshCw className={`w-3.5 h-3.5 ${busy === d.id ? "animate-spin" : ""}`} />
                  </Button>
                  <Button size="sm" variant="ghost" asChild>
                    <a href={d.post_url} target="_blank" rel="noreferrer"><ExternalLink className="w-3.5 h-3.5" /></a>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default DeliveredVideosInsights;
