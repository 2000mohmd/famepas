import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, Check, X, QrCode, MapPin, Calendar, Building2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useState } from "react";

const InfluencerInvitations = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<any>(null);
  const [confirmCancel, setConfirmCancel] = useState<any>(null);

  const { data: invitations } = useQuery({
    queryKey: ["my-invitations", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("invitations")
        .select("*, venues(name, city, logo_url, address, cover_image_url), offers(title, offer_type, description)")
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
      if (status === "cancelled") {
        // Remove any booking tied to this invitation
        await supabase.from("bookings").delete().eq("invitation_id", id);
      }
    },
    onSuccess: () => {
      toast({ title: "Invitation updated" });
      queryClient.invalidateQueries({ queryKey: ["my-invitations"] });
      setSelected(null);
      setConfirmCancel(null);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const statusColor = (s: string) => {
    switch (s) {
      case "pending": return "bg-yellow-500/10 text-yellow-500";
      case "accepted": return "bg-green-500/10 text-green-500";
      case "declined": return "bg-red-500/10 text-red-500";
      case "cancelled": return "bg-muted text-muted-foreground";
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
            <Card
              key={inv.id}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => setSelected(inv)}
            >
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <Avatar className="w-12 h-12 border border-border">
                    <AvatarImage src={inv.venues?.logo_url || inv.venues?.image_url || undefined} alt={inv.venues?.name} />
                    <AvatarFallback className="bg-secondary">
                      <Building2 className="w-5 h-5 text-muted-foreground" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{inv.offers?.title || "Venue Invitation"}</h3>
                      <Badge className={statusColor(inv.status)}>{inv.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{inv.venues?.name} • {inv.venues?.city}</p>
                    {inv.scheduled_at && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {format(new Date(inv.scheduled_at), "PPP p")}
                      </p>
                    )}
                  </div>
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

        {/* Details dialog */}
        <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
          <DialogContent className="max-w-lg">
            {selected && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={selected.venues?.logo_url || selected.venues?.image_url || undefined} />
                      <AvatarFallback><Building2 className="w-4 h-4" /></AvatarFallback>
                    </Avatar>
                    {selected.offers?.title || "Venue Invitation"}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge className={statusColor(selected.status)}>{selected.status}</Badge>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{selected.venues?.name}</p>
                    <p className="text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {selected.venues?.address || selected.venues?.city}
                    </p>
                  </div>
                  {selected.offers?.description && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Offer</p>
                      <p className="text-foreground">{selected.offers.description}</p>
                    </div>
                  )}
                  {selected.message && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Message from venue</p>
                      <p className="text-foreground">{selected.message}</p>
                    </div>
                  )}
                  {selected.scheduled_at && (
                    <p className="text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-4 h-4" /> {format(new Date(selected.scheduled_at), "PPP p")}
                    </p>
                  )}
                  {selected.qr_code && (
                    <div className="flex items-center gap-2 text-gold">
                      <QrCode className="w-4 h-4" />
                      <span className="font-mono">{selected.qr_code}</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 pt-2 flex-wrap">
                  {selected.status === "pending" && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => updateStatus.mutate({ id: selected.id, status: "accepted" })}
                      >
                        <Check className="w-4 h-4 mr-1" /> Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatus.mutate({ id: selected.id, status: "declined" })}
                      >
                        <X className="w-4 h-4 mr-1" /> Decline
                      </Button>
                    </>
                  )}
                  {selected.status === "accepted" && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setConfirmCancel(selected)}
                    >
                      <X className="w-4 h-4 mr-1" /> Cancel Invitation
                    </Button>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!confirmCancel} onOpenChange={(o) => !o && setConfirmCancel(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel this invitation?</AlertDialogTitle>
              <AlertDialogDescription>
                The venue will be notified and any related booking will be removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep it</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => confirmCancel && updateStatus.mutate({ id: confirmCancel.id, status: "cancelled" })}
              >
                Yes, cancel
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

export default InfluencerInvitations;
