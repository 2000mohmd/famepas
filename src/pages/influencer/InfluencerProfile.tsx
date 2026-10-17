import DashboardLayout from "@/components/DashboardLayout";
import CreatorPortfolio, { usePortfolio } from "@/components/CreatorPortfolio";
import CreatorPhoto from "@/components/CreatorPhoto";
import CreatorInsightsPanel from "@/components/CreatorInsightsPanel";
import { VenuePanel } from "@/components/venue/VenueUI";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Camera, Check, Instagram, Lock, MapPin, Music2, Save, Shield } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { toast } from "@/hooks/use-toast";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

const BIO_MIN = 40;
const BIO_MAX = 300;
const compact = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M` : n >= 1000 ? `${Math.round(n / 1000)}K` : String(n));

const Field = ({ label, hint, children }: { label: string; hint?: React.ReactNode; children: React.ReactNode }) => (
  <label className="block">
    <span className="flex items-baseline justify-between gap-3 mb-2">
      <span className="text-sm font-bold text-foreground">{label}</span>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </span>
    {children}
  </label>
);

const fieldCls = "h-12 rounded-2xl bg-muted/50 border-border focus-visible:bg-card";

const InfluencerProfile = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["my-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // Adnan, "Creator Page fixes" #3: once a platform is connected, its handle
  // and follower count come from the platform itself, not a typed-in field.
  const { data: tiktokConnected } = useQuery({
    queryKey: ["tiktok-connected", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("social_integrations").select("id")
        .eq("influencer_id", user!.id).eq("platform", "tiktok").eq("status", "connected").maybeSingle();
      return !!data;
    },
    enabled: !!user,
  });
  // A connection that never returned a handle (Meta refused the profile read) isn't
  // "verified" to a venue, so it doesn't lock the fields or earn the badge.
  const instagramConnected = !!profile?.instagram_verified && !!profile?.instagram_handle;
  const { data: portfolio = [] } = usePortfolio(user?.id);

  const [form, setForm] = useState({
    full_name: "", bio: "", phone: "", instagram_handle: "", tiktok_handle: "",
    followers_count: 0, tiktok_followers: 0, niche: [] as string[],
    avatar_url: "", cover_image_url: "", city: "", country: "",
  });
  const [locations, setLocations] = useState<{ id: string; city: string; country: string | null }[]>([]);
  const [nicheOptions, setNicheOptions] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    supabase.from("service_locations").select("id, city, country").eq("is_active", true).order("city").then(({ data }) => setLocations((data as any[]) ?? []));
    supabase.from("niches" as any).select("id, name").eq("is_active", true).order("name").then(({ data }) => setNicheOptions((data as any[]) ?? []));
  }, []);

  useEffect(() => {
    if (!profile) return;
    setForm({
      full_name: profile.full_name || "", bio: profile.bio || "", phone: profile.phone || "",
      instagram_handle: profile.instagram_handle || "", tiktok_handle: profile.tiktok_handle || "",
      followers_count: profile.followers_count || 0, tiktok_followers: profile.tiktok_followers || 0,
      niche: profile.niche || [], avatar_url: profile.avatar_url || "",
      cover_image_url: (profile as any).cover_image_url || "", city: (profile as any).city || "", country: (profile as any).country || "",
    });
  }, [profile]);

  const uploadImage = async (file: File, kind: "avatar" | "cover") => {
    if (!user) return;
    const setBusy = kind === "avatar" ? setAvatarUploading : setCoverUploading;
    setBusy(true);
    const filePath = `${user.id}/${kind}.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true });
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } else {
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const url = `${publicUrl}?t=${Date.now()}`;
      const column = kind === "avatar" ? "avatar_url" : "cover_image_url";
      setForm((f) => ({ ...f, [column]: url }));
      await supabase.from("profiles").update({ [column]: url } as any).eq("user_id", user.id);
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
      toast({ title: kind === "avatar" ? "Profile photo updated" : "Cover updated" });
    }
    setBusy(false);
  };

  const updateProfile = useMutation({
    mutationFn: async () => {
      const { followers_count, tiktok_followers, ...editable } = form;
      const { error } = await supabase.from("profiles").update(editable as any).eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Profile saved" });
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
      const redirect = searchParams.get("redirect");
      if (redirect) navigate(redirect);
    },
    onError: (e: any) => toast({ title: "Couldn't save", description: e.message, variant: "destructive" }),
  });

  const toggleNiche = (n: string) =>
    setForm((f) => ({ ...f, niche: f.niche.includes(n) ? f.niche.filter((x) => x !== n) : [...f.niche, n] }));

  // What makes a profile venues pick: each item links to the section that fixes it.
  const checklist = useMemo(() => [
    { key: "photo", label: "Profile photo", done: !!form.avatar_url, href: "#identity" },
    { key: "cover", label: "Cover photo", done: !!form.cover_image_url, href: "#identity" },
    { key: "bio", label: `Bio of ${BIO_MIN}+ characters`, done: form.bio.trim().length >= BIO_MIN, href: "#about" },
    { key: "city", label: "City", done: !!form.city, href: "#about" },
    { key: "niche", label: "At least one niche", done: form.niche.length > 0, href: "#niches" },
    { key: "social", label: "A social account", done: !!(form.instagram_handle || form.tiktok_handle), href: "#socials" },
    { key: "portfolio", label: "3+ portfolio photos", done: portfolio.length >= 3, href: "#portfolio" },
  ], [form, portfolio.length]);
  const doneCount = checklist.filter((c) => c.done).length;
  const pct = Math.round((doneCount / checklist.length) * 100);
  const followers = Math.max(form.followers_count || 0, form.tiktok_followers || 0);

  return (
    <DashboardLayout type="influencer">
      <div className="space-y-6 pb-28">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] mb-2 text-muted-foreground">Your public profile</p>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">My profile</h1>
            <p className="mt-2 text-muted-foreground max-w-2xl">This is what venues see before they invite you or accept your application.</p>
          </div>
          {profile?.is_verified && (
            <span className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-sm font-bold" style={{ background: "hsl(var(--venue-brand))", color: "hsl(var(--venue-brand-foreground))" }}>
              <Shield className="w-4 h-4" /> Verified creator
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
          <div className="space-y-6 min-w-0">
            {/* Identity: cover + photo, as venues see it */}
            <section id="identity" className="rounded-[2rem] bg-card border border-border overflow-hidden shadow-[var(--venue-shadow)] scroll-mt-24">
              <div className="relative h-44 md:h-60" style={{ background: "linear-gradient(135deg, hsl(var(--venue-brand)), hsl(0 60% 26%))" }}>
                {form.cover_image_url && <img src={form.cover_image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />}
                <label className="absolute right-4 top-4 inline-flex items-center gap-2 h-10 px-4 rounded-full bg-black/45 backdrop-blur text-white text-sm font-semibold cursor-pointer hover:bg-black/60 transition">
                  <Camera className="w-4 h-4" /> {coverUploading ? "Uploading…" : form.cover_image_url ? "Change cover" : "Add cover"}
                  <input type="file" accept="image/*" className="hidden" disabled={coverUploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f, "cover"); }} />
                </label>
              </div>
              <div className="px-6 md:px-8 pb-6 md:pb-8">
                <div className="flex flex-wrap items-end gap-5 -mt-14">
                  <div className="relative">
                    <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-card bg-muted shadow-lg">
                      <CreatorPhoto key={form.avatar_url} src={form.avatar_url || null} name={form.full_name || "?"} className="w-full h-full object-cover text-4xl" />
                    </div>
                    <label className="absolute bottom-1 right-1 w-9 h-9 rounded-full flex items-center justify-center cursor-pointer border-2 border-card hover:opacity-90 transition"
                      style={{ background: "hsl(var(--venue-brand))", color: "hsl(var(--venue-brand-foreground))" }} aria-label="Change profile photo">
                      <Camera className="w-4 h-4" />
                      <input type="file" accept="image/*" className="hidden" disabled={avatarUploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f, "avatar"); }} />
                    </label>
                  </div>
                  <div className="pb-1 min-w-0">
                    <p className="text-2xl font-extrabold text-foreground truncate">{form.full_name || "Your name"}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                      {avatarUploading ? "Uploading photo…" : <><MapPin className="w-3.5 h-3.5" /> {[form.city, form.country].filter(Boolean).join(", ") || "Add your city"}</>}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <VenuePanel title="About you" className="scroll-mt-24">
              <div id="about" className="space-y-5 scroll-mt-24">
                <Field label="Display name">
                  <Input className={fieldCls} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
                </Field>
                <Field label="Bio" hint={<span className={form.bio.trim().length < BIO_MIN ? "text-amber-700" : ""}>{form.bio.length}/{BIO_MAX}</span>}>
                  <Textarea className="rounded-2xl bg-muted/50 border-border focus-visible:bg-card min-h-[120px]" maxLength={BIO_MAX} value={form.bio}
                    onChange={(e) => setForm({ ...form, bio: e.target.value })}
                    placeholder="What you create, who follows you, and the kind of places you love to feature." />
                </Field>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="City">
                    <select value={form.city}
                      onChange={(e) => { const city = e.target.value; const loc = locations.find((l) => l.city === city); setForm({ ...form, city, country: loc?.country || form.country }); }}
                      className={`w-full px-3 text-sm text-foreground border ${fieldCls}`}>
                      <option value="">Select city</option>
                      {locations.map((l) => <option key={l.id} value={l.city}>{l.city}{l.country ? ` (${l.country})` : ""}</option>)}
                    </select>
                  </Field>
                  <Field label="Country">
                    <Input className={fieldCls} value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="Your country" />
                  </Field>
                </div>
              </div>
            </VenuePanel>

            <VenuePanel title="Niches">
              <div id="niches" className="scroll-mt-24">
                <p className="text-sm text-muted-foreground mb-4">Pick what you create. Venues filter creators by these.</p>
                <div className="flex flex-wrap gap-2">
                  {nicheOptions.map((n) => {
                    const on = form.niche.includes(n.name);
                    return (
                      <button key={n.id} type="button" onClick={() => toggleNiche(n.name)} aria-pressed={on}
                        className={`inline-flex items-center gap-1.5 h-10 px-4 rounded-full text-sm font-semibold border transition ${on ? "border-transparent" : "border-border bg-card text-foreground hover:border-primary"}`}
                        style={on ? { background: "hsl(var(--venue-brand))", color: "hsl(var(--venue-brand-foreground))" } : undefined}>
                        {on && <Check className="w-3.5 h-3.5" />} {n.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </VenuePanel>

            <VenuePanel title="Social accounts" action={<Link to="/influencer/settings" className="text-sm font-semibold underline-offset-4 hover:underline" style={{ color: "hsl(var(--venue-brand))" }}>Connect accounts</Link>}>
              <div id="socials" className="grid grid-cols-1 md:grid-cols-2 gap-4 scroll-mt-24">
                {([
                  { icon: Instagram, name: "Instagram", connected: instagramConnected, handleKey: "instagram_handle", countKey: "followers_count" },
                  { icon: Music2, name: "TikTok", connected: !!tiktokConnected, handleKey: "tiktok_handle", countKey: "tiktok_followers" },
                ] as const).map(({ icon: Icon, name, connected, handleKey, countKey }) => (
                  <div key={name} className="rounded-3xl border border-border p-5 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-2 font-bold text-foreground"><Icon className="w-5 h-5" /> {name}</span>
                      {connected
                        ? <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700"><BadgeCheck className="w-4 h-4" /> Verified</span>
                        : <span className="text-xs font-semibold text-muted-foreground">Self-reported</span>}
                    </div>
                    <Input className={fieldCls} placeholder="@handle" value={form[handleKey]} readOnly={connected} disabled={connected}
                      onChange={(e) => setForm({ ...form, [handleKey]: e.target.value })} aria-label={`${name} handle`} />
                    {/* Follower counts come only from a connected account (Phyllo); they can't be typed in. */}
                    <Input className={fieldCls} value={form[countKey] ? `${form[countKey].toLocaleString()} followers` : "—"} readOnly disabled aria-label={`${name} followers`} />
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-4">Venues see "Verified" only for connected accounts. Follower counts update automatically once you connect an account.</p>
            </VenuePanel>

            {/* The same live metrics venues see on your applications, once an account is linked. */}
            {user && (profile?.instagram_verified || tiktokConnected) && (
              <VenuePanel title="Your insights">
                <CreatorInsightsPanel influencerId={user.id} fallback={{ followers_count: form.followers_count, tiktok_followers: form.tiktok_followers }} />
              </VenuePanel>
            )}

            <VenuePanel title="Portfolio" action={<span className="text-sm text-muted-foreground">Up to 9 photos</span>}>
              <div id="portfolio" className="scroll-mt-24">
                <p className="text-sm text-muted-foreground mb-4">Your best shots: food, places, stays. This is the first thing venues look at after your photo.</p>
                {user && <CreatorPortfolio userId={user.id} editable />}
              </div>
            </VenuePanel>

            <VenuePanel title={<span className="inline-flex items-center gap-2"><Lock className="w-4 h-4" /> Private details</span>}>
              <Field label="Phone" hint="Only the FamePass team sees this">
                <Input className={fieldCls} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} inputMode="tel" />
              </Field>
            </VenuePanel>
          </div>

          {/* Right rail: completeness + how venues see your card */}
          <aside className="space-y-6 xl:sticky xl:top-24">
            <section className="rounded-[2rem] p-6" style={{ background: "hsl(var(--venue-brand))", color: "hsl(var(--venue-brand-foreground))" }}>
              <div className="flex items-end justify-between">
                <p className="text-sm font-semibold opacity-80">Profile strength</p>
                <p className="text-4xl font-extrabold leading-none">{pct}%</p>
              </div>
              <div className="h-2 rounded-full mt-4 overflow-hidden" style={{ background: "hsl(var(--venue-brand-foreground) / .15)" }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: "hsl(var(--primary))" }} />
              </div>
              <ul className="mt-5 space-y-2.5">
                {checklist.map((c) => (
                  <li key={c.key}>
                    <a href={c.href} className={`flex items-center gap-2.5 text-sm ${c.done ? "opacity-60" : "font-semibold hover:underline"}`}>
                      <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: c.done ? "hsl(var(--primary))" : "hsl(var(--venue-brand-foreground) / .15)" }}>
                        {c.done && <Check className="w-3 h-3" style={{ color: "hsl(var(--venue-brand))" }} strokeWidth={3} />}
                      </span>
                      {c.label}
                    </a>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground mb-3">How venues see your card</p>
              <article className="rounded-3xl border border-border bg-card p-3 shadow-[var(--venue-shadow)]">
                <div className="relative rounded-2xl overflow-hidden aspect-[4/5] bg-muted">
                  <CreatorPhoto key={form.avatar_url} src={form.avatar_url || null} name={form.full_name || "?"} className="w-full h-full object-cover" initialsClassName="text-5xl" style={{ objectPosition: "center 25%" }} />
                </div>
                <div className="px-2 pt-4 pb-2">
                  <p className="text-lg font-extrabold text-foreground truncate">{form.full_name || "Your name"}</p>
                  <p className="text-sm text-muted-foreground truncate mt-0.5">{[form.city || form.country, form.niche[0]].filter(Boolean).join(" · ") || "FamePass creator"}</p>
                  <p className="text-2xl font-extrabold text-foreground mt-3">{compact(followers)} <span className="text-xs font-medium text-muted-foreground">followers</span></p>
                </div>
              </article>
            </section>
          </aside>
        </div>

        {/* Sticky save bar */}
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-30 w-[calc(100%-2rem)] max-w-md">
          <button type="button" onClick={() => updateProfile.mutate()} disabled={updateProfile.isPending}
            className="w-full inline-flex items-center justify-center gap-2 h-14 rounded-full font-bold shadow-[0_18px_40px_-16px_hsl(0_100%_16%/.6)] transition hover:opacity-95 disabled:opacity-60"
            style={{ background: "hsl(var(--venue-brand))", color: "hsl(var(--venue-brand-foreground))" }}>
            <Save className="w-4 h-4" /> {updateProfile.isPending ? "Saving…" : "Save profile"}
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default InfluencerProfile;
