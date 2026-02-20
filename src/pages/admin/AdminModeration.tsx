import DashboardLayout from "@/components/DashboardLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Trash2, Star, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Review {
  id: string;
  review_text: string | null;
  rating: number;
  review_type: string;
  is_public: boolean;
  is_hidden: boolean;
  admin_note: string | null;
  created_at: string;
}

const AdminModeration = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "hidden" | "public">("all");
  const { toast } = useToast();

  const fetchReviews = async () => {
    const { data } = await supabase
      .from("reviews")
      .select("id, review_text, rating, review_type, is_public, is_hidden, admin_note, created_at")
      .order("created_at", { ascending: false });
    setReviews((data as any) ?? []);
  };

  useEffect(() => { fetchReviews(); }, []);

  const toggleHidden = async (id: string, hidden: boolean) => {
    const { error } = await supabase.from("reviews").update({ is_hidden: !hidden } as any).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: hidden ? "Review unhidden" : "Review hidden" });
      fetchReviews();
    }
  };

  const deleteReview = async (id: string) => {
    if (!confirm("Permanently delete this review?")) return;
    const { error } = await supabase.from("reviews").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Review deleted" });
      fetchReviews();
    }
  };

  const filtered = reviews.filter(r => {
    const matchSearch = !search || (r.review_text || "").toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || (filter === "hidden" ? r.is_hidden : !r.is_hidden);
    return matchSearch && matchFilter;
  });

  const renderStars = (rating: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`w-3 h-3 ${i <= rating ? "fill-gold text-gold" : "text-muted-foreground"}`} />
      ))}
    </div>
  );

  return (
    <DashboardLayout type="admin">
      <div className="animate-fade-in">
        <h1 className="text-3xl font-display font-bold text-foreground mb-2">
          Content <span className="text-gold">Moderation</span>
        </h1>
        <p className="text-muted-foreground mb-8">Review and moderate user-generated content</p>

        <div className="flex flex-wrap gap-4 mb-6">
          <div className="relative flex-1 min-w-64 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search reviews..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 bg-secondary border-border" />
          </div>
          <div className="flex gap-2">
            {(["all", "public", "hidden"] as const).map(f => (
              <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)} className={filter === f ? "gradient-gold text-accent-foreground" : "border-border text-muted-foreground"}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        <div className="gradient-card rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Review</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Rating</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Type</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Date</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No reviews found</td></tr>
              ) : (
                filtered.map((review) => (
                  <tr key={review.id} className={`border-b border-border/50 hover:bg-secondary/30 transition-colors ${review.is_hidden ? "opacity-50" : ""}`}>
                    <td className="p-4 max-w-xs">
                      <p className="text-sm text-foreground truncate">{review.review_text || <span className="text-muted-foreground italic">No text</span>}</p>
                    </td>
                    <td className="p-4">{renderStars(review.rating)}</td>
                    <td className="p-4">
                      <Badge variant="secondary" className="capitalize text-xs">{review.review_type}</Badge>
                    </td>
                    <td className="p-4">
                      {review.is_hidden ? (
                        <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-xs">Hidden</Badge>
                      ) : (
                        <Badge className="bg-success/20 text-success border-success/30 text-xs">Visible</Badge>
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
      </div>
    </DashboardLayout>
  );
};

export default AdminModeration;
