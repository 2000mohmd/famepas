import DashboardLayout from "@/components/DashboardLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Row {
  id: string;
  status: string;
  created_at: string;
  redeemed_at: string | null;
  offer_id: string;
  influencer_id: string;
  offer_title?: string;
  venue_name?: string;
  influencer_name?: string;
}

const AdminRedemptions = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("created_desc");
  const { toast } = useToast();

  const fetchAll = async () => {
      const { data: reds } = await supabase
        .from("offer_redemptions")
        .select("id, status, created_at, redeemed_at, offer_id, influencer_id")
        .order("created_at", { ascending: false });
      const list = (reds ?? []) as Row[];
      const offerIds = [...new Set(list.map(r => r.offer_id))];
      const userIds = [...new Set(list.map(r => r.influencer_id))];
      const [{ data: offers }, { data: profiles }] = await Promise.all([
        offerIds.length
          ? supabase.from("offers").select("id, title, venues(name)").in("id", offerIds)
          : Promise.resolve({ data: [] as any[] }),
        userIds.length
          ? supabase.rpc("get_public_profiles_basic", { _user_ids: userIds })
          : Promise.resolve({ data: [] as any[] }),
      ]);
      const offerMap = new Map((offers ?? []).map((o: any) => [o.id, o]));
      const profMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p]));
      setRows(list.map(r => ({
        ...r,
        offer_title: offerMap.get(r.offer_id)?.title,
        venue_name: offerMap.get(r.offer_id)?.venues?.name,
        influencer_name: profMap.get(r.influencer_id)?.full_name,
      })));
    };

  useEffect(() => { fetchAll(); }, []);

  const updateStatus = async (id: string, status: "approved" | "rejected") => {
    const patch: any = { status };
    if (status === "approved") patch.redeemed_at = new Date().toISOString();
    const { error } = await supabase.from("offer_redemptions").update(patch).eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: `Redemption ${status}` }); fetchAll(); }
  };

  let filtered = rows.filter(r =>
    (r.offer_title || "").toLowerCase().includes(search.toLowerCase()) ||
    (r.influencer_name || "").toLowerCase().includes(search.toLowerCase()) ||
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
    <DashboardLayout type="admin">
      <div className="animate-fade-in">
        <h1 className="text-3xl font-display font-bold text-foreground mb-2">Offer <span className="text-gold">Attendance</span></h1>
        <p className="text-muted-foreground mb-6">{rows.length} total redemptions across all venues</p>

        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search offer, venue or influencer..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 bg-secondary border-border" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] bg-secondary border-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
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
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Offer</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Venue</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Influencer</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Date</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No redemptions found</td></tr>
              ) : filtered.map(r => (
                <tr key={r.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                  <td className="p-4 font-medium text-foreground">{r.offer_title || "—"}</td>
                  <td className="p-4 text-muted-foreground">{r.venue_name || "—"}</td>
                  <td className="p-4 text-muted-foreground">{r.influencer_name || "—"}</td>
                  <td className="p-4 text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="p-4">
                    <Badge className={
                      r.status === "approved" ? "bg-success/20 text-success border-success/30" :
                      r.status === "rejected" ? "bg-destructive/20 text-destructive border-destructive/30" :
                      "bg-yellow-500/20 text-yellow-400 border-yellow-400/30"
                    }>{r.status}</Badge>
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

export default AdminRedemptions;
