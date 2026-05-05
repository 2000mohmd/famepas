import DashboardLayout from "@/components/DashboardLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Search, ShieldCheck, ShieldOff, UserX, UserCheck, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface Influencer {
  user_id: string;
  full_name: string | null;
  instagram_handle: string | null;
  tiktok_handle: string | null;
  followers_count: number | null;
  tiktok_followers: number | null;
  influencer_score: number | null;
  is_verified: boolean;
  is_suspended: boolean;
  phone: string | null;
  created_at: string;
  avatar_url: string | null;
}

const stripAt = (h: string | null) => (h ? h.replace(/^@+/, "") : "");

const AdminInfluencers = () => {
  const { user } = useAuth();
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [warningOpen, setWarningOpen] = useState(false);
  const [warningTarget, setWarningTarget] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState("");
  const { toast } = useToast();

  const fetchInfluencers = async () => {
    const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "influencer");
    if (!roles?.length) return;
    const ids = roles.map(r => r.user_id);
    const { data } = await supabase
      .from("profiles")
      .select("user_id, full_name, instagram_handle, tiktok_handle, followers_count, tiktok_followers, is_verified, is_suspended, phone, created_at, avatar_url")
      .in("user_id", ids)
      .order("created_at", { ascending: false });
    setInfluencers((data as any) ?? []);
  };

  useEffect(() => { fetchInfluencers(); }, []);

  const toggleVerified = async (userId: string, current: boolean) => {
    const { error } = await supabase.from("profiles").update({ is_verified: !current } as any).eq("user_id", userId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: current ? "Verification removed" : "Influencer verified" });
      fetchInfluencers();
    }
  };

  const toggleSuspended = async (userId: string, current: boolean) => {
    const { error } = await supabase.from("profiles").update({ is_suspended: !current } as any).eq("user_id", userId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: current ? "Account reinstated" : "Account suspended" });
      fetchInfluencers();
    }
  };

  const sendWarning = async () => {
    if (!warningTarget || !warningMessage.trim() || !user) return;
    const { error } = await supabase.from("influencer_warnings" as any).insert({
      influencer_id: warningTarget,
      warning_message: warningMessage,
      issued_by: user.id,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Warning sent to influencer" });
      setWarningOpen(false);
      setWarningMessage("");
      setWarningTarget(null);
    }
  };

  let filtered = influencers.filter(i =>
    (i.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (i.instagram_handle || "").toLowerCase().includes(search.toLowerCase())
  );

  // Status filter
  if (statusFilter === "verified") filtered = filtered.filter(i => i.is_verified);
  else if (statusFilter === "suspended") filtered = filtered.filter(i => i.is_suspended);
  else if (statusFilter === "active") filtered = filtered.filter(i => !i.is_suspended && !i.is_verified);

  // Sort
  if (sortBy === "newest") filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  else if (sortBy === "oldest") filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  else if (sortBy === "followers") filtered.sort((a, b) => (b.followers_count || 0) - (a.followers_count || 0));
  else if (sortBy === "name") filtered.sort((a, b) => (a.full_name || "").localeCompare(b.full_name || ""));

  return (
    <DashboardLayout type="admin">
      <div className="animate-fade-in">
        <h1 className="text-3xl font-display font-bold text-foreground mb-2">Manage <span className="text-gold">Influencers</span></h1>
        <p className="text-muted-foreground mb-8">{influencers.length} influencers registered</p>

        <div className="flex flex-wrap gap-4 mb-6">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by name or @handle..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-secondary border-border" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px] bg-secondary border-border"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px] bg-secondary border-border"><SelectValue placeholder="Sort by" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="followers">Most IG Followers</SelectItem>
              <SelectItem value="tiktok">Most TikTok Followers</SelectItem>
              <SelectItem value="score">Highest Score</SelectItem>
              <SelectItem value="name">Name A-Z</SelectItem>
              <SelectItem value="name_desc">Name Z-A</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="gradient-card rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Name</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Instagram</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">TikTok</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Followers</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Joined</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No influencers found</td></tr>
              ) : (
                filtered.map((inf) => (
                  <tr key={inf.user_id} className={`border-b border-border/50 hover:bg-secondary/30 transition-colors ${inf.is_suspended ? "opacity-60" : ""}`}>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {inf.avatar_url ? (
                          <img src={inf.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover border border-border" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-secondary" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">{inf.full_name || "—"}</span>
                            {inf.is_verified && <ShieldCheck className="w-4 h-4 text-gold shrink-0" />}
                          </div>
                          {inf.phone && <p className="text-xs text-muted-foreground">{inf.phone}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-gold text-sm">{inf.instagram_handle ? `@${inf.instagram_handle}` : "—"}</td>
                    <td className="p-4 text-muted-foreground text-sm">{inf.tiktok_handle ? `@${inf.tiktok_handle}` : "—"}</td>
                    <td className="p-4 text-muted-foreground text-sm">
                      {inf.followers_count ? `IG: ${inf.followers_count.toLocaleString()}` : ""}
                      {inf.tiktok_followers ? ` / TK: ${inf.tiktok_followers.toLocaleString()}` : ""}
                      {!inf.followers_count && !inf.tiktok_followers ? "—" : ""}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        {inf.is_verified && <Badge className="bg-gold/20 text-gold border-gold/30 text-xs w-fit">Verified</Badge>}
                        {inf.is_suspended && <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-xs w-fit">Suspended</Badge>}
                        {!inf.is_verified && !inf.is_suspended && <Badge variant="secondary" className="text-xs w-fit">Active</Badge>}
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground text-sm">{new Date(inf.created_at).toLocaleDateString()}</td>
                    <td className="p-4">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => toggleVerified(inf.user_id, inf.is_verified)} className="text-muted-foreground hover:text-gold h-7 px-2" title={inf.is_verified ? "Remove verification" : "Verify"}>
                          {inf.is_verified ? <ShieldOff className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => toggleSuspended(inf.user_id, inf.is_suspended)} className="text-muted-foreground hover:text-destructive h-7 px-2" title={inf.is_suspended ? "Reinstate" : "Suspend"}>
                          {inf.is_suspended ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => { setWarningTarget(inf.user_id); setWarningOpen(true); }} className="text-muted-foreground hover:text-warning h-7 px-2" title="Send Warning">
                          <AlertTriangle className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Warning Dialog */}
        <Dialog open={warningOpen} onOpenChange={setWarningOpen}>
          <DialogContent className="bg-card border-border max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display text-foreground flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-warning" /> Send Warning
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label className="text-muted-foreground">Warning Message</Label>
                <Textarea
                  value={warningMessage}
                  onChange={e => setWarningMessage(e.target.value)}
                  placeholder="Describe the violation or issue..."
                  className="bg-secondary border-border mt-1"
                  rows={4}
                />
              </div>
              <Button onClick={sendWarning} disabled={!warningMessage.trim()} className="w-full bg-warning/20 text-warning hover:bg-warning/30 font-semibold">
                Send Warning
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AdminInfluencers;
