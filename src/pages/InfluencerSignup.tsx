import { useMemo, useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import famepassLogo from "@/assets/famepass-logo.png";
import { ArrowLeft, Check, ChevronRight, Sparkles, UserCheck } from "lucide-react";

/* ============================================================
   Joli-style light-mode creator (influencer) signup wizard
   Route: /signup/influencer
   ============================================================ */

type Step = "account" | "profile" | "photo" | "socials" | "niche" | "done";

const NICHES = [
  "Food & Dining", "Travel", "Fashion", "Beauty", "Fitness",
  "Lifestyle", "Tech", "Gaming", "Music", "Photography",
  "Family", "Business", "Sports", "Art", "Other",
];

const getPasswordChecks = (v: string) => ({
  length: v.length >= 8,
  uppercase: /[A-Z]/.test(v),
  lowercase: /[a-z]/.test(v),
  number: /\d/.test(v),
});
const isStrongPassword = (v: string) => Object.values(getPasswordChecks(v)).every(Boolean);

/* ---------- light-mode primitives ---------- */
const Page = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen bg-[#f7f5f0] text-slate-900">
    <header className="px-6 sm:px-8 py-5 flex items-center justify-between">
      <Link to="/" className="flex items-center gap-2">
        <img src={famepassLogo} alt="FamePass" className="w-9 h-9 rounded-lg" />
        <span className="font-display text-xl sm:text-2xl font-bold text-slate-900">
          Fame<span className="text-[#b8923a]">Pass</span>
        </span>
      </Link>
      <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
        <UserCheck className="w-5 h-5" />
      </div>
    </header>
    <main className="flex justify-center px-4 pb-16">{children}</main>
  </div>
);

const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`w-full max-w-xl bg-white rounded-2xl shadow-sm border border-slate-100 p-6 sm:p-8 ${className}`}>
    {children}
  </div>
);

const Heading = ({ title, sub }: { title: string; sub?: string }) => (
  <div className="mb-6">
    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{title}</h1>
    {sub && <p className="mt-2 text-slate-500">{sub}</p>}
  </div>
);

const Field = ({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
    {children}
    {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
  </div>
);

const TextInput = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...props}
    className={`w-full h-11 px-3 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#b8923a] focus:ring-2 focus:ring-[#b8923a]/20 ${props.className ?? ""}`}
  />
);

const TextArea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea
    {...props}
    className={`w-full min-h-[90px] px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#b8923a] focus:ring-2 focus:ring-[#b8923a]/20 ${props.className ?? ""}`}
  />
);

const PrimaryButton = ({ children, disabled, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    {...rest}
    disabled={disabled}
    className={`w-full h-12 rounded-xl bg-[#b8923a] text-white font-semibold hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed transition`}
  >
    {children}
  </button>
);

const BackBar = ({ onBack, step, total }: { onBack: () => void; step: number; total: number }) => (
  <div className="flex items-center gap-3 mb-4">
    <button onClick={onBack} className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:text-[#b8923a]">
      <ArrowLeft className="w-4 h-4" />
    </button>
    <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
      <div className="h-full bg-[#b8923a] transition-all" style={{ width: `${(step / total) * 100}%` }} />
    </div>
    <span className="text-xs text-slate-500">{step}/{total}</span>
  </div>
);

const InfluencerSignup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>("account");
  const [submitting, setSubmitting] = useState(false);

  // account
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);

  // profile
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [bio, setBio] = useState("");

  // avatar
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");

  // socials
  const [instagram, setInstagram] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [youtube, setYoutube] = useState("");
  const [followers, setFollowers] = useState("");

  // niches
  const [selectedNiches, setSelectedNiches] = useState<string[]>([]);

  const pwdChecks = useMemo(() => getPasswordChecks(password), [password]);
  const pwdReady = useMemo(() => isStrongPassword(password), [password]);

  const accountReady = email.includes("@") && pwdReady;
  const profileReady = fullName.trim().length > 1 && country.trim().length > 0;
  const socialsReady = !!(instagram || tiktok || youtube);

  const toggleNiche = (n: string) =>
    setSelectedNiches((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]));

  useEffect(() => { window.scrollTo(0, 0); }, [step]);

  const handleFinalize = async () => {
    setSubmitting(true);
    try {
      const social_links: Record<string, string> = {};
      if (instagram) social_links.instagram = instagram;
      if (tiktok) social_links.tiktok = tiktok;
      if (youtube) social_links.youtube = youtube;
      if (username) social_links.username = username;

      const { data, error } = await supabase.functions.invoke("signup-user", {
        body: {
          email,
          password,
          role: "influencer",
          full_name: fullName,
          instagram_handle: instagram || null,
          tiktok_handle: tiktok || null,
          tiktok_followers: 0,
          followers_count: Number(followers) || 0,
          bio: bio || null,
          city: city || null,
          country: country || null,
          niche: selectedNiches,
          social_links,
        },
      });
      if (error) {
        // supabase.functions.invoke wraps non-2xx responses in FunctionsHttpError
        // whose .message is generic. Read the JSON body from .context to surface
        // the real error (e.g. "email_exists").
        let parsed: any = null;
        try { parsed = await (error as any).context?.json?.(); } catch { /* ignore */ }
        const msg = parsed?.error || (error as any).message || "Signup failed";
        const code = parsed?.code;
        const err = new Error(msg);
        (err as any).code = code;
        throw err;
      }
      if ((data as any)?.error) throw new Error((data as any).error);

      // Sign in so we have an authed session for avatar upload & routing
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;

      // Optional avatar upload (best-effort, non-blocking on failure)
      if (avatarFile) {
        try {
          const { data: ures } = await supabase.auth.getUser();
          const uid = ures.user?.id;
          if (uid) {
            const ext = avatarFile.name.split(".").pop() || "jpg";
            const path = `${uid}/avatar.${ext}`;
            const { error: upErr } = await supabase.storage
              .from("avatars")
              .upload(path, avatarFile, { upsert: true, contentType: avatarFile.type });
            if (!upErr) {
              const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
              await supabase.from("profiles").update({ avatar_url: pub.publicUrl }).eq("user_id", uid);
            }
          }
        } catch (e) {
          console.warn("Avatar upload skipped:", e);
        }
      }

      setStep("done");
      toast({ title: "Welcome to FamePass!", description: "Your creator account is ready." });
      setTimeout(() => navigate("/influencer/explore", { replace: true }), 600);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Please try again.";
      const isDuplicate = /already (been )?registered|email_exists|already exists/i.test(message);
      toast({
        title: isDuplicate ? "Email already registered" : "Signup failed",
        description: isDuplicate
          ? "An account with this email already exists. Redirecting you to sign in..."
          : message,
        variant: "destructive",
      });
      if (isDuplicate) {
        setTimeout(() => navigate("/login", { replace: true }), 1500);
      }
    } finally {
      setSubmitting(false);
    }
  };

  /* ============ steps ============ */

  if (step === "account") {
    return (
      <Page>
        <div className="w-full max-w-xl">
          <BackBar onBack={() => navigate("/login")} step={1} total={5} />
          <Card>
            <Heading title="Create your creator account" sub="Join FamePass and start collaborating with brands." />
            <Field label="Email">
              <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
            </Field>
            <Field label="Password" hint="At least 8 chars, with uppercase, lowercase, and a number.">
              <div className="relative">
                <TextInput
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-[#b8923a]"
                >
                  {showPwd ? "Hide" : "Show"}
                </button>
              </div>
              <ul className="mt-2 grid grid-cols-2 gap-1 text-xs">
                {[
                  ["length", "8+ characters"],
                  ["uppercase", "Uppercase letter"],
                  ["lowercase", "Lowercase letter"],
                  ["number", "A number"],
                ].map(([k, label]) => (
                  <li key={k} className={`flex items-center gap-1 ${pwdChecks[k as keyof typeof pwdChecks] ? "text-emerald-600" : "text-slate-400"}`}>
                    <Check className="w-3 h-3" /> {label}
                  </li>
                ))}
              </ul>
            </Field>
            <PrimaryButton disabled={!accountReady} onClick={() => setStep("profile")}>
              Continue <ChevronRight className="inline w-4 h-4 ml-1" />
            </PrimaryButton>
            <p className="mt-4 text-center text-sm text-slate-500">
              Already have an account?{" "}
              <button onClick={() => navigate("/login")} className="text-[#b8923a] font-semibold hover:underline">Sign in</button>
            </p>
          </Card>
        </div>
      </Page>
    );
  }

  if (step === "profile") {
    return (
      <Page>
        <div className="w-full max-w-xl">
          <BackBar onBack={() => setStep("account")} step={2} total={5} />
          <Card>
            <Heading title="Tell us about you" sub="This is how brands will discover you." />
            <Field label="Full name">
              <TextInput value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" />
            </Field>
            <Field label="Username / display name" hint="Optional — how you want to be shown publicly.">
              <TextInput value={username} onChange={(e) => setUsername(e.target.value)} placeholder="@yourhandle" />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Country">
                <TextInput value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g. United States" />
              </Field>
              <Field label="City">
                <TextInput value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Los Angeles" />
              </Field>
            </div>
            <Field label="Short bio" hint="A 1–2 sentence intro about you and the content you create.">
              <TextArea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="I create food & travel content for Gen-Z audiences..." />
            </Field>
            <PrimaryButton disabled={!profileReady} onClick={() => setStep("photo")}>
              Continue <ChevronRight className="inline w-4 h-4 ml-1" />
            </PrimaryButton>
          </Card>
        </div>
      </Page>
    );
  }

  if (step === "photo") {
    const onFile = (f: File | null) => {
      setAvatarFile(f);
      if (f) {
        const url = URL.createObjectURL(f);
        setAvatarPreview(url);
      } else {
        setAvatarPreview("");
      }
    };
    return (
      <Page>
        <div className="w-full max-w-xl">
          <BackBar onBack={() => setStep("profile")} step={3} total={5} />
          <Card>
            <Heading title="Add a profile photo" sub="Optional, but creators with a photo get 3× more matches." />
            <div className="flex flex-col items-center gap-4 mb-6">
              <div className="w-32 h-32 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-slate-400 text-sm">No photo</span>
                )}
              </div>
              <label className="inline-flex items-center gap-2 px-4 h-10 rounded-lg border border-slate-200 cursor-pointer hover:border-[#b8923a] text-sm font-medium text-slate-700">
                {avatarFile ? "Change photo" : "Upload photo"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onFile(e.target.files?.[0] ?? null)}
                />
              </label>
              {avatarFile && (
                <button onClick={() => onFile(null)} className="text-xs text-slate-500 hover:text-[#b8923a]">
                  Remove
                </button>
              )}
            </div>
            <PrimaryButton onClick={() => setStep("socials")}>
              {avatarFile ? "Continue" : "Skip for now"} <ChevronRight className="inline w-4 h-4 ml-1" />
            </PrimaryButton>
          </Card>
        </div>
      </Page>
    );
  }


  if (step === "socials") {
    return (
      <Page>
        <div className="w-full max-w-xl">
          <BackBar onBack={() => setStep("photo")} step={4} total={5} />
          <Card>
            <Heading title="Connect your socials" sub="Add at least one to help brands find you." />
            <Field label="Instagram handle">
              <TextInput value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@yourname" />
            </Field>
            <Field label="TikTok handle">
              <TextInput value={tiktok} onChange={(e) => setTiktok(e.target.value)} placeholder="@yourname" />
            </Field>
            <Field label="YouTube channel" hint="Username or full URL.">
              <TextInput value={youtube} onChange={(e) => setYoutube(e.target.value)} placeholder="@yourname or link" />
            </Field>
            <Field label="Total followers (approx.)" hint="Across your main platform. You can update this later.">
              <TextInput type="number" min={0} value={followers} onChange={(e) => setFollowers(e.target.value)} placeholder="e.g. 5000" />
            </Field>
            <PrimaryButton disabled={!socialsReady} onClick={() => setStep("niche")}>
              Continue <ChevronRight className="inline w-4 h-4 ml-1" />
            </PrimaryButton>
          </Card>
        </div>
      </Page>
    );
  }

  if (step === "niche") {
    return (
      <Page>
        <div className="w-full max-w-xl">
          <BackBar onBack={() => setStep("socials")} step={5} total={5} />
          <Card>
            <Heading title="Pick your content niches" sub="Choose all that apply — we'll match you with relevant offers." />
            <div className="flex flex-wrap gap-2 mb-6">
              {NICHES.map((n) => {
                const active = selectedNiches.includes(n);
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => toggleNiche(n)}
                    className={`px-3 h-9 rounded-full border text-sm transition ${
                      active
                        ? "bg-[#b8923a] text-white border-[#b8923a]"
                        : "bg-white text-slate-700 border-slate-200 hover:border-[#b8923a]"
                    }`}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
            <PrimaryButton disabled={submitting || selectedNiches.length === 0} onClick={handleFinalize}>
              {submitting ? "Creating your account..." : "Finish & Enter FamePass"}
            </PrimaryButton>
          </Card>
        </div>
      </Page>
    );
  }

  // done
  return (
    <Page>
      <div className="w-full max-w-xl">
        <Card className="text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-[#fbf6e8] flex items-center justify-center mb-4">
            <Sparkles className="w-8 h-8 text-[#b8923a]" />
          </div>
          <Heading title="You're in! 🎉" sub="Taking you to your creator dashboard..." />
        </Card>
      </div>
    </Page>
  );
};

export default InfluencerSignup;
