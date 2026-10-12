import DashboardLayout from "@/components/DashboardLayout";
import AdminPermissionGate from "@/components/admin/AdminPermissionGate";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, CheckCircle, XCircle, Building2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatLabel } from "./_format";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Offer {
  id: string;
  title: string;
  offer_type: string;
  is_active: boolean;
  current_redemptions: number;
  claims: number;
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
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { t } = useTranslation();

  const fetchOffers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("offers")
      .select("id, title, offer_type, is_active, max_redemptions, cover_image_url, image_url, created_at, venues(name, logo_url, is_active)")
      .order("created_at", { ascending: false });
    const list = (data as any[]) ?? [];

    // Derive live counts from offer_redemptions — offers.current_redemptions is a stale counter.
    const claimsMap: Record<string, number> = {};
    const completedMap: Record<string, number> = {};
    if (list.length) {
      const { data: reds } = await supabase
        .from("offer_redemptions")
        .select("offer_id, status")
        .in("offer_id", list.map((o) => o.id));
      (reds ?? []).forEach((r: any) => {
        claimsMap[r.offer_id] = (claimsMap[r.offer_id] ?? 0) + 1;
        if (["redeemed", "completed"].includes(r.status)) {
          completedMap[r.offer_id] = (completedMap[r.offer_id] ?? 0) + 1;
        }
      });
    }

    setOffers(
      list.map((o) => ({
        ...o,
        claims: claimsMap[o.id] ?? 0,
        current_redemptions: completedMap[o.id] ?? 0,
      })) as Offer[],
    );
    setLoading(false);
  };

  useEffect(() => { fetchOffers(); }, []);

  const toggleActive = async (id: string, active: boolean) => {
    const { error } = await supabase.from("offers").update({ is_active: !active } as any).eq("id", id);
    if (error) toast({ title: t("admin.common.error"), description: error.message, variant: "destructive" });
    else { toast({ title: active ? t("admin.offers.deactivated") : t("admin.offers.approvedActivated") }); fetchOffers(); }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("offers").delete().eq("id", deleteId);
    if (error) toast({ title: t("admin.common.error"), description: error.message, variant: "destructive" });
    else { toast({ title: t("admin.offers.offerDeleted") }); fetchOffers(); }
    setDeleteId(null);
  };

  let filtered = offers.filter(o =>
    (o.title || "").toLowerCase().includes(search.toLowerCase()) ||
    (o.venues?.name || "").toLowerCase().includes(search.toLowerCase())
  );
  if (statusFilter === "active") filtered = filtered.filter(o => o.is_active);
  else if (statusFilter === "inactive") filtered = filtered.filter(o => !o.is_active);
  if (venueStatusFilter === "active") filtered = filtered.filter(o => o.venues?.is_active);
  else if (venueStatusFilter === "inactive") filtered = filtered.filter(o => o.venues && !o.venues.is_active);
  filtered = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case "created_asc": return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case "title_asc": return (a.title || "").localeCompare(b.title || "");
      case "title_desc": return (b.title || "").localeCompare(a.title || "");
      case "redemptions_desc": return (b.current_redemptions || 0) - (a.current_redemptions || 0);
      case "redemptions_asc": return (a.current_redemptions || 0) - (b.current_redemptions || 0);
      default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  const activeOffers = offers.filter(o => o.is_active).length;
  const inactiveOffers = offers.filter(o => !o.is_active).length;

  return (
    <DashboardLayout type="admin">
      <AdminPermissionGate permission="manage_offers">
      <div className="animate-fade-in">
        <h1 className="text-3xl font-display font-bold text-foreground mb-2">{t("admin.offers.titlePrefix")} <span className="text-gold">{t("navLabel.Offers", "Offers")}</span></h1>
        <p className="text-muted-foreground mb-6">{t("admin.offers.summary", { total: offers.length, active: activeOffers, inactive: inactiveOffers })}</p>

        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder={t("admin.offers.searchPlaceholder")} value={search} onChange={e => setSearch(e.target.value)} className="pl-10 bg-secondary border-border" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] bg-secondary border-border"><SelectValue placeholder={t("admin.offers.offerStatus")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("admin.offers.allOffers")}</SelectItem>
              <SelectItem value="active">{t("admin.locations.active")}</SelectItem>
              <SelectItem value="inactive">{t("admin.locations.inactive")}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={venueStatusFilter} onValueChange={setVenueStatusFilter}>
            <SelectTrigger className="w-[180px] bg-secondary border-border"><SelectValue placeholder={t("admin.offers.venueStatus")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("navLabel.Venues", "Venues")}</SelectItem>
              <SelectItem value="active">{t("admin.offers.activeVenues")}</SelectItem>
              <SelectItem value="inactive">{t("admin.offers.inactiveVenues")}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px] bg-secondary border-border"><SelectValue placeholder={t("admin.offers.sortBy")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="created_desc">{t("admin.offers.newestFirst")}</SelectItem>
              <SelectItem value="created_asc">{t("admin.offers.oldestFirst")}</SelectItem>
              <SelectItem value="title_asc">{t("admin.offers.titleAZ")}</SelectItem>
              <SelectItem value="title_desc">{t("admin.offers.titleZA")}</SelectItem>
              <SelectItem value="redemptions_desc">{t("admin.offers.mostRedeemed")}</SelectItem>
              <SelectItem value="redemptions_asc">{t("admin.offers.leastRedeemed")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="gradient-card rounded-xl border border-border overflow-hidden">
          <div className="w-full overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t("navLabel.Offers", "Offer")}</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t("admin.events.venue")}</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t("admin.offers.type")}</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t("admin.offers.completedRedemptions")}</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t("admin.locations.status")}</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t("admin.culturalEvents.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">{t("admin.offers.loadingOffers")}</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">{t("admin.offers.noOffers")}</td></tr>
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
                    <td className="p-4"><Badge variant="secondary">{formatLabel(offer.offer_type)}</Badge></td>
                    <td className="p-4 text-muted-foreground">
                      <span className="text-foreground">{offer.current_redemptions}</span>{offer.max_redemptions ? `/${offer.max_redemptions}` : ""}
                      <span className="block text-xs">{t("admin.offers.claimsCount", { count: offer.claims })}</span>
                    </td>
                    <td className="p-4">
                      <Badge className={offer.is_active ? "bg-success/20 text-success border-success/30" : "bg-destructive/20 text-destructive border-destructive/30"}>
                        {offer.is_active ? t("admin.locations.active") : t("admin.locations.inactive")}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => toggleActive(offer.id, offer.is_active)} className="text-muted-foreground hover:text-gold h-7 px-2" title={offer.is_active ? t("admin.locations.deactivate") : t("admin.offers.approveActivate")}>
                          {offer.is_active ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteId(offer.id)} className="text-muted-foreground hover:text-destructive h-7 px-2" title={t("admin.offers.deleteOffer")}>
                          <Trash2 className="w-4 h-4" />
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
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.offers.deleteConfirm")}</AlertDialogTitle>
            <AlertDialogDescription>{t("admin.events.cannotUndo")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("admin.common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t("admin.common.delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </AdminPermissionGate>
    </DashboardLayout>
  );
};

export default AdminOffers;
