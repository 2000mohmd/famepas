import DashboardLayout from "@/components/DashboardLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Bell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const AdminCulturalEvents = () => {
  const { toast } = useToast();
  const [events, setEvents] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ title: "", start_date: "", end_date: "", region: "global", category: "", has_notification: false, color: "gray" });

  const load = async () => {
    const { data } = await supabase.from("cultural_events").select("*").order("start_date");
    setEvents(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm({ title: "", start_date: "", end_date: "", region: "global", category: "", has_notification: false, color: "gray" }); setOpen(true); };
  const openEdit = (e: any) => { setEditing(e); setForm({ ...e, category: e.category ?? "" }); setOpen(true); };

  const save = async () => {
    if (editing) {
      const { error } = await supabase.from("cultural_events").update(form).eq("id", editing.id);
      if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      const { error } = await supabase.from("cultural_events").insert(form);
      if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    }
    toast({ title: "Saved" }); setOpen(false); load();
  };
  const remove = async (id: string) => {
    if (!confirm("Delete event?")) return;
    await supabase.from("cultural_events").delete().eq("id", id);
    toast({ title: "Deleted" }); load();
  };

  return (
    <DashboardLayout type="admin">
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-[28px] font-bold text-foreground">Cultural Events</h1>
          <Button onClick={openNew} style={{ background: "#b8923a" }} className="text-white"><Plus className="w-4 h-4 mr-1.5" /> Add Event</Button>
        </div>

        <div className="bg-white border border-border rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left p-4 text-xs font-semibold uppercase text-muted-foreground">Title</th>
                <th className="text-left p-4 text-xs font-semibold uppercase text-muted-foreground">Dates</th>
                <th className="text-left p-4 text-xs font-semibold uppercase text-muted-foreground">Region</th>
                <th className="text-left p-4 text-xs font-semibold uppercase text-muted-foreground">Notify</th>
                <th className="text-right p-4 text-xs font-semibold uppercase text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map(e => (
                <tr key={e.id} className="border-b border-border/40">
                  <td className="p-4 font-medium text-foreground">{e.title}</td>
                  <td className="p-4 text-sm text-muted-foreground">{e.start_date} → {e.end_date}</td>
                  <td className="p-4 text-sm uppercase text-muted-foreground">{e.region}</td>
                  <td className="p-4">{e.has_notification && <Bell className="w-4 h-4" style={{ color: "#b8923a" }} />}</td>
                  <td className="p-4 text-right">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(e)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(e.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit" : "New"} Cultural Event</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start</Label><Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} /></div>
              <div><Label>End</Label><Input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Region</Label><Input value={form.region} onChange={e => setForm({ ...form, region: e.target.value })} placeholder="global / uk / us" /></div>
              <div><Label>Category</Label><Input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} /></div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Allow reminders</Label>
              <Switch checked={form.has_notification} onCheckedChange={v => setForm({ ...form, has_notification: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} style={{ background: "#b8923a" }} className="text-white">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default AdminCulturalEvents;
