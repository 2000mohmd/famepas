import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, Check, X, MessageSquare, QrCode } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

const InfluencerInvitations = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: invitations } = useQuery({
    queryKey: ["my-invitations", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("invitations")
        .select("*, venues(name, city, logo_url), offers(title, offer_type)")
        .eq("influencer_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("invitations").update({ status }).eq("id", id);
      if (error) throw error;
      // If accepted, create a booking
      if (status === "accepted") {
        const inv = invitations?.find((i: any) => i.id === id);
        if (inv) {
          await supabase.from("bookings").insert({
            influencer_id: user!.id,
            venue_id: inv.venue_id,
            offer_id: inv.offer_id,
            invitation_id: inv.id,
            scheduled_date: inv.scheduled_at || new Date().toISOString(),
            status: "upcoming",
          });
        }
      }
    },
    onSuccess: () => {
      toast({ title: "Invitation updated" });
      queryClient.invalidateQueries({ queryKey: ["my-invitations"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const statusColor = (s: string) => {
    switch (s) {
      case "pending": return "bg-yellow-500/10 text-yellow-500";
      case "accepted": return "bg-green-500/10 text-green-500";
      case "declined": return "bg-red-500/10 text-red-500";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <DashboardLayout type="influencer">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">My Invitations</h1>
          <p className="text-muted-foreground">Direct invites from venues</p>
        </div>

        <div className="space-y-4">
          {invitations?.map((inv: any) => (
            <Card key={inv.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{inv.offers?.title || "Venue Invitation"}</h3>
                      <Badge className={statusColor(inv.status)}>{inv.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{inv.venues?.name} • {inv.venues?.city}</p>
                    {inv.message && <p className="text-sm text-muted-foreground mt-2">{inv.message}</p>}
                    {inv.scheduled_at && (
                      <p className="text-sm text-muted-foreground">📅 {format(new Date(inv.scheduled_at), "PPP p")}</p>
                    )}
                    {inv.qr_code && (
                      <div className="flex items-center gap-2 mt-2 text-sm text-gold">
                        <QrCode className="w-4 h-4" />
                        <span>QR Pass: {inv.qr_code}</span>
                      </div>
                    )}
                  </div>
                  {inv.status === "pending" && (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => updateStatus.mutate({ id: inv.id, status: "accepted" })}>
                        <Check className="w-4 h-4 mr-1" /> Accept
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: inv.id, status: "declined" })}>
                        <X className="w-4 h-4 mr-1" /> Decline
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {invitations?.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Send className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No invitations yet. Complete your profile to attract venues!</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default InfluencerInvitations;
