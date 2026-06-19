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
import { useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";

const InfluencerReviews = () => {
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
    : "N/A";

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
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Review submitted" });
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
        <span className="text-xs text-muted-foreground">{format(new Date(review.created_at), "PP")}</span>
      </div>
      {review.review_text && <p className="text-sm text-muted-foreground mt-1">{review.review_text}</p>}
    </div>
  );

  return (
    <DashboardLayout type="influencer">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Reviews & Ratings</h1>
            <p className="text-muted-foreground">Your reputation on the platform</p>
          </div>
          <Button
            onClick={() => setWriteOpen(true)}
            disabled={!reviewableBookings || reviewableBookings.length === 0}
            className="gradient-gold text-accent-foreground"
          >
            <Pencil className="w-4 h-4 mr-2" />
            Write a review {reviewableBookings && reviewableBookings.length > 0 ? `(${reviewableBookings.length})` : ""}
          </Button>
        </div>

        <Card className="border-gold/20">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="text-4xl font-bold text-gold">{avgRating}</div>
            <div>
              <p className="text-sm font-medium">Average Rating</p>
              <p className="text-sm text-muted-foreground">{receivedReviews?.length ?? 0} reviews received</p>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="received">
          <TabsList>
            <TabsTrigger value="received">Received ({receivedReviews?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="given">Given ({givenReviews?.length ?? 0})</TabsTrigger>
          </TabsList>
          <TabsContent value="received" className="mt-4">
            <Card><CardContent className="pt-6">
              {receivedReviews?.map(renderReview)}
              {receivedReviews?.length === 0 && <p className="text-center text-muted-foreground py-4">No reviews received yet</p>}
            </CardContent></Card>
          </TabsContent>
          <TabsContent value="given" className="mt-4">
            <Card><CardContent className="pt-6">
              {givenReviews?.map(renderReview)}
              {givenReviews?.length === 0 && <p className="text-center text-muted-foreground py-4">No reviews given yet</p>}
            </CardContent></Card>
          </TabsContent>
        </Tabs>

        <Dialog open={writeOpen} onOpenChange={setWriteOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Write a review</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Venue (from completed bookings)</label>
                <select
                  value={selectedBookingId}
                  onChange={(e) => setSelectedBookingId(e.target.value)}
                  className="w-full mt-1 border border-border rounded-md p-2 bg-background"
                >
                  <option value="">Select a booking…</option>
                  {(reviewableBookings ?? []).map((b: any) => (
                    <option key={b.id} value={b.id}>
                      {b.venues?.name ?? "Venue"} — {b.completed_at ? format(new Date(b.completed_at), "PP") : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Rating</label>
                <div className="mt-1">{renderStars(rating, setRating)}</div>
              </div>
              <div>
                <label className="text-sm font-medium">Your review (optional)</label>
                <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Share your experience…" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setWriteOpen(false)}>Cancel</Button>
              <Button onClick={submitReview} disabled={!selectedBookingId || saving} className="gradient-gold text-accent-foreground">
                {saving ? "Submitting…" : "Submit review"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default InfluencerReviews;
