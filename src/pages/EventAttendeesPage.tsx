import DashboardLayout from "@/components/DashboardLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Row {
  id: string;
  status: string;
  created_at: string;
  checked_in_at: string | null;
  event_id: string;
  user_id: string;
  event_title?: string;
  venue_name?: string;
  attendee_name?: string;
}

interface Props { type: "admin" | "venue"; }

const EventAttendeesPage = ({ type }: Props) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("created_desc");
  const { toast } = useToast();

  const fetchAll = async () => {
    let eventQuery = supabase.from("events").select("id, title, venue_id, venues(name, owner_id)");
    if (type === "venue") {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: venue } = await supabase.from("venues").select("id").eq("owner_id", user.id).maybeSingle();
      if (!venue) { setRows([]); return; }
      eventQuery = eventQuery.eq("venue_id", venue.id);
    }
    const { data: events } = await eventQuery;
    const eventIds = (events ?? []).map((e: any) => e.id);
    if (!eventIds.length) { setRows([]); return; }
    const { data: atts } = await supabase
      .from("event_attendees")
      .select("id, status, created_at, checked_in_at, event_id, user_id")
      .in("event_id", eventIds)
      .order("created_at", { ascending: false });
    const list = (atts ?? []) as Row[];
    const userIds = [...new Set(list.map(r => r.user_id))];
    const { data: profiles } = userIds.length
      ? await supabase.rpc("get_public_profiles_basic", { _user_ids: userIds })
      : { data: [] as any[] } as any;
    const eventMap = new Map((events ?? []).map((e: any) => [e.id, e]));
    const profMap = new Map(((profiles ?? []) as any[]).map((p: any) => [p.user_id, p]));
    setRows(list.map(r => ({
      ...r,
      event_title: eventMap.get(r.event_id)?.title,
      venue_name: eventMap.get(r.event_id)?.venues?.name,
      attendee_name: profMap.get(r.user_id)?.full_name,
    })));
  };

  useEffect(() => { fetchAll(); }, []);

  const checkIn = async (id: string) => {
    const { error } = await supabase.from("event_attendees").update({ status: "attended", checked_in_at: new Date().toISOString() }).eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Checked in" }); fetchAll(); }
  };

  let filtered = rows.filter(r =>
    (r.event_title || "").toLowerCase().includes(search.toLowerCase()) ||
    (r.attendee_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (r.venue_name || "").toLowerCase().includes(search.toLowerCase())
  );
  if (statusFilter !== "all") filtered = filtered.filter(r => r.status === statusFilter);
  filtered = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case "created_asc": return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case "status": return a.status.localeCompare(b.status);
      default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  return (
    <DashboardLayout type={type}>
      <div className="animate-fade-in">
        <h1 className="text-3xl font-display font-bold text-foreground mb-2">Event <span className="text-gold">Attendees</span></h1>
        <p className="text-muted-foreground mb-6">{rows.length} registrations</p>

        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search event or attendee..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 bg-secondary border-border" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] bg-secondary border-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="registered">Registered</SelectItem>
              <SelectItem value="attended">Attended</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px] bg-secondary border-border"><SelectValue placeholder="Sort by" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="created_desc">Newest first</SelectItem>
              <SelectItem value="created_asc">Oldest first</SelectItem>
              <SelectItem value="status">Status</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="gradient-card rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Event</th>
                {type === "admin" && <th className="text-left p-4 text-sm font-medium text-muted-foreground">Venue</th>}
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Attendee</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Registered</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={type === "admin" ? 6 : 5} className="p-8 text-center text-muted-foreground">No registrations yet</td></tr>
              ) : filtered.map(r => (
                <tr key={r.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                  <td className="p-4 font-medium text-foreground">{r.event_title || "—"}</td>
                  {type === "admin" && <td className="p-4 text-muted-foreground">{r.venue_name || "—"}</td>}
                  <td className="p-4 text-muted-foreground">{r.attendee_name || "—"}</td>
                  <td className="p-4 text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="p-4">
                    <Badge className={
                      r.status === "attended" ? "bg-success/20 text-success border-success/30" :
                      r.status === "cancelled" ? "bg-destructive/20 text-destructive border-destructive/30" :
                      "bg-yellow-500/20 text-yellow-400 border-yellow-400/30"
                    }>{r.status}</Badge>
                  </td>
                  <td className="p-4">
                    {r.status !== "attended" && (
                      <Button size="sm" onClick={() => checkIn(r.id)} className="bg-success/20 text-success hover:bg-success/30 text-xs">Check in</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default EventAttendeesPage;
