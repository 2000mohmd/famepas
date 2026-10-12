import DashboardLayout from "@/components/DashboardLayout";
import AdminPermissionGate from "@/components/admin/AdminPermissionGate";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Search, Mail, ShieldCheck, ShieldOff, UserX, UserCheck, AlertTriangle, Trash2, Check, X, Eye, Download, MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import * as XLSX from "xlsx";

import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import InfluencerDetailDialog from "@/components/admin/InfluencerDetailDialog";
import PageControls from "@/components/admin/PageControls";
import { usePagination } from "@/hooks/usePagination";
import { notifyEmail } from "@/lib/notify";
import { formatLabel } from "./_format";
import { creatorTier, tierBadgeClass, LOW_FOLLOWER_THRESHOLD } from "./_creatorTier";
import { findNameDuplicateIds } from "./_dupes";

const REJECTION_REASONS = [
  "Fake account",
  "Too few followers",
  "Wrong city",
  "Duplicate account",
  "Other",
] as const;

interface Influencer {
  user_id: string;
  full_name: string | null;
  instagram_handle: string | null;
  tiktok_handle: string | null;
  followers_count: number | null;
  tiktok_followers: number | null;
  influencer_score: number | null;
  is_verified: boolean;
  is_suspended: boolean;
  approval_status: string | null;
  phone: string | null;
  created_at: string;
  avatar_url: string | null;
  instagram_verified: boolean | null;
}

const stripAt = (h: string | null) => (h ? h.replace(/^@+/, "") : "");
const normalizePhone = (p: string | null) => (p || "").replace(/\D/g, "");

/** Suspended/pending/rejected/verified are independent flags in the schema —
 * show one priority-ordered pill instead of stacking all of them. */
const statusBadge = (inf: Influencer, t: TFunction) => {
  if (inf.is_suspended) return <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-xs w-fit">{t("admin.users.suspended")}</Badge>;
  if (inf.approval_status === "pending") return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-400/30 text-xs w-fit">{t("admin.influencers.pending")}</Badge>;
  if (inf.approval_status === "rejected") return <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-xs w-fit">{t("admin.dashboard.status.rejected")}</Badge>;
  if (inf.is_verified) return <Badge className="bg-gold/20 text-gold border-gold/30 text-xs w-fit">{t("admin.influencers.verified")}</Badge>;
  return <Badge variant="secondary" className="text-xs w-fit">{t("admin.locations.active")}</Badge>;
};

const AdminInfluencers = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [warningOpen, setWarningOpen] = useState(false);
  const [warningTarget, setWarningTarget] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailUserId, setDetailUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Influencer | null>(null);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string>(REJECTION_REASONS[0]);
  const [rejectNote, setRejectNote] = useState("");
  // Adnan, "More Fixes" #26: bulk approve/reject for the 190+ pending applications.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkRejectOpen, setBulkRejectOpen] = useState(false);
  const { toast } = useToast();

  const fetchInfluencers = async () => {
    setLoading(true);
    const { data: roles } = await supabase.from("user_roles").select("user_id, role");
    const influencerIds = (roles ?? []).filter(r => r.role === "influencer").map(r => r.user_id);
    // Some seeded/legacy accounts carry both roles; a venue or admin account must
    // never show up in the influencer roster.
    const staffIds = new Set((roles ?? []).filter(r => r.role !== "influencer").map(r => r.user_id));
    const ids = [...new Set(influencerIds)].filter(id => !staffIds.has(id));
    if (!ids.length) { setInfluencers([]); setLoading(false); return; }
    const { data } = await supabase
      .from("profiles")
      .select("user_id, full_name, instagram_handle, tiktok_handle, followers_count, tiktok_followers, influencer_score, is_verified, is_suspended, approval_status, phone, created_at, avatar_url, instagram_verified")
      .in("user_id", ids)
      .order("created_at", { ascending: false });
    setInfluencers((data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchInfluencers(); }, []);

  const toggleVerified = async (userId: string, current: boolean) => {
    const { error } = await supabase.from("profiles").update({ is_verified: !current } as any).eq("user_id", userId);
    if (error) {
      toast({ title: t("admin.common.error"), description: error.message, variant: "destructive" });
    } else {
      toast({ title: current ? t("admin.influencers.verificationRemoved") : t("admin.influencers.influencerVerified") });
      fetchInfluencers();
    }
  };

  const toggleSuspended = async (userId: string, current: boolean) => {
    const { error } = await supabase.from("profiles").update({ is_suspended: !current } as any).eq("user_id", userId);
    if (error) {
      toast({ title: t("admin.common.error"), description: error.message, variant: "destructive" });
    } else {
      toast({ title: current ? t("admin.influencers.accountReinstated") : t("admin.influencers.accountSuspended") });
      fetchInfluencers();
    }
  };

  const deleteInfluencer = async (userId: string) => {
    const { error } = await supabase.functions.invoke("delete-user", { body: { user_id: userId } });
    if (error) {
      toast({ title: t("admin.common.error"), description: error.message, variant: "destructive" });
    } else {
      toast({ title: t("admin.influencers.influencerDeleted") });
      fetchInfluencers();
    }
  };

  const setApprovalStatus = async (userId: string, status: "approved" | "rejected", reason?: string) => {
    const { error } = await supabase.from("profiles").update({ approval_status: status } as any).eq("user_id", userId);
    if (error) { toast({ title: t("admin.common.error"), description: error.message, variant: "destructive" }); return; }
    if (status === "approved") {
      const sent = await notifyEmail({ event: "influencer_approved", user_id: userId });
      toast({
        title: t("admin.influencers.influencerApproved"),
        description: sent ? t("admin.influencers.approvalEmailSent") : t("admin.influencers.approvalEmailFailed"),
        variant: sent ? undefined : "destructive",
      });
    } else {
      const sent = await notifyEmail({ event: "influencer_rejected", user_id: userId, reason });
      toast({
        title: t("admin.influencers.influencerRejected"),
        description: sent ? t("admin.venues.emailSent") : t("admin.venues.emailCouldntSend"),
        variant: sent ? undefined : "destructive",
      });
    }
    fetchInfluencers();
  };

  const openReject = (userId: string) => {
    setRejectTarget(userId);
    setRejectReason(REJECTION_REASONS[0]);
    setRejectNote("");
  };

  const openBulkReject = () => {
    setRejectReason(REJECTION_REASONS[0]);
    setRejectNote("");
    setBulkRejectOpen(true);
  };

  const submitReject = async () => {
    const reason = rejectReason === "Other" ? (rejectNote.trim() || "Other") : rejectReason;
    if (bulkRejectOpen) {
      await bulkSetApprovalStatus([...selectedIds], "rejected", reason);
      setBulkRejectOpen(false);
      return;
    }
    if (!rejectTarget) return;
    await setApprovalStatus(rejectTarget, "rejected", reason);
    setRejectTarget(null);
  };

  const bulkSetApprovalStatus = async (ids: string[], status: "approved" | "rejected", reason?: string) => {
    if (!ids.length) return;
    const { error } = await supabase.from("profiles").update({ approval_status: status } as any).in("user_id", ids);
    if (error) { toast({ title: t("admin.common.error"), description: error.message, variant: "destructive" }); return; }
    await Promise.all(ids.map((id) =>
      notifyEmail(
        status === "approved"
          ? { event: "influencer_approved", user_id: id }
          : { event: "influencer_rejected", user_id: id, reason }
      )
    ));
    toast({ title: t("admin.influencers.bulkStatusResult", { count: ids.length, status: t(`admin.dashboard.status.${status}`, status) }) });
    setSelectedIds(new Set());
    fetchInfluencers();
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };


  const resendApproval = async (userId: string) => {
    const sent = await notifyEmail({ event: "influencer_approved", user_id: userId });
    toast({
      title: sent ? t("admin.influencers.approvalEmailSentTitle") : t("admin.influencers.emailCouldntSendTitle"),
      description: sent ? undefined : t("admin.influencers.checkEmailConfig"),
      variant: sent ? undefined : "destructive",
    });
  };

  const sendWarning = async () => {
    if (!warningTarget || !warningMessage.trim() || !user) return;
    const { error } = await supabase.from("influencer_warnings" as any).insert({
      influencer_id: warningTarget,
      warning_message: warningMessage,
      issued_by: user.id,
    });
    if (error) {
      toast({ title: t("admin.common.error"), description: error.message, variant: "destructive" });
    } else {
      toast({ title: t("admin.influencers.warningSent") });
      setWarningOpen(false);
      setWarningMessage("");
      setWarningTarget(null);
    }
  };

  const phoneCounts = new Map<string, number>();
  influencers.forEach((i) => {
    const p = normalizePhone(i.phone);
    if (p) phoneCounts.set(p, (phoneCounts.get(p) || 0) + 1);
  });
  const nameDupeIds = findNameDuplicateIds(influencers.map((i) => ({ id: i.user_id, name: i.full_name })));

  let filtered = influencers.filter(i =>
    (i.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (i.instagram_handle || "").toLowerCase().includes(search.toLowerCase())
  );

  // Status filter
  // Verified is meant as "show my active, verified creators" — a still-pending
  // or suspended account that also happens to have is_verified=true shouldn't
  // surface here (that combination is exactly the "two statuses at once" data
  // problem flagged separately; this keeps the filter from surfacing it).
  if (statusFilter === "verified") filtered = filtered.filter(i => i.is_verified && !i.is_suspended && i.approval_status === "approved");
  else if (statusFilter === "suspended") filtered = filtered.filter(i => i.is_suspended);
  else if (statusFilter === "pending") filtered = filtered.filter(i => i.approval_status === "pending");
  else if (statusFilter === "ig_unverified") filtered = filtered.filter(i => i.instagram_verified !== true);
  else if (statusFilter === "active") filtered = filtered.filter(i => !i.is_suspended && !i.is_verified && i.approval_status === "approved");

  // Sort
  if (sortBy === "newest") filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  else if (sortBy === "oldest") filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  else if (sortBy === "followers") filtered.sort((a, b) => (b.followers_count || 0) - (a.followers_count || 0));
  else if (sortBy === "tiktok") filtered.sort((a, b) => (b.tiktok_followers || 0) - (a.tiktok_followers || 0));
  else if (sortBy === "score") filtered.sort((a, b) => (b.influencer_score || 0) - (a.influencer_score || 0));
  else if (sortBy === "name") filtered.sort((a, b) => (a.full_name || "").localeCompare(b.full_name || ""));
  else if (sortBy === "name_desc") filtered.sort((a, b) => (b.full_name || "").localeCompare(a.full_name || ""));

  const { page, pageCount, setPage, paged } = usePagination(filtered);

  const exportToExcel = () => {
    const rows = filtered.map((i) => ({
      "Full name": i.full_name || "",
      Phone: i.phone || "",
      Instagram: stripAt(i.instagram_handle) ? `@${stripAt(i.instagram_handle)}` : "",
      "Instagram followers": i.followers_count ?? 0,
      "Instagram verified": i.instagram_verified ? "Yes" : "No",
      TikTok: stripAt(i.tiktok_handle) ? `@${stripAt(i.tiktok_handle)}` : "",
      "TikTok followers": i.tiktok_followers ?? 0,
      Score: i.influencer_score ?? 0,
      Status: i.is_suspended ? "Suspended" : formatLabel(i.approval_status || "pending"),
      Verified: i.is_verified ? "Yes" : "No",
      "Joined": new Date(i.created_at).toLocaleDateString(),
    }));
    // Neutralise spreadsheet formulas in user-supplied text (=, +, -, @, tab, CR).
    const safe = (v: unknown) => (typeof v === "string" && /^[=+\-@\t\r]/.test(v) ? `'${v}` : v);
    const safeRows = rows.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, safe(v)])));
    const sheet = XLSX.utils.json_to_sheet(safeRows);
    sheet["!cols"] = Object.keys(rows[0] ?? {}).map(() => ({ wch: 20 }));
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Influencers");
    XLSX.writeFile(book, `famepass-influencers-${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast({ title: t("admin.influencers.exportedCount", { count: rows.length }) });
  };

  return (

    <DashboardLayout type="admin">
      <AdminPermissionGate permission="manage_influencers">
      <div className="animate-fade-in">
        <h1 className="text-3xl font-display font-bold text-foreground mb-2">{t("admin.influencers.manage")} <span className="text-gold">{t("navLabel.Influencers", "Influencers")}</span></h1>
        <p className="text-muted-foreground mb-8">
          {statusFilter === "all" && !search
            ? t("admin.influencers.registeredCount", { count: influencers.length })
            : t("admin.influencers.filteredCount", { filtered: filtered.length, total: influencers.length })}
        </p>

        <div className="flex flex-wrap gap-4 mb-6">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder={t("admin.influencers.searchPlaceholder")} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-secondary border-border" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px] bg-secondary border-border"><SelectValue placeholder={t("admin.locations.status")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("admin.influencers.allStatus")}</SelectItem>
              <SelectItem value="pending">{t("admin.influencers.pendingApproval")}</SelectItem>
              <SelectItem value="verified">{t("admin.influencers.verified")}</SelectItem>
              <SelectItem value="active">{t("admin.locations.active")}</SelectItem>
              <SelectItem value="suspended">{t("admin.users.suspended")}</SelectItem>
              <SelectItem value="ig_unverified">{t("admin.influencers.igUnverified")}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px] bg-secondary border-border"><SelectValue placeholder={t("admin.offers.sortBy")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">{t("admin.offers.newestFirst")}</SelectItem>
              <SelectItem value="oldest">{t("admin.offers.oldestFirst")}</SelectItem>
              <SelectItem value="followers">{t("admin.influencers.mostIGFollowers")}</SelectItem>
              <SelectItem value="tiktok">{t("admin.influencers.mostTikTokFollowers")}</SelectItem>
              <SelectItem value="score">{t("admin.influencers.highestScore")}</SelectItem>
              <SelectItem value="name">{t("admin.venues.nameAZ")}</SelectItem>
              <SelectItem value="name_desc">{t("admin.venues.nameZA")}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportToExcel} disabled={filtered.length === 0}>
            <Download className="w-4 h-4 mr-2" /> {t("admin.influencers.exportToExcel")}
          </Button>
        </div>

        {(() => {
          const pendingIds = filtered.filter((i) => i.approval_status === "pending").map((i) => i.user_id);
          return pendingIds.length > 0 && selectedIds.size === 0 ? (
            <div className="mb-4">
              <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set(pendingIds))}>
                {t("admin.influencers.selectAllPending", { count: pendingIds.length })}
              </Button>
            </div>
          ) : null;
        })()}

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 mb-4 p-3 rounded-xl border border-gold/30 bg-gold/10">
            <span className="text-sm font-medium text-foreground">{t("admin.influencers.selectedCount", { count: selectedIds.size })}</span>
            <Button size="sm" onClick={() => bulkSetApprovalStatus([...selectedIds], "approved")} className="bg-success/20 text-success hover:bg-success/30">
              {t("admin.influencers.approveAll")}
            </Button>
            <Button size="sm" variant="outline" onClick={openBulkReject} className="text-destructive border-destructive/30 hover:bg-destructive/10">
              {t("admin.influencers.rejectAll")}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())} className="ml-auto text-muted-foreground">
              {t("admin.influencers.clear")}
            </Button>
          </div>
        )}

        <div className="gradient-card rounded-xl border border-border overflow-hidden">
          <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[1040px]">
            <thead>
              <tr className="border-b border-border">
                <th className="p-4 w-10">
                  <input
                    type="checkbox"
                    aria-label={t("admin.influencers.selectAllPage")}
                    checked={paged.length > 0 && paged.every((i) => selectedIds.has(i.user_id))}
                    onChange={(e) => {
                      setSelectedIds((prev) => {
                        const next = new Set(prev);
                        paged.forEach((i) => { if (e.target.checked) next.add(i.user_id); else next.delete(i.user_id); });
                        return next;
                      });
                    }}
                  />
                </th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t("admin.influencers.name")}</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t("admin.influencers.instagram")}</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t("admin.influencers.tiktok")}</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t("admin.influencers.followers")}</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground whitespace-nowrap min-w-[110px]">{t("admin.locations.status")}</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground whitespace-nowrap min-w-[90px]">{t("admin.influencers.joined")}</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground sticky right-0 bg-card">{t("admin.influencers.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">{t("admin.influencers.loading")}</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">{t("admin.influencers.noneFound")}</td></tr>
              ) : (
                paged.map((inf) => (
                  <tr key={inf.user_id} className={`border-b border-border/50 hover:bg-secondary/30 transition-colors ${inf.is_suspended ? "opacity-60" : ""}`}>
                    <td className="p-4">
                      <input type="checkbox" aria-label={`Select ${inf.full_name}`} checked={selectedIds.has(inf.user_id)} onChange={() => toggleSelected(inf.user_id)} />
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {inf.avatar_url ? (
                          <HoverCard openDelay={150}>
                            <HoverCardTrigger asChild>
                              <img src={inf.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover border border-border cursor-pointer" />
                            </HoverCardTrigger>
                            <HoverCardContent side="right" className="w-64 p-2 bg-card border-border">
                              <img src={inf.avatar_url} alt={inf.full_name || ""} className="w-full h-60 rounded-lg object-cover" />
                              <p className="text-sm font-medium text-foreground mt-2">{inf.full_name}</p>
                            </HoverCardContent>
                          </HoverCard>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold text-muted-foreground shrink-0">
                            {(inf.full_name || "?").split(" ").map(w => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">{inf.full_name || "—"}</span>
                            {inf.is_verified && <ShieldCheck className="w-4 h-4 text-gold shrink-0" />}
                            {nameDupeIds.has(inf.user_id) && (
                              <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-[9px] px-1 py-0 h-4" title={t("admin.influencers.similarNameTitle")}>{t("admin.influencers.similarName")}</Badge>
                            )}
                          </div>
                          {inf.phone && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              {inf.phone}
                              {(phoneCounts.get(normalizePhone(inf.phone)) ?? 0) > 1 && (
                                <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-[9px] px-1 py-0 h-4">{t("admin.influencers.possibleDuplicate")}</Badge>
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-sm">
                      {inf.instagram_handle ? (
                        <div className="flex items-center gap-2">
                          <a href={`https://instagram.com/${stripAt(inf.instagram_handle)}`} target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">@{stripAt(inf.instagram_handle)}</a>
                          {inf.instagram_verified === true ? (
                            <Badge className="bg-success/20 text-success border-success/30 text-[10px] w-fit">{t("admin.influencers.igVerifiedBadge")}</Badge>
                          ) : inf.instagram_verified === false ? (
                            <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-[10px] w-fit">{t("admin.influencers.igNotFound")}</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px] w-fit">{t("admin.influencers.igUnchecked")}</Badge>
                          )}
                        </div>
                      ) : "—"}
                    </td>
                    <td className="p-4 text-sm">
                      {inf.tiktok_handle ? (
                        <a href={`https://tiktok.com/@${stripAt(inf.tiktok_handle)}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-gold hover:underline">@{stripAt(inf.tiktok_handle)}</a>
                      ) : "—"}
                    </td>
                    <td className="p-4 text-muted-foreground text-sm">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span>
                          {inf.followers_count ? `IG: ${inf.followers_count.toLocaleString()}` : ""}
                          {inf.tiktok_followers ? ` / TK: ${inf.tiktok_followers.toLocaleString()}` : ""}
                          {!inf.followers_count && !inf.tiktok_followers ? "—" : ""}
                        </span>
                        {(inf.followers_count || inf.tiktok_followers) ? (() => {
                          const max = Math.max(inf.followers_count || 0, inf.tiktok_followers || 0);
                          const tier = creatorTier(max);
                          return (
                            <>
                              <Badge className={`text-[10px] px-1.5 py-0 h-4 ${tierBadgeClass[tier]}`}>{tier}</Badge>
                              {max < LOW_FOLLOWER_THRESHOLD && inf.approval_status === "pending" && (
                                <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-[9px] px-1 py-0 h-4">{t("admin.influencers.lowFollowers")}</Badge>
                              )}
                            </>
                          );
                        })() : null}
                      </div>
                    </td>
                    <td className="p-4">{statusBadge(inf, t)}</td>
                    <td className="p-4 text-muted-foreground text-sm whitespace-nowrap">{new Date(inf.created_at).toLocaleDateString()}</td>
                    <td className="p-4 sticky right-0 bg-card">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => { setDetailUserId(inf.user_id); setDetailOpen(true); }} className="text-muted-foreground hover:text-gold h-7 px-2" title={t("admin.influencers.viewProfile")}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        {inf.approval_status === "pending" && (
                          <Button size="sm" onClick={() => setApprovalStatus(inf.user_id, "approved")} className="bg-success/20 text-success hover:bg-success/30 h-7 text-xs">{t("admin.influencers.approve")}</Button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-gold h-7 px-2" title={t("admin.influencers.moreActions")}>
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-popover z-50">
                            {inf.approval_status === "pending" && (
                              <DropdownMenuItem onClick={() => openReject(inf.user_id)} className="text-destructive focus:text-destructive">
                                <X className="w-4 h-4 mr-2" /> {t("admin.influencers.reject")}
                              </DropdownMenuItem>
                            )}
                            {inf.approval_status === "approved" && (
                              <DropdownMenuItem onClick={() => resendApproval(inf.user_id)}>
                                <Mail className="w-4 h-4 mr-2" /> {t("admin.influencers.resendApprovalEmail")}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => toggleVerified(inf.user_id, inf.is_verified)}>
                              {inf.is_verified ? <ShieldOff className="w-4 h-4 mr-2" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
                              {inf.is_verified ? t("admin.influencers.removeVerification") : t("admin.influencers.verify")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleSuspended(inf.user_id, inf.is_suspended)}>
                              {inf.is_suspended ? <UserCheck className="w-4 h-4 mr-2" /> : <UserX className="w-4 h-4 mr-2" />}
                              {inf.is_suspended ? t("admin.influencers.reinstate") : t("admin.influencers.suspend")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setWarningTarget(inf.user_id); setWarningOpen(true); }}>
                              <AlertTriangle className="w-4 h-4 mr-2" /> {t("admin.influencers.sendWarning")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setDeleteTarget(inf)} className="text-destructive focus:text-destructive">
                              <Trash2 className="w-4 h-4 mr-2" /> {t("admin.common.delete")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
          <PageControls page={page} pageCount={pageCount} onChange={setPage} />
        </div>

        <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
          <AlertDialogContent className="bg-card border-border">
            <AlertDialogHeader>
              <AlertDialogTitle>{t("admin.influencers.deleteTitle")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("admin.influencers.deleteDescription", { name: deleteTarget?.full_name || t("admin.influencers.thisInfluencer") })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("admin.common.cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={() => { if (deleteTarget) deleteInfluencer(deleteTarget.user_id); setDeleteTarget(null); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t("admin.common.delete")}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Reject Dialog — also used for bulk reject */}
        <Dialog open={!!rejectTarget || bulkRejectOpen} onOpenChange={(o) => { if (!o) { setRejectTarget(null); setBulkRejectOpen(false); } }}>
          <DialogContent className="bg-card border-border max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display text-foreground">
                {bulkRejectOpen ? t("admin.influencers.rejectNApplications", { count: selectedIds.size }) : t("admin.influencers.rejectApplication")}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label className="text-muted-foreground">{t("admin.influencers.reason")}</Label>
                <Select value={rejectReason} onValueChange={setRejectReason}>
                  <SelectTrigger className="bg-secondary border-border mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {REJECTION_REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {rejectReason === "Other" && (
                <div>
                  <Label className="text-muted-foreground">{t("admin.influencers.details")}</Label>
                  <Textarea value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} placeholder={t("admin.influencers.reasonForRejection")} className="bg-secondary border-border mt-1" rows={3} />
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {bulkRejectOpen
                  ? t("admin.influencers.rejectBulkEmailNotice")
                  : t("admin.influencers.rejectSingleEmailNotice")}
              </p>
              <Button onClick={submitReject} className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90 font-semibold">
                {bulkRejectOpen ? t("admin.influencers.rejectNAndNotify", { count: selectedIds.size }) : t("admin.influencers.rejectAndNotify")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Warning Dialog */}
        <Dialog open={warningOpen} onOpenChange={setWarningOpen}>
          <DialogContent className="bg-card border-border max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display text-foreground flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-warning" /> {t("admin.influencers.sendWarning")}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label className="text-muted-foreground">{t("admin.influencers.warningMessage")}</Label>
                <Textarea
                  value={warningMessage}
                  onChange={e => setWarningMessage(e.target.value)}
                  placeholder={t("admin.influencers.warningPlaceholder")}
                  className="bg-secondary border-border mt-1"
                  rows={4}
                />
              </div>
              <Button onClick={sendWarning} disabled={!warningMessage.trim()} className="w-full bg-warning/20 text-warning hover:bg-warning/30 font-semibold">
                {t("admin.influencers.sendWarning")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <InfluencerDetailDialog
          userId={detailUserId}
          open={detailOpen}
          onOpenChange={setDetailOpen}
          onApprove={(id) => setApprovalStatus(id, "approved")}
          onReject={(id) => setApprovalStatus(id, "rejected")}
        />
      </div>
      </AdminPermissionGate>
    </DashboardLayout>
  );
};

export default AdminInfluencers;
