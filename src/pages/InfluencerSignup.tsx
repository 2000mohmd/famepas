import { useMemo, useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Check, ChevronRight, Sparkles, UserCheck } from "lucide-react";
import LocationAutocomplete from "@/components/venue/LocationAutocomplete";
import { isValidEmail, isValidFullName, isValidName, isValidOptionalHandle } from "@/lib/validation";
import { fetchSignupConfig, isRegistrationOpen } from "@/lib/signupConfig";


const normalizeHandle = (v: string) => v.trim().replace(/^@+/, "");

/* ============================================================
   Joli-style light-mode creator (influencer) signup wizard
   Route: /signup/influencer
   ============================================================ */

type Step = "account" | "profile" | "photo" | "niche" | "done";

const NICHES = [
  "Food & Dining", "Travel", "Fashion", "Beauty", "Fitness",
  "Lifestyle", "Tech", "Gaming", "Music", "Photography",
  "Family", "Business", "Sports", "Art", "Other",
];

const getPasswordChecks = (v: string) => ({
  length: v.length >= 8,
  letter: /[a-zA-Z]/.test(v),
  number: /\d/.test(v),
});
const isStrongPassword = (v: string) => Object.values(getPasswordChecks(v)).every(Boolean);
const isPasswordAllowed = (v: string) => v.length >= 6;

/* ---------- light-mode primitives ---------- */
const Page = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen bg-[#f7f5f0] text-slate-900">
    <header className="px-6 sm:px-8 py-5 flex items-center justify-between">
      <Link to="/" className="flex items-center gap-2">
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
  const [searchParams] = useSearchParams();

  // Present only when arriving from "Continue with Instagram" on the Login
  // page via a brand-new-creator identify() response (see InstagramCallback.tsx).
  // The Instagram identity behind it is already verified server-side — this
  // page never re-collects or re-verifies it, just displays it and passes the
  // token through to signup-user at the end.
  const igLinkToken = searchParams.get("ig_link_token");
  const igUsername = searchParams.get("ig_username");

  const [step, setStep] = useState<Step>(igLinkToken ? "profile" : "account");
  const [submitting, setSubmitting] = useState(false);
  const [registrationOpen, setRegistrationOpen] = useState<boolean | null>(null);
  const [countryOptions, setCountryOptions] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const config = await fetchSignupConfig();
      setRegistrationOpen(isRegistrationOpen(config, "influencer_registration_open"));
      setCountryOptions(
        config.countries?.length
          ? config.countries
          : ["Lebanon", "United Arab Emirates", "Saudi Arabia"],
      );
    })();
  }, []);



  // account
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

  // profile
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [bio, setBio] = useState("");

  // avatar
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");



  // niches
  const [selectedNiches, setSelectedNiches] = useState<string[]>([]);

  const pwdChecks = useMemo(() => getPasswordChecks(password), [password]);
  const pwdReady = useMemo(() => isStrongPassword(password), [password]);

  // profile validation
  const nameError =
    !fullName.trim() ? "" :
    !isValidName(fullName, 3) ? "Please enter at least 3 characters." :
    !isValidFullName(fullName) ? "Please enter your first and last name." : "";
  const usernameError =
    !username.trim() ? "" :
    !isValidOptionalHandle(normalizeHandle(username), username) ? "Please enter a valid username (at least 2 letters or numbers)." : "";
  const bioError = bio.trim().length > 0 && bio.trim().length < 10 ? "Please write at least 10 characters, or leave it empty." : "";
  const emailError = !igLinkToken ? "" : !email.trim() ? "" : !isValidEmail(email) ? "Please enter a valid email." : "";
  const profileReady =
    isValidFullName(fullName) && country.trim().length > 0 && !usernameError && !bioError &&
    (!igLinkToken || (email.trim().length > 0 && !emailError));




  const toggleNiche = (n: string) =>
    setSelectedNiches((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]));

  useEffect(() => { window.scrollTo(0, 0); }, [step]);

  const handleFinalize = async () => {
    setSubmitting(true);
    try {
      const social_links: Record<string, string> = {};
      if (username) social_links.username = normalizeHandle(username);

      const { data, error } = await supabase.functions.invoke("signup-user", {
        body: {
          email,
          ...(igLinkToken ? { instagram_link_token: igLinkToken } : { password }),
          role: "influencer",
          full_name: fullName,
          phone: phone.trim() || null,
          tiktok_followers: 0,
          followers_count: 0,
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

      // Sign in so we have an authed session for avatar upload & routing.
      // Instagram-verified signups have no password — they're signed in via
      // the magic-link token signup-user handed back instead.
      if (igLinkToken) {
        const { error: otpErr } = await supabase.auth.verifyOtp({
          email,
          token: (data as any).hashed_token,
          type: "magiclink",
        });
        if (otpErr) throw otpErr;
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
      }

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

      // Social follower counts are no longer self-reported at signup — they
      // come from the official Instagram / TikTok integrations once the
      // creator links their accounts from Settings.



      // New influencers start as "pending" — sign the temporary session out and
      // show a review confirmation instead of routing into the dashboard.
      await supabase.auth.signOut();

      setStep("done");
      toast({ title: "Application submitted", description: "Your creator account is under review." });

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

  if (registrationOpen === false) {
    return (
      <Page>
        <div className="w-full max-w-xl">
          <Card>
            <Heading
              title="Registrations are closed"
              sub="Influencer signups are temporarily disabled. Please check back soon."
            />
            <PrimaryButton onClick={() => navigate("/login")}>Back to sign in</PrimaryButton>
          </Card>
        </div>
      </Page>
    );
  }

  if (step === "account") {
    const passwordsMatch = password.length > 0 && password === confirmPassword;
    return (
      <Page>
        <div className="w-full max-w-xl">
          <BackBar onBack={() => navigate("/login")} step={1} total={4} />
          <Card>
            <Heading title="Create your creator account" sub="Join FamePass and start collaborating with brands." />
            <Field label="Email">
              <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
            </Field>
            <Field label="Password" hint="At least 8 characters, including a letter and a number.">
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
                  ["letter", "A letter"],
                  ["number", "A number"],
                ].map(([k, label]) => (
                  <li key={k} className={`flex items-center gap-1 ${pwdChecks[k as keyof typeof pwdChecks] ? "text-emerald-600" : "text-slate-400"}`}>
                    <Check className="w-3 h-3" /> {label}
                  </li>
                ))}
              </ul>
              {password.length >= 6 && !pwdReady && (
                <p className="mt-2 text-xs text-amber-600">For better security, we recommend a stronger password — but you can continue.</p>
              )}
            </Field>
            <Field label="Confirm password">
              <div className="relative">
                <TextInput
                  type={showConfirmPwd ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPwd((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-[#b8923a]"
                >
                  {showConfirmPwd ? "Hide" : "Show"}
                </button>
              </div>
              {confirmPassword.length > 0 && !passwordsMatch && (
                <p className="text-xs text-red-500 mt-1">Passwords do not match.</p>
              )}
            </Field>
            <PrimaryButton disabled={!email || password.length < 6 || !passwordsMatch} onClick={() => setStep("profile")}>
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
          <BackBar onBack={() => (igLinkToken ? navigate("/login") : setStep("account"))} step={2} total={4} />
          <Card>
            <Heading title="Tell us about you" sub="This is how brands will discover you." />
            {igLinkToken && (
              <Field label="Email" hint="We'll use this to notify you once your account is approved.">
                <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
                {emailError && <p className="text-xs text-red-600 mt-1">{emailError}</p>}
              </Field>
            )}
            <Field label="Full name">
              <TextInput value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" />
              {nameError && <p className="text-xs text-red-600 mt-1">{nameError}</p>}
            </Field>
            <Field label="Phone number" hint="So venues can reach you about bookings.">
              <TextInput type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+961 70 000 000" />
            </Field>
            <Field label="Username / display name" hint="Optional — how you want to be shown publicly.">
              <TextInput value={username} onChange={(e) => setUsername(e.target.value)} placeholder="@yourhandle" />
              {usernameError && <p className="text-xs text-red-600 mt-1">{usernameError}</p>}
            </Field>

            <Field label="Location" hint="Start typing your city — we'll auto-fill city and country.">
              <LocationAutocomplete
                defaultValue={city && country ? `${city}, ${country}` : ""}
                placeholder="e.g. Dubai, United Arab Emirates"
                onPick={(p) => {
                  if (p.city) setCity(p.city);
                  if (p.country) setCountry(p.country);
                }}
              />
              {(city || country) && (
                <p className="text-xs text-slate-500 mt-1">
                  Selected: {[city, country].filter(Boolean).join(", ")}
                </p>
              )}
            </Field>

            {/* Manual fallback — the map suggestions don't always appear, and
                without a country the Continue button used to stay disabled. */}
            <Field label="Country" hint="Pick your country if the suggestions above didn't work.">
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full h-11 px-3 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-[#b8923a] focus:ring-2 focus:ring-[#b8923a]/20"
              >
                <option value="">Select your country</option>
                {countryOptions.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
                {country && !countryOptions.includes(country) && (
                  <option value={country}>{country}</option>
                )}
              </select>
            </Field>
            <Field label="City" hint="Optional.">
              <TextInput value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Beirut" />
            </Field>

            <Field label="Short bio" hint="Optional — a 1–2 sentence intro about you and the content you create.">
              <TextArea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="I create food & travel content for Gen-Z audiences..." />
              {bioError && <p className="text-xs text-red-600 mt-1">{bioError}</p>}
            </Field>

            {!profileReady && (
              <p className="text-xs text-amber-600 mb-3">
                {!isValidFullName(fullName)
                  ? "Enter your first and last name to continue."
                  : !country.trim()
                    ? "Select your country to continue."
                    : igLinkToken && !email.trim()
                      ? "Enter your email to continue."
                      : "Please fix the highlighted fields to continue."}
              </p>
            )}

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
          <BackBar onBack={() => setStep("profile")} step={3} total={4} />
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
            <PrimaryButton onClick={() => setStep("niche")}>
              {avatarFile ? "Continue" : "Skip for now"} <ChevronRight className="inline w-4 h-4 ml-1" />
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
          <BackBar onBack={() => setStep("photo")} step={4} total={4} />
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
          <Heading
            title="Your application is under review"
            sub="Thanks for signing up! Our team reviews every creator profile before granting access. You'll get an email at the address you provided as soon as your account is approved — then you can sign in and start applying to offers."
          />
          <PrimaryButton onClick={() => navigate("/login")}>Back to sign in</PrimaryButton>
        </Card>
      </div>
    </Page>
  );
};

export default InfluencerSignup;
