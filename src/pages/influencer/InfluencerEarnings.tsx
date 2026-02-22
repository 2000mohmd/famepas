import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DollarSign, ArrowDownToLine, Clock } from "lucide-react";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

const InfluencerEarnings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: balance } = useQuery({
    queryKey: ["wallet-balance", user?.id],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_wallet_balance", { _user_id: user!.id });
      return data ?? 0;
    },
    enabled: !!user,
  });

  const { data: earnings } = useQuery({
    queryKey: ["earnings-history", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("earnings").select("*").eq("influencer_id", user!.id).order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: withdrawals } = useQuery({
    queryKey: ["withdrawal-requests", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("withdrawal_requests").select("*").eq("influencer_id", user!.id).order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const requestWithdrawal = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("withdrawal_requests").insert({
        influencer_id: user!.id,
        amount: parseFloat(withdrawAmount),
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Withdrawal requested" });
      setWithdrawAmount("");
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["withdrawal-requests"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const pendingAmount = earnings?.filter((e: any) => e.status === "pending").reduce((s: number, e: any) => s + Number(e.net_amount), 0) ?? 0;

  return (
    <DashboardLayout type="influencer">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Earnings</h1>
            <p className="text-muted-foreground">Track your income and request withdrawals</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><ArrowDownToLine className="w-4 h-4 mr-2" /> Withdraw</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Request Withdrawal</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Available balance: AED {Number(balance).toFixed(2)}</p>
                <Input type="number" placeholder="Amount (AED)" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} />
                <Button className="w-full" onClick={() => requestWithdrawal.mutate()} disabled={!withdrawAmount || parseFloat(withdrawAmount) <= 0 || requestWithdrawal.isPending}>
                  Submit Request
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10"><DollarSign className="w-5 h-5 text-gold" /></div>
              <div>
                <p className="text-2xl font-bold">AED {Number(balance).toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">Available Balance</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-yellow-500/10"><Clock className="w-5 h-5 text-yellow-500" /></div>
              <div>
                <p className="text-2xl font-bold">AED {pendingAmount.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10"><DollarSign className="w-5 h-5 text-gold" /></div>
              <div>
                <p className="text-2xl font-bold">{earnings?.length ?? 0}</p>
                <p className="text-sm text-muted-foreground">Total Transactions</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transaction History */}
        <Card>
          <CardHeader><CardTitle>Transaction History</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {earnings?.map((e: any) => (
              <div key={e.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium">{e.description || "Earning"}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(e.created_at), "PPP")}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">AED {Number(e.amount).toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">Commission: AED {Number(e.commission).toFixed(2)}</p>
                  <Badge variant="outline" className="text-xs capitalize">{e.status}</Badge>
                </div>
              </div>
            ))}
            {earnings?.length === 0 && <p className="text-center text-muted-foreground py-4">No earnings yet</p>}
          </CardContent>
        </Card>

        {/* Withdrawal Requests */}
        {(withdrawals?.length ?? 0) > 0 && (
          <Card>
            <CardHeader><CardTitle>Withdrawal Requests</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {withdrawals?.map((w: any) => (
                <div key={w.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium">AED {Number(w.amount).toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(w.created_at), "PPP")}</p>
                  </div>
                  <Badge variant="outline" className="capitalize">{w.status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default InfluencerEarnings;
