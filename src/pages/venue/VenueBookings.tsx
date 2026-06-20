import DashboardLayout from "@/components/DashboardLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, ClipboardIllustration } from "@/components/venue/EmptyState";
import { CheckCircle2, XCircle, RefreshCw, ChevronLeft, ChevronRight, List, Calendar as CalIcon, Instagram, Music2, KeyRound, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type Tab = "new" | "upcoming" | "in_progress" | "completed";

const PINK = "#b8923a";

interface Row {
  id: string;
  offer_id: string;
  influencer_id: string;
  status: string;
  created_at: string;
  redeemed_at: string | null;
  qr_token: string | null;
  qr_used_at: string | null;
  qr_code: string | null;
  profile?: any;
  offer?: any;
}

const VenueBookings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [tab, setTab] = useState<Tab>("new");
  const [view, setView] = useState<"list" | "calendar">("list");
  const [month, setMonth] = useState(new Date());
  const [redeemOpen, setRedeemOpen] = useState<Row | null>(null);
  const [otp, setOtp] = useState("");
  const [redeeming, setRedeeming] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data: ownerVenues } = await supabase.from("venues").select("id").eq("owner_id", user.id);
    const venueIds = (ownerVenues ?? []).map((v: any) => v.id);
    if (!venueIds.length) { setRows([]); return; }
    const { data: offers } = await supabase.from("offers").select("id, title, venue_id, image_url").in("venue_id", venueIds);
    const offerIds = (offers ?? []).map((o: any) => o.id);
    if (!offerIds.length) { setRows([]); return; }
    const { data } = await supabase.from("offer_redemptions").select("*").in("offer_id", offerIds).order("created_at", { ascending: false });
    const list = data ?? [];
    const infIds = [...new Set(list.map((r: any) => r.influencer_id))];
    const { data: profs } = infIds.length
      ? await supabase.rpc("get_public_profiles_basic" as any, { _user_ids: infIds })
      : { data: [] as any };
    const pmap = new Map((profs ?? []).map((p: any) => [p.user_id, p]));
    const omap = new Map((offers ?? []).map((o: any) => [o.id, o]));
    setRows(list.map((r: any) => ({ ...r, profile: pmap.get(r.influencer_id), offer: omap.get(r.offer_id) })));
  };

  useEffect(() => { load(); }, [user]);

  const updateStatus = async (r: Row, status: string, extra: Record<string, any> = {}) => {
    const { error } = await supabase.from("offer_redemptions").update({ status, ...extra }).eq("id", r.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: `Marked ${status.replace("_", " ")}` });
    load();
  };

  const verifyOtp = async () => {
    if (!redeemOpen) return;
    const code = otp.trim().toUpperCase();
    if (!code) return;
    setRedeeming(true);
    // Compare with stored qr_code on this redemption
    if ((redeemOpen.qr_code ?? "").toUpperCase() !== code) {
      setRedeeming(false);
      toast({ title: "Invalid code", description: "That OTP doesn't match this booking.", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("offer_redemptions").update({
      status: "redeemed",
      redeemed_at: new Date().toISOString(),
      qr_used_at: new Date().toISOString(),
    }).eq("id", redeemOpen.id);
    setRedeeming(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Booking completed", description: "Influencer checked in successfully." });
    setRedeemOpen(null); setOtp("");
    load();
  };

  // Bucket rows into tabs
  const isCompleted = (r: Row) => r.status === "redeemed" || !!r.qr_used_at;
  const newApps = rows.filter(r => r.status === "pending");
  const upcoming = rows.filter(r => r.status === "approved" && !isCompleted(r));
  const inProgress = rows.filter(r => r.status === "in_progress" && !isCompleted(r));
  const completed = rows.filter(r => isCompleted(r));

  const data = { new: newApps, upcoming, in_progress: inProgress, completed }[tab];

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "new", label: "New Applications", count: newApps.length },
    { key: "upcoming", label: "Upcoming", count: upcoming.length },
    { key: "in_progress", label: "In Progress", count: inProgress.length },
    { key: "completed", label: "Completed", count: completed.length },
  ];

  const statusBadge = (r: Row) => {
    if (isCompleted(r)) return <Badge style={{ background: "#dcfce7", color: "#166534" }}>Completed</Badge>;
    const map: Record<string, [string, string, string]> = {
      pending: ["#fef3c7", "#92400e", "Pending"],
      approved: ["#dbeafe", "#1e40af", "Approved"],
      in_progress: ["#fce7f3", "#9d174d", "In Progress"],
      rejected: ["#fee2e2", "#991b1b", "Rejected"],
    };
    const [bg, color, label] = map[r.status] ?? ["#f1f5f9", "#475569", r.status];
    return <Badge style={{ background: bg, color }}>{label}</Badge>;
  };

  const actions = (r: Row) => {
    if (isCompleted(r)) return <span className="text-xs text-muted-foreground">{r.redeemed_at && new Date(r.redeemed_at).toLocaleDateString()}</span>;
    switch (r.status) {
      case "pending":
        return <>
          <Button size="sm" onClick={() => updateStatus(r, "approved")} style={{ background: PINK }} className="text-white hover:opacity-90"><CheckCircle2 className="w-3 h-3 mr-1" />Accept</Button>
          <Button size="sm" variant="ghost" onClick={() => updateStatus(r, "rejected")}><XCircle className="w-3 h-3 mr-1" />Decline</Button>
        </>;
      case "approved":
        return <>
          <Button size="sm" variant="outline" onClick={() => updateStatus(r, "in_progress")}>Start Visit</Button>
          <Button size="sm" onClick={() => { setRedeemOpen(r); setOtp(""); }} style={{ background: PINK }} className="text-white hover:opacity-90"><KeyRound className="w-3 h-3 mr-1" />Verify OTP</Button>
        </>;
      case "in_progress":
        return <Button size="sm" onClick={() => { setRedeemOpen(r); setOtp(""); }} style={{ background: PINK }} className="text-white hover:opacity-90"><KeyRound className="w-3 h-3 mr-1" />Verify OTP</Button>;
    }
  };

  // Calendar
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const cells: ({ day: number; date: string } | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const dateStr = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ day: d, date: dateStr });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  const today = new Date();
  const isToday = (d: number) => today.getFullYear() === month.getFullYear() && today.getMonth() === month.getMonth() && today.getDate() === d;
  const rowsByDate: Record<string, Row[]> = {};
  upcoming.forEach(r => { const k = r.created_at.slice(0, 10); (rowsByDate[k] ??= []).push(r); });

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
                style={tab === t.key ? { borderColor: PINK } : undefined}
              >
                {t.label}
                {t.count > 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: PINK }}>{t.count}</span>}
              </button>
            ))}
          </div>
        </div>

        {tab === "upcoming" && (
          <div className="flex items-center gap-2 mb-4">
            <div className="flex bg-white border border-border rounded-lg p-1">
              <button onClick={() => setView("list")} className={`p-1.5 rounded ${view === "list" ? "bg-[hsl(42_65%_50%_/_0.10)] text-[#b8923a]" : "text-muted-foreground"}`}><List className="w-4 h-4" /></button>
              <button onClick={() => setView("calendar")} className={`p-1.5 rounded ${view === "calendar" ? "bg-[hsl(42_65%_50%_/_0.10)] text-[#b8923a]" : "text-muted-foreground"}`}><CalIcon className="w-4 h-4" /></button>
            </div>
            {view === "calendar" && (
              <>
                <Button variant="outline" size="sm" onClick={() => setMonth(new Date())}>Today</Button>
                <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="p-1.5 rounded hover:bg-white"><ChevronLeft className="w-4 h-4" /></button>
                <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="p-1.5 rounded hover:bg-white"><ChevronRight className="w-4 h-4" /></button>
                <span className="font-semibold text-foreground ml-1">{month.toLocaleString("default", { month: "long", year: "numeric" })}</span>
              </>
            )}
          </div>
        )}

        {data.length === 0 ? (
          <EmptyState
            icon={<ClipboardIllustration />}
            title={tab === "new" ? "No Applications" : tab === "upcoming" ? "Nothing Upcoming" : tab === "in_progress" ? "No Bookings In Progress" : "No Completed Bookings"}
            description={tab === "new" ? "We'll notify you when an influencer applies to your offers." : tab === "upcoming" ? "Approved bookings will appear here." : tab === "completed" ? "Verified bookings will appear here." : "Check approved applications and start their visit."}
            action={tab === "new" ? <Button onClick={() => navigate("/venue/offers")} style={{ background: PINK }} className="text-white hover:opacity-90">Manage Offers</Button> : undefined}
          />
        ) : tab === "upcoming" && view === "calendar" ? (
          <div className="bg-white border border-border rounded-2xl overflow-hidden">
            <div className="grid grid-cols-7 text-xs font-semibold text-muted-foreground border-b border-border">
              {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map(d => <div key={d} className="p-3 text-center">{d}</div>)}
            </div>
            <div className="grid grid-cols-7">
              {cells.map((cell, i) => {
                if (!cell) return <div key={i} className="min-h-[110px] border-r border-b border-border/40 bg-muted/20" />;
                const items = rowsByDate[cell.date] ?? [];
                return (
                  <div key={i} className={`min-h-[110px] border-r border-b border-border/40 p-2 ${isToday(cell.day) ? "bg-[hsl(42_65%_50%_/_0.06)]" : ""}`}>
                    <span className={`text-xs font-medium ${isToday(cell.day) ? "inline-flex w-6 h-6 rounded-full text-white items-center justify-center" : "text-foreground"}`} style={isToday(cell.day) ? { background: PINK } : undefined}>{cell.day}</span>
                    <div className="mt-1 space-y-1">
                      {items.slice(0, 3).map(r => (
                        <div key={r.id} className="text-[10px] truncate px-1.5 py-0.5 rounded" style={{ background: "#fce7f3", color: "#9d174d" }}>
                          {r.profile?.full_name ?? "Influencer"}
                        </div>
                      ))}
                      {items.length > 3 && <p className="text-[10px] text-muted-foreground">+{items.length - 3} more</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="grid gap-3">
            {data.map(r => {
              const p = r.profile || {};
              return (
                <div key={r.id} className="bg-white border border-border rounded-2xl p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={p.avatar_url} />
                    <AvatarFallback>{(p.full_name ?? "?").slice(0, 1)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground truncate">{p.full_name ?? "Influencer"}</p>
                      {statusBadge(r)}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{r.offer?.title ?? "Offer"}</p>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5">
                      {p.instagram_handle && <span className="inline-flex items-center gap-0.5"><Instagram className="w-3 h-3" />@{p.instagram_handle}</span>}
                      {p.tiktok_handle && <span className="inline-flex items-center gap-0.5"><Music2 className="w-3 h-3" />@{p.tiktok_handle}</span>}
                      <span>Applied {new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">{actions(r)}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={!!redeemOpen} onOpenChange={(o) => { if (!o) { setRedeemOpen(null); setOtp(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Verify OTP / QR Code</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Ask the influencer to show their booking code, then enter it below to complete the booking.</p>
          <Input value={otp} onChange={e => setOtp(e.target.value.toUpperCase())} placeholder="e.g. AB12CD34EF56" className="font-mono tracking-wider text-center" maxLength={20} />
          <Button onClick={verifyOtp} disabled={redeeming || !otp.trim()} style={{ background: PINK }} className="text-white hover:opacity-90 w-full">
            {redeeming ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4 mr-1" /> Verify & Complete</>}
          </Button>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default VenueBookings;
