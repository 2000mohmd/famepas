import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { Plus, ShieldCheck, Trash2 } from "lucide-react";

const ALL_PERMISSIONS = [
  { key: "manage_venues", label: "Manage Venues" },
  { key: "manage_influencers", label: "Manage Influencers" },
  { key: "manage_offers", label: "Manage Offers" },
  { key: "manage_events", label: "Manage Events" },
  { key: "manage_categories", label: "Manage Categories" },
  { key: "manage_locations", label: "Manage Locations" },
  { key: "manage_billing", label: "Manage Billing" },
  { key: "manage_moderation", label: "Moderation" },
  { key: "manage_analytics", label: "View Analytics" },
  { key: "manage_users", label: "Manage Admin Users" },
];

const AdminUsers = () => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", full_name: "", permissions: [] as string[] });

  const { data: admins } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
      const ids = (roles ?? []).map((r) => r.user_id);
      if (!ids.length) return [];
      const [{ data: profiles }, { data: perms }] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name, avatar_url, is_suspended").in("user_id", ids),
        supabase.from("admin_user_permissions").select("user_id, permission").in("user_id", ids),
      ]);
      return ids.map((id) => ({
        user_id: id,
        full_name: profiles?.find((p) => p.user_id === id)?.full_name || "Admin",
        avatar_url: profiles?.find((p) => p.user_id === id)?.avatar_url,
        is_suspended: !!profiles?.find((p) => p.user_id === id)?.is_suspended,
        permissions: (perms ?? []).filter((p) => p.user_id === id).map((p) => p.permission),
      }));
    },
  });

  const toggleSuspend = useMutation({
    mutationFn: async ({ user_id, suspend }: { user_id: string; suspend: boolean }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ is_suspended: suspend } as any)
        .eq("user_id", user_id);
      if (error) throw error;
      return suspend;
    },
    onSuccess: (suspend) => {
      toast({ title: suspend ? "User suspended" : "User unsuspended" });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: { email: form.email, password: form.password, full_name: form.full_name, role: "admin", permissions: form.permissions },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
    },
    onSuccess: () => {
      toast({ title: "Admin created" });
      setOpen(false);
      setForm({ email: "", password: "", full_name: "", permissions: [] });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updatePerms = useMutation({
    mutationFn: async ({ user_id, permissions }: { user_id: string; permissions: string[] }) => {
      await supabase.from("admin_user_permissions").delete().eq("user_id", user_id);
      if (permissions.length) {
        await supabase.from("admin_user_permissions").insert(permissions.map((p) => ({ user_id, permission: p })));
      }
    },
    onSuccess: () => {
      toast({ title: "Permissions updated" });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (user_id: string) => {
      await supabase.from("admin_user_permissions").delete().eq("user_id", user_id);
      const { error } = await supabase.from("user_roles").delete().eq("user_id", user_id).eq("role", "admin");
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Admin role removed" });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const toggle = (key: string, list: string[], set: (v: string[]) => void) => {
    set(list.includes(key) ? list.filter((p) => p !== key) : [...list, key]);
  };

  return (
    <DashboardLayout type="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Admin Users</h1>
            <p className="text-muted-foreground">Add admins and assign granular permissions</p>
          </div>
          <Button onClick={() => setOpen(true)} className="bg-gold text-background hover:bg-gold/90">
            <Plus className="w-4 h-4 mr-1" /> Add Admin
          </Button>
        </div>

        <div className="grid gap-4">
          {admins?.map((a) => (
            <Card key={a.user_id}>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {a.avatar_url ? (
                      <img src={a.avatar_url} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <ShieldCheck className="w-5 h-5 text-gold" />
                      </div>
                    )}
                    <div>
                      <p className="font-semibold">{a.full_name}</p>
                      <p className="text-xs text-muted-foreground">{a.permissions.length} permissions</p>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => remove.mutate(a.user_id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {ALL_PERMISSIONS.map((p) => {
                    const has = a.permissions.includes(p.key);
                    return (
                      <label key={p.key} className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded hover:bg-muted">
                        <Checkbox checked={has} onCheckedChange={() => {
                          const next = has ? a.permissions.filter((x) => x !== p.key) : [...a.permissions, p.key];
                          updatePerms.mutate({ user_id: a.user_id, permissions: next });
                        }} />
                        {p.label}
                      </label>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
          {admins?.length === 0 && <p className="text-center text-muted-foreground py-8">No admins yet</p>}
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Admin User</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Full Name</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Password</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
              <div>
                <Label>Permissions</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {ALL_PERMISSIONS.map((p) => (
                    <label key={p.key} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox checked={form.permissions.includes(p.key)} onCheckedChange={() => toggle(p.key, form.permissions, (v) => setForm({ ...form, permissions: v }))} />
                      {p.label}
                    </label>
                  ))}
                </div>
              </div>
              <Button className="w-full bg-gold text-background hover:bg-gold/90" onClick={() => create.mutate()} disabled={!form.email || !form.password || create.isPending}>
                {create.isPending ? "Creating..." : "Create Admin"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AdminUsers;
