import DashboardLayout from "@/components/DashboardLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Megaphone } from "lucide-react";

type Audience = "all_venues" | "approved_venues" | "all_influencers" | "approved_influencers" | "venue" | "influencer";

const AUDIENCE_LABELS: Record<Audience, string> = {
  all_venues: "All venues",
  approved_venues: "Approved venues only",
  all_influencers: "All influencers",
  approved_influencers: "Approved influencers only",
  venue: "A specific venue",
  influencer: "A specific influencer",
};

interface Venue { id: string; name: string; approval_status: string | null; }
interface Influencer { user_id: string; full_name: string | null; approval_status: string | null; }

const AdminBroadcast = () => {
  const { toast } = useToast();
  const [audience, setAudience] = useState<Audience | "">("");
  const [targetId, setTargetId] = useState("");
  const [venues, setVenues] = useState<Venue[]>([]);
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    supabase.from("venues").select("id, name, approval_status").order("name").then(({ data }) => setVenues(data ?? []));
    (async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id, role");
      const infIds = (roles ?? []).filter((r) => r.role === "influencer").map((r) => r.user_id);
      const staffIds = new Set((roles ?? []).filter((r) => r.role !== "influencer").map((r) => r.user_id));
      const ids = [...new Set(infIds)].filter((id) => !staffIds.has(id));
      if (!ids.length) return;
      const { data } = await supabase.from("profiles").select("user_id, full_name, approval_status").in("user_id", ids).order("full_name");
      setInfluencers(data ?? []);
    })();
  }, []);

  const needsTarget = audience === "venue" || audience === "influencer";

  const recipientCount = (() => {
    switch (audience) {
      case "all_venues": return venues.length;
      case "approved_venues": return venues.filter((v) => v.approval_status === "approved").length;
      case "all_influencers": return influencers.length;
      case "approved_influencers": return influencers.filter((i) => i.approval_status === "approved").length;
      case "venue": case "influencer": return targetId ? 1 : 0;
      default: return 0;
    }
  })();

  const canSend = !!audience && subject.trim() && message.trim() && (!needsTarget || targetId);

  const send = async () => {
    setConfirming(false);
    setSending(true);
    const { data, error } = await supabase.functions.invoke("broadcast-notification", {
      body: { audience, target_id: needsTarget ? targetId : undefined, subject, message },
    });
    setSending(false);
    if (error || data?.error) {
      toast({ title: "Error", description: data?.error || error?.message, variant: "destructive" });
      return;
    }
    toast({ title: `Sent to ${data.sent} of ${data.total} recipient${data.total === 1 ? "" : "s"}` });
    setSubject("");
    setMessage("");
  };

  return (
    <DashboardLayout type="admin">
      <div className="animate-fade-in max-w-2xl">
        <h1 className="text-3xl font-display font-bold text-foreground mb-2 flex items-center gap-2">
          <Megaphone className="w-7 h-7 text-gold" /> Send <span className="text-gold">Broadcast</span>
        </h1>
        <p className="text-muted-foreground mb-8">Email venues or creators about an event, announcement, or update.</p>

        <div className="gradient-card rounded-xl border border-border p-6 space-y-4">
          <div className="space-y-2">
            <Label className="text-muted-foreground">Send to</Label>
            <Select value={audience} onValueChange={(v: Audience) => { setAudience(v); setTargetId(""); }}>
              <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Choose an audience..." /></SelectTrigger>
              <SelectContent>
                {(Object.keys(AUDIENCE_LABELS) as Audience[]).map((a) => (
                  <SelectItem key={a} value={a}>{AUDIENCE_LABELS[a]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {audience === "venue" && (
            <div className="space-y-2">
              <Label className="text-muted-foreground">Venue</Label>
              <Select value={targetId} onValueChange={setTargetId}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Select a venue..." /></SelectTrigger>
                <SelectContent>{venues.map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}

          {audience === "influencer" && (
            <div className="space-y-2">
              <Label className="text-muted-foreground">Influencer</Label>
              <Select value={targetId} onValueChange={setTargetId}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Select a creator..." /></SelectTrigger>
                <SelectContent>{influencers.map((i) => <SelectItem key={i.user_id} value={i.user_id}>{i.full_name || "Unnamed"}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}

          {audience && (
            <p className="text-xs text-muted-foreground">
              {recipientCount === 0 ? "No recipients match this audience yet." : `This will reach ${recipientCount} recipient${recipientCount === 1 ? "" : "s"}.`}
            </p>
          )}

          <div className="space-y-2">
            <Label className="text-muted-foreground">Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. New rooftop event this Friday" className="bg-secondary border-border" />
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">Message</Label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={6} placeholder="Write the announcement..." className="bg-secondary border-border" />
          </div>

          <Button onClick={() => setConfirming(true)} disabled={sending || !canSend || recipientCount === 0} className="w-full gradient-gold text-accent-foreground font-semibold">
            {sending ? "Sending..." : "Send Broadcast"}
          </Button>
        </div>
      </div>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Send to {recipientCount} recipient{recipientCount === 1 ? "" : "s"}?</AlertDialogTitle>
            <AlertDialogDescription>
              "{subject}" will be emailed to {AUDIENCE_LABELS[audience as Audience]?.toLowerCase()} ({recipientCount} {recipientCount === 1 ? "person" : "people"}). This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={send}>Send</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default AdminBroadcast;
