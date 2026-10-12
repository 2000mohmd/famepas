import DashboardLayout from "@/components/DashboardLayout";
import AdminPermissionGate from "@/components/admin/AdminPermissionGate";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Eye, EyeOff, Trash2, Star, Search, CheckCircle, XCircle, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { notifyEmail } from "@/lib/notify";

interface Review {
  id: string;
  review_text: string | null;
  rating: number;
  review_type: string;
  is_public: boolean;
  is_hidden: boolean;
  admin_note: string | null;
  created_at: string;
  venue_id: string | null;
  reviewer_id: string | null;
  venue_name?: string | null;
  reviewer_name?: string | null;
}

interface Deliverable {
  id: string;
  content_type: string | null;
  post_url: string | null;
  content_url: string | null;
  status: string;
  submitted_at: string | null;
  created_at: string;
  influencer_name?: string | null;
  venue_name?: string | null;
}

const AdminModeration = () => {
  const { t } = useTranslation();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);

  const fetchDisputes = async () => {
    const { data } = await supabase
      .from("deliverables")
      .select("id, content_type, post_url, content_url, status, dispute_reason, disputed_at, influencer_id")
      .eq("disputed", true)
      .order("disputed_at", { ascending: false });
    const rows = (data as any[]) ?? [];
    const ids = Array.from(new Set(rows.map((r) => r.influencer_id).filter(Boolean)));
    let map = new Map<string, string>();
    if (ids.length) {
      const { data: profs } = await supabase.rpc("get_public_profiles_basic", { _user_ids: ids });
      map = new Map(((profs as any[]) ?? []).map((p) => [p.user_id, p.full_name]));
    }
    setDisputes(rows.map((r) => ({ ...r, influencer_name: map.get(r.influencer_id) ?? t("admin.dashboard.influencerFallback") })));
  };

  const resolveDispute = async (id: string) => {
    const { error } = await supabase.from("deliverables").update({ disputed: false } as any).eq("id", id);
    if (error) { toast({ title: t("admin.common.error"), description: error.message, variant: "destructive" }); return; }
    toast({ title: t("admin.moderation.disputeResolved") });
    fetchDisputes();
  };
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "hidden" | "public">("all");
  const [rejectTarget, setRejectTarget] = useState<Deliverable | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const { toast } = useToast();

  const fetchReviews = async () => {
    const { data } = await supabase
      .from("reviews")
      .select("id, review_text, rating, review_type, is_public, is_hidden, admin_note, created_at, venue_id, reviewer_id")
      .order("created_at", { ascending: false });
    const rows = (data as any[]) ?? [];

    const venueIds = Array.from(new Set(rows.map((r) => r.venue_id).filter(Boolean)));
    const reviewerIds = Array.from(new Set(rows.map((r) => r.reviewer_id).filter(Boolean)));

    const [{ data: venues }, { data: profiles }] = await Promise.all([
      venueIds.length ? supabase.from("venues").select("id, name").in("id", venueIds) : Promise.resolve({ data: [] as any[] }),
      reviewerIds.length ? supabase.from("profiles").select("user_id, full_name").in("user_id", reviewerIds) : Promise.resolve({ data: [] as any[] }),
    ]);
    const venueMap = new Map((venues ?? []).map((v: any) => [v.id, v.name]));
    const reviewerMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p.full_name]));

    setReviews(rows.map((r) => ({
      ...r,
      venue_name: r.venue_id ? venueMap.get(r.venue_id) ?? null : null,
      reviewer_name: r.reviewer_id ? reviewerMap.get(r.reviewer_id) ?? null : null,
    })));
  };

  const fetchDeliverables = async () => {
    const { data } = await supabase
      .from("deliverables")
      .select("id, content_type, post_url, content_url, status, submitted_at, created_at, booking_id, influencer_id")
      .eq("status", "submitted")
      .order("submitted_at", { ascending: false });
    const rows = (data as any[]) ?? [];

    const bookingIds = Array.from(new Set(rows.map((r) => r.booking_id).filter(Boolean)));
    const influencerIds = Array.from(new Set(rows.map((r) => r.influencer_id).filter(Boolean)));

    const [{ data: bookings }, { data: profiles }] = await Promise.all([
      bookingIds.length ? supabase.from("bookings").select("id, venue_id").in("id", bookingIds) : Promise.resolve({ data: [] as any[] }),
      influencerIds.length ? supabase.from("profiles").select("user_id, full_name").in("user_id", influencerIds) : Promise.resolve({ data: [] as any[] }),
    ]);
    const venueIds = Array.from(new Set((bookings ?? []).map((b: any) => b.venue_id).filter(Boolean)));
    const { data: venues } = venueIds.length
      ? await supabase.from("venues").select("id, name").in("id", venueIds)
      : { data: [] as any[] };

    const bookingMap = new Map((bookings ?? []).map((b: any) => [b.id, b.venue_id]));
    const venueMap = new Map((venues ?? []).map((v: any) => [v.id, v.name]));
    const influencerMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p.full_name]));

    setDeliverables(rows.map((d) => ({
      ...d,
      influencer_name: d.influencer_id ? influencerMap.get(d.influencer_id) ?? null : null,
      venue_name: venueMap.get(bookingMap.get(d.booking_id)) ?? null,
    })));
  };

  useEffect(() => { fetchReviews(); fetchDeliverables(); fetchDisputes(); }, []);

  const toggleHidden = async (id: string, hidden: boolean) => {
    const { error } = await supabase.from("reviews").update({ is_hidden: !hidden } as any).eq("id", id);
    if (error) toast({ title: t("admin.common.error"), description: error.message, variant: "destructive" });
    else { toast({ title: hidden ? t("admin.moderation.reviewUnhidden") : t("admin.moderation.reviewHidden") }); fetchReviews(); }
  };

  const deleteReview = async (id: string) => {
    if (!confirm(t("admin.moderation.deleteReviewConfirm"))) return;
    const { error } = await supabase.from("reviews").delete().eq("id", id);
    if (error) toast({ title: t("admin.common.error"), description: error.message, variant: "destructive" });
    else { toast({ title: t("admin.moderation.reviewDeleted") }); fetchReviews(); }
  };

  const approveDeliverable = async (id: string) => {
    const { error } = await supabase
      .from("deliverables")
      .update({ status: "approved", reviewed_at: new Date().toISOString() } as any)
      .eq("id", id);
    if (error) toast({ title: t("admin.common.error"), description: error.message, variant: "destructive" });
    else { toast({ title: t("admin.moderation.contentApproved") }); notifyEmail({ event: "content_approved", deliverable_id: id }); fetchDeliverables(); }
  };

  const submitReject = async () => {
    if (!rejectTarget) return;
    const { error } = await supabase
      .from("deliverables")
      .update({
        status: "rejected",
        rejection_note: rejectReason || null,
        reviewed_at: new Date().toISOString(),
      } as any)
      .eq("id", rejectTarget.id);
    if (error) toast({ title: t("admin.common.error"), description: error.message, variant: "destructive" });
    else {
      toast({ title: t("admin.moderation.contentRejected") });
      notifyEmail({ event: "content_rejected", deliverable_id: rejectTarget.id, feedback: rejectReason || undefined });
      setRejectTarget(null);
      setRejectReason("");
      fetchDeliverables();
    }
  };

  const filteredReviews = reviews.filter((r) => {
    const matchSearch = !search || (r.review_text || "").toLowerCase().includes(search.toLowerCase()) ||
      (r.venue_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (r.reviewer_name || "").toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || (filter === "hidden" ? r.is_hidden : !r.is_hidden);
    return matchSearch && matchFilter;
  });

  const renderStars = (rating: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`w-3 h-3 ${i <= rating ? "fill-gold text-gold" : "text-muted-foreground"}`} />
      ))}
    </div>
  );

  return (
    <DashboardLayout type="admin">
      <AdminPermissionGate permission="manage_moderation">
      <div className="animate-fade-in">
        <h1 className="text-3xl font-display font-bold text-foreground mb-2">
          {t("admin.moderation.titlePrefix")} <span className="text-gold">{t("navLabel.Moderation", "Moderation")}</span>
        </h1>
        <p className="text-muted-foreground mb-8">{t("admin.moderation.subtitle")}</p>

        <Tabs defaultValue="reviews">
          <TabsList>
            <TabsTrigger value="reviews">{t("admin.moderation.reviews")}</TabsTrigger>
            <TabsTrigger value="content" className="gap-2">
              {t("admin.moderation.content")}
              {deliverables.length > 0 && (
                <Badge className="bg-gold text-background ml-1">{deliverables.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="disputes" className="gap-2">
              {t("admin.moderation.disputes")}
              {disputes.length > 0 && <Badge variant="destructive" className="text-xs">{disputes.length}</Badge>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="disputes" className="mt-6">
            {disputes.length === 0 ? (
              <div className="bg-white border border-border rounded-2xl py-16 text-center text-muted-foreground">
                {t("admin.moderation.noFlagged")}
              </div>
            ) : (
              <div className="space-y-3">
                {disputes.map((d) => (
                  <div key={d.id} className="bg-white border border-border rounded-xl p-4 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{d.influencer_name} · <span className="capitalize">{d.content_type || t("admin.moderation.contentFallback")}</span></p>
                      <p className="text-sm text-muted-foreground mt-1">{d.dispute_reason || t("admin.moderation.noReasonProvided")}</p>
                      {(d.post_url || d.content_url) && (
                        <a href={d.post_url || d.content_url} target="_blank" rel="noreferrer" className="text-xs text-gold inline-flex items-center gap-1 mt-2">
                          {t("admin.moderation.openContent")} <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    <Button size="sm" variant="outline" onClick={() => resolveDispute(d.id)}>{t("admin.moderation.markResolved")}</Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="reviews" className="mt-6">
            <div className="flex flex-wrap gap-4 mb-6">
              <div className="relative flex-1 min-w-64 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder={t("admin.moderation.searchPlaceholder")} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-secondary border-border" />
              </div>
              <div className="flex gap-2">
                {(["all", "public", "hidden"] as const).map((f) => (
                  <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)} className={filter === f ? "gradient-gold text-accent-foreground" : "border-border text-muted-foreground"}>
                    {t(`admin.moderation.filter_${f}`)}
                  </Button>
                ))}
              </div>
            </div>

            <div className="gradient-card rounded-xl border border-border overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t("admin.moderation.review")}</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t("admin.moderation.rating")}</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t("admin.offers.type")}</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t("admin.events.venue")}</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t("admin.moderation.reviewer")}</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t("admin.locations.status")}</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t("admin.events.date")}</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t("admin.culturalEvents.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReviews.length === 0 ? (
                    <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">{t("admin.moderation.noReviewsFound")}</td></tr>
                  ) : (
                    filteredReviews.map((review) => (
                      <tr key={review.id} className={`border-b border-border/50 hover:bg-secondary/30 transition-colors ${review.is_hidden ? "opacity-50" : ""}`}>
                        <td className="p-4 max-w-xs">
                          <p className="text-sm text-foreground truncate">{review.review_text || <span className="text-muted-foreground italic">{t("admin.moderation.noText")}</span>}</p>
                        </td>
                        <td className="p-4">{renderStars(review.rating)}</td>
                        <td className="p-4"><Badge variant="secondary" className="capitalize text-xs">{review.review_type}</Badge></td>
                        <td className="p-4 text-sm text-foreground">{review.venue_name || "—"}</td>
                        <td className="p-4 text-sm text-foreground">{review.reviewer_name || t("admin.moderation.anonymous")}</td>
                        <td className="p-4">
                          {review.is_hidden ? (
                            <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-xs">{t("admin.moderation.hidden")}</Badge>
                          ) : (
                            <Badge className="bg-success/20 text-success border-success/30 text-xs">{t("admin.moderation.visible")}</Badge>
                          )}
                        </td>
                        <td className="p-4 text-muted-foreground text-sm">{new Date(review.created_at).toLocaleDateString()}</td>
                        <td className="p-4 flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => toggleHidden(review.id, review.is_hidden)} className="text-muted-foreground hover:text-gold h-7 px-2">
                            {review.is_hidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => deleteReview(review.id)} className="text-muted-foreground hover:text-destructive h-7 px-2">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="content" className="mt-6">
            <div className="gradient-card rounded-xl border border-border overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t("navLabel.Influencers", "Influencer")}</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t("admin.events.venue")}</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t("admin.offers.type")}</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t("admin.redemptions.post")}</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t("admin.moderation.submitted")}</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t("admin.culturalEvents.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {deliverables.length === 0 ? (
                    <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">{t("admin.moderation.noContentPending")}</td></tr>
                  ) : (
                    deliverables.map((d) => {
                      const url = d.post_url || d.content_url;
                      return (
                        <tr key={d.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                          <td className="p-4 text-sm text-foreground">{d.influencer_name || "—"}</td>
                          <td className="p-4 text-sm text-foreground">{d.venue_name || "—"}</td>
                          <td className="p-4"><Badge variant="secondary" className="capitalize text-xs">{d.content_type || "—"}</Badge></td>
                          <td className="p-4 text-sm">
                            {url ? (
                              <a href={url} target="_blank" rel="noreferrer" className="text-gold inline-flex items-center gap-1 hover:underline">
                                {t("admin.moderation.view")} <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : "—"}
                          </td>
                          <td className="p-4 text-muted-foreground text-sm">
                            {new Date(d.submitted_at || d.created_at).toLocaleDateString()}
                          </td>
                          <td className="p-4 flex gap-2">
                            <Button size="sm" onClick={() => approveDeliverable(d.id)} className="bg-success text-background hover:bg-success/90 h-8">
                              <CheckCircle className="w-4 h-4 mr-1" /> {t("admin.redemptions.approve")}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => { setRejectTarget(d); setRejectReason(""); }} className="border-destructive/30 text-destructive hover:bg-destructive/10 h-8">
                              <XCircle className="w-4 h-4 mr-1" /> {t("admin.billing.reject")}
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>

        <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>{t("admin.moderation.rejectContent")}</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">
              {t("admin.moderation.rejectContentDesc")}
            </p>
            <Textarea
              placeholder={t("admin.moderation.reasonPlaceholder")}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectTarget(null)}>{t("admin.common.cancel")}</Button>
              <Button onClick={submitReject} className="bg-destructive text-background hover:bg-destructive/90">{t("admin.billing.reject")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      </AdminPermissionGate>
    </DashboardLayout>
  );
};

export default AdminModeration;
