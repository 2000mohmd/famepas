import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Mail, Phone, MapPin, Globe, User } from "lucide-react";

interface Props {
  venueId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export default function VenueDetailDialog({ venueId, open, onOpenChange, onApprove, onReject }: Props) {
  const [venue, setVenue] = useState<any>(null);
  const [owner, setOwner] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!venueId || !open) return;
    setLoading(true);
    (async () => {
      const { data: v } = await supabase.from("venues").select("*").eq("id", venueId).maybeSingle();
      setVenue(v);
      if (v?.owner_id) {
        const { data: p } = await supabase.from("profiles").select("full_name, avatar_url, phone").eq("user_id", v.owner_id).maybeSingle();
        setOwner(p);
      }
      setLoading(false);
    })();
  }, [venueId, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-foreground">Venue Details</DialogTitle>
        </DialogHeader>
        {loading || !venue ? (
          <p className="text-muted-foreground p-6 text-center">Loading…</p>
        ) : (
          <div className="space-y-5 mt-2">
            <div className="flex items-start gap-4">
              {venue.logo_url ? (
                <img src={venue.logo_url} alt="" className="w-20 h-20 rounded-lg object-cover border border-border" />
              ) : (
                <div className="w-20 h-20 rounded-lg bg-secondary" />
              )}
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-foreground">{venue.name}</h3>
                <div className="flex gap-2 mt-2 flex-wrap">
                  <Badge variant="secondary" className="capitalize">{venue.category}</Badge>
                  <Badge className={
                    venue.approval_status === "approved" ? "bg-success/20 text-success border-success/30" :
                    venue.approval_status === "pending" ? "bg-yellow-500/20 text-yellow-400 border-yellow-400/30" :
                    "bg-destructive/20 text-destructive border-destructive/30"
                  }>{venue.approval_status}</Badge>
                  <Badge className={venue.is_active ? "bg-success/20 text-success border-success/30" : "bg-muted text-muted-foreground"}>
                    {venue.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
            </div>

            {venue.description && <p className="text-sm text-muted-foreground leading-relaxed">{venue.description}</p>}

            {venue.cover_image_url && (
              <img src={venue.cover_image_url} alt="" className="w-full h-44 rounded-lg object-cover border border-border" />
            )}

            <div className="grid grid-cols-2 gap-3 text-sm">
              {venue.email && <div className="flex items-center gap-2 text-muted-foreground"><Mail className="w-4 h-4 text-gold" /> {venue.email}</div>}
              {(venue.phone || venue.contact_phone) && <div className="flex items-center gap-2 text-muted-foreground"><Phone className="w-4 h-4 text-gold" /> {venue.phone || venue.contact_phone}</div>}
              {venue.whatsapp_phone && <div className="flex items-center gap-2 text-muted-foreground"><Phone className="w-4 h-4 text-gold" /> WhatsApp: {venue.whatsapp_phone}</div>}
              {venue.website && <a href={venue.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-gold hover:underline"><Globe className="w-4 h-4" /> Website</a>}
              {venue.contact_person_name && <div className="flex items-center gap-2 text-muted-foreground"><User className="w-4 h-4 text-gold" /> {venue.contact_person_name}</div>}
              {(venue.city || venue.country) && <div className="flex items-center gap-2 text-muted-foreground col-span-2"><MapPin className="w-4 h-4 text-gold" /> {[venue.address_line1, venue.address_line2, venue.city, venue.zip_code, venue.country].filter(Boolean).join(", ")}</div>}
            </div>

            {owner && (
              <div className="border-t border-border pt-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Account Owner</p>
                <div className="flex items-center gap-3">
                  {owner.avatar_url ? (
                    <img src={owner.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-secondary" />
                  )}
                  <div>
                    <p className="text-sm text-foreground">{owner.full_name || "—"}</p>
                    {owner.phone && <p className="text-xs text-muted-foreground">{owner.phone}</p>}
                  </div>
                </div>
              </div>
            )}

            {venue.approval_status === "pending" && (
              <div className="flex gap-2 pt-4 border-t border-border">
                <Button className="flex-1 bg-success/20 text-success hover:bg-success/30" onClick={() => { onApprove(venue.id); onOpenChange(false); }}>
                  <Check className="w-4 h-4 mr-2" /> Approve
                </Button>
                <Button className="flex-1 bg-destructive/20 text-destructive hover:bg-destructive/30" onClick={() => { onReject(venue.id); onOpenChange(false); }}>
                  <X className="w-4 h-4 mr-2" /> Reject
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
