import DashboardLayout from "@/components/DashboardLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { MapPin, ImagePlus, X } from "lucide-react";
import TwoFactorToggle from "@/components/TwoFactorToggle";

const VenueSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [venue, setVenue] = useState<any>(null);
  const [organization, setOrganization] = useState<any>(null);
  const [brand, setBrand] = useState<any>(null);
  const [photos, setPhotos] = useState<{ id: string; url: string }[]>([]);
  const [form, setForm] = useState({
    name: "", description: "", category: "dining", address: "", city: "", country: "",
    phone: "", email: "", website: "", latitude: "", longitude: "",
    logo_url: "", cover_image_url: "",
    venue_type: "physical", address_line1: "", address_line2: "", zip_code: "",
    timezone: "", contact_person_name: "", contact_phone: "", whatsapp_phone: "",
    organization_name: "", organization_legal_name: "", organization_tax_id: "", organization_country: "",
    brand_name: "", brand_description: "",
  });
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [locations, setLocations] = useState<{ id: string; city: string; country: string | null }[]>([]);

  useEffect(() => {
    const fetchOptions = async () => {
      const [catRes, locRes] = await Promise.all([
        supabase.from("categories").select("id, name").eq("is_active", true).order("name"),
        supabase.from("service_locations").select("id, city, country").eq("is_active", true).order("city"),
      ]);
      setCategories((catRes.data as any[]) ?? []);
      setLocations((locRes.data as any[]) ?? []);
    };
    fetchOptions();
  }, []);

  useEffect(() => {
    if (!user) return;
    const fetchAll = async () => {
      const { data } = await supabase.from("venues").select("*").eq("owner_id", user.id).maybeSingle();
      if (data) {
        setVenue(data);
        const v: any = data;

        // Load brand + organization
        let brandRow: any = null; let orgRow: any = null;
        if (v.brand_id) {
          const { data: b } = await supabase.from("brands").select("*").eq("id", v.brand_id).maybeSingle();
          brandRow = b;
          if (b?.organization_id) {
            const { data: o } = await supabase.from("organizations").select("*").eq("id", b.organization_id).maybeSingle();
            orgRow = o;
          }
        }
        setBrand(brandRow);
        setOrganization(orgRow);

        // Load photos
        const { data: ph } = await supabase.from("venue_photos").select("id, url").eq("venue_id", v.id).order("position");
        setPhotos((ph as any[]) ?? []);

        setForm({
          name: v.name || "", description: v.description || "", category: v.category || "dining",
          address: v.address || "", city: v.city || "", country: v.country || "",
          phone: v.phone || "", email: v.email || "", website: v.website || "",
          latitude: v.latitude?.toString() || "", longitude: v.longitude?.toString() || "",
          logo_url: v.logo_url || "", cover_image_url: v.cover_image_url || "",
          venue_type: v.venue_type || "physical",
          address_line1: v.address_line1 || "", address_line2: v.address_line2 || "",
          zip_code: v.zip_code || "", timezone: v.timezone || "",
          contact_person_name: v.contact_person_name || "",
          contact_phone: v.contact_phone || "", whatsapp_phone: v.whatsapp_phone || "",
          organization_name: orgRow?.name || "",
          organization_legal_name: orgRow?.legal_name || "",
          organization_tax_id: orgRow?.tax_id || "",
          organization_country: orgRow?.country || "",
          brand_name: brandRow?.name || "",
          brand_description: brandRow?.description || "",
        });
      }
    };
    fetchAll();
  }, [user]);

  const handleCityChange = (city: string) => {
    const loc = locations.find(l => l.city === city);
    setForm(f => ({ ...f, city, country: loc?.country || f.country }));
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: "Geolocation not supported", variant: "destructive" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm(f => ({ ...f, latitude: pos.coords.latitude.toFixed(6), longitude: pos.coords.longitude.toFixed(6) }));
        toast({ title: "Location captured" });
      },
      () => toast({ title: "Could not get location", variant: "destructive" })
    );
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, kind: "logo" | "cover") => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const setter = kind === "logo" ? setUploadingLogo : setUploadingCover;
    setter(true);
    const ext = file.name.split(".").pop();
    const filePath = `${user.id}/${kind}-${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true });
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } else {
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(filePath);
      setForm(f => ({ ...f, [kind === "logo" ? "logo_url" : "cover_image_url"]: publicUrl }));
    }
    setter(false);
  };

  const handleSave = async () => {
    if (!venue) return;
    const lat = form.latitude ? parseFloat(form.latitude) : null;
    const lng = form.longitude ? parseFloat(form.longitude) : null;
    if ((form.latitude && isNaN(lat!)) || (form.longitude && isNaN(lng!))) {
      toast({ title: "Invalid coordinates", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("venues").update({
      name: form.name,
      description: form.description,
      category: form.category,
      address: form.address,
      city: form.city,
      country: form.country,
      phone: form.phone,
      email: form.email,
      website: form.website,
      latitude: lat,
      longitude: lng,
      logo_url: form.logo_url || null,
      cover_image_url: form.cover_image_url || null,
    } as any).eq("id", venue.id);
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
        <p className="text-muted-foreground mb-8">Update your venue information and map location</p>

        <div className="gradient-card rounded-xl border border-border p-6 space-y-5">
          {/* Logo + Cover */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground text-sm">Logo</Label>
              {form.logo_url ? (
                <div className="relative mt-1 w-28 h-28">
                  <img src={form.logo_url} alt="Logo" className="w-28 h-28 rounded-full object-cover border border-border" />
                  <button type="button" onClick={() => setForm(f => ({ ...f, logo_url: "" }))} className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-1">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <label className="mt-1 flex flex-col items-center justify-center w-28 h-28 rounded-full border-2 border-dashed border-border cursor-pointer hover:border-gold/40 bg-secondary/40">
                  <ImagePlus className="w-6 h-6 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground mt-1">{uploadingLogo ? "Uploading..." : "Logo"}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, "logo")} disabled={uploadingLogo} />
                </label>
              )}
            </div>
            <div>
              <Label className="text-muted-foreground text-sm">Cover Image</Label>
              {form.cover_image_url ? (
                <div className="relative mt-1">
                  <img src={form.cover_image_url} alt="Cover" className="w-full h-28 rounded-lg object-cover border border-border" />
                  <button type="button" onClick={() => setForm(f => ({ ...f, cover_image_url: "" }))} className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <label className="mt-1 flex flex-col items-center justify-center w-full h-28 rounded-lg border-2 border-dashed border-border cursor-pointer hover:border-gold/40 bg-secondary/40">
                  <ImagePlus className="w-6 h-6 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground mt-1">{uploadingCover ? "Uploading..." : "Upload cover"}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, "cover")} disabled={uploadingCover} />
                </label>
              )}
            </div>
          </div>

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
            <Select value={form.city} onValueChange={handleCityChange}>
              <SelectTrigger className="bg-secondary border-border mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {locations.map(l => (
                  <SelectItem key={l.id} value={l.city}>{l.city}{l.country ? ` (${l.country})` : ""}</SelectItem>
                ))}
                {locations.length === 0 && <SelectItem value="other">Other</SelectItem>}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-muted-foreground text-sm">Country</Label>
            <Input value={form.country} readOnly className="bg-secondary/50 border-border mt-1" placeholder="Auto-set from city" />
          </div>

          {/* Map Coordinates */}
          <div className="border border-gold/20 bg-gold/5 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-foreground font-semibold flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gold" /> Map Location
              </Label>
              <Button type="button" size="sm" variant="outline" onClick={useCurrentLocation}>Use My Location</Button>
            </div>
            <p className="text-xs text-muted-foreground">Required to show your venue on the explore map. You can also paste coordinates from Google Maps.</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-muted-foreground text-xs">Latitude</Label>
                <Input value={form.latitude} onChange={e => setForm(f => ({ ...f, latitude: e.target.value }))} placeholder="25.2048" className="bg-secondary border-border mt-1" />
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Longitude</Label>
                <Input value={form.longitude} onChange={e => setForm(f => ({ ...f, longitude: e.target.value }))} placeholder="55.2708" className="bg-secondary border-border mt-1" />
              </div>
            </div>
          </div>

          <TwoFactorToggle userId={user?.id} />

          <Button onClick={handleSave} className="gradient-gold text-accent-foreground font-semibold">
            Save Settings
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default VenueSettings;
