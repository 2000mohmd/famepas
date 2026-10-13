import DashboardLayout from "@/components/DashboardLayout";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Sparkles } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  ai_generated?: boolean;
}

const InfluencerMessages = () => {
  const { user } = useAuth();
  const [thread, setThread] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [aiThinking, setAiThinking] = useState(false);
  const [escalated, setEscalated] = useState<Set<string>>(new Set());

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("messages")
      .select("id, sender_id, receiver_id, content, created_at, ai_generated")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .is("venue_id", null)
      .order("created_at", { ascending: true });
    setThread(((data as unknown) as Message[]) ?? []);
    setLoading(false);
    await supabase.from("messages").update({ is_read: true } as any).eq("receiver_id", user.id).eq("is_read", false);
  };

  useEffect(() => { load(); }, [user]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [thread]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`influencer-msg-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `receiver_id=eq.${user.id}` }, (payload) => {
        setThread((prev) => (prev.some((m) => m.id === (payload.new as Message).id) ? prev : [...prev, payload.new as Message]));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // AI first-line support: answers right away, flags what needs the team.
  // If the assistant is unavailable the message still sits in the team inbox.
  const askAssistant = async (messageId: string) => {
    setAiThinking(true);
    try {
      const { data, error } = await supabase.functions.invoke("support-assistant", { body: { message_id: messageId } });
      const reply = (data as any)?.message as Message | undefined;
      if (!error && reply) {
        setThread((prev) => (prev.some((m) => m.id === reply.id) ? prev : [...prev, reply]));
        if ((data as any).escalate) setEscalated((prev) => new Set(prev).add(reply.id));
      }
    } catch { /* team still gets the message */ }
    setAiThinking(false);
  };

  const sendMessage = async () => {
    if (!user || !draft.trim()) return;
    setSending(true);
    // Reply to whichever admin last wrote in — any admin can read/reply to the
    // thread regardless (it's a shared team inbox), but this keeps continuity.
    const lastFromAdmin = [...thread].reverse().find((m) => m.sender_id !== user.id);
    let receiverId = lastFromAdmin?.sender_id;
    if (!receiverId) {
      // Creators can't read other users' roles, so ask the backend for the support inbox.
      const { data: adminId } = await supabase.rpc("get_support_admin_id" as any);
      receiverId = (adminId as string) || undefined;
    }
    if (!receiverId) {
      setSending(false);
      toast({ title: "Couldn't send message", description: "Please try again in a moment.", variant: "destructive" });
      return;
    }
    const { data, error } = await supabase
      .from("messages")
      .insert({ sender_id: user.id, receiver_id: receiverId, content: draft.trim() } as any)
      .select()
      .single();
    setSending(false);
    if (!error && data) {
      const sent = data as Message;
      setThread((prev) => (prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]));
      setDraft("");
      void askAssistant(sent.id);
    }
  };

  return (
    <DashboardLayout type="influencer">
      <div className="animate-fade-in space-y-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground mb-2">Support</p>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">Messages</h1>
          <p className="mt-2 text-muted-foreground">Chat directly with the FamePass team — questions, bookings, anything.</p>
        </div>

        <div className="rounded-[2rem] bg-card border border-border flex flex-col overflow-hidden shadow-[var(--venue-shadow)]" style={{ height: "68vh" }}>
          <div className="flex items-center gap-4 px-6 py-4 border-b border-border">
            <span className="relative w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ background: "hsl(var(--venue-brand))" }}>
              <img src="/website/images/emblem-gold.webp" alt="" className="h-7 w-auto" />
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-card" />
            </span>
            <div>
              <p className="font-extrabold text-foreground">FamePass support</p>
              <p className="text-xs text-muted-foreground">AI assistant replies instantly · our team steps in when needed</p>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-3" style={{ background: "hsl(var(--background))" }}>
            {loading ? (
              <p className="text-muted-foreground text-sm text-center mt-8">Loading…</p>
            ) : thread.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center gap-4">
                <span className="flex items-center justify-center w-20 h-20 rounded-full"
                  style={{ background: "radial-gradient(circle at 30% 30%, hsl(var(--gold-light)), hsl(var(--primary)))", boxShadow: "0 0 0 10px hsl(var(--primary) / .12)" }}>
                  <Send className="w-8 h-8" style={{ color: "hsl(var(--venue-brand))" }} />
                </span>
                <p className="text-2xl font-extrabold text-foreground">Say hello 👋</p>
                <p className="text-muted-foreground max-w-sm">Questions about an offer or a visit? Message the FamePass team and we'll reply right here.</p>
              </div>
            ) : (
              thread.map((m) => {
                const mine = m.sender_id === user?.id;
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] px-4 py-3 text-sm leading-relaxed shadow-sm ${mine ? "rounded-3xl rounded-br-lg" : "rounded-3xl rounded-bl-lg bg-card border border-border text-foreground"}`}
                      style={mine ? { background: "hsl(var(--venue-brand))", color: "hsl(var(--venue-brand-foreground))" } : undefined}>
                      {m.ai_generated && <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: "hsl(var(--venue-brand))" }}><Sparkles className="w-3 h-3" /> FamePass AI</span>}
                      {m.content}
                      {escalated.has(m.id) && <span className="flex items-center gap-1 mt-2 text-[11px] font-semibold text-emerald-700"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Sent to the FamePass team</span>}
                      {(m as any).created_at && <span className="block text-[10px] mt-1 opacity-60">{new Date((m as any).created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
                    </div>
                  </div>
                );
              })
            )}
                {aiThinking && (
                  <div className="flex justify-start">
                    <div className="rounded-3xl rounded-bl-lg bg-card border border-border px-4 py-3 text-sm text-muted-foreground inline-flex items-center gap-2">
                      <Sparkles className="w-4 h-4" style={{ color: "hsl(var(--primary))" }} /> FamePass AI is typing
                      <span className="inline-flex gap-1"><span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" /><span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:.15s]" /><span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:.3s]" /></span>
                    </div>
                  </div>
                )}
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
        </div>
      </div>
    </DashboardLayout>
  );
};

export default InfluencerMessages;
