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
import { useTranslation } from "react-i18next";
import { Plus, ShieldCheck, Trash2, Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const ALL_PERMISSIONS = [
  { key: "manage_venues", labelKey: "admin.users.permManageVenues" },
  { key: "manage_influencers", labelKey: "admin.users.permManageInfluencers" },
  { key: "manage_offers", labelKey: "admin.users.permManageOffers" },
  { key: "manage_events", labelKey: "admin.users.permManageEvents" },
  { key: "manage_categories", labelKey: "admin.users.permManageCategories" },
  { key: "manage_locations", labelKey: "admin.users.permManageLocations" },
  { key: "manage_billing", labelKey: "admin.users.permManageBilling" },
  { key: "manage_moderation", labelKey: "admin.users.permModeration" },
  { key: "manage_analytics", labelKey: "admin.users.permViewAnalytics" },
  { key: "manage_users", labelKey: "admin.users.permManageAdminUsers" },
];

const AdminUsers = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", full_name: "", permissions: [] as string[] });

  // Gate this page itself, matching the DB policy: only manage_users holders
  // get in, unless nobody holds it yet (first-time bootstrap).
  const { data: canManage, isLoading: permLoading } = useQuery({
    queryKey: ["can-manage-admins", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data: hasPerm } = await supabase.rpc("has_admin_permission", { _user_id: user.id, _permission: "manage_users" });
      if (hasPerm) return true;
      const { count } = await supabase.from("admin_user_permissions").select("id", { count: "exact", head: true }).eq("permission", "manage_users");
      return !count;
    },
    enabled: !!user,
  });

  const { data: admins } = useQuery({
    queryKey: ["admin-users"],
    // Without this, the query can fire before the Supabase client has
    // finished attaching the restored session's JWT to outgoing requests —
    // it then runs as anon, admin_user_permissions' policies are scoped to
    // `authenticated` only, and the query quietly succeeds with 0 rows
    // instead of erroring. React Query then caches that empty result as
    // fresh and never retries. Matches exactly what Adnan reported: every
    // admin shows 0 permissions, even after a hard refresh.
    enabled: !!user,
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
      toast({ title: suspend ? t("admin.users.userSuspended") : t("admin.users.userUnsuspended") });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: any) => toast({ title: t("admin.common.error"), description: e.message, variant: "destructive" }),
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
      toast({ title: t("admin.users.adminCreated") });
      setOpen(false);
      setForm({ email: "", password: "", full_name: "", permissions: [] });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: any) => toast({ title: t("admin.common.error"), description: e.message, variant: "destructive" }),
  });

  const updatePerms = useMutation({
    mutationFn: async ({ user_id, permissions }: { user_id: string; permissions: string[] }) => {
      await supabase.from("admin_user_permissions").delete().eq("user_id", user_id);
      if (permissions.length) {
        await supabase.from("admin_user_permissions").insert(permissions.map((p) => ({ user_id, permission: p })));
      }
    },
    onSuccess: () => {
      toast({ title: t("admin.users.permissionsUpdated") });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: any) => toast({ title: t("admin.common.error"), description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (user_id: string) => {
      await supabase.from("admin_user_permissions").delete().eq("user_id", user_id);
      const { error } = await supabase.from("user_roles").delete().eq("user_id", user_id).eq("role", "admin");
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: t("admin.users.adminRemoved") });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: any) => toast({ title: t("admin.common.error"), description: e.message, variant: "destructive" }),
  });

  const toggle = (key: string, list: string[], set: (v: string[]) => void) => {
    set(list.includes(key) ? list.filter((p) => p !== key) : [...list, key]);
  };

  if (!permLoading && !canManage) {
    return (
      <DashboardLayout type="admin">
        <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
          <Lock className="w-8 h-8 text-muted-foreground" />
          <h1 className="text-xl font-display font-bold text-foreground">{t("navLabel.Admin Users", "Manage Admin Users")}</h1>
          <p className="text-muted-foreground max-w-sm">
            {t("admin.users.noPermission")}
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout type="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">{t("navLabel.Admin Users", "Admin Users")}</h1>
            <p className="text-muted-foreground">{t("admin.users.subtitle")}</p>
          </div>
          <Button onClick={() => setOpen(true)} className="bg-gold text-background hover:bg-gold/90">
            <Plus className="w-4 h-4 mr-1" /> {t("admin.users.addAdmin")}
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
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{a.full_name}</p>
                        {a.is_suspended && (
                          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 text-xs">{t("admin.users.suspended")}</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{t("admin.users.permissionsCount", { count: a.permissions.length })}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleSuspend.mutate({ user_id: a.user_id, suspend: !a.is_suspended })}
                      className={a.is_suspended ? "border-green-300 text-green-700 hover:bg-green-50" : "border-yellow-300 text-yellow-700 hover:bg-yellow-50"}
                    >
                      {a.is_suspended ? t("admin.users.unsuspend") : t("admin.users.suspend")}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => remove.mutate(a.user_id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
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
                        {t(p.labelKey)}
                      </label>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
          {admins?.length === 0 && <p className="text-center text-muted-foreground py-8">{t("admin.users.noAdmins")}</p>}
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>{t("admin.users.addAdminUser")}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>{t("admin.users.fullName")}</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
              <div><Label>{t("login.email")}</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>{t("login.password")}</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
              <div>
                <Label>{t("admin.users.permissions")}</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {ALL_PERMISSIONS.map((p) => (
                    <label key={p.key} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox checked={form.permissions.includes(p.key)} onCheckedChange={() => toggle(p.key, form.permissions, (v) => setForm({ ...form, permissions: v }))} />
                      {t(p.labelKey)}
                    </label>
                  ))}
                </div>
              </div>
              <Button className="w-full bg-gold text-background hover:bg-gold/90" onClick={() => create.mutate()} disabled={!form.email || !form.password || create.isPending}>
                {create.isPending ? t("admin.users.creatingEllipsis") : t("admin.users.createAdmin")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AdminUsers;
