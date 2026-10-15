import DashboardLayout from "@/components/DashboardLayout";
import AdminPermissionGate from "@/components/admin/AdminPermissionGate";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Trash2, Eye, UserCog, MoreHorizontal, X, MessageCircle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import VenueDetailDialog from "@/components/admin/VenueDetailDialog";
import PageControls from "@/components/admin/PageControls";
import { usePagination } from "@/hooks/usePagination";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { notifyEmail } from "@/lib/notify";
import { isValidEmail, isValidName } from "@/lib/validation";
import { formatLabel } from "./_format";
import { stageLabel } from "@/pages/sales/leadMeta";

interface Category { id: string; name: string; }
interface Location { id: string; city: string; }

interface Venue {
  id: string;
  name: string;
  category: string;
  city: string | null;
  is_active: boolean;
  approval_status: string;
  created_at: string;
  logo_url: string | null;
  contact_person_name?: string | null; // column is locked for admins at the DB level — read contacts through get_venue_contact()
}

// Single-word, obviously-placeholder business names — flagged for admin review,
// not blocked (business name stays free text per product decision).
const GENERIC_NAME_WORDS = ["creator", "influencer", "fashion", "test", "venue", "business", "brand", "sample"];
const isGenericName = (name: string) => {
  const words = name.trim().toLowerCase().split(/\s+/);
  return words.length === 1 && GENERIC_NAME_WORDS.includes(words[0]);
};

const AdminVenues = () => {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [approvalFilter, setApprovalFilter] = useState("all");
  const [sortBy, setSortBy] = useState("created_desc");
  const [open, setOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newVenue, setNewVenue] = useState({ name: "", category: "", city: "", email: "", password: "" });
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: "convert" | "delete"; venue: Venue } | null>(null);
  const { toast } = useToast();
  const { t } = useTranslation();

  // Sales pipeline per venue: stage, owner, and how far through activation it
  // is. Read from venue_activation, which already joins each venue to its lead.
  const [pipeline, setPipeline] = useState<Record<string, { stage: string | null; rep: string | null; done: number }>>({});
  // Adnan, recap B3: the person in charge's name + mobile, per venue. Phone
  // columns are locked at the DB level (RE: Re: IT Tasks #23), so this goes
  // through get_venue_contact() — the already-existing admin/owner RPC for it.
  const [contacts, setContacts] = useState<Record<string, { phone: string | null; whatsapp: string | null }>>({});

  const fetchVenues = async () => {
    setLoading(true);
    const [{ data }, { data: act }] = await Promise.all([
      supabase.from("venues").select("id, name, category, city, is_active, approval_status, created_at, logo_url").order("created_at", { ascending: false }),
      (supabase as any).from("venue_activation").select("venue_id, lead_stage, rep_id, profile_complete, photos_uploaded, first_offer_posted, first_creator_visit, first_content_published"),
    ]);
    setVenues((data as any) ?? []);

    const venueIds = (data ?? []).map((v: any) => v.id);
    Promise.all(venueIds.map((id: string) => (supabase as any).rpc("get_venue_contact", { _venue_id: id }).then(({ data: c }: any) => [id, c?.[0]])))
      .then((pairs) => setContacts(Object.fromEntries(
        pairs.filter(([, c]) => c).map(([id, c]: any) => [id, { phone: c.phone, whatsapp: c.whatsapp_phone }])
      )));

    const repIds = [...new Set((act ?? []).map((a: any) => a.rep_id).filter(Boolean))] as string[];
    const { data: reps } = repIds.length
      ? await supabase.from("profiles").select("user_id, full_name").in("user_id", repIds)
      : { data: [] as any[] };
    const repName = Object.fromEntries((reps ?? []).map((r: any) => [r.user_id, r.full_name || t("admin.messages.unnamed")]));
    setPipeline(Object.fromEntries((act ?? []).map((a: any) => [a.venue_id, {
      stage: a.lead_stage,
      rep: a.rep_id ? repName[a.rep_id] ?? t("admin.messages.unnamed") : null,
      done: [a.profile_complete, a.photos_uploaded, a.first_offer_posted, a.first_creator_visit, a.first_content_published].filter(Boolean).length,
    }])));
    setLoading(false);
  };

  useEffect(() => { fetchVenues(); }, []);

  useEffect(() => {
    const fetchOptions = async () => {
      const [catRes, locRes] = await Promise.all([
        supabase.from("categories").select("id, name").eq("is_active", true).order("name"),
        supabase.from("service_locations").select("id, city").eq("is_active", true).order("city"),
      ]);
      setCategories((catRes.data as Category[]) ?? []);
      setLocations((locRes.data as Location[]) ?? []);
    };
    fetchOptions();
  }, []);

  let filtered = venues.filter(v => v.name.toLowerCase().includes(search.toLowerCase()));
  if (categoryFilter !== "all") filtered = filtered.filter(v => v.category === categoryFilter);
  if (cityFilter !== "all") filtered = filtered.filter(v => v.city === cityFilter);
  if (approvalFilter !== "all") filtered = filtered.filter(v => (v.approval_status || "approved") === approvalFilter);
  filtered = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case "created_asc": return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case "name_asc": return a.name.localeCompare(b.name);
      case "name_desc": return b.name.localeCompare(a.name);
      case "status": return (a.approval_status || "").localeCompare(b.approval_status || "");
      default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });
  const allCities = [...new Set(venues.map(v => v.city).filter(Boolean))].sort();
  const { page, pageCount, setPage, paged } = usePagination(filtered);

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from("venues").update({ is_active: !active } as any).eq("id", id);
    fetchVenues();
  };

  const setApprovalStatus = async (id: string, status: string) => {
    await supabase.from("venues").update({ approval_status: status, is_active: status === "approved" } as any).eq("id", id);
    // CRM review, rule 2: every approval is logged with who and when.
    void (supabase as any).rpc("log_staff_action", { _action: status === "approved" ? "approve" : "reject", _table: "venues", _target: id });
    if (status === "approved") {
      toast({ title: t("admin.venues.venueApproved"), description: t("admin.venues.venueApprovedDesc") });
      const sent = await notifyEmail({ event: "venue_approved", venue_id: id });
      if (!sent) {
        toast({ title: t("admin.venues.emailNotSent"), description: t("admin.venues.emailNotSentDesc") });
      }
    } else if (status === "rejected") {
      const sent = await notifyEmail({ event: "venue_rejected", venue_id: id });
      toast({
        title: t("admin.venues.venueRejected"),
        description: sent ? t("admin.venues.emailSent") : t("admin.venues.emailCouldntSend"),
        variant: sent ? undefined : "destructive",
      });
    }
    fetchVenues();
  };


  const deleteVenue = async (id: string, name: string) => {
    const { error } = await supabase.functions.invoke("delete-user", { body: { venue_id: id } });
    if (error) {
      toast({ title: t("admin.common.error"), description: error.message, variant: "destructive" });
    } else {
      void (supabase as any).rpc("log_staff_action", { _action: "delete", _table: "venues", _target: id, _detail: { name } });
      toast({ title: t("admin.venues.deletedTitle", { name }) });
      fetchVenues();
    }
  };

  const convertToCreator = async (id: string, name: string) => {
    const { error, data } = await supabase.functions.invoke("convert-venue-to-influencer", { body: { venue_id: id } });
    if (error || data?.error) {
      toast({ title: t("admin.common.error"), description: data?.error || error?.message, variant: "destructive" });
    } else {
      toast({ title: t("admin.venues.movedToCreators", { name }), description: t("admin.venues.movedToCreatorsDesc") });
      fetchVenues();
    }
  };

  const handleCreateVenue = async () => {
    if (!isValidName(newVenue.name)) {
      toast({ title: t("admin.venues.invalidName"), description: t("admin.venues.invalidNameDesc"), variant: "destructive" });
      return;
    }
    if (!isValidEmail(newVenue.email)) {
      toast({ title: t("admin.venues.invalidEmail"), description: t("admin.venues.invalidEmailDesc"), variant: "destructive" });
      return;
    }
    if (newVenue.password.length < 6) {
      toast({ title: t("admin.venues.weakPassword"), description: t("admin.venues.weakPasswordDesc"), variant: "destructive" });
      return;
    }
    setIsCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("create-user", {
        body: {
          email: newVenue.email,
          password: newVenue.password,
          role: "venue",
          venue_name: newVenue.name,
          venue_category: newVenue.category,
          venue_city: newVenue.city || null,
        },
      });

      if (res.error || res.data?.error) {
        throw new Error(res.data?.error || res.error?.message || "Failed to create venue");
      }

      toast({ title: t("admin.venues.venueCreated"), description: t("admin.venues.venueCreatedDesc", { name: newVenue.name }) });
      setOpen(false);
      setNewVenue({ name: "", category: "", city: "", email: "", password: "" });
      fetchVenues();
    } catch (err: any) {
      toast({ title: t("admin.common.error"), description: err.message, variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <DashboardLayout type="admin">
      <AdminPermissionGate permission="manage_venues">
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">{t("admin.venues.manage")} <span className="text-gold">{t("navLabel.Venues", "Venues")}</span></h1>
            <p className="text-muted-foreground mt-1">{t("admin.venues.registeredCount", { count: venues.length })}</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-gold text-accent-foreground font-semibold">
                <Plus className="w-4 h-4 mr-2" /> {t("admin.venues.addVenue")}
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-foreground font-display">{t("admin.venues.createVenueAccount")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">{t("admin.venues.venueName")}</Label>
                  <Input value={newVenue.name} onChange={e => setNewVenue(v => ({ ...v, name: e.target.value }))} placeholder="e.g. Sky Lounge" className="bg-secondary border-border" />
                  {newVenue.name.trim() && !isValidName(newVenue.name) && (
                    <p className="text-xs text-destructive">{t("admin.venues.invalidNameDesc")}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">{t("admin.venues.loginEmail")}</Label>
                  <Input type="email" value={newVenue.email} onChange={e => setNewVenue(v => ({ ...v, email: e.target.value }))} placeholder="venue@example.com" className="bg-secondary border-border" />
                  {newVenue.email.trim() && !isValidEmail(newVenue.email) && (
                    <p className="text-xs text-destructive">{t("admin.venues.invalidEmailDesc")}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">{t("login.password")}</Label>
                  <Input type="password" value={newVenue.password} onChange={e => setNewVenue(v => ({ ...v, password: e.target.value }))} placeholder="Min 6 characters" className="bg-secondary border-border" />
                  {newVenue.password.length > 0 && newVenue.password.length < 6 && (
                    <p className="text-xs text-destructive">{t("admin.venues.weakPasswordDesc")}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">{t("admin.chatbot.content", "Category")}</Label>
                    <Select value={newVenue.category} onValueChange={val => setNewVenue(v => ({ ...v, category: val }))}>
                      <SelectTrigger className="bg-secondary border-border">
                        <SelectValue placeholder={t("admin.venues.selectEllipsis")} />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(c => (
                          <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                        ))}
                        {categories.length === 0 && <SelectItem value="dining">Dining</SelectItem>}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">{t("admin.locations.city")}</Label>
                    <Select value={newVenue.city} onValueChange={val => setNewVenue(v => ({ ...v, city: val }))}>
                      <SelectTrigger className="bg-secondary border-border">
                        <SelectValue placeholder={t("admin.venues.selectEllipsis")} />
                      </SelectTrigger>
                      <SelectContent>
                        {locations.map(l => (
                          <SelectItem key={l.id} value={l.city}>{l.city}</SelectItem>
                        ))}
                        {locations.length === 0 && <SelectItem value="">{t("admin.venues.other")}</SelectItem>}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={handleCreateVenue} disabled={isCreating} className="w-full gradient-gold text-accent-foreground font-semibold">
                  {isCreating ? t("admin.venues.creatingEllipsis") : t("admin.venues.createVenueAccount")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex flex-wrap gap-4 mb-6">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder={t("admin.venues.searchVenues")} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-secondary border-border" />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[160px] bg-secondary border-border"><SelectValue placeholder={t("admin.chatbot.content", "Category")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("admin.venues.allCategories")}</SelectItem>
              {categories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={cityFilter} onValueChange={setCityFilter}>
            <SelectTrigger className="w-[160px] bg-secondary border-border"><SelectValue placeholder={t("admin.locations.city")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("admin.analytics.allCities")}</SelectItem>
              {allCities.map(c => <SelectItem key={c} value={c!}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={approvalFilter} onValueChange={setApprovalFilter}>
            <SelectTrigger className="w-[160px] bg-secondary border-border"><SelectValue placeholder={t("admin.venues.approval")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("admin.venues.allApprovals")}</SelectItem>
              <SelectItem value="pending">{t("admin.dashboard.status.pending")}</SelectItem>
              <SelectItem value="approved">{t("admin.dashboard.status.approved")}</SelectItem>
              <SelectItem value="rejected">{t("admin.dashboard.status.rejected")}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px] bg-secondary border-border"><SelectValue placeholder={t("admin.offers.sortBy")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="created_desc">{t("admin.offers.newestFirst")}</SelectItem>
              <SelectItem value="created_asc">{t("admin.offers.oldestFirst")}</SelectItem>
              <SelectItem value="name_asc">{t("admin.venues.nameAZ")}</SelectItem>
              <SelectItem value="name_desc">{t("admin.venues.nameZA")}</SelectItem>
              <SelectItem value="status">{t("admin.venues.approvalStatus")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="gradient-card rounded-xl border border-border overflow-hidden">
          <div className="w-full overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t("admin.salesTeam.fullName", "Name")}</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t("admin.chatbot.content", "Category")}</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t("admin.locations.city")}</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t("admin.venues.approval")}</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t("admin.venues.stage")}</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t("admin.venues.contact")}</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t("admin.venues.assignedTo")}</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t("admin.venues.activation")}</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t("admin.locations.status")}</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t("admin.culturalEvents.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="p-8 text-center text-muted-foreground">{t("admin.venues.loadingVenues")}</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={10} className="p-8 text-center text-muted-foreground">{t("admin.venues.noVenuesFound")}</td></tr>
              ) : (
                paged.map((venue) => (
                  <tr key={venue.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {venue.logo_url ? (
                          <img src={venue.logo_url} alt="" className="w-8 h-8 rounded-full object-cover border border-border" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-secondary" />
                        )}
                        <span className="font-medium text-foreground">{venue.name}</span>
                        {isGenericName(venue.name) && (
                          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-400/30 text-[10px]">{t("admin.venues.genericName")}</Badge>
                        )}
                      </div>
                    </td>
                    <td className="p-4"><Badge variant="secondary">{formatLabel(venue.category)}</Badge></td>
                    <td className="p-4 text-muted-foreground">{venue.city || "—"}</td>
                    <td className="p-4">
                      <Badge className={
                        venue.approval_status === "approved" ? "bg-success/20 text-success border-success/30" :
                        venue.approval_status === "pending" ? "bg-yellow-500/20 text-yellow-400 border-yellow-400/30" :
                        "bg-destructive/20 text-destructive border-destructive/30"
                      } variant="outline">
                        {formatLabel(venue.approval_status || "approved")}
                      </Badge>
                    </td>
                    <td className="p-4 text-muted-foreground text-sm">
                      {pipeline[venue.id]?.stage ? stageLabel(pipeline[venue.id].stage!) : "—"}
                    </td>
                    <td className="p-4 text-sm">
                      {venue.contact_person_name || contacts[venue.id]?.phone ? (
                        <div className="space-y-0.5">
                          {venue.contact_person_name && <p className="text-foreground">{venue.contact_person_name}</p>}
                          {contacts[venue.id]?.phone && <p className="text-muted-foreground text-xs">{contacts[venue.id].phone}</p>}
                          {(contacts[venue.id]?.whatsapp || contacts[venue.id]?.phone) && (
                            <a
                              href={`https://wa.me/${(contacts[venue.id].whatsapp || contacts[venue.id].phone)!.replace(/\D/g, "")}`}
                              target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-success hover:underline"
                            >
                              <MessageCircle className="w-3 h-3" /> WhatsApp
                            </a>
                          )}
                        </div>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="p-4 text-muted-foreground text-sm">{pipeline[venue.id]?.rep ?? "—"}</td>
                    <td className="p-4 text-sm" title={t("admin.venues.activationTitle")}>
                      {pipeline[venue.id] ? (
                        <span className={pipeline[venue.id].done === 5 ? "text-success" : "text-muted-foreground"}>
                          {pipeline[venue.id].done}/5
                        </span>
                      ) : "—"}
                    </td>
                    <td className="p-4">
                      <Badge className={venue.is_active ? "bg-success/20 text-success border-success/30" : "bg-destructive/20 text-destructive border-destructive/30"}>
                        {venue.is_active ? t("admin.locations.active") : t("admin.locations.inactive")}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        {venue.approval_status === "pending" && (
                          <Button size="sm" onClick={() => setApprovalStatus(venue.id, "approved")} className="bg-success/20 text-success hover:bg-success/30 h-7 text-xs">{t("admin.redemptions.approve")}</Button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-gold h-7 px-2" title={t("admin.venues.moreActions")}>
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-popover z-50">
                            <DropdownMenuItem onClick={() => { setDetailId(venue.id); setDetailOpen(true); }}>
                              <Eye className="w-4 h-4 mr-2" /> {t("admin.venues.viewDetails")}
                            </DropdownMenuItem>
                            {venue.approval_status === "pending" && (
                              <DropdownMenuItem onClick={() => setApprovalStatus(venue.id, "rejected")} className="text-destructive focus:text-destructive">
                                <X className="w-4 h-4 mr-2" /> {t("admin.billing.reject")}
                              </DropdownMenuItem>
                            )}
                            {venue.approval_status === "approved" && (
                              <DropdownMenuItem onClick={() => toggleActive(venue.id, venue.is_active)}>
                                {venue.is_active ? t("admin.locations.deactivate") : t("admin.locations.activate")}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => setConfirmAction({ type: "convert", venue })}>
                              <UserCog className="w-4 h-4 mr-2" /> {t("admin.venues.moveToCreator")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setConfirmAction({ type: "delete", venue })} className="text-destructive focus:text-destructive">
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

        <VenueDetailDialog
          venueId={detailId}
          open={detailOpen}
          onOpenChange={setDetailOpen}
          onApprove={(id) => setApprovalStatus(id, "approved")}
          onReject={(id) => setApprovalStatus(id, "rejected")}
        />

        <AlertDialog open={!!confirmAction} onOpenChange={(o) => !o && setConfirmAction(null)}>
          <AlertDialogContent className="bg-card border-border">
            {confirmAction?.type === "convert" ? (
              <>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("admin.venues.moveToCreatorConfirm")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("admin.venues.moveToCreatorDesc", { name: confirmAction.venue.name })}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("admin.common.cancel")}</AlertDialogCancel>
                  <AlertDialogAction onClick={() => { convertToCreator(confirmAction.venue.id, confirmAction.venue.name); setConfirmAction(null); }}>{t("admin.venues.moveToCreator")}</AlertDialogAction>
                </AlertDialogFooter>
              </>
            ) : confirmAction?.type === "delete" ? (
              <>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("admin.venues.deleteVenueConfirm")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("admin.venues.deleteVenueDesc", { name: confirmAction.venue.name })}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("admin.common.cancel")}</AlertDialogCancel>
                  <AlertDialogAction onClick={() => { deleteVenue(confirmAction.venue.id, confirmAction.venue.name); setConfirmAction(null); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t("admin.common.delete")}</AlertDialogAction>
                </AlertDialogFooter>
              </>
            ) : null}
          </AlertDialogContent>
        </AlertDialog>
      </div>
      </AdminPermissionGate>
    </DashboardLayout>
  );
};

export default AdminVenues;
