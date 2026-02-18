import DashboardLayout from "@/components/DashboardLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Send, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Influencer {
  user_id: string;
  full_name: string | null;
  instagram_handle: string | null;
  followers_count: number | null;
}

interface Offer {
  id: string;
  title: string;
  offer_type: string;
}

interface Invitation {
  id: string;
  influencer_id: string;
  offer_id: string | null;
  status: string;
  message: string | null;
  scheduled_at: string | null;
  created_at: string;
  qr_code: string | null;
  influencer_name?: string;
  offer_title?: string;
}

const VenueInvitations = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [venueId, setVenueId] = useState<string | null>(null);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    influencer_id: "",
    offer_id: "",
    message: "",
    scheduled_at: "",
  });

  const fetchData = async () => {
    if (!user) return;
    const { data: venue } = await supabase.from("venues").select("id").eq("owner_id", user.id).maybeSingle();
    if (!venue) return;
    setVenueId(venue.id);

    const [invRes, offRes, roleRes] = await Promise.all([
      supabase.from("invitations").select("*").eq("venue_id", venue.id).order("created_at", { ascending: false }),
      supabase.from("offers").select("id, title, offer_type").eq("venue_id", venue.id).eq("is_active", true),
      supabase.from("user_roles").select("user_id").eq("role", "influencer"),
    ]);

    setOffers(offRes.data ?? []);

    // Fetch influencer profiles
    const infIds = (roleRes.data ?? []).map(r => r.user_id);
    if (infIds.length > 0) {
      const { data: profiles } = await supabase.from("profiles")
        .select("user_id, full_name, instagram_handle, followers_count")
        .in("user_id", infIds);
      setInfluencers(profiles ?? []);

      // Enrich invitations with names
      const invData = (invRes.data ?? []).map(inv => ({
        ...inv,
        influencer_name: profiles?.find(p => p.user_id === inv.influencer_id)?.full_name || "Unknown",
        offer_title: offRes.data?.find(o => o.id === inv.offer_id)?.title || "—",
      }));
      setInvitations(invData);
    } else {
      setInvitations(invRes.data ?? []);
    }
  };

  useEffect(() => { fetchData(); }, [user]);

  const handleSendInvitation = async () => {
    if (!venueId || !form.influencer_id) {
      toast({ title: "Error", description: "Please select an influencer", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("invitations").insert({
      venue_id: venueId,
      influencer_id: form.influencer_id,
      offer_id: form.offer_id || null,
      message: form.message || null,
      scheduled_at: form.scheduled_at || null,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Invitation sent!" });
      setOpen(false);
      setForm({ influencer_id: "", offer_id: "", message: "", scheduled_at: "" });
      fetchData();
    }
  };

  const filteredInvitations = invitations.filter(i =>
    (i.influencer_name || "").toLowerCase().includes(search.toLowerCase())
  );

  const statusColor = (status: string) => {
    switch (status) {
      case "accepted": return "bg-success/20 text-success border-success/30";
      case "declined": return "bg-destructive/20 text-destructive border-destructive/30";
      default: return "bg-warning/20 text-warning border-warning/30";
    }
  };

  return (
    <DashboardLayout type="venue">
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">
              <span className="text-gold">Invitations</span>
            </h1>
            <p className="text-muted-foreground mt-1">{invitations.length} invitations sent</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-gold text-accent-foreground font-semibold">
                <Send className="w-4 h-4 mr-2" /> Invite Influencer
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-display text-foreground">Send Invitation</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Select Influencer</Label>
                  <Select value={form.influencer_id} onValueChange={val => setForm(f => ({ ...f, influencer_id: val }))}>
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue placeholder="Choose an influencer" />
                    </SelectTrigger>
                    <SelectContent>
                      {influencers.map(inf => (
                        <SelectItem key={inf.user_id} value={inf.user_id}>
                          {inf.full_name || "Unknown"} {inf.instagram_handle ? `(@${inf.instagram_handle})` : ""} — {inf.followers_count?.toLocaleString() || 0} followers
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground">Attach Offer (Optional)</Label>
                  <Select value={form.offer_id} onValueChange={val => setForm(f => ({ ...f, offer_id: val }))}>
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue placeholder="Select an offer" />
                    </SelectTrigger>
                    <SelectContent>
                      {offers.map(o => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.title} ({o.offer_type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground">Scheduled Date (Optional)</Label>
                  <Input
                    type="datetime-local"
                    value={form.scheduled_at}
                    onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))}
                    className="bg-secondary border-border"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground">Personal Message</Label>
                  <Textarea
                    value={form.message}
                    onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                    placeholder="We'd love to have you visit..."
                    className="bg-secondary border-border"
                  />
                </div>

                <Button onClick={handleSendInvitation} className="w-full gradient-gold text-accent-foreground font-semibold">
                  Send Invitation
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative max-w-md mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search invitations..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 bg-secondary border-border" />
        </div>

        <div className="gradient-card rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Influencer</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Offer</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Scheduled</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">QR Code</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Sent</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvitations.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No invitations yet</td></tr>
              ) : (
                filteredInvitations.map(inv => (
                  <tr key={inv.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                    <td className="p-4 font-medium text-foreground">{inv.influencer_name}</td>
                    <td className="p-4 text-muted-foreground">{inv.offer_title}</td>
                    <td className="p-4 text-muted-foreground">
                      {inv.scheduled_at ? new Date(inv.scheduled_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="p-4">
                      <Badge className={statusColor(inv.status)}>{inv.status}</Badge>
                    </td>
                    <td className="p-4 text-gold font-mono text-sm">{inv.qr_code || "—"}</td>
                    <td className="p-4 text-muted-foreground">{new Date(inv.created_at).toLocaleDateString()}</td>
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

export default VenueInvitations;
