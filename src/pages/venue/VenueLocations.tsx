import DashboardLayout from "@/components/DashboardLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MapPin, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import LocationAutocomplete, { PickedPlace } from "@/components/venue/LocationAutocomplete";

const VenueLocations = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [venues, setVenues] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [place, setPlace] = useState<PickedPlace | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("venues")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true });
    setVenues(data ?? []);
  };
  useEffect(() => { load(); }, [user]);

  const save = async () => {
    if (!user || !name || !place) {
      toast({ title: "Missing info", description: "Name and address are required.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const primary = venues[0];
    const { error } = await supabase.from("venues").insert({
      owner_id: user.id,
      name,
      address: place.address,
      city: place.city ?? null,
      country: place.country ?? null,
      zip_code: place.zip ?? null,
      latitude: place.latitude ?? null,
      longitude: place.longitude ?? null,
      category: primary?.category ?? "dining",
      brand_id: primary?.brand_id ?? null,
      approval_status: "approved",
      is_active: true,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Location added" });
    setOpen(false);
    setName(""); setPlace(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this location?")) return;
    const { error } = await supabase.from("venues").delete().eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Removed" }); load(); }
  };

  return (
    <DashboardLayout type="venue">
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-[28px] font-bold text-foreground">Locations</h1>
          <Button style={{ background: "#e8547a" }} className="text-white hover:opacity-90" onClick={() => setOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Add Location
          </Button>
        </div>

        {venues.length === 0 ? (
          <div className="bg-white border border-border rounded-2xl p-12 text-center">
            <p className="text-muted-foreground">No locations yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {venues.map(v => (
              <div key={v.id} className="bg-white border border-border rounded-2xl p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "#fce7eb" }}>
                  <MapPin className="w-5 h-5" style={{ color: "#e8547a" }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">{v.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      v.approval_status === "approved" ? "bg-green-100 text-green-700" :
                      v.approval_status === "rejected" ? "bg-red-100 text-red-700" :
                      "bg-yellow-100 text-yellow-700"
                    }`}>{v.approval_status}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{v.address || v.city || "No address"}</p>
                </div>
                {venues.length > 1 && (
                  <Button size="icon" variant="ghost" onClick={() => remove(v.id)}>
                    <Trash2 className="w-4 h-4 text-muted-foreground" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Location</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Location name</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Downtown Branch" />
              </div>
              <div>
                <Label>Address</Label>
                <LocationAutocomplete onPick={setPlace} placeholder="Search Google Maps…" />
                {place && <p className="text-xs text-muted-foreground mt-2">{place.address}</p>}
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save} disabled={saving} style={{ background: "#e8547a" }} className="text-white">
                {saving ? "Saving…" : "Add Location"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default VenueLocations;
