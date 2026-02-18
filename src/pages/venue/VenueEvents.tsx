import DashboardLayout from "@/components/DashboardLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const VenueEvents = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<any[]>([]);
  const [venueId, setVenueId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", starts_at: "" });

  const fetchData = async () => {
    if (!user) return;
    const { data: venue } = await supabase.from("venues").select("id").eq("owner_id", user.id).maybeSingle();
    if (!venue) return;
    setVenueId(venue.id);
    const { data } = await supabase.from("events").select("*").eq("venue_id", venue.id).order("starts_at", { ascending: false });
    setEvents(data ?? []);
  };

  useEffect(() => { fetchData(); }, [user]);

  const handleCreate = async () => {
    if (!venueId) return;
    const { error } = await supabase.from("events").insert({
      venue_id: venueId,
      title: form.title,
      description: form.description,
      starts_at: form.starts_at,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Event created!" });
      setOpen(false);
      setForm({ title: "", description: "", starts_at: "" });
      fetchData();
    }
  };

  return (
    <DashboardLayout type="venue">
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">My <span className="text-gold">Events</span></h1>
            <p className="text-muted-foreground mt-1">{events.length} events</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-gold text-accent-foreground font-semibold">
                <Plus className="w-4 h-4 mr-2" /> New Event
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="font-display text-foreground">Create New Event</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div><Label className="text-muted-foreground">Title</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="bg-secondary border-border mt-1" /></div>
                <div><Label className="text-muted-foreground">Description</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="bg-secondary border-border mt-1" /></div>
                <div><Label className="text-muted-foreground">Start Date</Label><Input type="datetime-local" value={form.starts_at} onChange={e => setForm(f => ({ ...f, starts_at: e.target.value }))} className="bg-secondary border-border mt-1" /></div>
                <Button onClick={handleCreate} className="w-full gradient-gold text-accent-foreground font-semibold">Create Event</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {events.map((event) => (
            <div key={event.id} className="gradient-card rounded-xl border border-border p-6 hover:border-gold/20 transition-all">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-display font-bold text-foreground">{event.title}</h3>
                <Badge className={event.is_active ? "bg-success/20 text-success border-success/30" : "bg-destructive/20 text-destructive border-destructive/30"}>
                  {event.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-4">{event.description || "No description"}</p>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gold">{new Date(event.starts_at).toLocaleDateString()}</span>
                <span className="text-muted-foreground">{event.current_attendees} attendees</span>
              </div>
            </div>
          ))}
          {events.length === 0 && (
            <div className="col-span-full text-center p-12 text-muted-foreground">
              No events yet. Create your first event!
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default VenueEvents;
