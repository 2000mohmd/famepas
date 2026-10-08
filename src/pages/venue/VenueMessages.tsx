import DashboardLayout from "@/components/DashboardLayout";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
}

/** Adnan, Venue Portal item 1: venues chat with FamePass admin directly
 * (support, questions, reporting a creator) — the venue side of the
 * existing AdminMessages inbox, tagged by venue_id instead of per-creator. */
const VenueMessages = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [venueId, setVenueId] = useState<string | null>(null);
  const [adminId, setAdminId] = useState<string | null>(null);
  const [thread, setThread] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: venue } = await supabase.from("venues").select("id").eq("owner_id", user.id)
        .order("created_at", { ascending: true }).limit(1).maybeSingle();
      if (!venue) { setLoading(false); return; }
      setVenueId(venue.id);

      const { data: admin } = await supabase.from("user_roles").select("user_id").eq("role", "admin").limit(1).maybeSingle();
      setAdminId(admin?.user_id ?? null);

      const { data } = await supabase.from("messages")
        .select("id, sender_id, receiver_id, content, created_at")
        .eq("venue_id", venue.id).order("created_at", { ascending: true });
      setThread((data as Message[]) ?? []);
      await supabase.from("messages").update({ is_read: true } as any)
        .eq("venue_id", venue.id).eq("receiver_id", user.id).eq("is_read", false);
      setLoading(false);
    })();
  }, [user]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [thread]);

  useEffect(() => {
    if (!venueId) return;
    const channel = supabase
      .channel(`venue-msg-${venueId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `venue_id=eq.${venueId}` }, (payload) => {
        setThread((prev) => [...prev, payload.new as Message]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [venueId]);

  const sendMessage = async () => {
    if (!user || !venueId || !draft.trim()) return;
    setSending(true);
    const { data, error } = await supabase.from("messages").insert({
      sender_id: user.id, receiver_id: adminId ?? user.id, venue_id: venueId, content: draft.trim(),
    } as any).select().single();
    setSending(false);
    if (error) { toast({ title: "Message not sent", description: error.message, variant: "destructive" }); return; }
    if (data) { setThread((prev) => [...prev, data as Message]); setDraft(""); }
  };

  return (
    <DashboardLayout type="venue">
      <div className="animate-fade-in">
        <h1 className="text-[28px] font-bold text-foreground mb-2">Messages</h1>
        <p className="text-muted-foreground mb-6">Questions, support, or reporting a creator — the FamePass team sees this.</p>

        <div className="gradient-card rounded-xl border border-border flex flex-col" style={{ height: "65vh" }}>
          {loading ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Loading…</div>
          ) : !venueId ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">No venue found for your account.</div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {thread.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground text-sm gap-2">
                    <MessageCircle className="w-8 h-8" />
                    <p>Send a message to the FamePass team and we'll get back to you here.</p>
                  </div>
                )}
                {thread.map((m) => (
                  <div key={m.id} className={`flex ${m.sender_id === user?.id ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${m.sender_id === user?.id ? "bg-gold text-background" : "bg-secondary text-foreground"}`}>
                      {m.content}
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
              <div className="p-3 border-t border-border flex gap-2">
                <Input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Type a message…"
                  className="bg-secondary border-border"
                />
                <Button onClick={sendMessage} disabled={sending || !draft.trim()} size="icon" className="bg-gold text-background hover:bg-gold/90 shrink-0">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default VenueMessages;
