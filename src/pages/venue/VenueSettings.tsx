import DashboardLayout from "@/components/DashboardLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const VenueSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [venue, setVenue] = useState<any>(null);
  const [form, setForm] = useState({ name: "", description: "", category: "dining", address: "", city: "", phone: "", email: "", website: "" });
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [locations, setLocations] = useState<{ id: string; city: string }[]>([]);

  useEffect(() => {
    const fetchOptions = async () => {
      const [catRes, locRes] = await Promise.all([
        supabase.from("categories").select("id, name").eq("is_active", true).order("name"),
        supabase.from("service_locations").select("id, city").eq("is_active", true).order("city"),
      ]);
      setCategories((catRes.data as any[]) ?? []);
      setLocations((locRes.data as any[]) ?? []);
    };
    fetchOptions();
  }, []);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase.from("venues").select("*").eq("owner_id", user.id).maybeSingle();
      if (data) {
        setVenue(data);
        setForm({
          name: data.name || "",
          description: data.description || "",
          category: data.category || "dining",
          address: data.address || "",
          city: data.city || "",
          phone: data.phone || "",
          email: data.email || "",
          website: data.website || "",
        });
      }
    };
    fetch();
  }, [user]);

  const handleSave = async () => {
    if (!venue) return;
    const { error } = await supabase.from("venues").update(form).eq("id", venue.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Settings saved!" });
    }
  };

  return (
    <DashboardLayout type="venue">
      <div className="animate-fade-in max-w-2xl">
        <h1 className="text-3xl font-display font-bold text-foreground mb-2">Venue <span className="text-gold">Settings</span></h1>
        <p className="text-muted-foreground mb-8">Update your venue information</p>

        <div className="gradient-card rounded-xl border border-border p-6 space-y-5">
          {[
            { label: "Venue Name", key: "name" },
            { label: "Description", key: "description" },
            { label: "Address", key: "address" },
            { label: "Phone", key: "phone" },
            { label: "Email", key: "email" },
            { label: "Website", key: "website" },
          ].map(({ label, key }) => (
            <div key={key}>
              <Label className="text-muted-foreground text-sm">{label}</Label>
              <Input
                value={(form as any)[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                className="bg-secondary border-border mt-1"
              />
            </div>
          ))}
          <div>
            <Label className="text-muted-foreground text-sm">Category</Label>
            <Select value={form.category} onValueChange={val => setForm(f => ({ ...f, category: val }))}>
              <SelectTrigger className="bg-secondary border-border mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {categories.map(c => (
                  <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                ))}
                {categories.length === 0 && <SelectItem value="dining">Dining</SelectItem>}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-muted-foreground text-sm">City</Label>
            <Select value={form.city} onValueChange={val => setForm(f => ({ ...f, city: val }))}>
              <SelectTrigger className="bg-secondary border-border mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {locations.map(l => (
                  <SelectItem key={l.id} value={l.city}>{l.city}</SelectItem>
                ))}
                {locations.length === 0 && <SelectItem value="">Other</SelectItem>}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSave} className="gradient-gold text-accent-foreground font-semibold">
            Save Settings
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default VenueSettings;
