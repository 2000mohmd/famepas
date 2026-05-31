import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Instagram, Music2, Mail, Phone, MapPin, Users, TrendingUp } from "lucide-react";

interface Props {
  userId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onApprove: (userId: string) => void;
  onReject: (userId: string) => void;
}

export default function InfluencerDetailDialog({ userId, open, onOpenChange, onApprove, onReject }: Props) {
  const [profile, setProfile] = useState<any>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId || !open) return;
    setLoading(true);
    (async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle();
      setProfile(data);
      setLoading(false);
    })();
  }, [userId, open]);

  const stripAt = (h?: string | null) => (h ? h.replace(/^@+/, "") : "");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-foreground">Influencer Profile</DialogTitle>
        </DialogHeader>
        {loading || !profile ? (
          <p className="text-muted-foreground p-6 text-center">Loading…</p>
        ) : (
          <div className="space-y-5 mt-2">
            <div className="flex items-start gap-4">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-20 h-20 rounded-full object-cover border border-border" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-secondary" />
              )}
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-foreground">{profile.full_name || "—"}</h3>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {profile.approval_status === "pending" && <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-400/30">Pending</Badge>}
                  {profile.approval_status === "approved" && <Badge className="bg-success/20 text-success border-success/30">Approved</Badge>}
                  {profile.approval_status === "rejected" && <Badge className="bg-destructive/20 text-destructive border-destructive/30">Rejected</Badge>}
                  {profile.is_verified && <Badge className="bg-gold/20 text-gold border-gold/30">Verified</Badge>}
                  {profile.badge && <Badge variant="secondary" className="capitalize">{profile.badge}</Badge>}
                </div>
              </div>
            </div>

            {profile.bio && <p className="text-sm text-muted-foreground leading-relaxed">{profile.bio}</p>}

            <div className="grid grid-cols-2 gap-3 text-sm">
              {profile.phone && <div className="flex items-center gap-2 text-muted-foreground"><Phone className="w-4 h-4 text-gold" /> {profile.phone}</div>}
              {(profile.city || profile.country) && <div className="flex items-center gap-2 text-muted-foreground"><MapPin className="w-4 h-4 text-gold" /> {[profile.city, profile.country].filter(Boolean).join(", ")}</div>}
              {profile.instagram_handle && (
                <a href={`https://instagram.com/${stripAt(profile.instagram_handle)}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-gold hover:underline">
                  <Instagram className="w-4 h-4" /> @{stripAt(profile.instagram_handle)}
                </a>
              )}
              {profile.tiktok_handle && (
                <a href={`https://tiktok.com/@${stripAt(profile.tiktok_handle)}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-gold hover:underline">
                  <Music2 className="w-4 h-4" /> @{stripAt(profile.tiktok_handle)}
                </a>
              )}
              {profile.followers_count != null && <div className="flex items-center gap-2 text-muted-foreground"><Users className="w-4 h-4 text-gold" /> IG: {Number(profile.followers_count).toLocaleString()}</div>}
              {profile.tiktok_followers != null && <div className="flex items-center gap-2 text-muted-foreground"><Users className="w-4 h-4 text-gold" /> TK: {Number(profile.tiktok_followers).toLocaleString()}</div>}
              {profile.engagement_rate != null && <div className="flex items-center gap-2 text-muted-foreground"><TrendingUp className="w-4 h-4 text-gold" /> ER: {profile.engagement_rate}%</div>}
              {profile.influencer_score != null && <div className="flex items-center gap-2 text-muted-foreground"><TrendingUp className="w-4 h-4 text-gold" /> Score: {profile.influencer_score}</div>}
            </div>

            {Array.isArray(profile.niche) && profile.niche.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Niches</p>
                <div className="flex gap-2 flex-wrap">
                  {profile.niche.map((n: string) => <Badge key={n} variant="secondary" className="capitalize">{n}</Badge>)}
                </div>
              </div>
            )}

            {profile.social_links && Object.keys(profile.social_links || {}).length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Other Links</p>
                <ul className="text-sm space-y-1">
                  {Object.entries(profile.social_links as Record<string, string>).map(([k, v]) => (
                    <li key={k}><a href={v} target="_blank" rel="noreferrer" className="text-gold hover:underline">{k}: {v}</a></li>
                  ))}
                </ul>
              </div>
            )}

            {profile.approval_status === "pending" && userId && (
              <div className="flex gap-2 pt-4 border-t border-border">
                <Button className="flex-1 bg-success/20 text-success hover:bg-success/30" onClick={() => { onApprove(userId); onOpenChange(false); }}>
                  <Check className="w-4 h-4 mr-2" /> Approve
                </Button>
                <Button className="flex-1 bg-destructive/20 text-destructive hover:bg-destructive/30" onClick={() => { onReject(userId); onOpenChange(false); }}>
                  <X className="w-4 h-4 mr-2" /> Reject
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
