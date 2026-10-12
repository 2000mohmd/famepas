import DashboardLayout from "@/components/DashboardLayout";
import AdminPermissionGate from "@/components/admin/AdminPermissionGate";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, CheckCircle, XCircle, Trash2 } from "lucide-react";

interface EventRow {
  id: string;
  title: string;
  description?: string | null;
  starts_at: string;
  ends_at: string | null;
  is_active: boolean;
  current_attendees: number;
  venue_id: string;
  venues: { name: string } | null;
}

const AdminEvents = () => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [venues, setVenues] = useState<{ id: string; name: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ venue_id: "", title: "", description: "", starts_at: "", ends_at: "" });
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    const [{ data: ev }, { data: vn }] = await Promise.all([
      supabase.from("events").select("id, title, description, starts_at, ends_at, is_active, current_attendees, venue_id, venues(name)").order("starts_at", { ascending: false }),
      supabase.from("venues").select("id, name").order("name"),
    ]);
    setEvents((ev as any) ?? []);
    setVenues((vn as any) ?? []);
  };

  useEffect(() => { fetchAll(); }, []);

  const toggleActive = async (id: string, active: boolean) => {
    const { error } = await supabase.from("events").update({ is_active: !active }).eq("id", id);
    if (error) toast({ title: t("admin.common.error"), description: error.message, variant: "destructive" });
    else { toast({ title: active ? t("admin.events.deactivated") : t("admin.events.activated") }); fetchAll(); }
  };

  const saveEvent = async () => {
    if (!form.venue_id || !form.title || !form.starts_at) {
      toast({ title: t("admin.events.missingFields"), description: t("admin.events.missingFieldsDesc"), variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("events").insert({
      venue_id: form.venue_id,
      title: form.title,
      description: form.description || null,
      starts_at: form.starts_at,
      ends_at: form.ends_at || null,
      is_active: true,
    } as any);
    setSaving(false);
    if (error) { toast({ title: t("admin.common.error"), description: error.message, variant: "destructive" }); return; }
    toast({ title: t("admin.events.eventCreated") });
    setOpen(false);
    setForm({ venue_id: "", title: "", description: "", starts_at: "", ends_at: "" });
    fetchAll();
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("events").delete().eq("id", deleteId);
    if (error) toast({ title: t("admin.common.error"), description: error.message, variant: "destructive" });
    else { toast({ title: t("admin.events.eventDeleted") }); fetchAll(); }
    setDeleteId(null);
  };

  return (
    <DashboardLayout type="admin">
      <AdminPermissionGate permission="manage_events">
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground mb-2">{t("admin.events.titlePrefix")} <span className="text-gold">{t("navLabel.Events", "Events")}</span></h1>
            <p className="text-muted-foreground">{t("admin.events.totalEvents", { count: events.length })}</p>
          </div>
          <Button onClick={() => setOpen(true)} className="bg-gold text-background hover:bg-gold/90">
            <Plus className="w-4 h-4 mr-1.5" /> {t("admin.events.createEvent")}
          </Button>
        </div>

        <div className="gradient-card rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t("admin.culturalEvents.titleCol")}</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t("admin.events.venue")}</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t("admin.events.date")}</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t("admin.events.attendees")}</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t("admin.locations.status")}</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t("admin.culturalEvents.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">{t("admin.events.noEvents")}</td></tr>
              ) : (
                events.map((event) => (
                  <tr key={event.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                    <td className="p-4 font-medium text-foreground">{event.title}</td>
                    <td className="p-4 text-muted-foreground">{event.venues?.name ?? "—"}</td>
                    <td className="p-4 text-muted-foreground">{new Date(event.starts_at).toLocaleDateString()}</td>
                    <td className="p-4 text-muted-foreground">{event.current_attendees}</td>
                    <td className="p-4">
                      <Badge className={event.is_active ? "bg-success/20 text-success border-success/30" : "bg-destructive/20 text-destructive border-destructive/30"}>
                        {event.is_active ? t("admin.locations.active") : t("admin.locations.inactive")}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => toggleActive(event.id, event.is_active)} className="h-7 px-2 text-muted-foreground hover:text-gold" title={event.is_active ? t("admin.locations.deactivate") : t("admin.locations.activate")}>
                          {event.is_active ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteId(event.id)} className="h-7 px-2 text-muted-foreground hover:text-destructive" title={t("admin.common.delete")}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("admin.events.createEvent")}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("admin.events.venue")}</Label>
              <Select value={form.venue_id} onValueChange={(v) => setForm({ ...form, venue_id: v })}>
                <SelectTrigger><SelectValue placeholder={t("admin.events.selectVenue")} /></SelectTrigger>
                <SelectContent>
                  {venues.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("admin.culturalEvents.titleCol")}</Label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label>{t("admin.chatbot.content", "Description")}</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("admin.events.startsAt")}</Label>
                <Input type="datetime-local" value={form.starts_at} onChange={e => setForm({ ...form, starts_at: e.target.value })} />
              </div>
              <div>
                <Label>{t("admin.events.endsAt")}</Label>
                <Input type="datetime-local" value={form.ends_at} onChange={e => setForm({ ...form, ends_at: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>{t("admin.common.cancel")}</Button>
            <Button onClick={saveEvent} disabled={saving} className="bg-gold text-background hover:bg-gold/90">{saving ? t("admin.events.savingEllipsis") : t("admin.events.createEvent")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.events.deleteConfirm")}</AlertDialogTitle>
            <AlertDialogDescription>{t("admin.events.cannotUndo")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("admin.common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t("admin.common.delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </AdminPermissionGate>
    </DashboardLayout>
  );
};

export default AdminEvents;
