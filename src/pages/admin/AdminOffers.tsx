import DashboardLayout from "@/components/DashboardLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

interface Offer {
  id: string;
  title: string;
  offer_type: string;
  is_active: boolean;
  current_redemptions: number;
  max_redemptions: number | null;
  venues: { name: string } | null;
}

const AdminOffers = () => {
  const [offers, setOffers] = useState<Offer[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("offers").select("id, title, offer_type, is_active, current_redemptions, max_redemptions, venues(name)").order("created_at", { ascending: false });
      setOffers((data as any) ?? []);
    };
    fetch();
  }, []);

  return (
    <DashboardLayout type="admin">
      <div className="animate-fade-in">
        <h1 className="text-3xl font-display font-bold text-foreground mb-2">All <span className="text-gold">Offers</span></h1>
        <p className="text-muted-foreground mb-8">{offers.length} total offers</p>

        <div className="gradient-card rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Title</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Venue</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Type</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Redemptions</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {offers.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No offers yet</td></tr>
              ) : (
                offers.map((offer) => (
                  <tr key={offer.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                    <td className="p-4 font-medium text-foreground">{offer.title}</td>
                    <td className="p-4 text-muted-foreground">{offer.venues?.name ?? "—"}</td>
                    <td className="p-4"><Badge variant="secondary" className="capitalize">{offer.offer_type}</Badge></td>
                    <td className="p-4 text-muted-foreground">{offer.current_redemptions}{offer.max_redemptions ? `/${offer.max_redemptions}` : ""}</td>
                    <td className="p-4">
                      <Badge className={offer.is_active ? "bg-success/20 text-success border-success/30" : "bg-destructive/20 text-destructive border-destructive/30"}>
                        {offer.is_active ? "Active" : "Inactive"}
                      </Badge>
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

export default AdminOffers;
