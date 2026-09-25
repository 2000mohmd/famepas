import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, Instagram, Music2, Mail, Phone, MapPin, Users, TrendingUp, ArrowLeftRight, UserX } from "lucide-react";
import { formatLabel } from "@/pages/admin/_format";
import { creatorTier, tierBadgeClass } from "@/pages/admin/_creatorTier";
import { useToast } from "@/hooks/use-toast";
import CreatorInsightsPanel from "@/components/CreatorInsightsPanel";

/** Suspended/pending/rejected/verified are independent flags — show one priority pill. */
const statusBadge = (p: any) => {
  if (p.is_suspended) return <Badge className="bg-destructive/20 text-destructive border-destructive/30">Suspended</Badge>;
  if (p.approval_status === "pending") return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-400/30">Pending</Badge>;
  if (p.approval_status === "rejected") return <Badge className="bg-destructive/20 text-destructive border-destructive/30">Rejected</Badge>;
  if (p.is_verified) return <Badge className="bg-gold/20 text-gold border-gold/30">Verified</Badge>;
  if (p.approval_status === "approved") return <Badge className="bg-success/20 text-success border-success/30">Approved</Badge>;
  return null;
};

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
  const [noShowCount, setNoShowCount] = useState(0);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!userId || !open) return;
    setLoading(true);
    (async () => {
      const [{ data }, { count }] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("bookings").select("id", { count: "exact", head: true }).eq("influencer_id", userId).eq("status", "no_show"),
      ]);
      setProfile(data);
      setNotes(data?.admin_notes ?? "");
      setNoShowCount(count ?? 0);
      setLoading(false);
    })();
  }, [userId, open]);

  const saveNotes = async () => {
    if (!userId) return;
    setSavingNotes(true);
    const { error } = await supabase.from("profiles").update({ admin_notes: notes } as any).eq("user_id", userId);
    setSavingNotes(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Notes saved" });
  };

  const stripAt = (h?: string | null) => (h ? h.replace(/^@+/, "") : "");

  const swapHandles = async () => {
    if (!userId || !profile?.tiktok_handle) return;
    const { error } = await supabase
      .from("profiles")
      .update({ instagram_handle: profile.tiktok_handle, tiktok_handle: null, tiktok_followers: 0 } as any)
      .eq("user_id", userId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setProfile((p: any) => ({ ...p, instagram_handle: profile.tiktok_handle, tiktok_handle: null, tiktok_followers: 0 }));
    toast({ title: "Fields swapped", description: "Moved the TikTok field's value to Instagram and cleared TikTok." });
  };

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
                <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center text-xl font-semibold text-muted-foreground">
                  {(profile.full_name || "?").split(" ").map((w: string) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase()}
                </div>
              )}
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-foreground">{profile.full_name || "—"}</h3>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {statusBadge(profile)}
                  {(profile.followers_count || profile.tiktok_followers) ? (() => {
                    const tier = creatorTier(Math.max(profile.followers_count || 0, profile.tiktok_followers || 0));
                    return <Badge className={tierBadgeClass[tier]}>{tier}</Badge>;
                  })() : null}
                  {profile.badge && <Badge variant="secondary">{formatLabel(profile.badge)}</Badge>}
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
                <div className="flex items-center gap-2">
                  <a href={`https://tiktok.com/@${stripAt(profile.tiktok_handle)}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-gold hover:underline">
                    <Music2 className="w-4 h-4" /> @{stripAt(profile.tiktok_handle)}
                  </a>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[11px] text-muted-foreground hover:text-gold" title="This is actually an Instagram handle — swap it">
                        <ArrowLeftRight className="w-3 h-3 mr-1" /> Swap
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-card border-border">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Swap Instagram ⇄ TikTok?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Moves "@{stripAt(profile.tiktok_handle)}" from the TikTok field into Instagram, and clears the TikTok handle and follower count. Use this when a creator's Instagram data landed in the wrong field.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={swapHandles}>Swap</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
              {profile.followers_count != null && <div className="flex items-center gap-2 text-muted-foreground"><Users className="w-4 h-4 text-gold" /> IG: {Number(profile.followers_count).toLocaleString()}</div>}
              {profile.tiktok_followers != null && <div className="flex items-center gap-2 text-muted-foreground"><Users className="w-4 h-4 text-gold" /> TK: {Number(profile.tiktok_followers).toLocaleString()}</div>}
              {profile.engagement_rate != null && <div className="flex items-center gap-2 text-muted-foreground"><TrendingUp className="w-4 h-4 text-gold" /> ER: {profile.engagement_rate}%</div>}
              {profile.influencer_score != null && <div className="flex items-center gap-2 text-muted-foreground"><TrendingUp className="w-4 h-4 text-gold" /> Score: {profile.influencer_score}</div>}
              <div className={`flex items-center gap-2 ${noShowCount > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                <UserX className="w-4 h-4" /> No-shows: {noShowCount}
              </div>
            </div>

            {userId && (
              <div className="border-t border-border pt-4">
                <CreatorInsightsPanel
                  influencerId={userId}
                  fallback={{ followers_count: profile.followers_count, tiktok_followers: profile.tiktok_followers }}
                />
              </div>
            )}

            {Array.isArray(profile.niche) && profile.niche.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Niches</p>
                <div className="flex gap-2 flex-wrap">
                  {profile.niche.map((n: string) => <Badge key={n} variant="secondary">{formatLabel(n)}</Badge>)}
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

            <div className="border-t border-border pt-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Admin Notes</p>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Internal notes about this creator..." rows={3} className="bg-secondary border-border" />
              <Button size="sm" variant="outline" onClick={saveNotes} disabled={savingNotes} className="mt-2">
                {savingNotes ? "Saving..." : "Save Notes"}
              </Button>
            </div>

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
