import DashboardLayout from "@/components/DashboardLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Plus, UserMinus } from "lucide-react";

const db = supabase as any;

interface Member { user_id: string; full_name: string; role: string; leads: number }

const AdminSalesTeam = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", full_name: "", role: "sales_rep" });

  const load = async () => {
    setLoading(true);
    const { data: roles } = await supabase.from("user_roles").select("user_id, role");
    const staff = (roles ?? []).filter((r: any) => r.role === "sales_rep" || r.role === "sales_manager");
    if (!staff.length) { setMembers([]); setLoading(false); return; }
    const ids = staff.map((s: any) => s.user_id);
    const [{ data: profiles }, { data: leadRows }] = await Promise.all([
      supabase.from("profiles").select("user_id, full_name").in("user_id", ids),
      db.from("leads").select("owner_id"),
    ]);
    setMembers(staff.map((s: any) => ({
      user_id: s.user_id,
      role: s.role,
      full_name: profiles?.find((p: any) => p.user_id === s.user_id)?.full_name || "Unnamed",
      leads: (leadRows ?? []).filter((l: any) => l.owner_id === s.user_id).length,
    })));
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const create = async () => {
    if (!form.email.trim() || form.password.length < 8 || !form.full_name.trim()) {
      toast({ title: "Fill in name, email, and a password of at least 8 characters.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { data, error } = await supabase.functions.invoke("create-user", { body: form });
    setSaving(false);
    if (error || (data as any)?.error) {
      toast({ title: "Couldn't create that account", description: (data as any)?.error || error?.message, variant: "destructive" });
      return;
    }
    toast({ title: "Account created", description: `${form.full_name} can sign in now.` });
    setForm({ email: "", password: "", full_name: "", role: "sales_rep" });
    setOpen(false);
    void load();
  };

  const revoke = async (m: Member) => {
    if (m.leads > 0) {
      toast({
        title: "Reassign their leads first",
        description: `${m.full_name} still owns ${m.leads} lead${m.leads === 1 ? "" : "s"}. Move those to another rep, then remove the access.`,
        variant: "destructive",
      });
      return;
    }
    const { error } = await supabase.from("user_roles").delete().eq("user_id", m.user_id).eq("role", m.role as any);
    if (error) { toast({ title: "Couldn't remove access", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Sales access removed" });
    void load();
  };

  return (
    <DashboardLayout type="admin">
      <div className="animate-fade-in">
        <div className="flex items-start justify-between gap-3 mb-6 flex-wrap">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground mb-1">
              Sales <span className="text-gold">team</span>
            </h1>
            <p className="text-muted-foreground text-sm">
              Staff logins for the people working leads. Reps see only their own leads; managers see the whole pipeline.
            </p>
          </div>
          <Button onClick={() => setOpen(true)} className="gradient-gold text-accent-foreground font-semibold">
            <Plus className="w-4 h-4 mr-1.5" /> Add team member
          </Button>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : members.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <p className="text-muted-foreground mb-3">No sales staff yet.</p>
            <Button variant="outline" onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-1.5" /> Add the first one</Button>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {members.map((m) => (
              <div key={`${m.user_id}-${m.role}`} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">{m.full_name}</p>
                    <Badge variant="secondary" className="text-[10px] mt-1">
                      {m.role === "sales_manager" ? "Sales manager" : "Sales rep"}
                    </Badge>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => void revoke(m)} title="Remove sales access">
                    <UserMinus className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {m.leads} lead{m.leads === 1 ? "" : "s"} owned
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>Add a team member</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Full name</Label>
              <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Temporary password</Label>
              <Input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="At least 8 characters" />
              <p className="text-xs text-muted-foreground">Send this to them privately. They can change it from the login screen's reset link.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales_rep">Sales rep — own leads only</SelectItem>
                  <SelectItem value="sales_manager">Sales manager — whole pipeline</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => void create()} disabled={saving} className="gradient-gold text-accent-foreground font-semibold">
              {saving ? "Creating…" : "Create account"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default AdminSalesTeam;
