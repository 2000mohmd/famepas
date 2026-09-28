import DashboardLayout from "@/components/DashboardLayout";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
}

const InfluencerMessages = () => {
  const { user } = useAuth();
  const [thread, setThread] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("messages")
      .select("id, sender_id, receiver_id, content, created_at")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .is("venue_id", null)
      .order("created_at", { ascending: true });
    setThread((data as Message[]) ?? []);
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
        setThread((prev) => [...prev, payload.new as Message]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

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
      setThread((prev) => [...prev, data as Message]);
      setDraft("");
    }
  };

  return (
    <DashboardLayout type="influencer">
      <div className="animate-fade-in flex flex-col" style={{ height: "75vh" }}>
        <h1 className="text-3xl font-display font-bold text-foreground mb-2">
          <span className="text-gold">Messages</span>
        </h1>
        <p className="text-muted-foreground mb-6">Chat directly with the FamePass team.</p>

        <div className="gradient-card rounded-xl border border-border flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {loading ? (
              <p className="text-muted-foreground text-sm text-center mt-8">Loading…</p>
            ) : thread.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center mt-8">No messages yet. Say hello!</p>
            ) : (
              thread.map((m) => (
                <div key={m.id} className={`flex ${m.sender_id === user?.id ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${m.sender_id === user?.id ? "bg-gold text-background" : "bg-secondary text-foreground"}`}>
                    {m.content}
                  </div>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>
          <div className="p-3 border-t border-border flex gap-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Type a message..."
              className="bg-secondary border-border"
            />
            <Button onClick={sendMessage} disabled={sending || !draft.trim()} size="icon" className="bg-gold text-background hover:bg-gold/90 shrink-0">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default InfluencerMessages;
