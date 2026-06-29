import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, KeyRound, Upload, Loader2, CheckCircle2, BarChart3, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useState } from "react";

const InfluencerBookings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [uploadFor, setUploadFor] = useState<any | null>(null);
  const [platform, setPlatform] = useState("instagram");
  const [contentType, setContentType] = useState("post");
  const [contentUrl, setContentUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Check-in OTP dialog
  const [checkInFor, setCheckInFor] = useState<any | null>(null);
  const [otp, setOtp] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  // Stats editor
  const [statsFor, setStatsFor] = useState<any | null>(null);
  const [stats, setStats] = useState({ views: 0, likes: 0, comments: 0, shares: 0 });
  const [savingStats, setSavingStats] = useState(false);

  const { data: bookings } = useQuery({
    queryKey: ["my-bookings", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("bookings")
        .select("*, venues(name, city, logo_url), offers(title, offer_type), deliverables(id, status, views, likes, comments, shares, post_url), offer_redemptions:redemption_id(qr_code, qr_expires_at)")
        .eq("influencer_id", user!.id)
        .order("scheduled_date", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const completeBooking = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bookings").update({ completed_at: new Date().toISOString(), status: "completed" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Visit marked as completed" });
      queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
    },
  });

  const verifyAndCheckIn = async () => {
    if (!checkInFor) return;
    const code = otp.trim().toUpperCase();
    if (!code) return;
    setVerifyingOtp(true);
    try {
      const expected = (checkInFor.offer_redemptions?.qr_code ?? "").toUpperCase();
      if (!expected) {
        toast({ title: "No code on file", description: "Ask the venue to provide a check-in code.", variant: "destructive" });
        return;
      }
      if (expected !== code) {
        toast({ title: "Invalid code", description: "That code doesn't match this booking.", variant: "destructive" });
        return;
      }
      const now = new Date().toISOString();
      const { error } = await supabase.from("bookings").update({ checked_in_at: now, status: "checked_in" }).eq("id", checkInFor.id);
      if (error) throw error;
      toast({ title: "Checked in successfully!" });
      setCheckInFor(null); setOtp("");
      queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setVerifyingOtp(false);
    }
  };

  const resetUpload = () => {
    setUploadFor(null); setPlatform("instagram"); setContentType("post"); setContentUrl(""); setCaption(""); setFile(null);
  };

  const submitContent = async () => {
    if (!uploadFor || !user) return;
    if (!contentUrl.trim() && !file) {
      toast({ title: "Add a post URL or upload a file", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    let mediaUrl: string | null = null;
    try {
      if (file) {
        const ext = file.name.split(".").pop() || "bin";
        const path = `${user.id}/${uploadFor.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("deliverables").upload(path, file, { upsert: false });
        if (upErr) throw upErr;
        mediaUrl = path;
      }
      const url = contentUrl.trim();
      const { data: inserted, error } = await supabase.from("deliverables").insert({
        booking_id: uploadFor.id,
        influencer_id: user.id,
        content_type: contentType,
        platform,
        content_url: url || null,
        post_url: url || null,
        caption: caption.trim() || null,
        media_url: mediaUrl,
        status: "submitted",
        submitted_at: new Date().toISOString(),
      }).select("id").single();
      if (error) throw error;

      // Auto-fetch real metrics from Instagram/TikTok via RapidAPI
      if (inserted?.id && url && (url.includes("instagram.com") || url.includes("tiktok.com"))) {
        supabase.functions.invoke("fetch-post-metrics", {
          body: { deliverable_id: inserted.id, post_url: url },
        }).catch(() => { /* metrics best-effort; venue can refresh later */ });
      }

      toast({ title: "Content submitted", description: "The venue will review and approve it." });
      resetUpload();
      queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const openStats = (deliverable: any) => {
    setStatsFor(deliverable);
    setStats({
      views: deliverable.views ?? 0,
      likes: deliverable.likes ?? 0,
      comments: deliverable.comments ?? 0,
      shares: deliverable.shares ?? 0,
    });
  };

  const saveStats = async () => {
    if (!statsFor) return;
    setSavingStats(true);
    try {
      const { error } = await supabase.from("deliverables").update({
        views: Number(stats.views) || 0,
        likes: Number(stats.likes) || 0,
        comments: Number(stats.comments) || 0,
        shares: Number(stats.shares) || 0,
      }).eq("id", statsFor.id);
      if (error) throw error;
      toast({ title: "Stats updated" });
      setStatsFor(null);
      queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSavingStats(false);
    }
  };

  const upcoming = bookings?.filter((b: any) => ["upcoming", "checked_in"].includes(b.status)) ?? [];
  const past = bookings?.filter((b: any) => ["completed", "no_show", "cancelled"].includes(b.status)) ?? [];

  const statusColor = (s: string) => {
    switch (s) {
      case "upcoming": return "bg-blue-500/10 text-blue-500";
      case "checked_in": return "bg-green-500/10 text-green-500";
      case "completed": return "bg-primary/10 text-gold";
      case "no_show": return "bg-red-500/10 text-red-500";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const renderBooking = (booking: any) => {
    const deliverable = booking.deliverables?.[0];
    const hasDeliverable = !!deliverable;
    return (
    <Card key={booking.id}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold">{booking.offers?.title || "Visit"}</h3>
              <Badge className={statusColor(booking.status)}>{booking.status.replace("_", " ")}</Badge>
              {hasDeliverable && (
                <Badge variant="outline" className="text-xs">
                  Content: {deliverable.status}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{booking.venues?.name} • {booking.venues?.city}</p>
            <p className="text-sm text-muted-foreground">📅 {format(new Date(booking.scheduled_date), "PPP p")}</p>
            {booking.checked_in_at && (
              <p className="text-xs text-green-500">Checked in: {format(new Date(booking.checked_in_at), "PPP p")}</p>
            )}
            {booking.deliverable_deadline && (
              <p className="text-xs text-muted-foreground">Deliverable deadline: {format(new Date(booking.deliverable_deadline), "PPP")}</p>
            )}
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            {booking.status === "upcoming" && (
              <Button size="sm" onClick={() => { setCheckInFor(booking); setOtp(""); }}>
                <KeyRound className="w-4 h-4 mr-1" /> Check In
              </Button>
            )}
            {booking.status === "checked_in" && (
              <>
                <Button size="sm" onClick={() => completeBooking.mutate(booking.id)}>
                  <CheckCircle2 className="w-4 h-4 mr-1" /> Complete
                </Button>
                {!hasDeliverable && (
                  <Button size="sm" variant="outline" onClick={() => setUploadFor(booking)}>
                    <Upload className="w-4 h-4 mr-1" /> Share Post Link
                  </Button>
                )}
              </>
            )}
            {booking.status === "completed" && !hasDeliverable && (
              <Button size="sm" onClick={() => setUploadFor(booking)}>
                <Upload className="w-4 h-4 mr-1" /> Upload Content
              </Button>
            )}
            {booking.status === "completed" && deliverable?.status === "rejected" && (
              <Button size="sm" variant="outline" onClick={() => setUploadFor(booking)}>
                <Upload className="w-4 h-4 mr-1" /> Resubmit
              </Button>
            )}
            {hasDeliverable && deliverable.status !== "rejected" && (
              <Button size="sm" variant="outline" onClick={() => openStats(deliverable)}>
                <BarChart3 className="w-4 h-4 mr-1" /> Update stats
              </Button>
            )}
          </div>
        </div>
        {hasDeliverable && deliverable.status !== "rejected" && (
          <div className="mt-3 pt-3 border-t">
            <Label className="text-xs text-muted-foreground">Published post URL</Label>
            <div className="flex gap-2 mt-1">
              <Input
                defaultValue={deliverable.post_url || ""}
                placeholder="https://instagram.com/p/... or https://tiktok.com/..."
                onBlur={async (e) => {
                  const v = (e.target.value || "").trim();
                  if (v === (deliverable.post_url || "")) return;
                  const { error } = await supabase
                    .from("deliverables")
                    .update({ post_url: v || null })
                    .eq("id", deliverable.id);
                  if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
                  toast({ title: "Post URL saved" });
                  queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
                }}
                className="h-9 text-sm"
              />
              <Button
                size="sm"
                variant="outline"
                disabled={!deliverable.post_url}
                onClick={async () => {
                  const url = (deliverable.post_url || "").trim();
                  if (!url) { toast({ title: "Add a post URL first", variant: "destructive" }); return; }
                  toast({ title: "Fetching views..." });
                  const { error } = await supabase.functions.invoke("fetch-post-metrics", {
                    body: { deliverable_id: deliverable.id, post_url: url },
                  });
                  if (error) { toast({ title: "Refresh failed", description: error.message, variant: "destructive" }); return; }
                  toast({ title: "Views refreshed" });
                  queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
                }}
              >
                <RefreshCw className="w-4 h-4 mr-1" /> Refresh views
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Views: <span className="font-medium text-foreground">{deliverable.views ?? 0}</span> • Likes: {deliverable.likes ?? 0} • Comments: {deliverable.comments ?? 0}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );};

  return (
    <DashboardLayout type="influencer">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">My Bookings</h1>
          <p className="text-muted-foreground">Manage your scheduled visits</p>
        </div>

        <Tabs defaultValue="upcoming">
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
            <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="upcoming" className="space-y-4 mt-4">
            {upcoming.map(renderBooking)}
            {upcoming.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <CalendarDays className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No upcoming bookings</p>
              </div>
            )}
          </TabsContent>
          <TabsContent value="past" className="space-y-4 mt-4">
            {past.map(renderBooking)}
            {past.length === 0 && <div className="text-center py-12 text-muted-foreground">No past bookings</div>}
          </TabsContent>
        </Tabs>
      </div>

      {/* Check-in OTP dialog */}
      <Dialog open={!!checkInFor} onOpenChange={(o) => { if (!o) { setCheckInFor(null); setOtp(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Check in to your visit</DialogTitle>
            <DialogDescription>
              Ask the venue staff for the booking code (shown to them when they verify your visit). Enter it below to confirm you're at the venue.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={otp}
            onChange={e => setOtp(e.target.value.toUpperCase())}
            placeholder="e.g. AB12CD34EF56"
            className="font-mono tracking-wider text-center"
            maxLength={20}
          />
          <Button onClick={verifyAndCheckIn} disabled={verifyingOtp || !otp.trim()} className="w-full">
            {verifyingOtp ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4 mr-1" /> Verify & Check In</>}
          </Button>
        </DialogContent>
      </Dialog>

      {/* Content upload dialog */}
      <Dialog open={!!uploadFor} onOpenChange={(o) => { if (!o) resetUpload(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Submit your content</DialogTitle>
            <DialogDescription>
              Share the link to your post (and optional media file) so the venue can approve it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Platform</Label>
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="tiktok">TikTok</SelectItem>
                    <SelectItem value="youtube">YouTube</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Content type</Label>
                <Select value={contentType} onValueChange={setContentType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="post">Post</SelectItem>
                    <SelectItem value="reel">Reel</SelectItem>
                    <SelectItem value="story">Story</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Post URL</Label>
              <Input value={contentUrl} onChange={e => setContentUrl(e.target.value)} placeholder="https://instagram.com/p/..." />
            </div>
            <div>
              <Label className="text-xs">Caption (optional)</Label>
              <Textarea value={caption} onChange={e => setCaption(e.target.value)} rows={3} maxLength={2000} />
            </div>
            <div>
              <Label className="text-xs">Upload media (optional)</Label>
              <Input type="file" accept="image/*,video/*" onChange={e => setFile(e.target.files?.[0] ?? null)} />
            </div>
            <Button onClick={submitContent} disabled={submitting} className="w-full">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Upload className="w-4 h-4 mr-1" /> Submit for review</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Update stats dialog */}
      <Dialog open={!!statsFor} onOpenChange={(o) => !o && setStatsFor(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Update post stats</DialogTitle>
            <DialogDescription>
              Paste the latest metrics from your post so the venue sees real engagement.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            {(["views", "likes", "comments", "shares"] as const).map(k => (
              <div key={k}>
                <Label className="text-xs capitalize">{k}</Label>
                <Input
                  type="number"
                  min={0}
                  value={stats[k]}
                  onChange={e => setStats(s => ({ ...s, [k]: Number(e.target.value) }))}
                />
              </div>
            ))}
          </div>
          <Button onClick={saveStats} disabled={savingStats} className="w-full">
            {savingStats ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save stats"}
          </Button>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default InfluencerBookings;
