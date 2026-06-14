import DashboardLayout from "@/components/DashboardLayout";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Plus, ChevronDown, ChevronRight, ChevronLeft, Bell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Campaign = { id: string; title: string; status: string; start_date: string | null; end_date: string | null };
type CulturalEvent = { id: string; title: string; start_date: string; end_date: string; has_notification: boolean; color: string | null };

const VenueCampaigns = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [venueId, setVenueId] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [culturalEvents, setCulturalEvents] = useState<CulturalEvent[]>([]);
  const [view, setView] = useState<"list" | "calendar">("list");
  const [activeOpen, setActiveOpen] = useState(true);
  const [scheduledOpen, setScheduledOpen] = useState(true);
  const [pausedOpen, setPausedOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 5, 1));

  const load = async () => {
    if (!user) return;
    const { data: venue } = await supabase.from("venues").select("id").eq("owner_id", user.id).order("created_at", { ascending: true }).limit(1).maybeSingle();
    if (!venue) return;
    setVenueId(venue.id);
    const sb: any = supabase;
    const cRes = await sb.from("campaigns").select("*").eq("venue_id", venue.id).order("created_at", { ascending: false });
    const eRes = await sb.from("cultural_events").select("*").order("start_date");
    setCampaigns((cRes.data as any) ?? []);
    setCulturalEvents((eRes.data as any) ?? []);
  };

  useEffect(() => { load(); }, [user]);

  const openNew = (_date?: string) => navigate("/venue/campaigns/new");

  const active = campaigns.filter(c => c.status === "active");
  const scheduled = campaigns.filter(c => c.status === "scheduled");
  const paused = campaigns.filter(c => c.status === "paused");

  // Calendar logic
  const monthName = currentMonth.toLocaleString("default", { month: "long", year: "numeric" });
  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7; // Monday=0
  const totalDays = lastDay.getDate();
  const today = new Date();
  const isToday = (d: number) => today.getFullYear() === currentMonth.getFullYear() && today.getMonth() === currentMonth.getMonth() && today.getDate() === d;

  const cells: ({ day: number; date: string } | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ day: d, date: dateStr });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const Section = ({ title, items, open, setOpen, count }: any) => (
    <div className="mb-6">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <span className="font-semibold text-foreground">{title}</span>
          <span className="text-xs text-muted-foreground">({count})</span>
        </div>
      </button>
      {open && (
        items.length === 0 ? (
          <div className="border-2 border-dashed rounded-xl p-6 text-center" style={{ borderColor: "#fbbf78" }}>
            <p className="text-sm font-medium" style={{ color: "#c2410c" }}>No {title.toLowerCase()} campaigns</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((c: Campaign) => (
              <div key={c.id} className="bg-white border border-border rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">{c.title}</p>
                  <p className="text-xs text-muted-foreground">{c.start_date ? new Date(c.start_date).toLocaleDateString() : "No start date"} → {c.end_date ? new Date(c.end_date).toLocaleDateString() : "—"}</p>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );

  return (
    <DashboardLayout type="venue">
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-[28px] font-bold text-foreground">Campaigns</h1>
          <Button onClick={() => openNew()} style={{ background: "#e8547a" }} className="text-white hover:opacity-90">
            <Plus className="w-4 h-4 mr-1.5" /> New Campaign
          </Button>
        </div>

        <div className="flex items-center justify-between mb-6 border-b border-border">
          <div className="flex gap-6">
            <button onClick={() => setView("list")} className={`pb-3 px-1 text-sm font-medium ${view === "list" ? "border-b-2 text-foreground" : "text-muted-foreground"}`} style={view === "list" ? { borderColor: "#e8547a" } : undefined}>
              List
            </button>
            <button onClick={() => setView("calendar")} className={`pb-3 px-1 text-sm font-medium flex items-center gap-2 ${view === "calendar" ? "border-b-2 text-foreground" : "text-muted-foreground"}`} style={view === "calendar" ? { borderColor: "#e8547a" } : undefined}>
              Calendar
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded text-white" style={{ background: "#e8547a" }}>NEW</span>
            </button>
          </div>
        </div>

        {view === "list" ? (
          <div>
            <Section title="Active" items={active} open={activeOpen} setOpen={setActiveOpen} count={active.length} />
            <Section title="Scheduled" items={scheduled} open={scheduledOpen} setOpen={setScheduledOpen} count={scheduled.length} />
            <Section title="Paused" items={paused} open={pausedOpen} setOpen={setPausedOpen} count={paused.length} />
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())}>Today</Button>
                <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="p-1.5 rounded hover:bg-white"><ChevronLeft className="w-4 h-4" /></button>
                <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="p-1.5 rounded hover:bg-white"><ChevronRight className="w-4 h-4" /></button>
                <span className="font-semibold text-foreground ml-2">{monthName}</span>
              </div>
              <div className="flex gap-1 bg-white border border-border rounded-lg p-1">
                <button className="px-3 py-1 text-xs font-medium rounded text-white" style={{ background: "#e8547a" }}>Monthly</button>
                <button className="px-3 py-1 text-xs font-medium rounded text-muted-foreground">Quarterly</button>
              </div>
            </div>

            <div className="bg-white border border-border rounded-2xl overflow-hidden">
              <div className="grid grid-cols-7 text-xs font-semibold text-muted-foreground border-b border-border">
                {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <div key={i} className="p-3 text-center">{d}</div>)}
              </div>
              <div className="grid grid-cols-7">
                {cells.map((cell, i) => {
                  if (!cell) return <div key={i} className="aspect-square border-r border-b border-border/40 bg-muted/20" />;
                  const todayCell = isToday(cell.day);
                  return (
                    <div key={i} className={`aspect-square border-r border-b border-border/40 p-1.5 relative group ${todayCell ? "bg-pink-50" : ""}`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-medium ${todayCell ? "w-6 h-6 rounded-full text-white flex items-center justify-center" : "text-foreground"}`} style={todayCell ? { background: "#e8547a" } : undefined}>
                          {cell.day}
                        </span>
                        {todayCell && (
                          <button onClick={() => openNew(cell.date)} className="w-5 h-5 rounded text-white text-xs flex items-center justify-center" style={{ background: "#e8547a" }}>
                            <Plus className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Cultural events */}
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Cultural Calendar</h3>
              <div className="flex flex-wrap gap-2">
                {culturalEvents
                  .filter(e => {
                    const s = new Date(e.start_date), end = new Date(e.end_date);
                    return s.getMonth() === currentMonth.getMonth() || end.getMonth() === currentMonth.getMonth();
                  })
                  .map(e => (
                    <span key={e.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium" style={{ background: "rgba(0,0,0,0.05)", color: "#333" }}>
                      {e.title}
                      {e.has_notification && <Bell className="w-3 h-3" style={{ color: "#e8547a" }} />}
                    </span>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>

    </DashboardLayout>
  );
};

export default VenueCampaigns;
