import DashboardLayout from "@/components/DashboardLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Edit, DollarSign, Percent, CreditCard } from "lucide-react";
import StatCard from "@/components/StatCard";

interface Tier {
  id: string;
  name: string;
  price: number;
  description: string | null;
  features: string[];
  commission_pct: number;
  is_active: boolean;
}

const AdminBilling = () => {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [editTier, setEditTier] = useState<Tier | null>(null);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [pendingWithdrawals, setPendingWithdrawals] = useState(0);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const { toast } = useToast();

  const fetchAll = async () => {
    const [tiersRes, earningsRes, withdrawalsRes, pendingRes] = await Promise.all([
      supabase.from("subscription_tiers").select("*").order("price"),
      supabase.from("earnings").select("net_amount, commission"),
      supabase.from("withdrawal_requests").select("id, amount, status, created_at, payment_method").order("created_at", { ascending: false }).limit(20),
      supabase.from("withdrawal_requests").select("amount", { count: "exact" }).eq("status", "pending"),
    ]);
    setTiers((tiersRes.data as any) ?? []);
    const revenue = (earningsRes.data ?? []).reduce((sum: number, e: any) => sum + (e.commission ?? 0), 0);
    setTotalRevenue(revenue);
    setWithdrawals(withdrawalsRes.data ?? []);
    setPendingWithdrawals(pendingRes.count ?? 0);
  };

  useEffect(() => { fetchAll(); }, []);

  const handleSaveTier = async () => {
    if (!editTier) return;
    const { error } = await supabase.from("subscription_tiers").update({
      name: editTier.name,
      price: editTier.price,
      description: editTier.description,
      commission_pct: editTier.commission_pct,
      is_active: editTier.is_active,
    } as any).eq("id", editTier.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Tier updated" });
      setEditTier(null);
      fetchAll();
    }
  };

  const handleWithdrawalStatus = async (id: string, status: string) => {
    await supabase.from("withdrawal_requests").update({ status, processed_at: new Date().toISOString() } as any).eq("id", id);
    toast({ title: `Withdrawal ${status}` });
    fetchAll();
  };

  return (
    <DashboardLayout type="admin">
      <div className="animate-fade-in">
        <h1 className="text-3xl font-display font-bold text-foreground mb-2">
          Billing & <span className="text-gold">Subscriptions</span>
        </h1>
        <p className="text-muted-foreground mb-8">Manage subscription tiers, commissions and transactions</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard title="Platform Revenue" value={`$${totalRevenue.toFixed(2)}`} icon={<DollarSign className="w-6 h-6" />} trend="From commissions" trendUp />
          <StatCard title="Pending Withdrawals" value={pendingWithdrawals} icon={<CreditCard className="w-6 h-6" />} trend="Awaiting processing" trendUp={pendingWithdrawals === 0} />
          <StatCard title="Active Tiers" value={tiers.filter(t => t.is_active).length} icon={<Percent className="w-6 h-6" />} trend="Subscription plans" trendUp />
        </div>

        {/* Subscription Tiers */}
        <div className="mb-8">
          <h2 className="font-display text-xl font-bold text-foreground mb-4">Subscription Tiers</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {tiers.map((tier) => (
              <div key={tier.id} className="gradient-card rounded-xl border border-border p-6 relative">
                {!tier.is_active && (
                  <div className="absolute inset-0 bg-background/60 rounded-xl flex items-center justify-center z-10">
                    <Badge className="bg-destructive/20 text-destructive border-destructive/30">Inactive</Badge>
                  </div>
                )}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-display font-bold text-foreground text-lg">{tier.name}</h3>
                    <p className="text-gold font-bold text-2xl">${tier.price}<span className="text-muted-foreground text-sm font-normal">/mo</span></p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setEditTier(tier)} className="text-muted-foreground hover:text-gold">
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-muted-foreground text-sm mb-3">{tier.description}</p>
                <div className="flex items-center gap-2 mb-4">
                  <Percent className="w-4 h-4 text-gold" />
                  <span className="text-sm text-foreground">{tier.commission_pct}% commission</span>
                </div>
                <ul className="space-y-1">
                  {(tier.features || []).map((f: string, i: number) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-gold shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Withdrawal Requests */}
        <div>
          <h2 className="font-display text-xl font-bold text-foreground mb-4">Withdrawal Requests</h2>
          <div className="gradient-card rounded-xl border border-border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Date</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Amount</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Method</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {withdrawals.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No withdrawal requests yet</td></tr>
                ) : (
                  withdrawals.map((w) => (
                    <tr key={w.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                      <td className="p-4 text-muted-foreground text-sm">{new Date(w.created_at).toLocaleDateString()}</td>
                      <td className="p-4 font-medium text-foreground">${Number(w.amount).toFixed(2)}</td>
                      <td className="p-4 text-muted-foreground capitalize">{w.payment_method || "—"}</td>
                      <td className="p-4">
                        <Badge className={
                          w.status === "completed" ? "bg-success/20 text-success border-success/30" :
                          w.status === "pending" ? "bg-yellow-500/20 text-yellow-400 border-yellow-400/30" :
                          "bg-destructive/20 text-destructive border-destructive/30"
                        }>{w.status}</Badge>
                      </td>
                      <td className="p-4 flex gap-2">
                        {w.status === "pending" && (
                          <>
                            <Button size="sm" onClick={() => handleWithdrawalStatus(w.id, "completed")} className="gradient-gold text-accent-foreground h-7 text-xs">Approve</Button>
                            <Button size="sm" variant="ghost" onClick={() => handleWithdrawalStatus(w.id, "rejected")} className="text-destructive hover:bg-destructive/10 h-7 text-xs">Reject</Button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Edit Tier Dialog */}
        {editTier && (
          <Dialog open={!!editTier} onOpenChange={() => setEditTier(null)}>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="font-display text-foreground">Edit Tier: {editTier.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Monthly Price ($)</Label>
                    <Input type="number" value={editTier.price} onChange={e => setEditTier(t => t ? { ...t, price: Number(e.target.value) } : t)} className="bg-secondary border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Commission (%)</Label>
                    <Input type="number" value={editTier.commission_pct} onChange={e => setEditTier(t => t ? { ...t, commission_pct: Number(e.target.value) } : t)} className="bg-secondary border-border" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Description</Label>
                  <Textarea value={editTier.description ?? ""} onChange={e => setEditTier(t => t ? { ...t, description: e.target.value } : t)} className="bg-secondary border-border" rows={2} />
                </div>
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="tier-active" checked={editTier.is_active} onChange={e => setEditTier(t => t ? { ...t, is_active: e.target.checked } : t)} className="w-4 h-4" />
                  <Label htmlFor="tier-active" className="text-muted-foreground cursor-pointer">Active</Label>
                </div>
                <Button onClick={handleSaveTier} className="w-full gradient-gold text-accent-foreground font-semibold">Save Changes</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminBilling;
