import DashboardLayout from "@/components/DashboardLayout";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Send } from "lucide-react";

interface Person {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
}

const AdminMessages = () => {
  const { user } = useAuth();
  const [influencers, setInfluencers] = useState<Person[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Person | null>(null);
  const [thread, setThread] = useState<Message[]>([]);
  const [unreadIds, setUnreadIds] = useState<Set<string>>(new Set());
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id, role");
      const infIds = (roles ?? []).filter((r) => r.role === "influencer").map((r) => r.user_id);
      const staffIds = new Set((roles ?? []).filter((r) => r.role !== "influencer").map((r) => r.user_id));
      const ids = [...new Set(infIds)].filter((id) => !staffIds.has(id));
      if (!ids.length) return;
      const { data } = await supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", ids).order("full_name");
      setInfluencers((data as Person[]) ?? []);
    })();
  }, []);

  // Team-wide unread — any admin may have received it, not just the one viewing this page.
  useEffect(() => {
    if (!user) return;
    supabase.from("messages").select("sender_id").eq("is_read", false).is("venue_id", null).then(({ data }) => {
      setUnreadIds(new Set((data ?? []).map((m: any) => m.sender_id)));
    });
  }, [user]);

  const loadThread = async (person: Person) => {
    if (!user) return;
    setSelected(person);
    // Any admin may have been on the other end of this conversation — it's a
    // shared team inbox per creator, not a thread scoped to "me" specifically.
    const { data } = await supabase
      .from("messages")
      .select("id, sender_id, receiver_id, content, created_at")
      .or(`sender_id.eq.${person.user_id},receiver_id.eq.${person.user_id}`)
      .is("venue_id", null)
      .order("created_at", { ascending: true });
    setThread((data as Message[]) ?? []);
    await supabase.from("messages").update({ is_read: true } as any).eq("sender_id", person.user_id).eq("is_read", false);
    setUnreadIds((prev) => { const next = new Set(prev); next.delete(person.user_id); return next; });
  };

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [thread]);

  // Live updates for the open thread
  useEffect(() => {
    if (!user || !selected) return;
    const channel = supabase
      .channel(`admin-msg-${selected.user_id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `sender_id=eq.${selected.user_id}` }, (payload) => {
        setThread((prev) => [...prev, payload.new as Message]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, selected]);

  const sendMessage = async () => {
    if (!user || !selected || !draft.trim()) return;
    setSending(true);
    const { data, error } = await supabase
      .from("messages")
      .insert({ sender_id: user.id, receiver_id: selected.user_id, content: draft.trim() } as any)
      .select()
      .single();
    setSending(false);
    if (!error && data) {
      setThread((prev) => [...prev, data as Message]);
      setDraft("");
    }
  };

  const filtered = influencers.filter((i) => (i.full_name || "").toLowerCase().includes(search.toLowerCase()));

  return (
    <DashboardLayout type="admin">
      <div className="animate-fade-in">
        <h1 className="text-3xl font-display font-bold text-foreground mb-2">
          <span className="text-gold">Messages</span>
        </h1>
        <p className="text-muted-foreground mb-6">Message creators directly.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 gradient-card rounded-xl border border-border overflow-hidden" style={{ height: "70vh" }}>
          <div className="border-r border-border flex flex-col">
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search creators..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 bg-secondary border-border h-9" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filtered.map((p) => (
                <button
                  key={p.user_id}
                  onClick={() => loadThread(p)}
                  className={`w-full flex items-center gap-2 p-3 text-left hover:bg-secondary/50 transition-colors ${selected?.user_id === p.user_id ? "bg-secondary" : ""}`}
                >
                  {p.avatar_url ? (
                    <img src={p.avatar_url} className="w-8 h-8 rounded-full object-cover shrink-0" alt="" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs shrink-0">{(p.full_name || "?")[0]}</div>
                  )}
                  <span className="text-sm text-foreground truncate flex-1">{p.full_name || "Unnamed"}</span>
                  {unreadIds.has(p.user_id) && <Badge className="bg-gold text-background text-[10px] px-1.5">New</Badge>}
                </button>
              ))}
            </div>
          </div>

          <div className="md:col-span-2 flex flex-col">
            {!selected ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Select a creator to start messaging</div>
            ) : (
              <>
                <div className="p-3 border-b border-border font-medium text-foreground">{selected.full_name || "Unnamed"}</div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
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
                    placeholder="Type a message..."
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
      </div>
    </DashboardLayout>
  );
};

export default AdminMessages;
