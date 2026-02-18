import DashboardLayout from "@/components/DashboardLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const VenueRedemptions = () => {
  const { user } = useAuth();
  const [redemptions, setRedemptions] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data: venue } = await supabase.from("venues").select("id").eq("owner_id", user.id).maybeSingle();
      if (!venue) return;
      const { data: offers } = await supabase.from("offers").select("id, title").eq("venue_id", venue.id);
      if (!offers?.length) return;
      const offerIds = offers.map(o => o.id);
      const { data } = await supabase.from("offer_redemptions").select("*").in("offer_id", offerIds).order("created_at", { ascending: false });
      setRedemptions((data ?? []).map(r => ({ ...r, offer_title: offers.find(o => o.id === r.offer_id)?.title })));
    };
    fetch();
  }, [user]);

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("offer_redemptions").update({ status, redeemed_at: status === "approved" ? new Date().toISOString() : null }).eq("id", id);
    setRedemptions(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  };

  return (
    <DashboardLayout type="venue">
      <div className="animate-fade-in">
        <h1 className="text-3xl font-display font-bold text-foreground mb-2">
          Offer <span className="text-gold">Redemptions</span>
        </h1>
        <p className="text-muted-foreground mb-8">{redemptions.length} redemption requests</p>

        <div className="gradient-card rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Offer</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Date</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {redemptions.length === 0 ? (
                <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No redemptions yet</td></tr>
              ) : (
                redemptions.map((r) => (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                    <td className="p-4 font-medium text-foreground">{r.offer_title || "—"}</td>
                    <td className="p-4 text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                    <td className="p-4">
                      <Badge className={
                        r.status === "approved" ? "bg-success/20 text-success border-success/30" :
                        r.status === "rejected" ? "bg-destructive/20 text-destructive border-destructive/30" :
                        "bg-warning/20 text-warning border-warning/30"
                      }>
                        {r.status}
                      </Badge>
                    </td>
                    <td className="p-4">
                      {r.status === "pending" && (
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => updateStatus(r.id, "approved")} className="bg-success/20 text-success hover:bg-success/30 text-xs">Approve</Button>
                          <Button size="sm" variant="ghost" onClick={() => updateStatus(r.id, "rejected")} className="text-destructive hover:bg-destructive/10 text-xs">Reject</Button>
                        </div>
                      )}
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

export default VenueRedemptions;
