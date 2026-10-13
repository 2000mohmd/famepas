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
      <div className="animate-fade-in space-y-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground mb-2">Support</p>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">Messages</h1>
          <p className="mt-2 text-muted-foreground">Questions, support, or reporting a creator — the FamePass team reads every message.</p>
        </div>

        <div className="rounded-[2rem] bg-card border border-border flex flex-col overflow-hidden shadow-[var(--venue-shadow)]" style={{ height: "68vh" }}>
          <div className="flex items-center gap-4 px-6 py-4 border-b border-border">
            <span className="relative w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ background: "hsl(var(--venue-brand))" }}>
              <img src="/website/images/emblem-gold.webp" alt="" className="h-7 w-auto" />
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-card" />
            </span>
            <div>
              <p className="font-extrabold text-foreground">FamePass team</p>
              <p className="text-xs text-muted-foreground">Usually replies within a few hours</p>
            </div>
          </div>
          {loading ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Loading…</div>
          ) : !venueId ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">No venue found for your account.</div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-3" style={{ background: "hsl(var(--background))" }}>
                {thread.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center gap-4">
                    <span className="flex items-center justify-center w-20 h-20 rounded-full"
                      style={{ background: "radial-gradient(circle at 30% 30%, hsl(var(--gold-light)), hsl(var(--primary)))", boxShadow: "0 0 0 10px hsl(var(--primary) / .12)" }}>
                      <MessageCircle className="w-8 h-8" style={{ color: "hsl(var(--venue-brand))" }} />
                    </span>
                    <p className="text-2xl font-extrabold text-foreground">Start a conversation</p>
                    <p className="text-muted-foreground max-w-sm">Send the FamePass team a message and we'll get back to you right here.</p>
                  </div>
                )}
                {thread.map((m) => {
                  const mine = m.sender_id === user?.id;
                  return (
                    <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[70%] px-4 py-3 text-sm leading-relaxed shadow-sm ${mine ? "rounded-3xl rounded-br-lg" : "rounded-3xl rounded-bl-lg bg-card border border-border text-foreground"}`}
                        style={mine ? { background: "hsl(var(--venue-brand))", color: "hsl(var(--venue-brand-foreground))" } : undefined}>
                        {m.content}
                        <span className="block text-[10px] mt-1 opacity-60">{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
              <div className="p-4 border-t border-border flex gap-3 items-center">
                <Input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Write a message…"
                  className="h-12 rounded-full px-5 bg-muted border-0"
                />
                <Button onClick={sendMessage} disabled={sending || !draft.trim()} size="icon" aria-label="Send message"
                  className="w-12 h-12 rounded-full shrink-0" style={{ background: "hsl(var(--venue-brand))", color: "hsl(var(--venue-brand-foreground))" }}>
                  <Send className="w-5 h-5" />
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
