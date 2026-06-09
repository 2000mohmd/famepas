import DashboardLayout from "@/components/DashboardLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, ClipboardIllustration } from "@/components/venue/EmptyState";
import { QrCode, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface Booking {
  id: string;
  influencer_id: string;
  scheduled_date: string;
  status: string;
  checked_in_at: string | null;
  completed_at: string | null;
  created_at: string;
  offer_id: string | null;
  influencer_name?: string;
  offer_title?: string;
}

const VenueBookings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [tab, setTab] = useState<"new" | "upcoming" | "in_progress" | "completed">("new");
  const [showArchived, setShowArchived] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data: venue } = await supabase.from("venues").select("id").eq("owner_id", user.id).maybeSingle();
    if (!venue) return;
    const { data } = await supabase.from("bookings").select("*").eq("venue_id", venue.id).order("created_at", { ascending: false });
    if (!data) return;
    const infIds = [...new Set(data.map(b => b.influencer_id))];
    const offerIds = [...new Set(data.filter(b => b.offer_id).map(b => b.offer_id!))];
    const [pRes, oRes] = await Promise.all([
      infIds.length ? supabase.rpc("get_public_profiles_basic" as any, { _user_ids: infIds }) : { data: [] },
      offerIds.length ? supabase.from("offers").select("id, title").in("id", offerIds) : { data: [] },
    ]);
    setBookings(data.map(b => ({
      ...b,
      influencer_name: (pRes.data as any)?.find((p: any) => p.user_id === b.influencer_id)?.full_name || "Unknown",
      offer_title: b.offer_id ? (oRes.data as any)?.find((o: any) => o.id === b.offer_id)?.title || "—" : "—",
    })));
  };

  useEffect(() => { load(); }, [user]);

  const updateStatus = async (id: string, status: string, extra: Record<string, any> = {}) => {
    const { error } = await supabase.from("bookings").update({ status, ...extra }).eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: `Booking ${status}` }); load(); }
  };

  const now = new Date();
  const newApps = bookings.filter(b => b.status === "pending" || b.status === "applied");
  const upcoming = bookings.filter(b => ["upcoming", "confirmed"].includes(b.status) && new Date(b.scheduled_date) >= now);
  const inProgress = bookings.filter(b => b.status === "checked_in");
  const completed = bookings.filter(b => ["completed", "no_show"].includes(b.status));

  const data = { new: newApps, upcoming, in_progress: inProgress, completed }[tab];

  const tabs: { key: typeof tab; label: string; count: number }[] = [
    { key: "new", label: "New Applications", count: newApps.length },
    { key: "upcoming", label: "Upcoming", count: upcoming.length },
    { key: "in_progress", label: "In Progress", count: inProgress.length },
    { key: "completed", label: "Completed", count: completed.length },
  ];

  return (
    <DashboardLayout type="venue">
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-[28px] font-bold text-foreground">Bookings</h1>
          <button onClick={load} className="p-2 rounded-lg hover:bg-white">
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="flex items-center justify-between mb-6 border-b border-border">
          <div className="flex gap-6">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`pb-3 px-1 text-sm font-medium flex items-center gap-2 ${tab === t.key ? "border-b-2 text-foreground" : "text-muted-foreground"}`}
                style={tab === t.key ? { borderColor: "#e8547a" } : undefined}
              >
                {t.label}
                {t.count > 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: "#e8547a" }}>{t.count}</span>}
              </button>
            ))}
          </div>
          <button onClick={() => setShowArchived(!showArchived)} className="text-sm text-muted-foreground hover:text-foreground pb-3">
            Archived
          </button>
        </div>

        {data.length === 0 ? (
          <EmptyState
            icon={<ClipboardIllustration />}
            title="No Active Listings"
            description="Create a live listing to start receiving applications"
            action={
              <Button onClick={() => navigate("/venue/campaigns")} style={{ background: "#e8547a" }} className="text-white hover:opacity-90">
                Create Campaign
              </Button>
            }
          />
        ) : (
          <div className="bg-white border border-border rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Influencer</th>
                  <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Offer</th>
                  <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</th>
                  <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="text-right p-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map(b => (
                  <tr key={b.id} className="border-b border-border/40 hover:bg-muted/20">
                    <td className="p-4 font-medium text-foreground">{b.influencer_name}</td>
                    <td className="p-4 text-muted-foreground">{b.offer_title}</td>
                    <td className="p-4 text-muted-foreground">{new Date(b.scheduled_date).toLocaleDateString()}</td>
                    <td className="p-4"><Badge variant="secondary" className="capitalize">{b.status.replace("_", " ")}</Badge></td>
                    <td className="p-4 text-right">
                      <div className="flex gap-2 justify-end">
                        {(b.status === "pending" || b.status === "applied") && (
                          <>
                            <Button size="sm" onClick={() => updateStatus(b.id, "upcoming")} style={{ background: "#e8547a" }} className="text-white"><CheckCircle2 className="w-3 h-3 mr-1" />Accept</Button>
                            <Button size="sm" variant="ghost" onClick={() => updateStatus(b.id, "rejected")}><XCircle className="w-3 h-3 mr-1" />Decline</Button>
                          </>
                        )}
                        {b.status === "upcoming" && (
                          <Button size="sm" onClick={() => updateStatus(b.id, "checked_in", { checked_in_at: new Date().toISOString() })} variant="outline"><QrCode className="w-3 h-3 mr-1" />Check In</Button>
                        )}
                        {b.status === "checked_in" && (
                          <Button size="sm" onClick={() => updateStatus(b.id, "completed", { completed_at: new Date().toISOString() })} style={{ background: "#e8547a" }} className="text-white"><CheckCircle2 className="w-3 h-3 mr-1" />Complete</Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default VenueBookings;
