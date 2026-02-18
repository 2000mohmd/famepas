import DashboardLayout from "@/components/DashboardLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface Category { id: string; name: string; }
interface Location { id: string; city: string; }

interface Venue {
  id: string;
  name: string;
  category: string;
  city: string | null;
  is_active: boolean;
  created_at: string;
}

const AdminVenues = () => {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newVenue, setNewVenue] = useState({ name: "", category: "", city: "", email: "", password: "" });
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const { toast } = useToast();

  const fetchVenues = async () => {
    const { data } = await supabase.from("venues").select("id, name, category, city, is_active, created_at").order("created_at", { ascending: false });
    setVenues(data ?? []);
  };

  useEffect(() => { fetchVenues(); }, []);

  useEffect(() => {
    const fetchOptions = async () => {
      const [catRes, locRes] = await Promise.all([
        supabase.from("categories").select("id, name").eq("is_active", true).order("name"),
        supabase.from("service_locations").select("id, city").eq("is_active", true).order("city"),
      ]);
      setCategories((catRes.data as Category[]) ?? []);
      setLocations((locRes.data as Location[]) ?? []);
    };
    fetchOptions();
  }, []);

  const filtered = venues.filter(v => v.name.toLowerCase().includes(search.toLowerCase()));

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from("venues").update({ is_active: !active }).eq("id", id);
    fetchVenues();
  };

  const handleCreateVenue = async () => {
    if (!newVenue.name || !newVenue.email || !newVenue.password) {
      toast({ title: "Missing fields", description: "Name, email and password are required", variant: "destructive" });
      return;
    }
    setIsCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("create-user", {
        body: {
          email: newVenue.email,
          password: newVenue.password,
          role: "venue",
          venue_name: newVenue.name,
          venue_category: newVenue.category,
          venue_city: newVenue.city || null,
        },
      });

      if (res.error || res.data?.error) {
        throw new Error(res.data?.error || res.error?.message || "Failed to create venue");
      }

      toast({ title: "Venue created", description: `${newVenue.name} account is ready` });
      setOpen(false);
      setNewVenue({ name: "", category: "", city: "", email: "", password: "" });
      fetchVenues();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <DashboardLayout type="admin">
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Manage <span className="text-gold">Venues</span></h1>
            <p className="text-muted-foreground mt-1">{venues.length} venues registered</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-gold text-accent-foreground font-semibold">
                <Plus className="w-4 h-4 mr-2" /> Add Venue
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-foreground font-display">Create Venue Account</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Venue Name</Label>
                  <Input value={newVenue.name} onChange={e => setNewVenue(v => ({ ...v, name: e.target.value }))} placeholder="e.g. Sky Lounge" className="bg-secondary border-border" />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Login Email</Label>
                  <Input type="email" value={newVenue.email} onChange={e => setNewVenue(v => ({ ...v, email: e.target.value }))} placeholder="venue@example.com" className="bg-secondary border-border" />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Password</Label>
                  <Input type="password" value={newVenue.password} onChange={e => setNewVenue(v => ({ ...v, password: e.target.value }))} placeholder="Min 6 characters" className="bg-secondary border-border" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Category</Label>
                    <Select value={newVenue.category} onValueChange={val => setNewVenue(v => ({ ...v, category: val }))}>
                      <SelectTrigger className="bg-secondary border-border">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(c => (
                          <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                        ))}
                        {categories.length === 0 && <SelectItem value="dining">Dining</SelectItem>}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">City</Label>
                    <Select value={newVenue.city} onValueChange={val => setNewVenue(v => ({ ...v, city: val }))}>
                      <SelectTrigger className="bg-secondary border-border">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {locations.map(l => (
                          <SelectItem key={l.id} value={l.city}>{l.city}</SelectItem>
                        ))}
                        {locations.length === 0 && <SelectItem value="">Other</SelectItem>}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={handleCreateVenue} disabled={isCreating} className="w-full gradient-gold text-accent-foreground font-semibold">
                  {isCreating ? "Creating..." : "Create Venue Account"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search venues..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-secondary border-border" />
          </div>
        </div>

        <div className="gradient-card rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Name</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Category</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">City</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No venues found</td></tr>
              ) : (
                filtered.map((venue) => (
                  <tr key={venue.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                    <td className="p-4 font-medium text-foreground">{venue.name}</td>
                    <td className="p-4"><Badge variant="secondary" className="capitalize">{venue.category}</Badge></td>
                    <td className="p-4 text-muted-foreground">{venue.city || "—"}</td>
                    <td className="p-4">
                      <Badge className={venue.is_active ? "bg-success/20 text-success border-success/30" : "bg-destructive/20 text-destructive border-destructive/30"}>
                        {venue.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <Button variant="ghost" size="sm" onClick={() => toggleActive(venue.id, venue.is_active)} className="text-muted-foreground hover:text-gold">
                        {venue.is_active ? "Deactivate" : "Activate"}
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

export default AdminVenues;
