import DashboardLayout from "@/components/DashboardLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface Location {
  id: string;
  city: string;
  country: string;
  is_active: boolean;
  created_at: string;
}

const AdminLocations = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [open, setOpen] = useState(false);
  const [newLoc, setNewLoc] = useState({ city: "", country: "UAE" });
  const { toast } = useToast();

  const fetchLocations = async () => {
    const { data } = await supabase.from("service_locations").select("*").order("city");
    setLocations((data as Location[]) ?? []);
  };

  useEffect(() => { fetchLocations(); }, []);

  const handleCreate = async () => {
    if (!newLoc.city) {
      toast({ title: "City is required", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("service_locations").insert({ city: newLoc.city, country: newLoc.country } as any);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Location added" });
      setOpen(false);
      setNewLoc({ city: "", country: "UAE" });
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
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Service <span className="text-gold">Locations</span></h1>
            <p className="text-muted-foreground mt-1">{locations.length} locations</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-gold text-accent-foreground font-semibold">
                <Plus className="w-4 h-4 mr-2" /> Add Location
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-foreground font-display">New Location</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">City</Label>
                  <Input value={newLoc.city} onChange={e => setNewLoc(v => ({ ...v, city: e.target.value }))} placeholder="e.g. Dubai" className="bg-secondary border-border" />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Country</Label>
                  <Input value={newLoc.country} onChange={e => setNewLoc(v => ({ ...v, country: e.target.value }))} placeholder="e.g. UAE" className="bg-secondary border-border" />
                </div>
                <Button onClick={handleCreate} className="w-full gradient-gold text-accent-foreground font-semibold">Add Location</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="gradient-card rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">City</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Country</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {locations.length === 0 ? (
                <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No locations yet</td></tr>
              ) : (
                locations.map((loc) => (
                  <tr key={loc.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                    <td className="p-4 font-medium text-foreground">{loc.city}</td>
                    <td className="p-4 text-muted-foreground">{loc.country}</td>
                    <td className="p-4">
                      <Badge className={loc.is_active ? "bg-success/20 text-success border-success/30" : "bg-destructive/20 text-destructive border-destructive/30"}>
                        {loc.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="p-4 flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => toggleActive(loc.id, loc.is_active)} className="text-muted-foreground hover:text-gold">
                        {loc.is_active ? "Deactivate" : "Activate"}
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
    </DashboardLayout>
  );
};

export default AdminLocations;
