import DashboardLayout from "@/components/DashboardLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  const fetchOffers = async () => {
    const { data } = await supabase
      .from("offers")
      .select("id, title, offer_type, is_active, current_redemptions, max_redemptions, venues(name)")
      .order("created_at", { ascending: false });
    setOffers((data as any) ?? []);
  };

  useEffect(() => { fetchOffers(); }, []);

  const toggleActive = async (id: string, active: boolean) => {
    const { error } = await supabase.from("offers").update({ is_active: !active } as any).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: active ? "Offer deactivated" : "Offer approved & activated" });
      fetchOffers();
    }
  };

  const deleteOffer = async (id: string) => {
    if (!confirm("Delete this offer permanently?")) return;
    const { error } = await supabase.from("offers").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Offer deleted" });
      fetchOffers();
    }
  };

  const filtered = offers.filter(o =>
    (o.title || "").toLowerCase().includes(search.toLowerCase()) ||
    (o.venues?.name || "").toLowerCase().includes(search.toLowerCase())
  );

  const activeOffers = offers.filter(o => o.is_active).length;
  const inactiveOffers = offers.filter(o => !o.is_active).length;

  return (
    <DashboardLayout type="admin">
      <div className="animate-fade-in">
        <h1 className="text-3xl font-display font-bold text-foreground mb-2">All <span className="text-gold">Offers</span></h1>
        <p className="text-muted-foreground mb-6">{offers.length} total offers · {activeOffers} active · {inactiveOffers} inactive</p>

        <div className="relative max-w-md mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search offers or venues..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 bg-secondary border-border" />
        </div>

        <div className="gradient-card rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Title</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Venue</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Type</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Redemptions</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No offers found</td></tr>
              ) : (
                filtered.map((offer) => (
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
                    <td className="p-4">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => toggleActive(offer.id, offer.is_active)} className="text-muted-foreground hover:text-gold h-7 px-2" title={offer.is_active ? "Deactivate" : "Approve/Activate"}>
                          {offer.is_active ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteOffer(offer.id)} className="text-muted-foreground hover:text-destructive h-7 px-2" title="Delete offer">
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </div>
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
