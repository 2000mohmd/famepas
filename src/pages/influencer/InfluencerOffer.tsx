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
import { useTranslation } from "react-i18next";

const InfluencerOffer = () => {
  const { t, i18n } = useTranslation();
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
      toast({ title: t("creator.explore.applied"), description: t("creator.explore.appliedBody") });
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
    const text = t("creator.offer.shareText", { title: offer?.title ?? t("creator.offer.checkOut") });
    if (navigator.share) {
      try { await navigator.share({ title: text, url }); } catch { /* user cancelled */ }
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(`${text} — ${url}`)}`, "_blank");
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout type="influencer">
        <div className="rounded-[2rem] bg-card border border-border py-24 text-center text-muted-foreground max-w-6xl mx-auto">{t("creator.offer.loading")}</div>
      </DashboardLayout>
    );
  }

  if (!offer) {
    return (
      <DashboardLayout type="influencer">
        <div className="p-8 text-center">
          <p className="text-muted-foreground mb-4">{t("creator.offer.notFound")}</p>
          <Button onClick={() => navigate("/influencer/explore")}>{t("creator.offer.backToExplore")}</Button>
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
    { icon: Users, label: t("creator.offer.minFollowers"), value: offer.min_followers ? `${Number(offer.min_followers).toLocaleString()}+` : t("creator.offer.any") },
    { icon: Tag, label: t("creator.offer.spots"), value: slotsLeft != null ? t("creator.offer.left", { n: slotsLeft }) : t("creator.offer.open") },
    ...((offer as any).expires_at ? [{ icon: Calendar, label: t("creator.offer.applyBy"), value: new Date((offer as any).expires_at).toLocaleDateString(i18n.language) }] : []),
    ...((offer as any).deliverable_type ? [{ icon: Clock, label: t("creator.offer.deliverable"), value: t(`creator.contentTypes.${(offer as any).deliverable_type}`, { defaultValue: String((offer as any).deliverable_type) }) }] : []),
  ];
  const brand = { background: "hsl(var(--venue-brand))", color: "hsl(var(--venue-brand-foreground))" };

  const applyCard = (
    <div className="rounded-[2rem] bg-card border border-border p-6 shadow-[0_20px_50px_-30px_hsl(0_35%_16%/.5)]">
      {offer.discount_value ? (
        <p className="text-3xl font-extrabold text-foreground">${offer.discount_value} <span className="text-base font-semibold text-muted-foreground">{t("creator.offer.value")}</span></p>
      ) : (
        <p className="text-2xl font-extrabold text-foreground capitalize">{t("creator.offer.collab", { type: t(`creator.offerTypes.${offer.offer_type}`, { defaultValue: offer.offer_type }) })}</p>
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
              <CheckCircle className="w-4 h-4" /> <span>{t("creator.offer.applicationStatus", { status: t(`creator.status.${myApplication.status}`, { defaultValue: myApplication.status }) })}</span>
            </div>
            <button type="button" onClick={() => navigate("/influencer/bookings")} className="w-full h-14 rounded-full font-bold border-2 transition hover:bg-muted" style={{ borderColor: "hsl(var(--venue-brand))", color: "hsl(var(--venue-brand))" }}>
              {t("creator.offer.goToBookings")}
            </button>
          </>
        ) : !hasInstagram || (slotsLeft != null && slotsLeft <= 0) ? (
          <>
            <button type="button" disabled className="w-full h-14 rounded-full font-bold opacity-50" style={brand}>
              {!hasInstagram ? t("creator.offer.connectToApply") : t("creator.offer.noSpots")}
            </button>
            {!hasInstagram && <button type="button" onClick={() => navigate("/influencer/settings")} className="w-full mt-3 text-sm font-bold" style={{ color: "hsl(var(--venue-brand))" }}>{t("creator.offer.connectInstagram")}</button>}
          </>
        ) : (
          <Dialog open={applyOpen} onOpenChange={(o) => { setApplyOpen(o); if (!o) setRulesAccepted(false); }}>
            <DialogTrigger asChild>
              <button type="button" className="w-full h-14 rounded-full font-bold text-base transition hover:opacity-90" style={brand}>{t("creator.offer.applyForOffer")}</button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="text-2xl font-extrabold">{t("creator.explore.applyTo", { title: offer.title })}</DialogTitle>
                <DialogDescription>{t("creator.offer.reviewRules")}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <BookingRulesNotice
                  maxGuests={(offer as any).campaigns?.instagram_offers?.[0]?.max_guests ? parseInt((offer as any).campaigns.instagram_offers[0].max_guests) : null}
                  requirements={(offer as any).requirements}
                  accepted={rulesAccepted}
                  onAcceptedChange={setRulesAccepted}
                />
                <button type="button" className="w-full h-12 rounded-full font-bold disabled:opacity-50" style={brand} onClick={() => apply.mutate()} disabled={apply.isPending || !rulesAccepted}>
                  {apply.isPending ? t("creator.reviews.submitting") : t("creator.explore.confirm")}
                </button>
              </div>
            </DialogContent>
          </Dialog>
        )}
        {!myApplication && <p className="text-xs text-muted-foreground text-center mt-3">{t("creator.offer.reviewNote")}</p>}
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
            <button type="button" onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 h-11 ps-3 pe-5 rounded-full bg-white/15 backdrop-blur text-white text-sm font-semibold hover:bg-white/25 transition">
              <ArrowLeft className="w-4 h-4 rtl:rotate-180" /> {t("creator.offer.back")}
            </button>
            <div className="flex gap-2">
              <button type="button" onClick={shareOffer} aria-label={t("creator.offer.share")} className="w-11 h-11 rounded-full bg-white/15 backdrop-blur text-white flex items-center justify-center hover:bg-white/25 transition"><Share2 className="w-5 h-5" /></button>
              <button type="button" onClick={() => toggleSave.mutate()} aria-label={isSaved ? t("creator.explore.unsave") : t("creator.explore.save")} className="w-11 h-11 rounded-full bg-white/15 backdrop-blur text-white flex items-center justify-center hover:bg-white/25 transition">
                <Heart className={`w-5 h-5 ${isSaved ? "fill-current" : ""}`} />
              </button>
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 p-6 md:p-10 text-white">
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide" style={{ background: "hsl(var(--primary))", color: "hsl(var(--venue-brand))" }}>{t(`creator.offerTypes.${offer.offer_type}`, { defaultValue: offer.offer_type })}</span>
              {cat?.name && <span className="rounded-full px-3 py-1 text-xs font-bold bg-white/15 backdrop-blur">{cat.name}</span>}
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.02] text-white max-w-3xl">{offer.title}</h1>
            <button type="button" onClick={() => navigate(`/influencer/explore?venue=${encodeURIComponent(v?.name || "")}`)} className="mt-5 inline-flex items-center gap-3 text-start group">
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
              <h2 className="text-2xl font-extrabold text-foreground mb-4">{t("creator.offer.aboutOffer")}</h2>
              <p className="text-foreground/80 leading-relaxed whitespace-pre-wrap">{offer.description || t("creator.offer.noDescription")}</p>
              {(offer as any).requirements && (
                <div className="mt-6 rounded-2xl bg-muted/70 p-5">
                  <h3 className="font-extrabold text-foreground mb-2">{t("creator.explore.venueAsks")}</h3>
                  <p className="text-foreground/80 leading-relaxed whitespace-pre-wrap">{(offer as any).requirements}</p>
                </div>
              )}
              {((offer as any).reel_min_duration_seconds || (offer as any).post_min_photo_count) && (
                <div className="mt-6">
                  <h3 className="font-extrabold text-foreground mb-3">{t("creator.offer.contentSpec")}</h3>
                  <ul className="space-y-2">
                    {(offer as any).reel_min_duration_seconds && (
                      <li className="flex items-center gap-3 text-foreground/80"><CheckCircle className="w-4 h-4 shrink-0" style={{ color: "hsl(var(--venue-brand))" }} /> {t("creator.offer.reelSpec", { n: (offer as any).reel_min_duration_seconds })}</li>
                    )}
                    {(offer as any).post_min_photo_count && (
                      <li className="flex items-center gap-3 text-foreground/80"><CheckCircle className="w-4 h-4 shrink-0" style={{ color: "hsl(var(--venue-brand))" }} /> {t("creator.offer.postSpec", { n: (offer as any).post_min_photo_count })}</li>
                    )}
                  </ul>
                </div>
              )}
            </section>

            {v && (
              <section className="rounded-[2rem] bg-card border border-border p-6 md:p-8 shadow-[var(--venue-shadow)]">
                <h2 className="text-2xl font-extrabold text-foreground mb-5">{t("creator.offer.aboutVenue")}</h2>
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
                    <MapPin className="w-4 h-4" /> {t("creator.offer.openMaps")}
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
  const { t } = useTranslation();
  const deliverable = booking?.deliverables?.[0];
  const status = application.status as string;
  const checkedIn = !!booking?.checked_in_at || status === "redeemed";
  const code = application.qr_code as string | null;

  const isDelivery = fulfilmentType === "delivery";
  const steps = [
    { key: "applied", label: t("creator.explore.appliedBadge"), done: true },
    { key: "approved", label: t("creator.status.approved"), done: status === "approved" || status === "redeemed" || checkedIn },
    { key: "checked_in", label: isDelivery ? t("creator.offer.shipped") : t("creator.status.checked_in"), done: checkedIn },
    { key: "submitted", label: t("creator.delivery.posted"), done: !!deliverable },
    { key: "approved_content", label: t("creator.offer.contentApproved"), done: deliverable?.status === "approved" },
  ];

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">{t("creator.offer.yourCollab")}</h2>
          <Badge variant="outline" className="capitalize">{t(`creator.status.${status}`, { defaultValue: status })}</Badge>
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
            {t("creator.offer.pendingNote")}
          </p>
        )}

        {/* Rejected */}
        {status === "rejected" && (
          <p className="text-sm text-red-500">{t("creator.offer.rejectedNote")}</p>
        )}

        {/* Approved, delivery offer → shipping address */}
        {status === "approved" && !checkedIn && isDelivery && (
          <ShippingAddressBlock application={application} onSaved={onShippingSaved} />
        )}

        {/* Approved, visit offer → show check-in code */}
        {status === "approved" && !checkedIn && !isDelivery && code && (
          <div className="rounded-lg border border-gold/30 bg-gold/5 p-4">
            <p className="text-xs text-muted-foreground mb-1">{t("creator.offer.checkinCode")}</p>
            <p className="text-2xl font-mono tracking-widest font-bold text-foreground">{code}</p>
            <p className="text-xs text-muted-foreground mt-2">
              {t("creator.offer.checkinNote")}
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
  const { t } = useTranslation();
  const [name, setName] = React.useState(application.shipping_name || "");
  const [phone, setPhone] = React.useState(application.shipping_phone || "");
  const [address, setAddress] = React.useState(application.shipping_address || "");
  const [city, setCity] = React.useState(application.shipping_city || "");
  const [saving, setSaving] = React.useState(false);

  if (application.shipping_address) {
    return (
      <div className="rounded-lg border border-gold/30 bg-gold/5 p-4">
        <p className="text-sm font-medium text-foreground">{t("creator.offer.addressSent")}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {application.shipping_name} • {application.shipping_phone}<br />
          {application.shipping_address}, {application.shipping_city}
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          {t("creator.offer.waitingShip")}
        </p>
      </div>
    );
  }

  const save = async () => {
    if (!name.trim() || !phone.trim() || !address.trim() || !city.trim()) {
      toast({ title: t("creator.offer.fillAll"), variant: "destructive" });
      return;
    }
    setSaving(true);
    const { data, error } = await (supabase as any).rpc("submit_shipping_address", {
      _redemption_id: application.id, _name: name, _phone: phone, _address: address, _city: city,
    });
    setSaving(false);
    if (error || !data?.ok) {
      toast({ title: t("creator.common.error"), description: data?.reason || error?.message, variant: "destructive" });
      return;
    }
    toast({ title: t("creator.offer.addressSentToast") });
    onSaved();
  };

  return (
    <div className="rounded-lg border border-gold/30 bg-gold/5 p-4 space-y-3">
      <p className="text-sm font-medium text-foreground">{t("creator.offer.shipIntro")}</p>
      <Input placeholder={t("creator.offer.fullName")} value={name} onChange={(e) => setName(e.target.value)} />
      <Input placeholder={t("creator.profile.phone")} value={phone} onChange={(e) => setPhone(e.target.value)} />
      <Input placeholder={t("creator.offer.address")} value={address} onChange={(e) => setAddress(e.target.value)} />
      <Input placeholder={t("creator.profile.city")} value={city} onChange={(e) => setCity(e.target.value)} />
      <Button onClick={save} disabled={saving} size="sm">{saving ? t("creator.profile.saving") : t("creator.offer.sendAddress")}</Button>
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
  const { t } = useTranslation();
  const [saving, setSaving] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);

  const save = async () => {
    const clean = url.trim();
    if (!clean) {
      toast({ title: t("creator.offer.pasteUrl"), variant: "destructive" });
      return;
    }
    if (!bookingId) {
      toast({ title: t("creator.offer.visitNotConfirmed"), variant: "destructive" });
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
      toast({ title: t("creator.offer.postShared"), description: t("creator.offer.postSharedBody") });
      onSaved();
    } catch (e: any) {
      toast({ title: t("creator.common.error"), description: e.message, variant: "destructive" });
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
    if (error) { toast({ title: t("creator.bookings.refreshFailed"), description: error.message, variant: "destructive" }); return; }
    if (data && data.success === false) {
      toast({
        title: t("creator.offer.metricsUnavailable"),
        description: data.code === "MISSING_API_KEY"
          ? t("creator.offer.metricsNotConfigured")
          : data.code === "PROVIDER_RATE_LIMITED"
          ? t("creator.offer.metricsRateLimited")
          : data.error || t("creator.offer.metricsFailed"),
        variant: "destructive",
      });
      onSaved();
      return;
    }
    toast({ title: t("creator.offer.metricsRefreshed") });
    onSaved();
  };

  return (
    <div className="rounded-lg border border-border bg-secondary/30 p-4 space-y-3">
      <div>
        <p className="text-sm font-medium text-foreground">{t("creator.offer.sharePostTitle")}</p>
        <p className="text-xs text-muted-foreground">
          {t("creator.offer.sharePostBody", { title: offerTitle })}
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
          {saving ? t("creator.profile.saving") : deliverable ? t("creator.offer.update") : t("creator.offer.submit")}
        </Button>
      </div>
      {deliverable && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {t("creator.offer.status")}: <span className="capitalize font-medium text-foreground">{t(`creator.status.${deliverable.status}`, { defaultValue: deliverable.status })}</span> • {t("creator.bookings.views")}: {deliverable.views ?? 0} • {t("creator.bookings.likes")}: {deliverable.likes ?? 0} • {t("creator.bookings.comments")}: {deliverable.comments ?? 0}
          </span>
          <Button size="sm" variant="ghost" onClick={refresh} disabled={refreshing || !deliverable.post_url}>
            {refreshing ? t("creator.offer.refreshing") : t("creator.offer.refreshMetrics")}
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
