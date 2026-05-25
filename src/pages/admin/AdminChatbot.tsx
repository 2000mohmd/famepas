import DashboardLayout from "@/components/DashboardLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Pencil } from "lucide-react";

type Entry = {
  id: string;
  entry_type: "qa" | "doc";
  question: string | null;
  answer: string | null;
  doc_title: string | null;
  doc_content: string | null;
  category: string | null;
  is_active: boolean;
};

const empty = { entry_type: "qa" as "qa" | "doc", question: "", answer: "", doc_title: "", doc_content: "", category: "" };

const AdminChatbot = () => {
  const { toast } = useToast();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(empty);

  const load = async () => {
    const { data } = await supabase.from("chatbot_knowledge").select("*").order("created_at", { ascending: false });
    setEntries((data as Entry[]) ?? []);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setEditingId(null); setForm(empty); setOpen(true); };
  const openEdit = (e: Entry) => {
    setEditingId(e.id);
    setForm({
      entry_type: e.entry_type,
      question: e.question ?? "",
      answer: e.answer ?? "",
      doc_title: e.doc_title ?? "",
      doc_content: e.doc_content ?? "",
      category: e.category ?? "",
    });
    setOpen(true);
  };

  const save = async () => {
    const payload: any = {
      entry_type: form.entry_type,
      category: form.category || null,
      question: form.entry_type === "qa" ? form.question : null,
      answer: form.entry_type === "qa" ? form.answer : null,
      doc_title: form.entry_type === "doc" ? form.doc_title : null,
      doc_content: form.entry_type === "doc" ? form.doc_content : null,
    };
    if (form.entry_type === "qa" && (!form.question.trim() || !form.answer.trim())) {
      return toast({ title: "Missing fields", description: "Question and answer required.", variant: "destructive" });
    }
    if (form.entry_type === "doc" && (!form.doc_title.trim() || !form.doc_content.trim())) {
      return toast({ title: "Missing fields", description: "Title and content required.", variant: "destructive" });
    }
    const { error } = editingId
      ? await supabase.from("chatbot_knowledge").update(payload).eq("id", editingId)
      : await supabase.from("chatbot_knowledge").insert(payload);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    toast({ title: editingId ? "Updated" : "Added" });
    setOpen(false);
    load();
  };

  const toggle = async (e: Entry) => {
    await supabase.from("chatbot_knowledge").update({ is_active: !e.is_active }).eq("id", e.id);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this entry?")) return;
    await supabase.from("chatbot_knowledge").delete().eq("id", id);
    load();
  };

  return (
    <DashboardLayout type="admin">
      <div className="animate-fade-in">
        <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground mb-2">
              Train <span className="text-gold">Chatbot</span>
            </h1>
            <p className="text-muted-foreground">Manage the knowledge the AI assistant uses to answer visitors.</p>
          </div>
          <Button onClick={openNew} className="bg-gold hover:bg-gold/90 text-background">
            <Plus className="w-4 h-4 mr-2" /> Add Entry
          </Button>
        </div>

        <div className="grid gap-4">
          {entries.length === 0 && (
            <div className="gradient-card rounded-xl border border-border p-8 text-center text-muted-foreground">
              No entries yet. Add your first Q&A or document to teach the chatbot.
            </div>
          )}
          {entries.map((e) => (
            <div key={e.id} className="gradient-card rounded-xl border border-border p-5">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={e.entry_type === "qa" ? "bg-primary/20 text-primary border-primary/30" : "bg-gold/20 text-gold border-gold/30"}>
                    {e.entry_type === "qa" ? "Q&A" : "Document"}
                  </Badge>
                  {e.category && <Badge variant="secondary">{e.category}</Badge>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Switch checked={e.is_active} onCheckedChange={() => toggle(e)} />
                  <Button size="icon" variant="ghost" onClick={() => openEdit(e)}><Pencil className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(e.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              </div>
              {e.entry_type === "qa" ? (
                <>
                  <p className="font-medium text-foreground">{e.question}</p>
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{e.answer}</p>
                </>
              ) : (
                <>
                  <p className="font-medium text-foreground">{e.doc_title}</p>
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap line-clamp-4">{e.doc_content}</p>
                </>
              )}
            </div>
          ))}
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Entry" : "New Knowledge Entry"}</DialogTitle>
            </DialogHeader>
            <Tabs value={form.entry_type} onValueChange={(v: any) => setForm({ ...form, entry_type: v })}>
              <TabsList>
                <TabsTrigger value="qa">Q&A Pair</TabsTrigger>
                <TabsTrigger value="doc">Document / Snippet</TabsTrigger>
              </TabsList>
              <TabsContent value="qa" className="space-y-3 pt-3">
                <div>
                  <Label>Question</Label>
                  <Input value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} placeholder="How do I sign up as an influencer?" />
                </div>
                <div>
                  <Label>Answer</Label>
                  <Textarea rows={5} value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} placeholder="Click 'Get Started' in the top-right..." />
                </div>
              </TabsContent>
              <TabsContent value="doc" className="space-y-3 pt-3">
                <div>
                  <Label>Title</Label>
                  <Input value={form.doc_title} onChange={(e) => setForm({ ...form, doc_title: e.target.value })} placeholder="About FamePass" />
                </div>
                <div>
                  <Label>Content</Label>
                  <Textarea rows={8} value={form.doc_content} onChange={(e) => setForm({ ...form, doc_content: e.target.value })} placeholder="Paste documentation, policies, or any information the chatbot should know..." />
                </div>
              </TabsContent>
            </Tabs>
            <div>
              <Label>Category (optional)</Label>
              <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="onboarding, billing, faq..." />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save} className="bg-gold hover:bg-gold/90 text-background">Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AdminChatbot;
