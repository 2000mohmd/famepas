import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Star, Pencil } from "lucide-react";
import { format } from "date-fns";
import { dateOpts } from "@/lib/dateLocale";
import { useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

const InfluencerReviews = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [writeOpen, setWriteOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string>("");
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: receivedReviews } = useQuery({
    queryKey: ["received-reviews", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("reviews").select("*, venues(name)")
        .eq("reviewed_id", user!.id).eq("is_hidden", false)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: givenReviews } = useQuery({
    queryKey: ["given-reviews", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("reviews").select("*, venues(name)")
        .eq("reviewer_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: reviewableBookings } = useQuery({
    queryKey: ["reviewable-bookings", user?.id],
    queryFn: async () => {
      const { data: bks } = await supabase
        .from("bookings")
        .select("id, venue_id, completed_at, venues(name, owner_id)")
        .eq("influencer_id", user!.id)
        .eq("status", "completed")
        .order("completed_at", { ascending: false });
      const bookingIds = (bks ?? []).map((b: any) => b.id);
      if (bookingIds.length === 0) return [];
      const { data: existing } = await supabase
        .from("reviews").select("booking_id")
        .eq("reviewer_id", user!.id).in("booking_id", bookingIds);
      const reviewed = new Set((existing ?? []).map((r: any) => r.booking_id));
      return (bks ?? []).filter((b: any) => !reviewed.has(b.id));
    },
    enabled: !!user,
  });

  const avgRating = receivedReviews && receivedReviews.length > 0
    ? (receivedReviews.reduce((s: number, r: any) => s + r.rating, 0) / receivedReviews.length).toFixed(1)
    : "—";

  const selectedBooking = useMemo(
    () => (reviewableBookings ?? []).find((b: any) => b.id === selectedBookingId),
    [reviewableBookings, selectedBookingId]
  );

  const submitReview = async () => {
    if (!user || !selectedBooking) return;
    setSaving(true);
    const { error } = await supabase.from("reviews").insert({
      reviewer_id: user.id,
      reviewed_id: (selectedBooking as any).venues?.owner_id,
      venue_id: (selectedBooking as any).venue_id,
      booking_id: (selectedBooking as any).id,
      rating,
      review_text: text || null,
      review_type: "influencer_to_venue",
      is_public: true,
    });
    setSaving(false);
    if (error) {
      toast({ title: t("creator.common.error"), description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: t("creator.reviews.submitted") });
    setWriteOpen(false);
    setSelectedBookingId(""); setRating(5); setText("");
    qc.invalidateQueries({ queryKey: ["given-reviews"] });
    qc.invalidateQueries({ queryKey: ["reviewable-bookings"] });
  };

  const renderStars = (r: number, onChange?: (n: number) => void) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          onClick={() => onChange?.(i)}
          className={`w-5 h-5 ${i <= r ? "text-gold fill-gold" : "text-muted-foreground"} ${onChange ? "cursor-pointer" : ""}`}
        />
      ))}
    </div>
  );

  const renderReview = (review: any) => (
    <div key={review.id} className="py-3 border-b border-border last:border-0">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          {renderStars(review.rating)}
          {review.venues?.name && <span className="text-sm text-muted-foreground">• {review.venues.name}</span>}
        </div>
        <span className="text-xs text-muted-foreground">{format(new Date(review.created_at), "PP", dateOpts())}</span>
      </div>
      {review.review_text && <p className="text-sm text-muted-foreground mt-1">{review.review_text}</p>}
    </div>
  );

  return (
    <DashboardLayout type="influencer">
      <div className="space-y-6">
        <div className="relative overflow-hidden rounded-[2rem] p-7 md:p-10 flex flex-wrap items-end justify-between gap-6 creator-hero">
          <div><p className="text-xs font-bold uppercase tracking-[0.18em] mb-3 creator-hero-eyebrow">{t("creator.reviews.eyebrow")}</p>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.02] creator-hero-title">{t("creator.reviews.title")}</h1>
            <p className="mt-3 text-base md:text-lg opacity-75 max-w-2xl">{t("creator.reviews.subtitle")}</p>
          </div>
          {/* Adnan, "Creator Page fixes" #10: hidden, not just disabled, until a completed visit exists. */}
          {reviewableBookings && reviewableBookings.length > 0 && (
            <Button onClick={() => setWriteOpen(true)} className="gradient-gold text-accent-foreground">
              <Pencil className="w-4 h-4 me-2" />
              {t("creator.reviews.writeCount", { n: reviewableBookings.length })}
            </Button>
          )}
        </div>

        <Card className="border-gold/20">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="w-20 h-20 rounded-3xl flex flex-col items-center justify-center shrink-0" style={{ background: "hsl(var(--venue-brand))", color: "hsl(var(--primary))" }}>
              <span className="text-3xl font-extrabold leading-none">{avgRating}</span>
              <span className="text-[10px] font-bold mt-1 opacity-80">/ 5</span>
            </div>
            <div>
              <p className="text-lg font-extrabold text-foreground">{t("creator.reviews.average")}</p>
              <p className="text-sm text-muted-foreground">{t("creator.reviews.receivedCount", { n: receivedReviews?.length ?? 0 })}</p>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="received">
          <TabsList>
            <TabsTrigger value="received">{t("creator.reviews.receivedTab", { n: receivedReviews?.length ?? 0 })}</TabsTrigger>
            <TabsTrigger value="given">{t("creator.reviews.givenTab", { n: givenReviews?.length ?? 0 })}</TabsTrigger>
          </TabsList>
          <TabsContent value="received" className="mt-4">
            <Card><CardContent className="pt-6">
              {receivedReviews?.map(renderReview)}
              {receivedReviews?.length === 0 && <div className="text-center py-10"><p className="text-xl font-extrabold text-foreground">{t("creator.reviews.emptyReceivedTitle")}</p><p className="text-sm text-muted-foreground mt-1">{t("creator.reviews.emptyReceivedBody")}</p></div>}
            </CardContent></Card>
          </TabsContent>
          <TabsContent value="given" className="mt-4">
            <Card><CardContent className="pt-6">
              {givenReviews?.map(renderReview)}
              {givenReviews?.length === 0 && <div className="text-center py-10"><p className="text-xl font-extrabold text-foreground">{t("creator.reviews.emptyGivenTitle")}</p><p className="text-sm text-muted-foreground mt-1">{t("creator.reviews.emptyGivenBody")}</p></div>}
            </CardContent></Card>
          </TabsContent>
        </Tabs>

        <Dialog open={writeOpen} onOpenChange={setWriteOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>{t("creator.reviews.write")}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">{t("creator.reviews.venueLabel")}</label>
                <select
                  value={selectedBookingId}
                  onChange={(e) => setSelectedBookingId(e.target.value)}
                  className="w-full mt-1 border border-border rounded-md p-2 bg-background"
                >
                  <option value="">{t("creator.reviews.selectBooking")}</option>
                  {(reviewableBookings ?? []).map((b: any) => (
                    <option key={b.id} value={b.id}>
                      {b.venues?.name ?? t("creator.common.venue")} — {b.completed_at ? format(new Date(b.completed_at), "PP", dateOpts()) : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">{t("creator.reviews.rating")}</label>
                <div className="mt-1">{renderStars(rating, setRating)}</div>
              </div>
              <div>
                <label className="text-sm font-medium">{t("creator.reviews.yourReview")}</label>
                <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={t("creator.reviews.placeholder")} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setWriteOpen(false)}>{t("common.cancel")}</Button>
              <Button onClick={submitReview} disabled={!selectedBookingId || saving} className="gradient-gold text-accent-foreground">
                {saving ? t("creator.reviews.submitting") : t("creator.reviews.submit")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default InfluencerReviews;
