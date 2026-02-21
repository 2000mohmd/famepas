import DashboardLayout from "@/components/DashboardLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDays, QrCode, CheckCircle2, XCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Booking {
  id: string;
  influencer_id: string;
  scheduled_date: string;
  status: string;
  checked_in_at: string | null;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  influencer_name?: string;
  offer_title?: string;
}

const VenueBookings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [venueId, setVenueId] = useState<string | null>(null);

  const fetchData = async () => {
    if (!user) return;
    const { data: venue } = await supabase.from("venues").select("id").eq("owner_id", user.id).maybeSingle();
    if (!venue) return;
    setVenueId(venue.id);

    const { data } = await supabase.from("bookings").select("*").eq("venue_id", venue.id).order("scheduled_date", { ascending: false });
    if (!data) return;

    const infIds = [...new Set(data.map(b => b.influencer_id))];
    const offerIds = [...new Set(data.filter(b => b.offer_id).map(b => b.offer_id!))];

    const [profRes, offRes] = await Promise.all([
      infIds.length > 0 ? supabase.from("profiles").select("user_id, full_name").in("user_id", infIds) : { data: [] },
      offerIds.length > 0 ? supabase.from("offers").select("id, title").in("id", offerIds) : { data: [] },
    ]);

    setBookings(data.map(b => ({
      ...b,
      influencer_name: profRes.data?.find(p => p.user_id === b.influencer_id)?.full_name || "Unknown",
      offer_title: b.offer_id ? offRes.data?.find(o => o.id === b.offer_id)?.title || "—" : "—",
    })));
  };

  useEffect(() => { fetchData(); }, [user]);

  const updateStatus = async (id: string, status: string, extra: Record<string, any> = {}) => {
    const { error } = await supabase.from("bookings").update({ status, ...extra }).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Booking ${status}` });
      fetchData();
    }
  };

  const checkIn = (id: string) => updateStatus(id, "checked_in", { checked_in_at: new Date().toISOString() });
  const complete = (id: string) => updateStatus(id, "completed", { completed_at: new Date().toISOString() });
  const noShow = (id: string) => updateStatus(id, "no_show");

  const now = new Date();
  const upcoming = bookings.filter(b => new Date(b.scheduled_date) >= now && !["completed", "no_show", "cancelled"].includes(b.status));
  const past = bookings.filter(b => new Date(b.scheduled_date) < now || ["completed", "no_show", "cancelled"].includes(b.status));

  const statusColor = (s: string) => {
    switch (s) {
      case "checked_in": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "completed": return "bg-success/20 text-success border-success/30";
      case "no_show": return "bg-destructive/20 text-destructive border-destructive/30";
      case "cancelled": return "bg-muted text-muted-foreground border-border";
      default: return "bg-warning/20 text-warning border-warning/30";
    }
  };

  const BookingRow = ({ b }: { b: Booking }) => (
    <tr className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
      <td className="p-4 font-medium text-foreground">{b.influencer_name}</td>
      <td className="p-4 text-muted-foreground">{b.offer_title}</td>
      <td className="p-4 text-muted-foreground">{new Date(b.scheduled_date).toLocaleDateString()}</td>
      <td className="p-4"><Badge className={statusColor(b.status)}>{b.status.replace("_", " ")}</Badge></td>
      <td className="p-4 text-sm text-muted-foreground">{b.checked_in_at ? new Date(b.checked_in_at).toLocaleTimeString() : "—"}</td>
      <td className="p-4">
        {b.status === "upcoming" && (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => checkIn(b.id)} className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 text-xs"><QrCode className="w-3 h-3 mr-1" />Check In</Button>
            <Button size="sm" variant="ghost" onClick={() => noShow(b.id)} className="text-destructive hover:bg-destructive/10 text-xs"><XCircle className="w-3 h-3 mr-1" />No-Show</Button>
          </div>
        )}
        {b.status === "checked_in" && (
          <Button size="sm" onClick={() => complete(b.id)} className="bg-success/20 text-success hover:bg-success/30 text-xs"><CheckCircle2 className="w-3 h-3 mr-1" />Complete</Button>
        )}
      </td>
    </tr>
  );

  return (
    <DashboardLayout type="venue">
      <div className="animate-fade-in">
        <h1 className="text-3xl font-display font-bold text-foreground mb-2">
          Bookings & <span className="text-gold">Visits</span>
        </h1>
        <p className="text-muted-foreground mb-8">{bookings.length} total bookings</p>

        <Tabs defaultValue="upcoming">
          <TabsList className="bg-secondary border border-border mb-6">
            <TabsTrigger value="upcoming" className="data-[state=active]:bg-gold/20 data-[state=active]:text-gold">
              <Clock className="w-4 h-4 mr-2" />Upcoming ({upcoming.length})
            </TabsTrigger>
            <TabsTrigger value="past" className="data-[state=active]:bg-gold/20 data-[state=active]:text-gold">
              <CalendarDays className="w-4 h-4 mr-2" />Past ({past.length})
            </TabsTrigger>
          </TabsList>

          {["upcoming", "past"].map(tab => (
            <TabsContent key={tab} value={tab}>
              <div className="gradient-card rounded-xl border border-border overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Influencer</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Offer</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Date</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Check-In</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(tab === "upcoming" ? upcoming : past).length === 0 ? (
                      <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No {tab} bookings</td></tr>
                    ) : (
                      (tab === "upcoming" ? upcoming : past).map(b => <BookingRow key={b.id} b={b} />)
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default VenueBookings;
