import DashboardLayout from "@/components/DashboardLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

interface Event {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  is_active: boolean;
  current_attendees: number;
  venues: { name: string } | null;
}

const AdminEvents = () => {
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("events").select("id, title, starts_at, ends_at, is_active, current_attendees, venues(name)").order("starts_at", { ascending: false });
      setEvents((data as any) ?? []);
    };
    fetch();
  }, []);

  return (
    <DashboardLayout type="admin">
      <div className="animate-fade-in">
        <h1 className="text-3xl font-display font-bold text-foreground mb-2">All <span className="text-gold">Events</span></h1>
        <p className="text-muted-foreground mb-8">{events.length} total events</p>

        <div className="gradient-card rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Title</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Venue</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Date</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Attendees</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No events yet</td></tr>
              ) : (
                events.map((event) => (
                  <tr key={event.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                    <td className="p-4 font-medium text-foreground">{event.title}</td>
                    <td className="p-4 text-muted-foreground">{event.venues?.name ?? "—"}</td>
                    <td className="p-4 text-muted-foreground">{new Date(event.starts_at).toLocaleDateString()}</td>
                    <td className="p-4 text-muted-foreground">{event.current_attendees}</td>
                    <td className="p-4">
                      <Badge className={event.is_active ? "bg-success/20 text-success border-success/30" : "bg-destructive/20 text-destructive border-destructive/30"}>
                        {event.is_active ? "Active" : "Inactive"}
                      </Badge>
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

export default AdminEvents;
