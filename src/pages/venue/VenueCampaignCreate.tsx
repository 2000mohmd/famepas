import DashboardLayout from "@/components/DashboardLayout";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, Plus, Trash2, Video, Image as ImageIcon, Instagram, Music2, Minus, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

type OfferRow = { min_followers: string; max_followers: string; max_guests: string; offer: string };

const DIETARY = ["Gluten-free", "Halal", "Vegan", "Vegetarian"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const SectionCard = ({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) => (
  <div className="bg-white border border-border rounded-2xl p-6 mb-5">
    <div className="flex items-start justify-between mb-5">
      <h2 className="text-lg font-bold text-foreground">{title}</h2>
      {action}
    </div>
    {children}
  </div>
);


const VenueCampaignCreate = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { id } = useParams();
  const editing = !!id;

  const [venueId, setVenueId] = useState<string | null>(null);
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [coverVideoUrl, setCoverVideoUrl] = useState<string>("");
  const [coverImages, setCoverImages] = useState<string[]>([]);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [contentFocus, setContentFocus] = useState("all");
  const [dietary, setDietary] = useState<string[]>([]);
  const [requirePhone, setRequirePhone] = useState(false);
  const [ageRestricted, setAgeRestricted] = useState(false);
  const [ageLimit, setAgeLimit] = useState<string>("");
  const [inviteOnly, setInviteOnly] = useState(false);

  const [igOffers, setIgOffers] = useState<OfferRow[]>([{ min_followers: "1500", max_followers: "", max_guests: "1", offer: "" }]);
  const [tkEnabled, setTkEnabled] = useState(false);
  const [tkOffers, setTkOffers] = useState<OfferRow[]>([]);
  const [handles, setHandles] = useState<string[]>([]);
  const [handleInput, setHandleInput] = useState("");
  const [stories, setStories] = useState(2);
  const [reels, setReels] = useState(1);
  const [posts, setPosts] = useState(0);
  const [allowPostOrReel, setAllowPostOrReel] = useState(false);

  const [availabilityType, setAvailabilityType] = useState("ongoing");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [visibleBeforeStart, setVisibleBeforeStart] = useState(false);
  const [daysNotice, setDaysNotice] = useState(3);
  const [availableDays, setAvailableDays] = useState<string[]>([...DAYS]);
  const [locationId, setLocationId] = useState<string>("");
  const [bookingLimits, setBookingLimits] = useState(false);
  const [bookingLimitCount, setBookingLimitCount] = useState<string>("");
  const [previewOpen, setPreviewOpen] = useState(false);

  const [approvalType, setApprovalType] = useState("manual");
  const [autoApproveTop, setAutoApproveTop] = useState(true);

  useEffect(() => {
    (async () => {
      if (!user) return;
      // Pull all the owner's venues so they can pick a campaign location
      const { data: ownerVenues } = await supabase
        .from("venues").select("id, name")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: true });
      const list = ownerVenues ?? [];
      if (!list.length) return;
      setVenueId(list[0].id);
      const sb: any = supabase;
      const catRes = await sb.from("categories").select("id,name");
      setLocations(list.map(v => ({ id: v.id, name: v.name })));
      setCategories((catRes.data as any) ?? []);

      if (editing && id) {
        const { data: c }: any = await sb.from("campaigns").select("*").eq("id", id).maybeSingle();
        if (c) {
          setTitle(c.title ?? "");
          setDescription(c.description ?? "");
          setContentFocus((c as any).content_focus ?? "all");
          setDietary((c as any).dietary_options ?? []);
          setRequirePhone((c as any).require_phone ?? false);
          setAgeRestricted((c as any).age_restricted ?? false);
          setAgeLimit((c as any).age_limit?.toString() ?? "");
          setInviteOnly((c as any).invite_only ?? false);
          const igo = (c as any).instagram_offers; if (Array.isArray(igo) && igo.length) setIgOffers(igo);
          const tko = (c as any).tiktok_offers; if (Array.isArray(tko) && tko.length) { setTkOffers(tko); setTkEnabled(true); }
          setHandles((c as any).handles ?? []);
          const d = (c as any).deliverables ?? {};
          setStories(d.stories ?? 2); setReels(d.reels ?? 1); setPosts(d.posts ?? 0);
          setAllowPostOrReel((c as any).allow_post_or_reel ?? false);
          setAvailabilityType((c as any).availability_type ?? "ongoing");
          setStartDate(c.start_date ?? "");
          setEndDate(c.end_date ?? "");
          setVisibleBeforeStart((c as any).visible_before_start ?? false);
          setDaysNotice((c as any).required_days_notice ?? 3);
          setAvailableDays((c as any).available_days ?? [...DAYS]);
          setLocationId(c.location_id ?? "");
          setBookingLimits((c as any).booking_limits ?? false);
          setBookingLimitCount((c as any).booking_limit_count?.toString() ?? "");
          setApprovalType((c as any).approval_type ?? "manual");
          setAutoApproveTop((c as any).auto_approve_top ?? true);
          setCoverVideoUrl((c as any).cover_video_url ?? "");
          setCoverImages((c as any).cover_images ?? []);
        }
      }
    })();
  }, [user, id, editing]);

  const toggle = (arr: string[], v: string, set: (a: string[]) => void) => {
    set(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);
  };

  const addHandle = () => {
    const h = handleInput.trim().replace(/^@/, "");
    if (h && !handles.includes(h)) setHandles([...handles, h]);
    setHandleInput("");
  };

  const updateOffer = (which: "ig" | "tk", i: number, key: keyof OfferRow, value: string) => {
    const list = which === "ig" ? [...igOffers] : [...tkOffers];
    list[i] = { ...list[i], [key]: value };
    which === "ig" ? setIgOffers(list) : setTkOffers(list);
  };

  const removeOffer = (which: "ig" | "tk", i: number) => {
    const list = which === "ig" ? igOffers : tkOffers;
    const next = list.filter((_, idx) => idx !== i);
    which === "ig" ? setIgOffers(next) : setTkOffers(next);
  };

  const save = async (mode: "draft" | "live") => {
    if (!venueId) return;
    if (!title.trim()) { toast({ title: "Campaign name required", variant: "destructive" }); return; }
    setSaving(true);
    const payload: any = {
      venue_id: venueId,
      title,
      description: description || null,
      content_focus: contentFocus,
      dietary_options: dietary,
      require_phone: requirePhone,
      age_restricted: ageRestricted,
      age_limit: ageLimit ? parseInt(ageLimit) : null,
      invite_only: inviteOnly,
      instagram_offers: igOffers,
      tiktok_offers: tkEnabled ? tkOffers : [],
      handles,
      deliverables: { stories, reels, posts },
      allow_post_or_reel: allowPostOrReel,
      availability_type: availabilityType,
      start_date: startDate || null,
      end_date: endDate || null,
      visible_before_start: visibleBeforeStart,
      required_days_notice: daysNotice,
      available_days: availableDays,
      location_id: locationId || null,
      booking_limits: bookingLimits,
      booking_limit_count: bookingLimits && bookingLimitCount ? parseInt(bookingLimitCount) : null,
      approval_type: approvalType,
      auto_approve_top: autoApproveTop,
      cover_video_url: coverVideoUrl || null,
      cover_images: coverImages,
      cover_image_url: coverImages[0] || null,
      is_draft: mode === "draft",
      status: mode === "live" ? (startDate && new Date(startDate) > new Date() ? "scheduled" : "active") : "scheduled",
    };
    const sb: any = supabase;
    let campaignId = id;
    let saveErr: any = null;
    if (editing) {
      const { error } = await sb.from("campaigns").update(payload).eq("id", id!);
      saveErr = error;
    } else {
      const { data: inserted, error } = await sb.from("campaigns").insert(payload).select("id").single();
      saveErr = error;
      campaignId = inserted?.id;
    }
    if (saveErr) {
      setSaving(false);
      toast({ title: "Error", description: saveErr.message, variant: "destructive" });
      return;
    }

    // Sync campaign → offers (so influencers and admin can see it).
    // Offers stays the canonical consumer-facing table; one row per campaign linked via campaign_id.
    if (campaignId) {
      const firstIg = igOffers[0];
      const discountNum = firstIg?.offer ? parseFloat(String(firstIg.offer).replace(/[^0-9.]/g, "")) : null;
      const offerPayload: any = {
        venue_id: venueId,
        campaign_id: campaignId,
        title,
        description: description || null,
        image_url: coverImages[0] || null,
        cover_image_url: coverImages[0] || null,
        gallery_urls: coverImages,
        offer_type: "experience",
        discount_value: Number.isFinite(discountNum as number) ? discountNum : null,
        min_followers: firstIg?.min_followers ? parseInt(firstIg.min_followers) : null,
        starts_at: startDate || new Date().toISOString(),
        ends_at: endDate || null,
        is_active: mode === "live" && !inviteOnly,
        requirements: firstIg?.offer || null,
      };
      const { data: existingOffer } = await sb.from("offers").select("id").eq("campaign_id", campaignId).maybeSingle();
      if (existingOffer?.id) {
        await sb.from("offers").update(offerPayload).eq("id", existingOffer.id);
      } else {
        await sb.from("offers").insert(offerPayload);
      }
    }

    setSaving(false);
    toast({ title: mode === "draft" ? "Saved to drafts" : "Campaign is live" });
    navigate("/venue/campaigns");
  };



  const uploadFile = async (file: File, kind: "video" | "image") => {
    if (!venueId) { toast({ title: "Loading venue…", description: "Please wait a moment and try again.", variant: "destructive" }); return null; }
    setUploading(true);
    const ext = (file.name.split(".").pop() || (kind === "video" ? "mp4" : "jpg")).toLowerCase().replace(/[^a-z0-9]/g, "");
    const safe = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const path = `${venueId}/campaigns/${safe}`;
    const bucket = kind === "image" ? "offer-images" : "venue-photos";
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true, contentType: file.type });
    setUploading(false);
    if (error) { toast({ title: "Upload failed", description: error.message, variant: "destructive" }); return null; }
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  };

  const onPickVideo = async (file?: File | null) => {
    if (!file) return;
    const url = await uploadFile(file, "video");
    if (url) setCoverVideoUrl(url);
  };

  const onPickImages = async (files: FileList | null) => {
    if (!files) return;
    const slots = Math.max(0, 5 - coverImages.length);
    const picked = Array.from(files).slice(0, slots);
    const urls: string[] = [];
    for (const f of picked) {
      const u = await uploadFile(f, "image");
      if (u) urls.push(u);
    }
    if (urls.length) setCoverImages([...coverImages, ...urls]);
  };

  return (
    <DashboardLayout type="venue">
      <div className="max-w-3xl mx-auto pb-28 animate-fade-in">
        <button onClick={() => navigate("/venue/campaigns")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-5">
          <ChevronLeft className="w-4 h-4" /> Back to Campaigns
        </button>

        {/* CAMPAIGN DETAILS */}
        <SectionCard title="Campaign Details">

          <div className="space-y-5">
            <div>
              <Label className="text-sm font-semibold">Campaign Name</Label>
              <p className="text-xs text-muted-foreground mb-2">Max 50 characters</p>
              <Input maxLength={50} value={title} onChange={e => setTitle(e.target.value)} placeholder="Example campaign name..." />
            </div>
            <div>
              <Label className="text-sm font-semibold">Campaign Details</Label>
              <p className="text-xs text-muted-foreground mb-2">Outline your campaign to help the influencer understand your goals</p>
              <Textarea maxLength={2000} rows={5} value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe your campaign..." />
              <p className="text-right text-xs text-muted-foreground mt-1">{description.length}/2000</p>
            </div>
            <div>
              <Label className="text-sm font-semibold">Upload Images</Label>
              <p className="text-xs text-muted-foreground mb-2">Choose 1 video and up to 5 images to showcase your campaign {uploading && <span className="text-[#b8923a]">(uploading…)</span>}</p>
              <div className="flex gap-3 flex-wrap">
                <label className="w-32 h-24 border border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-1 text-xs text-muted-foreground hover:border-[#b8923a] cursor-pointer overflow-hidden relative">
                  {coverVideoUrl ? (
                    <>
                      <video src={coverVideoUrl} className="w-full h-full object-cover" />
                      <button type="button" onClick={(e) => { e.preventDefault(); setCoverVideoUrl(""); }} className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5"><X className="w-3 h-3" /></button>
                    </>
                  ) : (
                    <>
                      <Video className="w-5 h-5" /> Choose video
                    </>
                  )}
                  <input type="file" accept="video/*" className="hidden" onChange={e => onPickVideo(e.target.files?.[0])} />
                </label>
                {coverImages.map((url, i) => (
                  <div key={url} className="w-32 h-24 rounded-xl overflow-hidden relative border border-border">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => setCoverImages(coverImages.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5"><X className="w-3 h-3" /></button>
                  </div>
                ))}
                {coverImages.length < 5 && (
                  <label className="w-32 h-24 border border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-1 text-xs text-muted-foreground hover:border-[#b8923a] cursor-pointer">
                    <ImageIcon className="w-5 h-5" /> Choose images
                    <input type="file" accept="image/*" multiple className="hidden" onChange={e => onPickImages(e.target.files)} />
                  </label>
                )}
              </div>
            </div>
            <div>
              <Label className="text-sm font-semibold">Content Focus</Label>
              <p className="text-xs text-muted-foreground mb-2">Select the types of influencers you'd like to work with</p>
              <Select value={contentFocus} onValueChange={setContentFocus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-semibold">Dietary Options</Label>
              <p className="text-xs text-muted-foreground mb-2">Select any dietary preferences you cater to</p>
              <div className="flex flex-wrap gap-2">
                {DIETARY.map(d => {
                  const on = dietary.includes(d);
                  return (
                    <button key={d} type="button" onClick={() => toggle(dietary, d, setDietary)} className={`px-3 py-1.5 rounded-full border text-sm ${on ? "border-[#b8923a] bg-[hsl(42_65%_50%_/_0.10)] text-[#b8923a]" : "border-border text-foreground"}`}>
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <Label className="text-sm font-semibold">Requirements</Label>
              <div className="space-y-2 mt-2">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={requirePhone} onCheckedChange={(v) => setRequirePhone(!!v)} /> Require phone number
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={ageRestricted} onCheckedChange={(v) => setAgeRestricted(!!v)} /> Age restricted campaign
                  {ageRestricted && (
                    <Select value={ageLimit} onValueChange={setAgeLimit}>
                      <SelectTrigger className="w-24 h-8"><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>
                        {["16", "18", "21"].map(a => <SelectItem key={a} value={a}>{a}+</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                </label>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/40">
              <div>
                <p className="text-sm font-semibold">Invite Only</p>
                <p className="text-xs text-muted-foreground">Campaigns are visible to all eligible creators by default. Turn this on to hide it and share privately.</p>
              </div>
              <Switch checked={inviteOnly} onCheckedChange={setInviteOnly} />
            </div>
          </div>
        </SectionCard>

        {/* INSTAGRAM OFFERS */}
        <SectionCard title="Instagram Offers" action={<button className="text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-md bg-gradient-to-tr from-[hsl(42_78%_68%)] via-[hsl(42_65%_50%)] to-[hsl(38_60%_38%)] flex items-center justify-center">
              <Instagram className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold">Instagram</p>
              <p className="text-xs text-muted-foreground">Create offers for Instagram influencers</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 text-[11px] font-semibold uppercase text-muted-foreground">
              <div className="col-span-3">Min Followers</div>
              <div className="col-span-3">Max Followers</div>
              <div className="col-span-2">Max Guests</div>
              <div className="col-span-4">Offer</div>
            </div>
            {igOffers.map((o, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <Input className="col-span-3" value={o.min_followers} onChange={e => updateOffer("ig", i, "min_followers", e.target.value)} />
                <Input className="col-span-3" placeholder="∞" value={o.max_followers} onChange={e => updateOffer("ig", i, "max_followers", e.target.value)} />
                <Select value={o.max_guests} onValueChange={v => updateOffer("ig", i, "max_guests", v)}>
                  <SelectTrigger className="col-span-2"><SelectValue /></SelectTrigger>
                  <SelectContent>{["1", "2", "3", "4"].map(n => <SelectItem key={n} value={n}>+{n} Guest</SelectItem>)}</SelectContent>
                </Select>
                <Input className="col-span-3" placeholder="Complimentary meal" value={o.offer} onChange={e => updateOffer("ig", i, "offer", e.target.value)} />
                <button onClick={() => removeOffer("ig", i)} className="col-span-1 text-muted-foreground hover:text-destructive"><X className="w-4 h-4" /></button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setIgOffers([...igOffers, { min_followers: "", max_followers: "", max_guests: "1", offer: "" }])}>
              + Add Offer
            </Button>
          </div>

          <div className="mt-6">
            <Label className="text-sm font-semibold">Handles</Label>
            <p className="text-xs text-muted-foreground mb-2">Let the influencer know who to tag in their content</p>
            <div className="flex gap-2">
              <Input placeholder="@ Enter a handle and press Enter (or click Add)" value={handleInput} onChange={e => setHandleInput(e.target.value)} onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addHandle())} />
              <Button onClick={addHandle} disabled={!handleInput.trim()} style={{ background: "#b8923a" }} className="text-white">Add</Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {handles.map(h => (
                <span key={h} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[hsl(42_65%_50%_/_0.10)] text-[#b8923a] text-sm">
                  <Instagram className="w-3 h-3" /> @{h}
                  <button onClick={() => setHandles(handles.filter(x => x !== h))}><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <Label className="text-sm font-semibold">Deliverables</Label>
            <p className="text-xs text-muted-foreground mb-3">What content would you like in return</p>
            {[
              { label: "Instagram Story", val: stories, set: setStories },
              { label: "Instagram Reel", val: reels, set: setReels },
              { label: "Instagram Post", val: posts, set: setPosts },
            ].map(({ label, val, set }) => (
              <div key={label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <span className="text-sm">{label}</span>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => set(Math.max(0, val - 1))}><Minus className="w-3 h-3" /></Button>
                  <span className="w-8 text-center text-sm">{val}</span>
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => set(val + 1)}><Plus className="w-3 h-3" /></Button>
                </div>
              </div>
            ))}
            <label className="flex items-center gap-2 text-sm mt-3">
              <Checkbox checked={allowPostOrReel} onCheckedChange={(v) => setAllowPostOrReel(!!v)} /> Allow Instagram Post or Instagram Reel
            </label>
          </div>
        </SectionCard>

        {/* TIKTOK */}
        {!tkEnabled ? (
          <button onClick={() => { setTkEnabled(true); setTkOffers([{ min_followers: "1000", max_followers: "", max_guests: "1", offer: "" }]); }} className="w-full mb-5 py-3 rounded-2xl border border-dashed border-border flex items-center justify-center gap-2 text-sm font-medium hover:border-[#b8923a] hover:text-[#b8923a]">
            <Plus className="w-4 h-4" /> Add TikTok Offers
          </button>
        ) : (
          <SectionCard title="TikTok Offers" action={<button onClick={() => { setTkEnabled(false); setTkOffers([]); }} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-md bg-black flex items-center justify-center"><Music2 className="w-4 h-4 text-white" /></div>
              <div>
                <p className="text-sm font-semibold">TikTok</p>
                <p className="text-xs text-muted-foreground">Create offers for TikTok influencers</p>
              </div>
            </div>
            {tkOffers.map((o, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center mb-2">
                <Input className="col-span-3" value={o.min_followers} onChange={e => updateOffer("tk", i, "min_followers", e.target.value)} />
                <Input className="col-span-3" placeholder="∞" value={o.max_followers} onChange={e => updateOffer("tk", i, "max_followers", e.target.value)} />
                <Select value={o.max_guests} onValueChange={v => updateOffer("tk", i, "max_guests", v)}>
                  <SelectTrigger className="col-span-2"><SelectValue /></SelectTrigger>
                  <SelectContent>{["1", "2", "3", "4"].map(n => <SelectItem key={n} value={n}>+{n} Guest</SelectItem>)}</SelectContent>
                </Select>
                <Input className="col-span-3" placeholder="Complimentary meal" value={o.offer} onChange={e => updateOffer("tk", i, "offer", e.target.value)} />
                <button onClick={() => removeOffer("tk", i)} className="col-span-1 text-muted-foreground hover:text-destructive"><X className="w-4 h-4" /></button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setTkOffers([...tkOffers, { min_followers: "", max_followers: "", max_guests: "1", offer: "" }])}>
              + Add Offer
            </Button>
          </SectionCard>
        )}

        {/* AVAILABILITY */}
        <SectionCard title="Availability Options">
          <Label className="text-sm font-semibold">Availability Type</Label>
          <div className="grid grid-cols-3 gap-3 mt-3 mb-5">
            {[
              { v: "ongoing", title: "Ongoing", desc: "A scheduled visit based on location opening hours", badge: "Most Popular" },
              { v: "anytime", title: "Redeem Anytime", desc: "Available anytime without the need for prior scheduling" },
              { v: "scheduled", title: "Scheduled", desc: "eg. Brunch at 1pm and 3pm on Saturdays and Sundays" },
              { v: "event", title: "Event", desc: "eg. Launch party on 16th August at 7:30pm" },
              { v: "integration", title: "Integration", desc: "Use real-time availability from your booking platform", disabled: true },
            ].map(opt => {
              const on = availabilityType === opt.v;
              return (
                <button key={opt.v} disabled={opt.disabled} onClick={() => setAvailabilityType(opt.v)} className={`relative text-left p-3 rounded-xl border ${on ? "border-[#b8923a] bg-[hsl(42_65%_50%_/_0.08)]" : "border-border"} ${opt.disabled ? "opacity-50 cursor-not-allowed" : ""}`}>
                  {opt.badge && <span className="absolute -top-2 left-3 text-[9px] font-bold px-1.5 py-0.5 rounded text-white" style={{ background: "#b8923a" }}>{opt.badge}</span>}
                  <div className="flex items-start gap-2">
                    <span className={`mt-0.5 w-3.5 h-3.5 rounded-full border-2 ${on ? "border-[#b8923a]" : "border-border"} flex items-center justify-center`}>
                      {on && <span className="w-1.5 h-1.5 rounded-full bg-[#b8923a]" />}
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{opt.title}</p>
                      <p className="text-xs text-muted-foreground">{opt.desc}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mb-5">
            <Label className="text-sm font-semibold">Campaign Dates</Label>
            <p className="text-xs text-muted-foreground mb-2">Influencers can apply from these dates. Leave the end date for an indefinite campaign.</p>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-1.5">
                <span className="text-xs text-muted-foreground">Start</span>
                <Input type="date" className="border-0 p-0 h-7" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-1.5">
                <span className="text-xs text-muted-foreground">End</span>
                <Input type="date" className="border-0 p-0 h-7" value={endDate} onChange={e => setEndDate(e.target.value)} placeholder="Ongoing" />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm mt-3">
              <Checkbox checked={visibleBeforeStart} onCheckedChange={(v) => setVisibleBeforeStart(!!v)} /> Visible to Influencers before Campaign Start Date
            </label>
          </div>

          <div className="mb-5">
            <Label className="text-sm font-semibold">Required Days Notice</Label>
            <p className="text-xs text-muted-foreground mb-2">Set the minimum number of days ahead an influencer can book</p>
            <div className="inline-flex items-center gap-1 border border-border rounded-lg">
              <button onClick={() => setDaysNotice(Math.max(0, daysNotice - 1))} className="px-3 py-1.5"><Minus className="w-3 h-3" /></button>
              <span className="w-8 text-center text-sm">{daysNotice}</span>
              <button onClick={() => setDaysNotice(daysNotice + 1)} className="px-3 py-1.5"><Plus className="w-3 h-3" /></button>
            </div>
          </div>

          <div className="mb-5">
            <Label className="text-sm font-semibold">Available Days</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {DAYS.map(d => {
                const on = availableDays.includes(d);
                return (
                  <button key={d} onClick={() => toggle(availableDays, d, setAvailableDays)} className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full border text-sm ${on ? "border-[#b8923a] bg-[hsl(42_65%_50%_/_0.10)] text-[#b8923a]" : "border-border"}`}>
                    {d} {on && <X className="w-3 h-3" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mb-5">
            <Label className="text-sm font-semibold">Locations</Label>
            <Select value={locationId} onValueChange={setLocationId}>
              <SelectTrigger className="mt-2"><SelectValue placeholder="Select a location" /></SelectTrigger>
              <SelectContent>
                {locations.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="p-4 rounded-xl bg-muted/40 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Booking Limits</p>
                <p className="text-xs text-muted-foreground">Automatically block off availability once limits are reached</p>
              </div>
              <Switch checked={bookingLimits} onCheckedChange={setBookingLimits} />
            </div>
            {bookingLimits && (
              <div>
                <Label className="text-xs font-semibold">Max bookings per week</Label>
                <Input
                  type="number"
                  min={1}
                  value={bookingLimitCount}
                  onChange={(e) => setBookingLimitCount(e.target.value)}
                  placeholder="e.g. 10"
                  className="mt-1 max-w-[180px]"
                />
              </div>
            )}
          </div>
        </SectionCard>

        {/* APPROVAL */}
        <SectionCard title="Approval Settings">
          <Label className="text-sm font-semibold">Approval Type</Label>
          <p className="text-xs text-muted-foreground mb-3">Choose how you'd like to approve influencer applications</p>
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { v: "manual", t: "Manual Approval", d: "Every influencer must be approved individually" },
              { v: "smart", t: "Smart Approval", d: "Set auto-approval criteria, manually approve the rest", badge: "Get 3.2x more applications" },
              { v: "all", t: "Approve All", d: "All influencers will be automatically approved" },
            ].map(o => {
              const on = approvalType === o.v;
              return (
                <button key={o.v} onClick={() => setApprovalType(o.v)} className={`relative text-left p-3 rounded-xl border ${on ? "border-[#b8923a] bg-[hsl(42_65%_50%_/_0.08)]" : "border-border"}`}>
                  {o.badge && <span className="absolute -top-2 left-3 text-[9px] font-bold px-1.5 py-0.5 rounded text-white whitespace-nowrap" style={{ background: "#b8923a" }}>{o.badge}</span>}
                  <div className="flex items-start gap-2">
                    <span className={`mt-0.5 w-3.5 h-3.5 rounded-full border-2 ${on ? "border-[#b8923a]" : "border-border"} flex items-center justify-center`}>
                      {on && <span className="w-1.5 h-1.5 rounded-full bg-[#b8923a]" />}
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{o.t}</p>
                      <p className="text-xs text-muted-foreground">{o.d}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/40">
            <div>
              <p className="text-sm font-semibold">Auto-Approve Top Creators</p>
              <p className="text-xs text-muted-foreground">Top-performing creators are auto-approved by default, making it easier for them to book in with you. Turn this off if you'd prefer to review them manually.</p>
            </div>
            <Switch checked={autoApproveTop} onCheckedChange={setAutoApproveTop} />
          </div>
        </SectionCard>
      </div>

      {/* Sticky footer */}
      <div className="fixed bottom-0 left-64 right-0 bg-white border-t border-border px-8 py-3 flex items-center justify-between z-30">
        <Button variant="outline">Preview</Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => save("draft")} disabled={saving}>Save to Drafts</Button>
          <Button onClick={() => save("live")} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white">▶ Set Live</Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default VenueCampaignCreate;
