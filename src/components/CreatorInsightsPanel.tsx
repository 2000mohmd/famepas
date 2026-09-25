import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Instagram, Music2, RefreshCw, Users, Eye, Heart, Film } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  influencerId: string;
  /** Fallback numbers stored on the profile, used when nothing is linked yet. */
  fallback?: { followers_count?: number | null; tiktok_followers?: number | null };
}

const fmt = (n?: number | null) => (typeof n === "number" ? n.toLocaleString() : "—");

const Metric = ({ icon: Icon, label, value }: any) => (
  <div className="rounded-lg border border-border bg-background/40 p-3">
    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
      <Icon className="w-3 h-3" /> {label}
    </div>
    <div className="text-lg font-semibold text-foreground">{value}</div>
  </div>
);

export default function CreatorInsightsPanel({ influencerId, fallback }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data: res, error } = await supabase.functions.invoke("creator-insights", {
        body: { influencer_id: influencerId },
      });
      if (error) throw error;
      setData(res);
    } catch {
      setData({ error: true });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (influencerId) load(); /* eslint-disable-next-line */ }, [influencerId]);

  const ig = data?.instagram ?? {};
  const tk = data?.tiktok ?? {};

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Social account metrics</p>
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={load} disabled={loading}>
          <RefreshCw className={`w-3 h-3 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <div className="rounded-xl border border-border p-4">
        <div className="flex items-center gap-2 mb-3">
          <Instagram className="w-4 h-4 text-gold" />
          <span className="text-sm font-medium">Instagram</span>
          {ig.handle && <span className="text-xs text-muted-foreground">@{String(ig.handle).replace(/^@+/, "")}</span>}
          {!ig.connected && <span className="text-[11px] text-muted-foreground ml-auto">Not linked</span>}
        </div>
        {ig.error ? (
          <p className="text-xs text-muted-foreground">Metrics unavailable right now — the creator may need to relink the account.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Metric icon={Users} label="Followers" value={fmt(ig.followers ?? fallback?.followers_count)} />
            <Metric icon={Film} label="Posts" value={fmt(ig.media_count)} />
            <Metric icon={Eye} label="Reach (28d)" value={fmt(ig.reach)} />
            <Metric icon={Heart} label="Interactions (28d)" value={fmt(ig.total_interactions)} />
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border p-4">
        <div className="flex items-center gap-2 mb-3">
          <Music2 className="w-4 h-4 text-gold" />
          <span className="text-sm font-medium">TikTok</span>
          {tk.handle && <span className="text-xs text-muted-foreground">@{String(tk.handle).replace(/^@+/, "")}</span>}
          {!tk.connected && <span className="text-[11px] text-muted-foreground ml-auto">Not linked</span>}
        </div>
        {tk.error ? (
          <p className="text-xs text-muted-foreground">Metrics unavailable right now — the creator may need to relink the account.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Metric icon={Users} label="Followers" value={fmt(tk.followers ?? fallback?.tiktok_followers)} />
            <Metric icon={Film} label="Videos" value={fmt(tk.media_count)} />
            <Metric icon={Heart} label="Total likes" value={fmt(tk.likes)} />
            <Metric icon={Users} label="Following" value={fmt(tk.following)} />
          </div>
        )}
      </div>
    </div>
  );
}
