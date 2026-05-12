import DashboardLayout from "@/components/DashboardLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, CheckCircle, XCircle, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Offer {
  id: string;
  title: string;
  offer_type: string;
  is_active: boolean;
  current_redemptions: number;
  max_redemptions: number | null;
  cover_image_url: string | null;
  image_url: string | null;
  created_at: string;
  venues: { name: string; logo_url: string | null; is_active: boolean } | null;
}

const AdminOffers = () => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [venueStatusFilter, setVenueStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("created_desc");
  const { toast } = useToast();

  const fetchOffers = async () => {
    const { data } = await supabase
      .from("offers")
      .select("id, title, offer_type, is_active, current_redemptions, max_redemptions, cover_image_url, image_url, created_at, venues(name, logo_url, is_active)")
      .order("created_at", { ascending: false });
    setOffers((data as any) ?? []);
  };

  useEffect(() => { fetchOffers(); }, []);

  const toggleActive = async (id: string, active: boolean) => {
    const { error } = await supabase.from("offers").update({ is_active: !active } as any).eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: active ? "Offer deactivated" : "Offer approved & activated" }); fetchOffers(); }
  };

  const deleteOffer = async (id: string) => {
    if (!confirm("Delete this offer permanently?")) return;
    const { error } = await supabase.from("offers").delete().eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Offer deleted" }); fetchOffers(); }
  };

  let filtered = offers.filter(o =>
    (o.title || "").toLowerCase().includes(search.toLowerCase()) ||
    (o.venues?.name || "").toLowerCase().includes(search.toLowerCase())
  );
  if (statusFilter === "active") filtered = filtered.filter(o => o.is_active);
  else if (statusFilter === "inactive") filtered = filtered.filter(o => !o.is_active);
  if (venueStatusFilter === "active") filtered = filtered.filter(o => o.venues?.is_active);
  else if (venueStatusFilter === "inactive") filtered = filtered.filter(o => o.venues && !o.venues.is_active);

  const activeOffers = offers.filter(o => o.is_active).length;
  const inactiveOffers = offers.filter(o => !o.is_active).length;

  return (
    <DashboardLayout type="admin">
      <div className="animate-fade-in">
        <h1 className="text-3xl font-display font-bold text-foreground mb-2">All <span className="text-gold">Offers</span></h1>
        <p className="text-muted-foreground mb-6">{offers.length} total offers · {activeOffers} active · {inactiveOffers} inactive</p>

        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search offers or venues..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 bg-secondary border-border" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] bg-secondary border-border"><SelectValue placeholder="Offer status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All offers</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Select value={venueStatusFilter} onValueChange={setVenueStatusFilter}>
            <SelectTrigger className="w-[180px] bg-secondary border-border"><SelectValue placeholder="Venue status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All venues</SelectItem>
              <SelectItem value="active">Active venues</SelectItem>
              <SelectItem value="inactive">Inactive venues</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="gradient-card rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Offer</th>
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
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {offer.cover_image_url || offer.image_url ? (
                          <img src={offer.cover_image_url || offer.image_url!} alt="" className="w-10 h-10 rounded-lg object-cover border border-border" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-secondary" />
                        )}
                        <span className="font-medium text-foreground">{offer.title}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {offer.venues?.logo_url ? (
                          <img src={offer.venues.logo_url} alt="" className="w-7 h-7 rounded-full object-cover border border-border" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center"><Building2 className="w-3 h-3 text-muted-foreground" /></div>
                        )}
                        <span className="text-muted-foreground text-sm">{offer.venues?.name ?? "—"}</span>
                      </div>
                    </td>
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
