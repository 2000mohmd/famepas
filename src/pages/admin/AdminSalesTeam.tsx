import DashboardLayout from "@/components/DashboardLayout";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
      toast({ title: t("admin.salesTeam.fillRequired"), variant: "destructive" });
      return;
    }
    setSaving(true);
    const { data, error } = await supabase.functions.invoke("create-user", { body: form });
    setSaving(false);
    if (error || (data as any)?.error) {
      toast({ title: t("admin.salesTeam.couldntCreate"), description: (data as any)?.error || error?.message, variant: "destructive" });
      return;
    }
    toast({ title: t("admin.salesTeam.accountCreated"), description: t("admin.salesTeam.canSignInNow", { name: form.full_name }) });
    setForm({ email: "", password: "", full_name: "", role: "sales_rep" });
    setOpen(false);
    void load();
  };

  const revoke = async (m: Member) => {
    if (!window.confirm(t("admin.salesTeam.revokeConfirm", { name: m.full_name }))) return;
    // Cuts access and reassigns their leads in one step, logged to the audit
    // log — the CRM review's rule that disabling a login never leaves orphaned records.
    const { data, error } = await (supabase as any).rpc("disable_staff_login", { _user_id: m.user_id });
    if (error || data?.ok === false) {
      toast({ title: t("admin.salesTeam.couldntRemove"), description: data?.reason || error?.message, variant: "destructive" });
      return;
    }
    toast({ title: t("admin.salesTeam.accessRemoved"), description: data.leads_reassigned ? t("admin.salesTeam.leadsReassigned", { count: data.leads_reassigned }) : undefined });
    void load();
  };

  return (
    <DashboardLayout type="admin">
      <div className="animate-fade-in">
        <div className="flex items-start justify-between gap-3 mb-6 flex-wrap">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground mb-1">
              {t("admin.salesTeam.titlePrefix")} <span className="text-gold">{t("admin.salesTeam.titleAccent")}</span>
            </h1>
            <p className="text-muted-foreground text-sm">
              {t("admin.salesTeam.subtitle")}
            </p>
          </div>
          <Button onClick={() => setOpen(true)} className="btn-sales-primary font-semibold">
            <Plus className="w-4 h-4 mr-1.5" /> {t("admin.salesTeam.addMember")}
          </Button>
        </div>

        {loading ? (
          <p className="text-muted-foreground">{t("common.loading")}</p>
        ) : members.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <p className="text-muted-foreground mb-3">{t("admin.salesTeam.noStaff")}</p>
            <Button variant="outline" onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-1.5" /> {t("admin.salesTeam.addFirst")}</Button>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {members.map((m) => (
              <div key={`${m.user_id}-${m.role}`} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">{m.full_name}</p>
                    <Badge variant="secondary" className="text-[10px] mt-1">
                      {m.role === "sales_manager" ? t("admin.salesTeam.salesManager") : t("admin.salesTeam.salesRep")}
                    </Badge>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => void revoke(m)} title={t("admin.salesTeam.removeAccess")}>
                    <UserMinus className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {t("admin.salesTeam.leadsOwned", { count: m.leads })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>{t("admin.salesTeam.addMemberTitle")}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>{t("influencerSignup.fullName")}</Label>
              <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("login.email")}</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("admin.salesTeam.tempPassword")}</Label>
              <Input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={t("admin.salesTeam.atLeast8Chars")} />
              <p className="text-xs text-muted-foreground">{t("admin.salesTeam.sendPrivately")}</p>
            </div>
            <div className="space-y-1.5">
              <Label>{t("admin.salesTeam.role")}</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales_rep">{t("admin.salesTeam.salesRepOption")}</SelectItem>
                  <SelectItem value="sales_manager">{t("admin.salesTeam.salesManagerOption")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>{t("admin.common.cancel")}</Button>
            <Button onClick={() => void create()} disabled={saving} className="btn-sales-primary font-semibold">
              {saving ? t("admin.salesTeam.creating") : t("admin.salesTeam.createAccount")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default AdminSalesTeam;
