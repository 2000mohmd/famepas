import DashboardLayout from "@/components/DashboardLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface Influencer {
  user_id: string;
  full_name: string | null;
  instagram_handle: string | null;
  followers_count: number | null;
  created_at: string;
}

const AdminInfluencers = () => {
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetch = async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "influencer");
      if (!roles?.length) return;
      const ids = roles.map(r => r.user_id);
      const { data } = await supabase.from("profiles").select("user_id, full_name, instagram_handle, followers_count, created_at").in("user_id", ids);
      setInfluencers(data ?? []);
    };
    fetch();
  }, []);

  const filtered = influencers.filter(i => (i.full_name || "").toLowerCase().includes(search.toLowerCase()));

  return (
    <DashboardLayout type="admin">
      <div className="animate-fade-in">
        <h1 className="text-3xl font-display font-bold text-foreground mb-2">Manage <span className="text-gold">Influencers</span></h1>
        <p className="text-muted-foreground mb-8">{influencers.length} influencers registered</p>

        <div className="relative max-w-md mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search influencers..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-secondary border-border" />
        </div>

        <div className="gradient-card rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Name</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Instagram</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Followers</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Joined</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No influencers found</td></tr>
              ) : (
                filtered.map((inf) => (
                  <tr key={inf.user_id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                    <td className="p-4 font-medium text-foreground">{inf.full_name || "—"}</td>
                    <td className="p-4 text-gold">{inf.instagram_handle ? `@${inf.instagram_handle}` : "—"}</td>
                    <td className="p-4 text-muted-foreground">{inf.followers_count?.toLocaleString() ?? "—"}</td>
                    <td className="p-4 text-muted-foreground">{new Date(inf.created_at).toLocaleDateString()}</td>
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

export default AdminInfluencers;
