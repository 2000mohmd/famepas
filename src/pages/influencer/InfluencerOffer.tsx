import React from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Users,
  Tag,
  Calendar,
  CheckCircle,
  Clock,
  Heart,
  Share2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { notifyEmail } from "@/lib/notify";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import BookingRulesNotice from "@/components/influencer/BookingRulesNotice";

const InfluencerOffer = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: offer, isLoading } = useQuery({
    queryKey: ["offer-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("offers")
        .select(
          "*, venues(id, name, city, country, address, category, logo_url, cover_image_url, description, latitude, longitude), categories(name, icon, image_url, color), campaigns(instagram_offers)"
        )
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: myApplication } = useQuery({
    queryKey: ["my-application", id, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("offer_redemptions")
        .select("*, bookings!bookings_redemption_id_fkey(id, status, checked_in_at, completed_at, deliverables(id, status, post_url, views, likes, comments))")
        .eq("offer_id", id!)
        .eq("influencer_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!id && !!user,
  });

  // Record a listing view (analytics). Fire-and-forget, never blocks the page.
  React.useEffect(() => {
    if (!id || !user?.id) return;
    supabase.from("offer_views").insert({ offer_id: id, viewer_id: user.id }).then(({ error }) => {
      if (error) console.error("offer view not recorded", error.message);
    });
  }, [id, user?.id]);



  // Distinct query key from the "influencer-profile" one used elsewhere (e.g.
  // InfluencerDashboard.tsx) — this fetches a narrower column set, and
  // sharing a key would let one page's cached shape leak into the other.
  const { data: profile } = useQuery({
    queryKey: ["influencer-instagram-status", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("instagram_verified").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });
  const hasInstagram = !!profile?.instagram_verified;

  const { data: isSaved } = useQuery({
    queryKey: ["saved-offer", id, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("saved_offers")
        .select("id")
        .eq("offer_id", id!)
        .eq("influencer_id", user!.id)
        .maybeSingle();
      return !!data;
    },
    enabled: !!id && !!user,
  });

  const [applyOpen, setApplyOpen] = React.useState(false);
  const [rulesAccepted, setRulesAccepted] = React.useState(false);

  const apply = useMutation({
    mutationFn: async () => {
      const { data: inserted, error } = await supabase.from("offer_redemptions").insert({
        offer_id: id!,
        influencer_id: user!.id,
        status: "pending",
      }).select("id").single();
      if (error) throw error;
      if (inserted?.id) notifyEmail({ event: "application_submitted", redemption_id: inserted.id });
    },
    onSuccess: () => {
      toast({ title: "Application submitted!", description: "The venue will review your application." });
      setApplyOpen(false); setRulesAccepted(false);
      qc.invalidateQueries({ queryKey: ["my-application", id] });
      qc.invalidateQueries({ queryKey: ["offer-detail", id] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const toggleSave = useMutation({
    mutationFn: async () => {
      if (isSaved) {
        await supabase.from("saved_offers").delete().eq("offer_id", id!).eq("influencer_id", user!.id);
      } else {
        await supabase.from("saved_offers").insert({ offer_id: id!, influencer_id: user!.id });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["saved-offer", id] }),
  });

  // The OS share sheet (Instagram Stories, WhatsApp, etc.) on mobile; a
  // wa.me link is the fallback where navigator.share isn't available (desktop).
  const shareOffer = async () => {
    const url = window.location.href;
    const text = `${offer?.title ?? "Check out this offer"} on FamePass`;
    if (navigator.share) {
      try { await navigator.share({ title: text, url }); } catch { /* user cancelled */ }
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(`${text} — ${url}`)}`, "_blank");
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout type="influencer">
        <div className="rounded-[2rem] bg-card border border-border py-24 text-center text-muted-foreground max-w-6xl mx-auto">Loading offer…</div>
      </DashboardLayout>
    );
  }

  if (!offer) {
    return (
      <DashboardLayout type="influencer">
        <div className="p-8 text-center">
          <p className="text-muted-foreground mb-4">Offer not found.</p>
          <Button onClick={() => navigate("/influencer/explore")}>Back to Explore</Button>
        </div>
      </DashboardLayout>
    );
  }

  const v: any = offer.venues;
  const cat: any = (offer as any).categories;
  const cover = (offer as any).image_url || (offer as any).cover_image_url || v?.cover_image_url || cat?.image_url;
  const slotsLeft =
    offer.max_redemptions != null ? offer.max_redemptions - (offer.current_redemptions || 0) : null;

  const facts = [
    { icon: Users, label: "Min followers", value: offer.min_followers ? `${Number(offer.min_followers).toLocaleString()}+` : "Any" },
    { icon: Tag, label: "Spots", value: slotsLeft != null ? `${slotsLeft} left` : "Open" },
    ...((offer as any).expires_at ? [{ icon: Calendar, label: "Apply by", value: new Date((offer as any).expires_at).toLocaleDateString() }] : []),
    ...((offer as any).deliverable_type ? [{ icon: Clock, label: "Deliverable", value: String((offer as any).deliverable_type) }] : []),
  ];
  const brand = { background: "hsl(var(--venue-brand))", color: "hsl(var(--venue-brand-foreground))" };

  const applyCard = (
    <div className="rounded-[2rem] bg-card border border-border p-6 shadow-[0_20px_50px_-30px_hsl(0_35%_16%/.5)]">
      {offer.discount_value ? (
        <p className="text-3xl font-extrabold text-foreground">${offer.discount_value} <span className="text-base font-semibold text-muted-foreground">value</span></p>
      ) : (
        <p className="text-2xl font-extrabold text-foreground capitalize">{offer.offer_type} collab</p>
      )}
      <div className="grid grid-cols-2 gap-3 mt-5">
        {facts.map(({ icon: Icon, label, value }) => (
          <div key={label} className="rounded-2xl bg-muted/70 p-4">
            <Icon className="w-4 h-4 mb-2" style={{ color: "hsl(var(--venue-brand))" }} />
            <p className="text-sm font-extrabold text-foreground capitalize">{value}</p>
            <p className="text-[11px] text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>
      <div className="mt-5">
        {myApplication ? (
          <>
            <div className="flex items-center gap-2 rounded-2xl px-4 py-3 mb-3 text-sm font-bold" style={{ background: "hsl(var(--primary) / .18)", color: "hsl(var(--venue-brand))" }}>
              <CheckCircle className="w-4 h-4" /> <span className="capitalize">Application {myApplication.status}</span>
            </div>
            <button type="button" onClick={() => navigate("/influencer/bookings")} className="w-full h-14 rounded-full font-bold border-2 transition hover:bg-muted" style={{ borderColor: "hsl(var(--venue-brand))", color: "hsl(var(--venue-brand))" }}>
              Go to my bookings
            </button>
          </>
        ) : !hasInstagram || (slotsLeft != null && slotsLeft <= 0) ? (
          <>
            <button type="button" disabled className="w-full h-14 rounded-full font-bold opacity-50" style={brand}>
              {!hasInstagram ? "Connect Instagram to apply" : "No spots left"}
            </button>
            {!hasInstagram && <button type="button" onClick={() => navigate("/influencer/settings")} className="w-full mt-3 text-sm font-bold" style={{ color: "hsl(var(--venue-brand))" }}>Connect Instagram →</button>}
          </>
        ) : (
          <Dialog open={applyOpen} onOpenChange={(o) => { setApplyOpen(o); if (!o) setRulesAccepted(false); }}>
            <DialogTrigger asChild>
              <button type="button" className="w-full h-14 rounded-full font-bold text-base transition hover:opacity-90" style={brand}>Apply for this offer</button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="text-2xl font-extrabold">Apply to {offer.title}</DialogTitle>
                <DialogDescription>Review the booking rules and confirm your application.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <BookingRulesNotice
                  maxGuests={(offer as any).campaigns?.instagram_offers?.[0]?.max_guests ? parseInt((offer as any).campaigns.instagram_offers[0].max_guests) : null}
                  requirements={(offer as any).requirements}
                  accepted={rulesAccepted}
                  onAcceptedChange={setRulesAccepted}
                />
                <button type="button" className="w-full h-12 rounded-full font-bold disabled:opacity-50" style={brand} onClick={() => apply.mutate()} disabled={apply.isPending || !rulesAccepted}>
                  {apply.isPending ? "Submitting…" : "Confirm application"}
                </button>
              </div>
            </DialogContent>
          </Dialog>
        )}
        {!myApplication && <p className="text-xs text-muted-foreground text-center mt-3">The venue reviews every application. You'll be notified when they decide.</p>}
      </div>
    </div>
  );

  return (
    <DashboardLayout type="influencer">
      <div className="space-y-8 max-w-6xl mx-auto">
        {/* Cinematic cover */}
        <section className="relative rounded-[2rem] overflow-hidden h-[380px] md:h-[460px]" style={{ background: "linear-gradient(135deg, hsl(var(--venue-brand)), hsl(0 60% 26%))" }}>
          {cover && <img src={cover} alt={offer.title} className="absolute inset-0 w-full h-full object-cover" />}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/30" />
          <div className="absolute inset-x-0 top-0 p-5 flex items-center justify-between">
            <button type="button" onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 h-11 pl-3 pr-5 rounded-full bg-white/15 backdrop-blur text-white text-sm font-semibold hover:bg-white/25 transition">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <div className="flex gap-2">
              <button type="button" onClick={shareOffer} aria-label="Share offer" className="w-11 h-11 rounded-full bg-white/15 backdrop-blur text-white flex items-center justify-center hover:bg-white/25 transition"><Share2 className="w-5 h-5" /></button>
              <button type="button" onClick={() => toggleSave.mutate()} aria-label={isSaved ? "Remove from saved" : "Save offer"} className="w-11 h-11 rounded-full bg-white/15 backdrop-blur text-white flex items-center justify-center hover:bg-white/25 transition">
                <Heart className={`w-5 h-5 ${isSaved ? "fill-current" : ""}`} />
              </button>
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 p-6 md:p-10 text-white">
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide" style={{ background: "hsl(var(--primary))", color: "hsl(var(--venue-brand))" }}>{offer.offer_type}</span>
              {cat?.name && <span className="rounded-full px-3 py-1 text-xs font-bold bg-white/15 backdrop-blur">{cat.name}</span>}
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.02] text-white max-w-3xl">{offer.title}</h1>
            <button type="button" onClick={() => navigate(`/influencer/explore?venue=${encodeURIComponent(v?.name || "")}`)} className="mt-5 inline-flex items-center gap-3 text-left group">
              {v?.logo_url
                ? <img src={v.logo_url} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-white/80 bg-white" />
                : <span className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center"><Building2 className="w-5 h-5" /></span>}
              <span>
                <span className="block font-bold group-hover:underline">{v?.name}</span>
                <span className="block text-sm text-white/75 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {v?.address || v?.city}{v?.country ? `, ${v.country}` : ""}</span>
              </span>
            </button>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-6 items-start">
          <div className="space-y-6 min-w-0 order-2 lg:order-1">
            <section className="rounded-[2rem] bg-card border border-border p-6 md:p-8 shadow-[var(--venue-shadow)]">
              <h2 className="text-2xl font-extrabold text-foreground mb-4">About this offer</h2>
              <p className="text-foreground/80 leading-relaxed whitespace-pre-wrap">{offer.description || "No description provided."}</p>
              {(offer as any).requirements && (
                <div className="mt-6 rounded-2xl bg-muted/70 p-5">
                  <h3 className="font-extrabold text-foreground mb-2">What the venue asks for</h3>
                  <p className="text-foreground/80 leading-relaxed whitespace-pre-wrap">{(offer as any).requirements}</p>
                </div>
              )}
              {((offer as any).reel_min_duration_seconds || (offer as any).post_min_photo_count) && (
                <div className="mt-6">
                  <h3 className="font-extrabold text-foreground mb-3">Content spec</h3>
                  <ul className="space-y-2">
                    {(offer as any).reel_min_duration_seconds && (
                      <li className="flex items-center gap-3 text-foreground/80"><CheckCircle className="w-4 h-4 shrink-0" style={{ color: "hsl(var(--venue-brand))" }} /> Reels at least {(offer as any).reel_min_duration_seconds} seconds long</li>
                    )}
                    {(offer as any).post_min_photo_count && (
                      <li className="flex items-center gap-3 text-foreground/80"><CheckCircle className="w-4 h-4 shrink-0" style={{ color: "hsl(var(--venue-brand))" }} /> Posts with at least {(offer as any).post_min_photo_count} photo{(offer as any).post_min_photo_count > 1 ? "s" : ""}</li>
                    )}
                  </ul>
                </div>
              )}
            </section>

            {v && (
              <section className="rounded-[2rem] bg-card border border-border p-6 md:p-8 shadow-[var(--venue-shadow)]">
                <h2 className="text-2xl font-extrabold text-foreground mb-5">About the venue</h2>
                <div className="flex items-center gap-4">
                  {v.logo_url
                    ? <img src={v.logo_url} alt={v.name} className="w-16 h-16 rounded-2xl object-cover border border-border bg-white" />
                    : <span className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "hsl(var(--venue-brand))" }}><Building2 className="w-6 h-6" style={{ color: "hsl(var(--primary))" }} /></span>}
                  <div>
                    <p className="text-lg font-extrabold text-foreground">{v.name}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {v.address || v.city}</p>
                  </div>
                </div>
                {v.description && <p className="mt-5 text-foreground/80 leading-relaxed whitespace-pre-wrap">{v.description}</p>}
                {v.latitude && v.longitude && (
                  <a href={`https://www.google.com/maps/search/?api=1&query=${v.latitude},${v.longitude}`} target="_blank" rel="noreferrer"
                    className="mt-5 inline-flex items-center gap-2 h-11 px-5 rounded-full bg-muted text-sm font-bold text-foreground hover:bg-secondary transition">
                    <MapPin className="w-4 h-4" /> Open in Google Maps
                  </a>
                )}
              </section>
            )}

            {myApplication && (
              <ApplicationPanel
                application={myApplication}
                offerTitle={offer.title}
                fulfilmentType={(offer as any).fulfilment_type ?? "visit"}
                onPostUrlSaved={() => qc.invalidateQueries({ queryKey: ["my-application", id] })}
                onShippingSaved={() => qc.invalidateQueries({ queryKey: ["my-application", id] })}
              />
            )}
          </div>

          <aside className="order-1 lg:order-2 lg:sticky lg:top-24">{applyCard}</aside>
        </div>
      </div>
    </DashboardLayout>
  );
};

const ApplicationPanel = ({
  application,
  offerTitle,
  fulfilmentType,
  onPostUrlSaved,
  onShippingSaved,
}: {
  application: any;
  offerTitle: string;
  fulfilmentType: string;
  onPostUrlSaved: () => void;
  onShippingSaved: () => void;
}) => {
  const booking = application.bookings?.[0];
  const deliverable = booking?.deliverables?.[0];
  const status = application.status as string;
  const checkedIn = !!booking?.checked_in_at || status === "redeemed";
  const code = application.qr_code as string | null;

  const isDelivery = fulfilmentType === "delivery";
  const steps = [
    { key: "applied", label: "Applied", done: true },
    { key: "approved", label: "Approved", done: status === "approved" || status === "redeemed" || checkedIn },
    { key: "checked_in", label: isDelivery ? "Shipped" : "Checked in", done: checkedIn },
    { key: "submitted", label: "Content submitted", done: !!deliverable },
    { key: "approved_content", label: "Content approved", done: deliverable?.status === "approved" },
  ];

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Your collaboration</h2>
          <Badge variant="outline" className="capitalize">{status}</Badge>
        </div>

        {/* Progress timeline */}
        <div className="flex items-center gap-1 flex-wrap">
          {steps.map((s, i) => (
            <div key={s.key} className="flex items-center gap-1">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${s.done ? "bg-gold text-background" : "bg-muted text-muted-foreground"}`}>
                {s.done ? <CheckCircle className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span className={`text-xs ${s.done ? "text-foreground font-medium" : "text-muted-foreground"}`}>{s.label}</span>
              {i < steps.length - 1 && <div className={`w-4 h-px ${s.done ? "bg-gold" : "bg-border"}`} />}
            </div>
          ))}
        </div>

        {/* Pending */}
        {status === "pending" && (
          <p className="text-sm text-muted-foreground">
            Your application is waiting for the venue to review. You'll be notified once it's approved.
          </p>
        )}

        {/* Rejected */}
        {status === "rejected" && (
          <p className="text-sm text-red-500">Sorry, the venue declined this application.</p>
        )}

        {/* Approved, delivery offer → shipping address */}
        {status === "approved" && !checkedIn && isDelivery && (
          <ShippingAddressBlock application={application} onSaved={onShippingSaved} />
        )}

        {/* Approved, visit offer → show check-in code */}
        {status === "approved" && !checkedIn && !isDelivery && code && (
          <div className="rounded-lg border border-gold/30 bg-gold/5 p-4">
            <p className="text-xs text-muted-foreground mb-1">Your check-in code</p>
            <p className="text-2xl font-mono tracking-widest font-bold text-foreground">{code}</p>
            <p className="text-xs text-muted-foreground mt-2">
              Show this code to the venue staff when you arrive. They'll verify it to confirm your visit.
            </p>
          </div>
        )}

        {/* Checked in → share post URL */}
        {checkedIn && (
          <PostUrlBlock
            deliverable={deliverable}
            bookingId={booking?.id}
            influencerId={application.influencer_id}
            offerTitle={offerTitle}
            onSaved={onPostUrlSaved}
          />
        )}
      </CardContent>
    </Card>
  );
};

const ShippingAddressBlock = ({ application, onSaved }: { application: any; onSaved: () => void }) => {
  const [name, setName] = React.useState(application.shipping_name || "");
  const [phone, setPhone] = React.useState(application.shipping_phone || "");
  const [address, setAddress] = React.useState(application.shipping_address || "");
  const [city, setCity] = React.useState(application.shipping_city || "");
  const [saving, setSaving] = React.useState(false);

  if (application.shipping_address) {
    return (
      <div className="rounded-lg border border-gold/30 bg-gold/5 p-4">
        <p className="text-sm font-medium text-foreground">Delivery address sent</p>
        <p className="text-xs text-muted-foreground mt-1">
          {application.shipping_name} • {application.shipping_phone}<br />
          {application.shipping_address}, {application.shipping_city}
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Waiting for the venue to ship your product. You'll be able to submit your post once it's on its way.
        </p>
      </div>
    );
  }

  const save = async () => {
    if (!name.trim() || !phone.trim() || !address.trim() || !city.trim()) {
      toast({ title: "Fill in all fields", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { data, error } = await (supabase as any).rpc("submit_shipping_address", {
      _redemption_id: application.id, _name: name, _phone: phone, _address: address, _city: city,
    });
    setSaving(false);
    if (error || !data?.ok) {
      toast({ title: "Error", description: data?.reason || error?.message, variant: "destructive" });
      return;
    }
    toast({ title: "Delivery address sent to the venue" });
    onSaved();
  };

  return (
    <div className="rounded-lg border border-gold/30 bg-gold/5 p-4 space-y-3">
      <p className="text-sm font-medium text-foreground">This is a Create From Home campaign — tell the venue where to ship the product.</p>
      <Input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
      <Input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
      <Input placeholder="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
      <Input placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
      <Button onClick={save} disabled={saving} size="sm">{saving ? "Saving..." : "Send delivery address"}</Button>
    </div>
  );
};

const PostUrlBlock = ({
  deliverable,
  bookingId,
  influencerId,
  offerTitle,
  onSaved,
}: {
  deliverable: any;
  bookingId?: string;
  influencerId: string;
  offerTitle: string;
  onSaved: () => void;
}) => {
  const [url, setUrl] = React.useState(deliverable?.post_url || "");
  const [saving, setSaving] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);

  const save = async () => {
    const clean = url.trim();
    if (!clean) {
      toast({ title: "Paste your Instagram or TikTok post URL", variant: "destructive" });
      return;
    }
    if (!bookingId) {
      toast({ title: "Visit not confirmed yet", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      let id = deliverable?.id;
      if (id) {
        const { error } = await supabase.from("deliverables").update({ post_url: clean, content_url: clean }).eq("id", id);
        if (error) throw error;
      } else {
        const platform = clean.includes("tiktok.com") ? "tiktok" : "instagram";
        const { data, error } = await supabase.from("deliverables").insert({
          booking_id: bookingId,
          influencer_id: influencerId,
          platform,
          content_type: "post",
          content_url: clean,
          post_url: clean,
          status: "submitted",
          submitted_at: new Date().toISOString(),
        }).select("id").single();
        if (error) throw error;
        id = data.id;
        notifyEmail({ event: "content_submitted", deliverable_id: id });
      }
      // best-effort metrics scrape
      if (id && (clean.includes("instagram.com") || clean.includes("tiktok.com"))) {
        supabase.functions.invoke("fetch-post-metrics", { body: { deliverable_id: id, post_url: clean } }).catch(() => {});
      }
      toast({ title: "Post shared with the venue", description: "We'll pull the metrics automatically." });
      onSaved();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const refresh = async () => {
    if (!deliverable?.id || !deliverable?.post_url) return;
    setRefreshing(true);
    const { data, error } = await supabase.functions.invoke("fetch-post-metrics", {
      body: { deliverable_id: deliverable.id, post_url: deliverable.post_url },
    });
    setRefreshing(false);
    if (error) { toast({ title: "Refresh failed", description: error.message, variant: "destructive" }); return; }
    if (data && data.success === false) {
      toast({
        title: "Metrics unavailable",
        description: data.code === "MISSING_API_KEY"
          ? "The metrics provider isn't configured yet. The venue will see your link."
          : data.code === "PROVIDER_RATE_LIMITED"
          ? "The metrics provider is rate-limited. Try again in a minute."
          : data.error || "We couldn't fetch metrics right now. Your post URL is saved.",
        variant: "destructive",
      });
      onSaved();
      return;
    }
    toast({ title: "Metrics refreshed" });
    onSaved();
  };

  return (
    <div className="rounded-lg border border-border bg-secondary/30 p-4 space-y-3">
      <div>
        <p className="text-sm font-medium text-foreground">Share your post with the venue</p>
        <p className="text-xs text-muted-foreground">
          Paste the link to your Instagram or TikTok post for "{offerTitle}". We'll automatically pull views, likes and comments and send them to the venue.
        </p>
      </div>
      <div className="flex gap-2">
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://instagram.com/p/... or https://tiktok.com/..."
          className="h-9 text-sm"
        />
        <Button size="sm" onClick={save} disabled={saving}>
          {saving ? "Saving..." : deliverable ? "Update" : "Submit"}
        </Button>
      </div>
      {deliverable && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            Status: <span className="capitalize font-medium text-foreground">{deliverable.status}</span> • Views: {deliverable.views ?? 0} • Likes: {deliverable.likes ?? 0} • Comments: {deliverable.comments ?? 0}
          </span>
          <Button size="sm" variant="ghost" onClick={refresh} disabled={refreshing || !deliverable.post_url}>
            {refreshing ? "Refreshing..." : "Refresh metrics"}
          </Button>
        </div>
      )}
    </div>
  );
};

const FactCard = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="rounded-lg border border-border bg-card p-3">
    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
      {icon} {label}
    </div>
    <p className="text-sm font-semibold text-foreground">{value}</p>
  </div>
);

export default InfluencerOffer;
