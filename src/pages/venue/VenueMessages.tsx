import DashboardLayout from "@/components/DashboardLayout";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Thread {
  user_id: string;
  full_name: string | null;
  last_message: string;
  last_at: string;
  unread: number;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
}

const VenueMessages = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [venueId, setVenueId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    const fetchThreads = async () => {
      const { data: venue } = await supabase.from("venues").select("id").eq("owner_id", user.id).maybeSingle();
      if (venue) setVenueId(venue.id);

      const { data: msgs } = await supabase.from("messages")
        .select("*")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      const threadMap = new Map<string, { last_message: string; last_at: string; unread: number }>();
      (msgs ?? []).forEach(m => {
        const otherId = m.sender_id === user.id ? m.receiver_id : m.sender_id;
        if (!threadMap.has(otherId)) {
          threadMap.set(otherId, { last_message: m.content, last_at: m.created_at, unread: 0 });
        }
        if (m.receiver_id === user.id && !m.is_read) {
          threadMap.get(otherId)!.unread++;
        }
      });

      // Add influencers that applied to this venue's offers
      if (venue) {
        const { data: offers } = await supabase.from("offers").select("id").eq("venue_id", venue.id);
        const offerIds = (offers ?? []).map(o => o.id);
        if (offerIds.length) {
          const { data: reds } = await supabase.from("offer_redemptions").select("influencer_id").in("offer_id", offerIds);
          (reds ?? []).forEach(r => {
            if (!threadMap.has(r.influencer_id)) {
              threadMap.set(r.influencer_id, { last_message: "Start a conversation", last_at: new Date(0).toISOString(), unread: 0 });
            }
          });
        }
      }

      const userIds = [...threadMap.keys()];
      if (userIds.length === 0) { setThreads([]); return; }

      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);

      const threadList: Thread[] = userIds.map(uid => ({
        user_id: uid,
        full_name: profiles?.find(p => p.user_id === uid)?.full_name || "Influencer",
        ...threadMap.get(uid)!,
      }));
      threadList.sort((a, b) => new Date(b.last_at).getTime() - new Date(a.last_at).getTime());
      setThreads(threadList);
    };
    fetchThreads();
  }, [user]);

  useEffect(() => {
    if (!user || !selectedUser) return;
    const fetchMessages = async () => {
      const { data } = await supabase.from("messages")
        .select("*")
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${selectedUser}),and(sender_id.eq.${selectedUser},receiver_id.eq.${user.id})`)
        .order("created_at", { ascending: true });
      setMessages((data as Message[]) ?? []);

      // Mark as read
      await supabase.from("messages").update({ is_read: true }).eq("sender_id", selectedUser).eq("receiver_id", user.id).eq("is_read", false);
    };
    fetchMessages();
  }, [user, selectedUser]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!user || !selectedUser || !newMsg.trim()) return;
    const { error } = await supabase.from("messages").insert({
      sender_id: user.id,
      receiver_id: selectedUser,
      content: newMsg.trim(),
      venue_id: venueId,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setMessages(prev => [...prev, { id: crypto.randomUUID(), sender_id: user.id, receiver_id: selectedUser, content: newMsg.trim(), created_at: new Date().toISOString(), is_read: false }]);
      setNewMsg("");
    }
  };

  const selectedName = threads.find(t => t.user_id === selectedUser)?.full_name || "Unknown";

  return (
    <DashboardLayout type="venue">
      <div className="animate-fade-in">
        <h1 className="text-3xl font-display font-bold text-foreground mb-6">
          <span className="text-gold">Messages</span>
        </h1>

        <div className="gradient-card rounded-xl border border-border overflow-hidden flex" style={{ height: "calc(100vh - 220px)" }}>
          {/* Thread List */}
          <div className="w-80 border-r border-border flex flex-col">
            <div className="p-4 border-b border-border">
              <h3 className="font-display font-bold text-foreground text-sm">Conversations</h3>
            </div>
            <div className="flex-1 overflow-y-auto">
              {threads.length === 0 && <p className="p-4 text-sm text-muted-foreground">No conversations yet</p>}
              {threads.map(t => (
                <div
                  key={t.user_id}
                  onClick={() => setSelectedUser(t.user_id)}
                  className={`p-4 border-b border-border/50 cursor-pointer transition-colors hover:bg-secondary/50 ${selectedUser === t.user_id ? "bg-secondary/80" : ""}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-foreground text-sm">{t.full_name}</span>
                    {t.unread > 0 && <span className="bg-gold text-background text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">{t.unread}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{t.last_message}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col">
            {selectedUser ? (
              <>
                <div className="p-4 border-b border-border">
                  <h3 className="font-display font-bold text-foreground">{selectedName}</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.map(m => (
                    <div key={m.id} className={`flex ${m.sender_id === user?.id ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[70%] rounded-xl px-4 py-2 text-sm ${m.sender_id === user?.id ? "bg-gold/20 text-foreground" : "bg-secondary text-foreground"}`}>
                        {m.content}
                        <p className="text-xs text-muted-foreground mt-1">{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={bottomRef} />
                </div>
                <div className="p-4 border-t border-border flex gap-2">
                  <Input
                    value={newMsg}
                    onChange={e => setNewMsg(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && sendMessage()}
                    placeholder="Type a message..."
                    className="bg-secondary border-border"
                  />
                  <Button onClick={sendMessage} className="gradient-gold text-accent-foreground"><Send className="w-4 h-4" /></Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gold/30" />
                  <p>Select a conversation to start chatting</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default VenueMessages;
