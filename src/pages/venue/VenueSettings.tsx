import DashboardLayout from "@/components/DashboardLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Pencil, Trash2, Plus, Check, Upload, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";

type Tab = "integrations" | "team" | "profile" | "messaging" | "billing" | "compliance";

const tabs: { key: Tab; label: string }[] = [
  { key: "integrations", label: "Integrations" },
  { key: "team", label: "Team" },
  { key: "profile", label: "Profile" },
  { key: "messaging", label: "Messaging" },
  { key: "billing", label: "Billing" },
  { key: "compliance", label: "Compliance" },
];

const PINK = "#e8547a";

// Brand logos
const IGLogo = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="white">
    <path d="M12 2.2c3.2 0 3.6 0 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s0 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58 0-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.2 15.58 2.2 15.2 2.2 12s0-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.2 8.8 2.2 12 2.2zm0 5.6a4.2 4.2 0 1 0 0 8.4 4.2 4.2 0 0 0 0-8.4zm0 6.93a2.73 2.73 0 1 1 0-5.46 2.73 2.73 0 0 1 0 5.46zm5.34-7.1a.98.98 0 1 1-1.96 0 .98.98 0 0 1 1.96 0z"/>
  </svg>
);

const TikTokLogo = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="white">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.7 20.1a6.34 6.34 0 0 0 10.86-4.43V8.66a8.16 8.16 0 0 0 4.77 1.52V6.73a4.85 4.85 0 0 1-1.74-.04z"/>
  </svg>
);

const VenueSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("integrations");
  const [venue, setVenue] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [socials, setSocials] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [tiers, setTiers] = useState<any[]>([]);
  const [igHandle, setIgHandle] = useState("");
  const [ttHandle, setTtHandle] = useState("");

  // profile form
  const [pName, setPName] = useState("");
  const [pDesc, setPDesc] = useState("");
  const [pCancel, setPCancel] = useState(true);
  const [pLogo, setPLogo] = useState<string | null>(null);
  const [pCats, setPCats] = useState<string[]>([]);
  const [allCats, setAllCats] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  // template form
  const [tplOpen, setTplOpen] = useState(false);
  const [tplTitle, setTplTitle] = useState("");
  const [tplBody, setTplBody] = useState("");
  const [editId, setEditId] = useState<string | null>(null);

  // team
  const [inviteEmail, setInviteEmail] = useState("");
  const [invites, setInvites] = useState<any[]>([]);

  const load = async () => {
    if (!user) return;
    const { data: v } = await supabase
      .from("venues").select("*").eq("owner_id", user.id)
      .order("created_at", { ascending: true }).limit(1).maybeSingle();
    if (!v) return;
    setVenue(v);
    setPName(v.name || "");
    setPDesc(v.description || "");
    setPLogo(v.logo_url || null);
    setPCats(v.category ? String(v.category).split(",").map((x: string) => x.trim()).filter(Boolean) : []);

    const { data: prof } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
    setProfile(prof);

    const [sRes, tplRes, tierRes, catRes, invRes] = await Promise.all([
      supabase.from("social_integrations").select("*").eq("venue_id", v.id),
      supabase.from("venue_message_templates").select("*").eq("venue_id", v.id).order("created_at"),
      supabase.from("subscription_tiers").select("*").eq("is_active", true).order("price"),
      supabase.from("categories").select("*").order("name"),
      supabase.from("venue_team_invites").select("*").eq("venue_id", v.id).order("created_at"),
    ]);
    setSocials(sRes.data ?? []);
    setTemplates(tplRes.data ?? []);
    setTiers(tierRes.data ?? []);
    setAllCats(catRes.data ?? []);
    setInvites(invRes.data ?? []);
  };
  useEffect(() => { load(); }, [user]);

  const findSocial = (p: string) => socials.find(s => s.platform === p);

  const connectSocial = async (platform: "instagram" | "tiktok", handle: string) => {
    if (!venue || !handle) return;
    const { error } = await supabase.from("social_integrations").upsert({
      venue_id: venue.id, platform, handle: handle.replace(/^@/, ""), status: "connected",
    }, { onConflict: "venue_id,platform" });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: `${platform} connected` }); load(); }
  };

  const disconnectSocial = async (platform: string) => {
    if (!venue) return;
    await supabase.from("social_integrations").delete().eq("venue_id", venue.id).eq("platform", platform);
    toast({ title: "Disconnected" }); load();
  };

  const uploadLogo = async (file: File) => {
    if (!venue) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${venue.id}/logo-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("venue-photos").upload(path, file, { upsert: true });
    if (upErr) {
      toast({ title: "Upload failed", description: upErr.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    const { data: pub } = supabase.storage.from("venue-photos").getPublicUrl(path);
    setPLogo(pub.publicUrl);
    await supabase.from("venues").update({ logo_url: pub.publicUrl }).eq("id", venue.id);
    setUploading(false);
    toast({ title: "Logo updated" });
  };

  const saveProfile = async () => {
    if (!venue) return;
    const { error } = await supabase.from("venues").update({
      name: pName,
      description: pDesc,
      logo_url: pLogo,
      category: pCats[0] || "dining",
    }).eq("id", venue.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Profile saved" });
  };

  const saveTemplate = async () => {
    if (!venue || !tplTitle || !tplBody) return;
    if (editId) {
      await supabase.from("venue_message_templates").update({ title: tplTitle, body: tplBody }).eq("id", editId);
    } else {
      await supabase.from("venue_message_templates").insert({ venue_id: venue.id, title: tplTitle, body: tplBody });
    }
    setTplOpen(false); setTplTitle(""); setTplBody(""); setEditId(null);
    load();
  };
  const editTemplate = (t: any) => { setEditId(t.id); setTplTitle(t.title); setTplBody(t.body); setTplOpen(true); };
  const deleteTemplate = async (id: string) => {
    await supabase.from("venue_message_templates").delete().eq("id", id);
    load();
  };

  const sendInvite = async () => {
    if (!inviteEmail || !venue) return;
    const { error } = await supabase.from("venue_team_invites").insert({
      venue_id: venue.id, email: inviteEmail, invited_by: user?.id, status: "pending",
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Invite sent", description: `An invitation has been sent to ${inviteEmail}.` });
    setInviteEmail("");
    load();
  };

  const removeInvite = async (id: string) => {
    await supabase.from("venue_team_invites").delete().eq("id", id);
    load();
  };

  const toggleCat = (name: string) => {
    setPCats(prev => prev.includes(name) ? prev.filter(c => c !== name) : [...prev, name]);
  };

  const SocialRow = ({ platform, label, color, logo, handle, setHandle }: any) => {
    const s = findSocial(platform);
    return (
      <div className="flex items-center justify-between py-4 border-b border-border last:border-0">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: color }}>
            {logo}
          </div>
          <div>
            <p className="font-medium text-foreground">{label}</p>
            <p className="text-xs text-muted-foreground">{s ? `@${s.handle}` : "Not connected"}</p>
          </div>
        </div>
        {s?.status === "connected" ? (
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-sm text-green-600">
              <Check className="w-4 h-4" /> Connected
            </span>
            <Button size="sm" variant="ghost" onClick={() => disconnectSocial(platform)}>Disconnect</Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Input placeholder="@handle" className="w-40 h-9" value={handle} onChange={e => setHandle(e.target.value)} />
            <Button size="sm" variant="outline" onClick={() => connectSocial(platform, handle)}>Connect</Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <DashboardLayout type="venue">
      <div className="animate-fade-in">
        <h1 className="text-[28px] font-bold text-foreground mb-6">Settings</h1>

        <div className="flex gap-6 border-b border-border mb-8 overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`pb-3 px-1 text-sm font-medium whitespace-nowrap ${tab === t.key ? "border-b-2 text-foreground" : "text-muted-foreground"}`}
              style={tab === t.key ? { borderColor: PINK } : undefined}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "integrations" && (
          <div className="bg-white border border-border rounded-2xl p-6 max-w-3xl">
            <div className="mb-4">
              <h2 className="font-semibold text-foreground">Social Profiles</h2>
              <p className="text-xs text-muted-foreground">Connect your social accounts for content tracking and analytics</p>
            </div>
            <SocialRow
              platform="instagram" label="Instagram"
              color="linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)"
              logo={<IGLogo />} handle={igHandle} setHandle={setIgHandle}
            />
            <TikTokConnectRow venue={venue} social={findSocial("tiktok")} onChange={load} logo={<TikTokLogo />} />
          </div>
        )}

        {tab === "team" && (
          <div className="bg-white border border-border rounded-2xl p-6 max-w-3xl">
            <h2 className="font-semibold text-foreground mb-4">Manage Your Team</h2>
            <div className="flex gap-2 mb-6">
              <Input placeholder="Enter email address" type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
              <Button onClick={sendInvite} style={{ background: PINK }} className="text-white">Invite User</Button>
            </div>
            <div className="border-t border-border pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">
                    {profile?.full_name || "Owner"} <span className="text-xs text-muted-foreground ml-2">Admin</span>
                  </p>
                  <p className="text-sm text-muted-foreground">{profile?.email || user?.email}</p>
                </div>
              </div>
              {invites.map(inv => (
                <div key={inv.id} className="flex items-center justify-between border-t border-border pt-3">
                  <div>
                    <p className="font-medium text-foreground">{inv.email}</p>
                    <p className="text-xs">
                      <span className="inline-block px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 capitalize">
                        {inv.status}
                      </span>
                    </p>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => removeInvite(inv.id)}>
                    <X className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "profile" && venue && (
          <div className="bg-white border border-border rounded-2xl p-6 max-w-3xl space-y-5">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center overflow-hidden border border-border">
                {pLogo ? (
                  <img src={pLogo} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <Upload className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
              <label className="cursor-pointer">
                <input
                  type="file" accept="image/*" className="hidden"
                  onChange={e => e.target.files?.[0] && uploadLogo(e.target.files[0])}
                />
                <span className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted">
                  <Upload className="w-4 h-4" /> {uploading ? "Uploading…" : pLogo ? "Change Logo" : "Upload Logo"}
                </span>
              </label>
            </div>

            <div>
              <Label>Brand Name</Label>
              <p className="text-xs text-muted-foreground mb-2">This will be displayed on the app</p>
              <Input value={pName} onChange={e => setPName(e.target.value)} />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={pDesc} maxLength={160}
                onChange={e => setPDesc(e.target.value)}
                placeholder="Write a short description of your brand…"
                className="resize-none min-h-[100px]"
              />
              <p className="text-xs text-muted-foreground text-right">{pDesc.length}/160</p>
            </div>

            <div>
              <Label>Categories</Label>
              <p className="text-xs text-muted-foreground mb-2">Pick all that apply - this helps influencers find you</p>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between font-normal">
                    {pCats.length ? `${pCats.length} categories selected` : "Select categories"}
                    <span>▾</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-2">
                  {allCats.map(c => (
                    <label key={c.id} className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer">
                      <Checkbox checked={pCats.includes(c.name)} onCheckedChange={() => toggleCat(c.name)} />
                      <span className="text-sm">{c.name}</span>
                    </label>
                  ))}
                  {allCats.length === 0 && <p className="text-sm text-muted-foreground p-2">No categories yet</p>}
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>Cancellation Policy</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Require influencers to contact the venue for any changes within 24hrs of their visit
              </p>
              <Select value={pCancel ? "yes" : "no"} onValueChange={v => setPCancel(v === "yes")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={saveProfile} style={{ background: PINK }} className="text-white w-full">Save</Button>
          </div>
        )}

        {tab === "messaging" && venue && (
          <div className="bg-white border border-border rounded-2xl p-6 max-w-3xl">
            <div className="mb-4">
              <h2 className="font-semibold text-foreground">Custom Templates</h2>
              <p className="text-xs text-muted-foreground">Saved replies for when you need to pass on an application</p>
            </div>

            <div className="space-y-3">
              {templates.map(t => (
                <div key={t.id} className="border border-border rounded-xl p-4 flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">{t.title}</p>
                    <p className="text-sm text-muted-foreground mt-1">{t.body}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => editTemplate(t)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteTemplate(t.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {tplOpen ? (
                <div className="border border-border rounded-xl p-4 space-y-3">
                  <Input placeholder="Template title" value={tplTitle} onChange={e => setTplTitle(e.target.value)} />
                  <Textarea placeholder="Template message" value={tplBody} onChange={e => setTplBody(e.target.value)} />
                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" onClick={() => { setTplOpen(false); setEditId(null); setTplTitle(""); setTplBody(""); }}>Cancel</Button>
                    <Button onClick={saveTemplate} style={{ background: PINK }} className="text-white">
                      {editId ? "Save" : "Add Template"}
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setTplOpen(true)}
                  className="w-full border border-dashed border-border rounded-xl p-4 flex items-center gap-2 text-muted-foreground hover:text-foreground hover:border-foreground transition"
                >
                  <Plus className="w-5 h-5" /> Add New Template
                </button>
              )}
            </div>
          </div>
        )}

        {tab === "billing" && (
          <div className="space-y-4 max-w-3xl">
            <div className="bg-white border border-border rounded-2xl p-6">
              <h2 className="font-semibold text-foreground mb-4">Subscription Plans</h2>
              <div className="grid md:grid-cols-3 gap-4">
                {tiers.map(t => (
                  <div key={t.id} className="border border-border rounded-xl p-4">
                    <p className="font-semibold text-foreground">{t.name}</p>
                    <p className="text-2xl font-bold my-2" style={{ color: PINK }}>${Number(t.price).toFixed(0)}<span className="text-sm text-muted-foreground font-normal">/mo</span></p>
                    {t.description && <p className="text-xs text-muted-foreground mb-3">{t.description}</p>}
                    <Button className="w-full" variant="outline">Select</Button>
                  </div>
                ))}
                {tiers.length === 0 && <p className="text-sm text-muted-foreground">No plans configured.</p>}
              </div>
            </div>
          </div>
        )}

        {tab === "compliance" && (
          <div className="bg-white border border-border rounded-2xl p-6 max-w-3xl space-y-4">
            <h2 className="font-semibold text-foreground">Compliance</h2>
            <p className="text-sm text-muted-foreground">
              Make sure influencer content meets advertising disclosure requirements.
            </p>
            <div className="flex items-center justify-between border border-border rounded-xl p-4">
              <div>
                <p className="font-medium">Require #ad disclosure</p>
                <p className="text-xs text-muted-foreground">Influencers must include #ad in sponsored posts</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between border border-border rounded-xl p-4">
              <div>
                <p className="font-medium">Require venue tag</p>
                <p className="text-xs text-muted-foreground">Posts must tag your venue's social handle</p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default VenueSettings;
