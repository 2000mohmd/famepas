import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

const InfluencerMessages = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");

  // Get unique conversations
  const { data: threads } = useQuery({
    queryKey: ["influencer-threads", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("messages")
        .select("*, venues(name, logo_url)")
        .or(`sender_id.eq.${user!.id},receiver_id.eq.${user!.id}`)
        .order("created_at", { ascending: false });

      // Group by other party
      const threadMap = new Map<string, any>();
      (data ?? []).forEach((msg: any) => {
        const otherId = msg.sender_id === user!.id ? msg.receiver_id : msg.sender_id;
        if (!threadMap.has(otherId)) {
          threadMap.set(otherId, { contactId: otherId, venueName: msg.venues?.name || "Unknown", lastMessage: msg.content, lastAt: msg.created_at, unread: msg.receiver_id === user!.id && !msg.is_read ? 1 : 0 });
        } else if (msg.receiver_id === user!.id && !msg.is_read) {
          threadMap.get(otherId).unread += 1;
        }
      });
      return Array.from(threadMap.values());
    },
    enabled: !!user,
  });

  const { data: messages } = useQuery({
    queryKey: ["thread-messages", selectedThread],
    queryFn: async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .or(`and(sender_id.eq.${user!.id},receiver_id.eq.${selectedThread}),and(sender_id.eq.${selectedThread},receiver_id.eq.${user!.id})`)
        .order("created_at", { ascending: true });

      // Mark unread as read
      await supabase.from("messages").update({ is_read: true }).eq("receiver_id", user!.id).eq("sender_id", selectedThread!).eq("is_read", false);

      return data ?? [];
    },
    enabled: !!selectedThread && !!user,
  });

  const sendMessage = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("messages").insert({
        sender_id: user!.id,
        receiver_id: selectedThread!,
        content: newMessage,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ["thread-messages", selectedThread] });
      queryClient.invalidateQueries({ queryKey: ["influencer-threads"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <DashboardLayout type="influencer">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Messages</h1>
          <p className="text-muted-foreground">Chat with venue owners</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[600px]">
          {/* Thread list */}
          <Card className="overflow-y-auto">
            <CardContent className="p-2 space-y-1">
              {threads?.map((t: any) => (
                <button
                  key={t.contactId}
                  onClick={() => setSelectedThread(t.contactId)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${selectedThread === t.contactId ? "bg-primary/10 border border-gold/20" : "hover:bg-muted"}`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-sm">{t.venueName}</span>
                    {t.unread > 0 && <span className="bg-gold text-background text-xs rounded-full px-2 py-0.5">{t.unread}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-1">{t.lastMessage}</p>
                </button>
              ))}
              {threads?.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  No conversations yet
                </div>
              )}
            </CardContent>
          </Card>

          {/* Chat area */}
          <Card className="md:col-span-2 flex flex-col">
            {selectedThread ? (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages?.map((msg: any) => (
                    <div key={msg.id} className={`flex ${msg.sender_id === user!.id ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[70%] rounded-lg px-4 py-2 text-sm ${msg.sender_id === user!.id ? "bg-gold text-background" : "bg-muted"}`}>
                        <p>{msg.content}</p>
                        <p className="text-xs opacity-60 mt-1">{format(new Date(msg.created_at), "p")}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-4 border-t border-border flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    onKeyDown={(e) => e.key === "Enter" && newMessage.trim() && sendMessage.mutate()}
                  />
                  <Button onClick={() => newMessage.trim() && sendMessage.mutate()} disabled={!newMessage.trim()}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">Select a conversation</div>
            )}
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default InfluencerMessages;
