import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, QrCode, Upload } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

const InfluencerBookings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: bookings } = useQuery({
    queryKey: ["my-bookings", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("bookings")
        .select("*, venues(name, city, logo_url), offers(title, offer_type)")
        .eq("influencer_id", user!.id)
        .order("scheduled_date", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const checkIn = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bookings").update({ checked_in_at: new Date().toISOString(), status: "checked_in" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Checked in successfully!" });
      queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
    },
  });

  const completeBooking = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bookings").update({ completed_at: new Date().toISOString(), status: "completed" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Visit marked as completed" });
      queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
    },
  });

  const upcoming = bookings?.filter((b: any) => ["upcoming", "checked_in"].includes(b.status)) ?? [];
  const past = bookings?.filter((b: any) => ["completed", "no_show", "cancelled"].includes(b.status)) ?? [];

  const statusColor = (s: string) => {
    switch (s) {
      case "upcoming": return "bg-blue-500/10 text-blue-500";
      case "checked_in": return "bg-green-500/10 text-green-500";
      case "completed": return "bg-primary/10 text-gold";
      case "no_show": return "bg-red-500/10 text-red-500";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const renderBooking = (booking: any) => (
    <Card key={booking.id}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{booking.offers?.title || "Visit"}</h3>
              <Badge className={statusColor(booking.status)}>{booking.status.replace("_", " ")}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{booking.venues?.name} • {booking.venues?.city}</p>
            <p className="text-sm text-muted-foreground">📅 {format(new Date(booking.scheduled_date), "PPP p")}</p>
            {booking.checked_in_at && (
              <p className="text-xs text-green-500">Checked in: {format(new Date(booking.checked_in_at), "PPP p")}</p>
            )}
            {booking.deliverable_deadline && (
              <p className="text-xs text-muted-foreground">Deliverable deadline: {format(new Date(booking.deliverable_deadline), "PPP")}</p>
            )}
          </div>
          <div className="flex gap-2">
            {booking.status === "upcoming" && (
              <Button size="sm" onClick={() => checkIn.mutate(booking.id)}>
                <QrCode className="w-4 h-4 mr-1" /> Check In
              </Button>
            )}
            {booking.status === "checked_in" && (
              <Button size="sm" onClick={() => completeBooking.mutate(booking.id)}>
                <Upload className="w-4 h-4 mr-1" /> Complete
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <DashboardLayout type="influencer">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">My Bookings</h1>
          <p className="text-muted-foreground">Manage your scheduled visits</p>
        </div>

        <Tabs defaultValue="upcoming">
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
            <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="upcoming" className="space-y-4 mt-4">
            {upcoming.map(renderBooking)}
            {upcoming.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <CalendarDays className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No upcoming bookings</p>
              </div>
            )}
          </TabsContent>
          <TabsContent value="past" className="space-y-4 mt-4">
            {past.map(renderBooking)}
            {past.length === 0 && <div className="text-center py-12 text-muted-foreground">No past bookings</div>}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default InfluencerBookings;
