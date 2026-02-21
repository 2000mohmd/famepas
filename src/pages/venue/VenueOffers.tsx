import DashboardLayout from "@/components/DashboardLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, ImagePlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const VenueOffers = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [offers, setOffers] = useState<any[]>([]);
  const [venueId, setVenueId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    offer_type: "free",
    discount_value: "",
    requirements: "",
    image_url: "",
    min_followers: "",
    max_redemptions: "",
    starts_at: "",
    ends_at: "",
  });

  const fetchData = async () => {
    if (!user) return;
    const { data: venue } = await supabase.from("venues").select("id").eq("owner_id", user.id).maybeSingle();
    if (!venue) return;
    setVenueId(venue.id);
    const { data } = await supabase.from("offers").select("*").eq("venue_id", venue.id).order("created_at", { ascending: false });
    setOffers(data ?? []);
  };

  useEffect(() => { fetchData(); }, [user]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !venueId) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const filePath = `${venueId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("offer-images").upload(filePath, file);
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } else {
      const { data: { publicUrl } } = supabase.storage.from("offer-images").getPublicUrl(filePath);
      setForm(f => ({ ...f, image_url: publicUrl }));
    }
    setUploading(false);
  };

  const handleCreate = async () => {
    if (!venueId) return;
    const { error } = await supabase.from("offers").insert({
      venue_id: venueId,
      title: form.title,
      description: form.description,
      offer_type: form.offer_type,
      discount_value: form.discount_value ? Number(form.discount_value) : null,
      requirements: form.requirements || null,
      image_url: form.image_url || null,
      min_followers: form.min_followers ? Number(form.min_followers) : null,
      max_redemptions: form.max_redemptions ? Number(form.max_redemptions) : null,
      starts_at: form.starts_at || new Date().toISOString(),
      ends_at: form.ends_at || null,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Offer created!" });
      setOpen(false);
      setForm({ title: "", description: "", offer_type: "free", discount_value: "", requirements: "", image_url: "", min_followers: "", max_redemptions: "", starts_at: "", ends_at: "" });
      fetchData();
    }
  };

  return (
    <DashboardLayout type="venue">
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">My <span className="text-gold">Offers</span></h1>
            <p className="text-muted-foreground mt-1">{offers.length} offers</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-gold text-accent-foreground font-semibold">
                <Plus className="w-4 h-4 mr-2" /> New Offer
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-display text-foreground">Create New Offer</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label className="text-muted-foreground">Title</Label>
                  <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="bg-secondary border-border mt-1" />
                </div>
                <div>
                  <Label className="text-muted-foreground">Description</Label>
                  <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="bg-secondary border-border mt-1" />
                </div>

                {/* Image Upload */}
                <div>
                  <Label className="text-muted-foreground">Offer Image</Label>
                  <div className="mt-1">
                    {form.image_url ? (
                      <div className="relative">
                        <img src={form.image_url} alt="Offer" className="w-full h-40 object-cover rounded-lg border border-border" />
                        <Button size="sm" variant="ghost" onClick={() => setForm(f => ({ ...f, image_url: "" }))} className="absolute top-2 right-2 text-destructive bg-background/80 hover:bg-background">
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-gold/40 transition-colors bg-secondary/50">
                        <ImagePlus className="w-8 h-8 text-muted-foreground mb-2" />
                        <span className="text-sm text-muted-foreground">{uploading ? "Uploading..." : "Click to upload image"}</span>
                        <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
                      </label>
                    )}
                  </div>
                </div>

                <div>
                  <Label className="text-muted-foreground">Type</Label>
                  <select value={form.offer_type} onChange={e => setForm(f => ({ ...f, offer_type: e.target.value }))} className="w-full mt-1 rounded-lg bg-secondary border border-border p-2 text-foreground">
                    <option value="free">Free / Barter</option>
                    <option value="discount">Discount</option>
                    <option value="complimentary">Complimentary</option>
                    <option value="paid">Paid Collaboration</option>
                    <option value="event_invite">Event Invite</option>
                  </select>
                </div>
                {form.offer_type === "discount" && (
                  <div>
                    <Label className="text-muted-foreground">Discount %</Label>
                    <Input type="number" value={form.discount_value} onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))} className="bg-secondary border-border mt-1" />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Min Followers</Label>
                    <Input type="number" value={form.min_followers} onChange={e => setForm(f => ({ ...f, min_followers: e.target.value }))} placeholder="e.g. 5000" className="bg-secondary border-border mt-1" />
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Max Redemptions</Label>
                    <Input type="number" value={form.max_redemptions} onChange={e => setForm(f => ({ ...f, max_redemptions: e.target.value }))} placeholder="e.g. 10" className="bg-secondary border-border mt-1" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Start Date</Label>
                    <Input type="datetime-local" value={form.starts_at} onChange={e => setForm(f => ({ ...f, starts_at: e.target.value }))} className="bg-secondary border-border mt-1" />
                  </div>
                  <div>
                    <Label className="text-muted-foreground">End Date</Label>
                    <Input type="datetime-local" value={form.ends_at} onChange={e => setForm(f => ({ ...f, ends_at: e.target.value }))} className="bg-secondary border-border mt-1" />
                  </div>
                </div>

                {/* Requirements */}
                <div>
                  <Label className="text-muted-foreground">Deliverables & Requirements</Label>
                  <Textarea
                    value={form.requirements}
                    onChange={e => setForm(f => ({ ...f, requirements: e.target.value }))}
                    placeholder="e.g. 1 story + 1 reel, tag our account, use location tag, minimum 5k followers..."
                    className="bg-secondary border-border mt-1"
                    rows={3}
                  />
                </div>

                <Button onClick={handleCreate} className="w-full gradient-gold text-accent-foreground font-semibold">Create Campaign</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {offers.map((offer) => (
            <div key={offer.id} className="gradient-card rounded-xl border border-border overflow-hidden hover:border-gold/20 transition-all">
              {offer.image_url && (
                <img src={offer.image_url} alt={offer.title} className="w-full h-40 object-cover" />
              )}
              <div className="p-6">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-display font-bold text-foreground">{offer.title}</h3>
                  <Badge className={offer.is_active ? "bg-success/20 text-success border-success/30" : "bg-destructive/20 text-destructive border-destructive/30"}>
                    {offer.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{offer.description || "No description"}</p>
                {offer.requirements && (
                  <p className="text-xs text-gold/80 mb-4 border border-gold/20 rounded-md p-2 bg-gold/5">
                    <strong>Requirements:</strong> {offer.requirements}
                  </p>
                )}
                <div className="flex justify-between items-center text-sm">
                  <Badge variant="secondary" className="capitalize">{offer.offer_type}</Badge>
                  <span className="text-muted-foreground">{offer.current_redemptions} redeemed</span>
                </div>
              </div>
            </div>
          ))}
          {offers.length === 0 && (
            <div className="col-span-full text-center p-12 text-muted-foreground">
              No offers yet. Create your first offer!
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default VenueOffers;
