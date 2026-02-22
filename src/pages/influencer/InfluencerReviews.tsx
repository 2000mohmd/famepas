import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { format } from "date-fns";

const InfluencerReviews = () => {
  const { user } = useAuth();

  const { data: receivedReviews } = useQuery({
    queryKey: ["received-reviews", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("reviews")
        .select("*, venues(name)")
        .eq("reviewed_id", user!.id)
        .eq("is_hidden", false)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: givenReviews } = useQuery({
    queryKey: ["given-reviews", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("reviews")
        .select("*, venues(name)")
        .eq("reviewer_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const avgRating = receivedReviews && receivedReviews.length > 0
    ? (receivedReviews.reduce((s: number, r: any) => s + r.rating, 0) / receivedReviews.length).toFixed(1)
    : "N/A";

  const renderStars = (rating: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`w-4 h-4 ${i <= rating ? "text-gold fill-gold" : "text-muted-foreground"}`} />
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
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Reviews & Ratings</h1>
          <p className="text-muted-foreground">Your reputation on the platform</p>
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
            <Card>
              <CardContent className="pt-6">
                {receivedReviews?.map(renderReview)}
                {receivedReviews?.length === 0 && <p className="text-center text-muted-foreground py-4">No reviews received yet</p>}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="given" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                {givenReviews?.map(renderReview)}
                {givenReviews?.length === 0 && <p className="text-center text-muted-foreground py-4">No reviews given yet</p>}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default InfluencerReviews;
