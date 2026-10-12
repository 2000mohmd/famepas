import DashboardLayout from "@/components/DashboardLayout";
import AdminPermissionGate from "@/components/admin/AdminPermissionGate";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

const db = supabase as any;

interface Entry { id: string; user_id: string | null; action: string; target_table: string | null; target_id: string | null; detail: any; created_at: string }

const ACTION_TONE: Record<string, string> = {
  approve: "bg-success/15 text-success border-success/30",
  reject: "bg-destructive/15 text-destructive border-destructive/30",
  delete: "bg-destructive/15 text-destructive border-destructive/30",
  export: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  bulk_reassign: "bg-gold/15 text-gold border-gold/30",
  login_created: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  login_disabled: "bg-destructive/15 text-destructive border-destructive/30",
};

const AdminAuditLog = () => {
  const { t } = useTranslation();
  const [rows, setRows] = useState<Entry[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await db.from("staff_audit_log").select("*").order("created_at", { ascending: false }).limit(300);
      if (error) { setLoadError(error.message); setLoading(false); return; }
      setRows(data ?? []);
      const ids = [...new Set((data ?? []).map((r: Entry) => r.user_id).filter(Boolean))] as string[];
      if (ids.length) {
        const { data: profiles } = await supabase.rpc("get_public_profiles_basic", { _user_ids: ids });
        setNames(Object.fromEntries((profiles ?? []).map((p: any) => [p.user_id, p.full_name])));
      }
      setLoading(false);
    })();
  }, []);

  return (
    <DashboardLayout type="admin">
      <AdminPermissionGate permission="manage_users">
      <div className="animate-fade-in">
        <h1 className="text-3xl font-display font-bold text-foreground mb-2">{t("admin.auditLog.title")} <span className="text-gold">{t("admin.auditLog.titleAccent")}</span></h1>
        <p className="text-muted-foreground mb-6">
          {t("admin.auditLog.subtitle")}
        </p>

        {loadError && (
          <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {t("admin.auditLog.couldntLoad")} {loadError}
          </div>
        )}

        <div className="gradient-card rounded-xl border border-border overflow-hidden">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="p-3 font-medium">{t("admin.auditLog.when")}</th>
                  <th className="p-3 font-medium">{t("admin.auditLog.who")}</th>
                  <th className="p-3 font-medium">{t("admin.auditLog.action")}</th>
                  <th className="p-3 font-medium">{t("admin.auditLog.on")}</th>
                  <th className="p-3 font-medium">{t("admin.auditLog.detail")}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">{t("common.loading")}</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">{t("admin.auditLog.nothingLogged")}</td></tr>
                ) : rows.map((r) => (
                  <tr key={r.id} className="border-b border-border/50">
                    <td className="p-3 text-muted-foreground whitespace-nowrap">{new Date(r.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</td>
                    <td className="p-3 text-foreground">{r.user_id ? names[r.user_id] ?? t("admin.auditLog.unknown") : t("admin.auditLog.system")}</td>
                    <td className="p-3"><Badge variant="outline" className={ACTION_TONE[r.action]}>{r.action.replace("_", " ")}</Badge></td>
                    <td className="p-3 text-muted-foreground">{[r.target_table, r.target_id?.slice(0, 8)].filter(Boolean).join(" · ") || "—"}</td>
                    <td className="p-3 text-xs text-muted-foreground max-w-xs truncate" title={JSON.stringify(r.detail)}>
                      {Object.keys(r.detail ?? {}).length ? JSON.stringify(r.detail) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      </AdminPermissionGate>
    </DashboardLayout>
  );
};

export default AdminAuditLog;
