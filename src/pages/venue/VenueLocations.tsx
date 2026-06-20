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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import LocationAutocomplete, { PickedPlace } from "@/components/venue/LocationAutocomplete";

const VenueLocations = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [venue, setVenue] = useState<any>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [place, setPlace] = useState<PickedPlace | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    const { data: v } = await supabase
      .from("venues")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    setVenue(v);
    if (!v) { setLocations([]); return; }
    const { data: locs } = await supabase
      .from("venue_locations" as any)
      .select("*")
      .eq("venue_id", v.id)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true });
    setLocations((locs as any) ?? []);
  };
  useEffect(() => { load(); }, [user]);

  const save = async () => {
    if (!venue || !name || !place) {
      toast({ title: "Missing info", description: "Name and address are required.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("venue_locations" as any).insert({
      venue_id: venue.id,
      name,
      address: place.address,
      city: place.city ?? null,
      country: place.country ?? null,
      zip_code: place.zip ?? null,
      latitude: place.latitude ?? null,
      longitude: place.longitude ?? null,
      is_primary: locations.length === 0,
    } as any);
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
    const { error } = await supabase.from("venue_locations" as any).delete().eq("id", id);
    setConfirmDelete(null);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Removed" }); load(); }
  };

  return (
    <DashboardLayout type="venue">
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-[28px] font-bold text-foreground">Locations</h1>
          <Button style={{ background: "#b8923a" }} className="text-white hover:opacity-90" onClick={() => setOpen(true)} disabled={!venue}>
            <Plus className="w-4 h-4 mr-1.5" /> Add Location
          </Button>
        </div>

        {!venue ? (
          <div className="bg-white border border-border rounded-2xl p-12 text-center">
            <p className="text-muted-foreground">Create your venue profile first to add locations.</p>
          </div>
        ) : locations.length === 0 ? (
          <div className="bg-white border border-border rounded-2xl p-12 text-center">
            <p className="text-muted-foreground">No locations yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {locations.map(l => (
              <div key={l.id} className="bg-white border border-border rounded-2xl p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "#fce7eb" }}>
                  <MapPin className="w-5 h-5" style={{ color: "#b8923a" }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">{l.name}</h3>
                    {l.is_primary && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">Primary</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{l.address || l.city || "No address"}</p>
                </div>
                {!l.is_primary && (
                  <Button size="icon" variant="ghost" onClick={() => setConfirmDelete(l.id)}>
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
              <Button onClick={save} disabled={saving} style={{ background: "#b8923a" }} className="text-white">
                {saving ? "Saving…" : "Add Location"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!confirmDelete} onOpenChange={(v) => !v && setConfirmDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove this location?</AlertDialogTitle>
              <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => confirmDelete && remove(confirmDelete)}>Remove</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

export default VenueLocations;
