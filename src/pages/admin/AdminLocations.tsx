import DashboardLayout from "@/components/DashboardLayout";
import AdminPermissionGate from "@/components/admin/AdminPermissionGate";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { isValidName } from "@/lib/validation";

interface Location {
  id: string;
  city: string;
  area: string | null;
  country: string;
  is_active: boolean;
  created_at: string;
}

const AdminLocations = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [open, setOpen] = useState(false);
  const [newLoc, setNewLoc] = useState({ city: "", area: "", country: "UAE" });
  const { toast } = useToast();
  const { t } = useTranslation();

  const fetchLocations = async () => {
    const { data } = await supabase.from("service_locations").select("*").order("area").order("city");
    setLocations((data as Location[]) ?? []);
  };

  useEffect(() => { fetchLocations(); }, []);

  const handleCreate = async () => {
    if (!isValidName(newLoc.city)) {
      toast({ title: t("admin.locations.invalidCity"), description: t("admin.locations.cityMinChars"), variant: "destructive" });
      return;
    }
    if (!isValidName(newLoc.country)) {
      toast({ title: t("admin.locations.invalidCountry"), description: t("admin.locations.countryMinChars"), variant: "destructive" });
      return;
    }
    const { error } = await supabase
      .from("service_locations")
      .insert({ city: newLoc.city.trim(), area: newLoc.area.trim() || null, country: newLoc.country.trim(), is_active: true } as any);
    if (error) {
      toast({ title: t("admin.common.error"), description: error.message, variant: "destructive" });
    } else {
      toast({ title: t("admin.locations.locationAdded") });
      setOpen(false);
      setNewLoc({ city: "", area: "", country: "UAE" });
      fetchLocations();
    }
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from("service_locations").update({ is_active: !active } as any).eq("id", id);
    fetchLocations();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("service_locations").delete().eq("id", id);
    fetchLocations();
  };

  return (
    <DashboardLayout type="admin">
      <AdminPermissionGate permission="manage_locations">
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">{t("admin.locations.titlePrefix")} <span className="text-gold">{t("navLabel.Locations", "Locations")}</span></h1>
            <p className="text-muted-foreground mt-1">{t("admin.locations.countLabel", { count: locations.length })}</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-gold text-accent-foreground font-semibold">
                <Plus className="w-4 h-4 mr-2" /> {t("admin.locations.addLocation")}
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-foreground font-display">{t("admin.locations.newLocation")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">{t("admin.locations.city")}</Label>
                  <Input value={newLoc.city} onChange={e => setNewLoc(v => ({ ...v, city: e.target.value }))} placeholder="e.g. Dubai" className="bg-secondary border-border" />
                  {newLoc.city.trim() && !isValidName(newLoc.city) && (
                    <p className="text-xs text-destructive">{t("admin.locations.cityMinChars")}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">{t("admin.locations.areaOptional")}</Label>
                  <Input value={newLoc.area} onChange={e => setNewLoc(v => ({ ...v, area: e.target.value }))} placeholder="e.g. Metn" className="bg-secondary border-border" />
                  <p className="text-xs text-muted-foreground">{t("admin.locations.areaHint")}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">{t("admin.locations.country")}</Label>
                  <Input value={newLoc.country} onChange={e => setNewLoc(v => ({ ...v, country: e.target.value }))} placeholder="e.g. UAE" className="bg-secondary border-border" />
                  <p className="text-xs text-muted-foreground">{t("admin.locations.countryHint")}</p>
                </div>
                <Button onClick={handleCreate} className="w-full gradient-gold text-accent-foreground font-semibold">{t("admin.locations.addLocation")}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="gradient-card rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t("admin.locations.city")}</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t("admin.locations.area")}</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t("admin.locations.country")}</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t("admin.locations.status")}</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t("admin.culturalEvents.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {locations.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">{t("admin.locations.noLocations")}</td></tr>
              ) : (
                locations.map((loc) => (
                  <tr key={loc.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                    <td className="p-4 font-medium text-foreground">{loc.city}</td>
                    <td className="p-4 text-muted-foreground">{loc.area || "—"}</td>
                    <td className="p-4 text-muted-foreground">{loc.country}</td>
                    <td className="p-4">
                      <Badge className={loc.is_active ? "bg-success/20 text-success border-success/30" : "bg-destructive/20 text-destructive border-destructive/30"}>
                        {loc.is_active ? t("admin.locations.active") : t("admin.locations.inactive")}
                      </Badge>
                    </td>
                    <td className="p-4 flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => toggleActive(loc.id, loc.is_active)} className="text-muted-foreground hover:text-gold">
                        {loc.is_active ? t("admin.locations.deactivate") : t("admin.locations.activate")}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(loc.id)} className="text-muted-foreground hover:text-destructive">
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
      </AdminPermissionGate>
    </DashboardLayout>
  );
};

export default AdminLocations;
