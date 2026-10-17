import DashboardLayout from "@/components/DashboardLayout";
import { VenueEmpty, BrandButton } from "@/components/venue/VenueUI";
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
import { CalendarDays, Upload, Loader2, RefreshCw, ExternalLink } from "lucide-react";
import CheckInCode from "@/components/influencer/CheckInCode";
import { DELIVERY_LABEL, DELIVERY_TONE } from "@/lib/delivery";
import { toast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { useState } from "react";
import { notifyEmail } from "@/lib/notify";
import { dateOpts } from "@/lib/dateLocale";
import { useTranslation } from "react-i18next";

const InfluencerBookings = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [uploadFor, setUploadFor] = useState<any | null>(null);
  const [platform, setPlatform] = useState("instagram");
  const [contentType, setContentType] = useState("post");
  const [contentUrl, setContentUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);


  const { data: bookings } = useQuery({
    queryKey: ["my-bookings", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("bookings")
        .select("*, preferred_date, venues(name, city, logo_url), offers(title, offer_type), deliverables(id, status, views, likes, comments, shares, post_url), offer_redemptions:redemption_id(id, delivery_stage, post_due_at, failure_reason, shipped_at, received_at)")
        .eq("influencer_id", user!.id)
        .order("scheduled_date", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  // Check-in codes, cached so they still show with no signal at the venue.
  const { data: codes } = useQuery({
    queryKey: ["my-checkin-codes", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("booking_checkin_codes").select("redemption_id, code");
      if (error) throw error;
      const map = Object.fromEntries((data ?? []).map((c: any) => [c.redemption_id, c.code]));
      try { localStorage.setItem("fp_checkin_codes", JSON.stringify(map)); } catch { /* ignore */ }
      return map as Record<string, string>;
    },
    enabled: !!user,
    placeholderData: () => {
      try { return JSON.parse(localStorage.getItem("fp_checkin_codes") || "{}"); } catch { return {}; }
    },
  });

  const { data: connections } = useQuery({
    queryKey: ["my-social-connections", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("social_integrations")
        .select("platform,status")
        .eq("influencer_id", user!.id);
      return data ?? [];
    },
    enabled: !!user,
  });
  const connectedPlatforms = (connections ?? [])
    .filter((c: any) => c.status === "connected")
    .map((c: any) => c.platform);

  // Adnan, "RE: Re: IT Tasks" Delivery item: the post deadline starts when the
  // creator confirms they received the item, not when the venue marks it shipped.
  const [confirmingReceipt, setConfirmingReceipt] = useState<string | null>(null);
  const confirmReceived = async (redemptionId: string) => {
    setConfirmingReceipt(redemptionId);
    const { data, error } = await (supabase as any).rpc("confirm_delivery_received", { _redemption_id: redemptionId });
    setConfirmingReceipt(null);
    if (error || !data?.ok) {
      toast({ title: t("creator.bookings.receiptFailed"), description: data?.reason || error?.message, variant: "destructive" });
      return;
    }
    toast({ title: t("creator.bookings.receiptConfirmed"), description: t("creator.bookings.deadlineStarts") });
    queryClient.invalidateQueries({ queryKey: ["my-bookings", user?.id] });
  };

  const resetUpload = () => {
    setUploadFor(null); setPlatform("instagram"); setContentType("post"); setContentUrl(""); setCaption(""); setFile(null);
  };

  const submitContent = async () => {
    if (!uploadFor || !user) return;
    if (!contentUrl.trim() && !file) {
      toast({ title: t("creator.bookings.needUrlOrFile"), variant: "destructive" });
      return;
    }
    const typedUrl = contentUrl.trim().toLowerCase();
    if (typedUrl) {
      if (platform === "instagram" && !typedUrl.includes("instagram.com")) {
        toast({ title: t("creator.bookings.notInstagram"), description: t("creator.bookings.pasteInstagram"), variant: "destructive" });
        return;
      }
      if (platform === "tiktok" && !typedUrl.includes("tiktok.com")) {
        toast({ title: t("creator.bookings.notTiktok"), description: t("creator.bookings.pasteTiktok"), variant: "destructive" });
        return;
      }
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
      if (inserted?.id) notifyEmail({ event: "content_submitted", deliverable_id: inserted.id });

      // The same link is the delivery proof the platform verifies; this is
      // what stops the post deadline from turning the booking into a Missed.
      if (url && uploadFor.redemption_id) {
        const { data: res } = await (supabase as any).rpc("submit_booking_post", {
          _redemption_id: uploadFor.redemption_id, _url: url,
        });
        if (res && !res.ok) toast({ title: t("creator.bookings.notLogged"), description: res.reason });
        else if (res?.late) toast({ title: t("creator.bookings.late"), description: t("creator.bookings.lateBody") });
      }

      // Auto-fetch real metrics from Instagram/TikTok via RapidAPI
      if (inserted?.id && url && (url.includes("instagram.com") || url.includes("tiktok.com"))) {
        supabase.functions.invoke("fetch-post-metrics", {
          body: { deliverable_id: inserted.id, post_url: url },
        }).catch(() => { /* metrics best-effort; venue can refresh later */ });
      }

      toast({ title: t("creator.bookings.submitted"), description: t("creator.bookings.submittedBody") });
      resetUpload();
      queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
    } catch (e: any) {
      toast({ title: t("creator.bookings.uploadFailed"), description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
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
              <h3 className="text-lg font-extrabold text-foreground">{booking.offers?.title || t("creator.bookings.visit")}</h3>
              {/* Adnan, "Creator Page fixes" #5: one clear stage badge, not three
                  disagreeing ones — delivery_stage already carries this label. */}
              {booking.offer_redemptions?.delivery_stage ? (
                <Badge variant="outline" className={`text-xs ${DELIVERY_TONE[booking.offer_redemptions.delivery_stage] ?? ""}`}>
                  {t(`creator.delivery.${booking.offer_redemptions.delivery_stage}`, { defaultValue: DELIVERY_LABEL[booking.offer_redemptions.delivery_stage] ?? booking.offer_redemptions.delivery_stage })}
                </Badge>
              ) : (
                <Badge className={statusColor(booking.status)}>{t(`creator.status.${booking.status}`, { defaultValue: booking.status.replace("_", " ") })}</Badge>
              )}
              {deliverable?.status === "rejected" && (
                <Badge variant="outline" className="text-xs bg-destructive/15 text-destructive border-destructive/30">
                  {t("creator.bookings.contentRejected")}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {booking.venues?.logo_url && (
                <img src={booking.venues.logo_url} alt={booking.venues?.name ?? t("creator.common.venue")} loading="lazy" className="w-9 h-9 rounded-xl object-cover border border-border bg-white" />
              )}
              <span className="font-semibold">{booking.venues?.name}{booking.venues?.city ? ` · ${booking.venues.city}` : ""}</span>
            </div>
            {/* Prefer the date the influencer actually requested; scheduled_date
                falls back to the row's creation time when none was chosen. */}
            <p className="inline-flex items-center gap-2 mt-1 rounded-full bg-muted px-3 py-1.5 text-sm font-semibold text-foreground">
              <CalendarDays className="w-4 h-4" style={{ color: "hsl(var(--venue-brand))" }} /> {booking.preferred_date
                ? format(parseISO(`${booking.preferred_date}T00:00:00`), "PPP", dateOpts())
                : format(new Date(booking.scheduled_date), "PPP p", dateOpts())}
            </p>
            {booking.checked_in_at && (
              <p className="text-xs text-green-500">{t("creator.bookings.checkedIn", { date: format(new Date(booking.checked_in_at), "PPP p", dateOpts()) })}</p>
            )}
            {booking.deliverable_deadline && (
              <p className="text-xs text-muted-foreground">{t("creator.bookings.deadline", { date: format(new Date(booking.deliverable_deadline), "PPP", dateOpts()) })}</p>
            )}
            {(() => {
              const d = booking.offer_redemptions;
              if (!d?.delivery_stage) return null;
              const due = d.post_due_at ? new Date(d.post_due_at) : null;
              return (
                <div className="mt-1 space-y-1">
                  {d.delivery_stage === "visited" && d.shipped_at && !d.received_at && (
                    <Button size="sm" variant="outline" disabled={confirmingReceipt === d.id} onClick={() => confirmReceived(d.id)}>
                      {confirmingReceipt === d.id ? t("creator.bookings.confirming") : t("creator.bookings.received")}
                    </Button>
                  )}
                  {due && d.delivery_stage === "visited" && (!d.shipped_at || d.received_at) && (
                    <p className={`text-xs ${due < new Date() ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                      {t("creator.bookings.postDue", { date: format(due, "PPP p", dateOpts()) })}
                    </p>
                  )}
                  {d.failure_reason && <p className="text-xs text-destructive">{d.failure_reason}</p>}
                </div>
              );
            })()}
            {booking.offer_redemptions?.delivery_stage === "booked" && codes?.[booking.redemption_id] && (
              <CheckInCode code={codes[booking.redemption_id]} />
            )}
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            {booking.offer_id && (
              <Button asChild size="sm" variant="ghost">
                <Link to={`/influencer/offers/${booking.offer_id}`}>
                  <ExternalLink className="w-4 h-4 me-1" /> {t("creator.bookings.viewOffer")}
                </Link>
              </Button>
            )}
            {booking.status === "upcoming" && (
              <p className="text-[11px] text-muted-foreground max-w-[180px] text-end">
                {t("creator.bookings.checkinHint")}
              </p>
            )}
            {booking.status === "checked_in" && !hasDeliverable && (
              <Button size="sm" variant="outline" onClick={() => setUploadFor(booking)}>
                <Upload className="w-4 h-4 me-1" /> {t("creator.bookings.sharePost")}
              </Button>
            )}
            {booking.status === "completed" && !hasDeliverable && (
              <Button size="sm" onClick={() => setUploadFor(booking)}>
                <Upload className="w-4 h-4 me-1" /> {t("creator.bookings.uploadContent")}
              </Button>
            )}
            {booking.status === "completed" && deliverable?.status === "rejected" && (
              <Button size="sm" variant="outline" onClick={() => setUploadFor(booking)}>
                <Upload className="w-4 h-4 me-1" /> {t("creator.bookings.resubmit")}
              </Button>
            )}
          </div>
        </div>
        {hasDeliverable && deliverable.status !== "rejected" && (
          <div className="mt-3 pt-3 border-t">
            <Label className="text-xs text-muted-foreground">{t("creator.bookings.publishedUrl")}</Label>
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
                  if (error) { toast({ title: t("creator.common.error"), description: error.message, variant: "destructive" }); return; }
                  toast({ title: t("creator.bookings.urlSaved") });
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
                  if (!url) { toast({ title: t("creator.bookings.addUrlFirst"), variant: "destructive" }); return; }
                  toast({ title: t("creator.bookings.fetchingViews") });
                  const { error } = await supabase.functions.invoke("fetch-post-metrics", {
                    body: { deliverable_id: deliverable.id, post_url: url },
                  });
                  if (error) { toast({ title: t("creator.bookings.refreshFailed"), description: error.message, variant: "destructive" }); return; }
                  toast({ title: t("creator.bookings.viewsRefreshed") });
                  queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
                }}
              >
                <RefreshCw className="w-4 h-4 me-1" /> {t("creator.bookings.refreshViews")}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {t("creator.bookings.views")}: <span className="font-medium text-foreground">{deliverable.views ?? 0}</span> • {t("creator.bookings.likes")}: {deliverable.likes ?? 0} • {t("creator.bookings.comments")}: {deliverable.comments ?? 0}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );};

  return (
    <DashboardLayout type="influencer">
      <div className="space-y-6">
        <div className="relative overflow-hidden rounded-[2rem] p-7 md:p-10 flex flex-wrap items-end justify-between gap-6 creator-hero">
          <div><p className="text-xs font-bold uppercase tracking-[0.18em] mb-3 creator-hero-eyebrow">{t("creator.bookings.eyebrow")}</p>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.02] creator-hero-title">{t("creator.bookings.title")}</h1>
            <p className="mt-3 text-base md:text-lg opacity-75 max-w-2xl">{t("creator.bookings.subtitle")}</p>
          </div>
        </div>

        <Tabs defaultValue="upcoming">
          <TabsList>
            <TabsTrigger value="upcoming">{t("creator.bookings.upcomingTab", { n: upcoming.length })}</TabsTrigger>
            <TabsTrigger value="past">{t("creator.bookings.pastTab", { n: past.length })}</TabsTrigger>
          </TabsList>
          <TabsContent value="upcoming" className="space-y-4 mt-4">
            {upcoming.map(renderBooking)}
            {upcoming.length === 0 && (
              <VenueEmpty icon={CalendarDays} title={t("creator.bookings.emptyUpcomingTitle")} body={t("creator.bookings.emptyUpcomingBody")}
                actions={<BrandButton to="/influencer/explore">{t("creator.common.browseOffers")}</BrandButton>} />
            )}
          </TabsContent>
          <TabsContent value="past" className="space-y-4 mt-4">
            {past.map(renderBooking)}
            {past.length === 0 && <VenueEmpty compact icon={CalendarDays} title={t("creator.bookings.emptyPastTitle")} body={t("creator.bookings.emptyPastBody")} />}
          </TabsContent>
        </Tabs>
      </div>


      {/* Content upload dialog */}
      <Dialog open={!!uploadFor} onOpenChange={(o) => { if (!o) resetUpload(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("creator.bookings.dialogTitle")}</DialogTitle>
            <DialogDescription>
              {t("creator.bookings.dialogBody")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">{t("creator.bookings.platform")}</Label>
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
                <Label className="text-xs">{t("creator.bookings.contentType")}</Label>
                <Select value={contentType} onValueChange={setContentType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="post">{t("creator.contentTypes.post")}</SelectItem>
                    <SelectItem value="reel">{t("creator.contentTypes.reel")}</SelectItem>
                    <SelectItem value="story">{t("creator.contentTypes.story")}</SelectItem>
                    <SelectItem value="video">{t("creator.contentTypes.video")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">{t("creator.bookings.postUrl")}</Label>
              <Input
                value={contentUrl}
                onChange={e => setContentUrl(e.target.value)}
                placeholder={platform === "tiktok" ? "https://tiktok.com/@you/video/..." : "https://instagram.com/p/..."}
              />
              {(platform === "instagram" || platform === "tiktok") && !connectedPlatforms.includes(platform) && (
                <p className="text-[11px] text-amber-600 mt-1">
                  {t("creator.bookings.linkAccountA", { platform: platform === "tiktok" ? "TikTok" : "Instagram" })}{" "}
                  <Link to="/influencer/settings" className="underline">{t("nav.settings")}</Link> {t("creator.bookings.linkAccountB")}
                </p>
              )}
            </div>
            <div>
              <Label className="text-xs">{t("creator.bookings.caption")}</Label>
              <Textarea value={caption} onChange={e => setCaption(e.target.value)} rows={3} maxLength={2000} />
            </div>
            <div>
              <Label className="text-xs">{t("creator.bookings.media")}</Label>
              <Input type="file" accept="image/*,video/*" onChange={e => setFile(e.target.files?.[0] ?? null)} />
            </div>
            <Button onClick={submitContent} disabled={submitting} className="w-full">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Upload className="w-4 h-4 me-1" /> {t("creator.bookings.submitForReview")}</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </DashboardLayout>
  );
};

export default InfluencerBookings;
