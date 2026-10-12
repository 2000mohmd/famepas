import { useMemo, useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Check, ChevronRight, Sparkles, UserCheck } from "lucide-react";
import LocationAutocomplete from "@/components/venue/LocationAutocomplete";
import { isValidEmail, isValidFullName, isValidName, isValidOptionalHandle, normalizePhone } from "@/lib/validation";
import { fetchSignupConfig, isRegistrationOpen } from "@/lib/signupConfig";
import LanguageSwitcher from "@/components/LanguageSwitcher";


const normalizeHandle = (v: string) => {
  let s = v.trim();
  // Pull the username out of a pasted profile URL (instagram.com/user, tiktok.com/@user, ...).
  const urlMatch = s.match(/^https?:\/\/[^/]+\/(@?[^/?#]+)/i);
  if (urlMatch) s = urlMatch[1];
  return s.replace(/^@+/, "").trim();
};

/* ============================================================
   Joli-style light-mode creator (influencer) signup wizard
   Route: /signup/influencer
   ============================================================ */

type Step = "account" | "profile" | "photo" | "niche" | "done";

const getPasswordChecks = (v: string) => ({
  length: v.length >= 8,
  letter: /[a-zA-Z]/.test(v),
  number: /\d/.test(v),
});
const isStrongPassword = (v: string) => Object.values(getPasswordChecks(v)).every(Boolean);
const isPasswordAllowed = (v: string) => v.length >= 6;

/* ---------- light-mode primitives ---------- */
const Page = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen bg-background text-foreground">
    <header className="px-6 sm:px-8 py-5 flex items-center justify-between">
      <Link to="/" className="flex items-center gap-2">
        <span className="font-display text-xl sm:text-2xl font-bold text-foreground">
          Fame<span className="text-primary">Pass</span>
        </span>
      </Link>
      <div className="flex items-center gap-4">
        <LanguageSwitcher />
        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-foreground/60">
          <UserCheck className="w-5 h-5" />
        </div>
      </div>
    </header>
    <main className="flex justify-center px-4 pb-16">{children}</main>
  </div>
);

const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`w-full max-w-xl bg-card text-card-foreground rounded-2xl shadow-sm border border-border p-6 sm:p-8 ${className}`}>
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
    className={`w-full h-11 px-3 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 ${props.className ?? ""}`}
  />
);

const TextArea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea
    {...props}
    className={`w-full min-h-[90px] px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 ${props.className ?? ""}`}
  />
);

const PrimaryButton = ({ children, disabled, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    {...rest}
    disabled={disabled}
    className={`w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed transition`}
  >
    {children}
  </button>
);

const BackBar = ({ onBack, step, total }: { onBack: () => void; step: number; total: number }) => (
  <div className="flex items-center gap-3 mb-4">
    <button onClick={onBack} className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:text-primary">
      <ArrowLeft className="w-4 h-4" />
    </button>
    <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
      <div className="h-full bg-primary transition-all" style={{ width: `${(step / total) * 100}%` }} />
    </div>
    <span className="text-xs text-slate-500">{step}/{total}</span>
  </div>
);

const InfluencerSignup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();

  // Present only when arriving from "Continue with Instagram" on the Login
  // page via a brand-new-creator identify() response (see InstagramCallback.tsx).
  // The Instagram identity behind it is already verified server-side — this
  // page never re-collects or re-verifies it, just displays it and passes the
  // token through to signup-user at the end.
  const igLinkToken = searchParams.get("ig_link_token");
  const igUsername = searchParams.get("ig_username");
  // Refer-a-creator (Adnan, "Influencer Portal" item 58): the referrer's own
  // user id, passed as ?ref= on a link they share.
  const referredBy = searchParams.get("ref");

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
  const [svcLocations, setSvcLocations] = useState<{ city: string; area: string | null; country: string | null }[]>([]);
  useEffect(() => {
    supabase.functions.invoke("public-signup-config").then(({ data }) => {
      const locs = (data as { locations?: { city: string; area: string | null; country: string | null }[] } | null)?.locations;
      if (locs) setSvcLocations(locs);
    });
  }, []);

  // avatar
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");



  // niches — Adnan, "Creator Page fixes" #4: pull from the same `niches`
  // table Settings' niche picker uses, instead of a separate hardcoded list.
  const [selectedNiches, setSelectedNiches] = useState<string[]>([]);
  const [niches, setNiches] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    supabase.from("niches" as any).select("id, name").eq("is_active", true).order("name").then(({ data }) => {
      setNiches((data as any[]) ?? []);
    });
  }, []);

  const pwdChecks = useMemo(() => getPasswordChecks(password), [password]);
  const pwdReady = useMemo(() => isStrongPassword(password), [password]);

  // profile validation
  const nameError =
    !fullName.trim() ? "" :
    !isValidName(fullName, 3) ? t("influencerSignup.min3Chars") :
    !isValidFullName(fullName) ? t("influencerSignup.enterFirstLast") : "";
  const usernameError =
    !username.trim() ? "" :
    !isValidOptionalHandle(normalizeHandle(username), username) ? t("influencerSignup.invalidUsername") : "";
  const bioError = bio.trim().length > 0 && bio.trim().length < 10 ? t("influencerSignup.bioTooShort") : "";
  const emailError = !igLinkToken ? "" : !email.trim() ? "" : !isValidEmail(email) ? t("influencerSignup.invalidEmail") : "";
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
          phone: normalizePhone(phone),
          tiktok_followers: 0,
          followers_count: 0,
          bio: bio || null,
          city: city || null,
          country: country || null,
          niche: selectedNiches,
          social_links,
          referred_by: referredBy,
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
      toast({ title: t("influencerSignup.applicationSubmitted"), description: t("influencerSignup.accountUnderReview") });

    } catch (e) {
      const message = e instanceof Error ? e.message : t("influencerSignup.pleaseTryAgain");
      const isDuplicate = /already (been )?registered|email_exists|already exists/i.test(message);
      toast({
        title: isDuplicate ? t("influencerSignup.emailAlreadyRegistered") : t("influencerSignup.signupFailed"),
        description: isDuplicate
          ? t("influencerSignup.redirectingToSignIn")
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
              title={t("influencerSignup.registrationsClosed")}
              sub={t("influencerSignup.registrationsClosedSub")}
            />
            <PrimaryButton onClick={() => navigate("/login")}>{t("venueSignup.backToSignIn")}</PrimaryButton>
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
            <Heading title={t("signup.creatorTitle")} sub={t("influencerSignup.joinAndCollaborate")} />
            <Field label={t("login.email")}>
              <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
            </Field>
            <Field label={t("login.password")} hint={t("influencerSignup.passwordHint")}>
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-primary"
                >
                  {showPwd ? t("login.hide") : t("login.show")}
                </button>
              </div>
              <ul className="mt-2 grid grid-cols-2 gap-1 text-xs">
                {[
                  ["length", t("venueSignup.pwLength")],
                  ["letter", t("venueSignup.pwLetter")],
                  ["number", t("venueSignup.pwNumber")],
                ].map(([k, label]) => (
                  <li key={k} className={`flex items-center gap-1 ${pwdChecks[k as keyof typeof pwdChecks] ? "text-emerald-600" : "text-slate-400"}`}>
                    <Check className="w-3 h-3" /> {label}
                  </li>
                ))}
              </ul>
              {password.length >= 6 && !pwdReady && (
                <p className="mt-2 text-xs text-amber-600">{t("venueSignup.weakPasswordHint")}</p>
              )}
            </Field>
            <Field label={t("venueSignup.confirmPassword")}>
              <div className="relative">
                <TextInput
                  type={showConfirmPwd ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t("venueSignup.reenterPassword")}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPwd((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-primary"
                >
                  {showConfirmPwd ? t("login.hide") : t("login.show")}
                </button>
              </div>
              {confirmPassword.length > 0 && !passwordsMatch && (
                <p className="text-xs text-red-500 mt-1">{t("venueSignup.passwordsDontMatch")}</p>
              )}
            </Field>
            <PrimaryButton disabled={!email || password.length < 6 || !passwordsMatch} onClick={() => setStep("profile")}>
              {t("influencerSignup.continueBtn")} <ChevronRight className="inline w-4 h-4 ml-1" />
            </PrimaryButton>
            <p className="mt-4 text-center text-sm text-slate-500">
              {t("login.noAccount")}{" "}
              <button onClick={() => navigate("/login")} className="text-primary font-semibold hover:underline">{t("welcome.signIn")}</button>
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
            <Heading title={t("influencerSignup.tellUsAboutYou")} sub={t("influencerSignup.howBrandsDiscover")} />
            {igLinkToken && (
              <Field label={t("login.email")} hint={t("influencerSignup.emailNotifyHint")}>
                <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
                {emailError && <p className="text-xs text-red-600 mt-1">{emailError}</p>}
              </Field>
            )}
            <Field label={t("influencerSignup.fullName")}>
              <TextInput value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={t("influencerSignup.yourFullName")} />
              {nameError && <p className="text-xs text-red-600 mt-1">{nameError}</p>}
            </Field>
            <Field label={t("influencerSignup.phoneNumber")} hint={t("influencerSignup.phoneHint")}>
              <TextInput type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+961 70 000 000" />
              {phone.trim() && !normalizePhone(phone) && <p className="text-xs text-red-600 mt-1">{t("venueSignup.invalidPhone")}</p>}
            </Field>
            <Field label={t("influencerSignup.usernameLabel")} hint={t("influencerSignup.usernameHint")}>
              <TextInput value={username} onChange={(e) => setUsername(e.target.value)} placeholder="@yourhandle" />
              {usernameError && <p className="text-xs text-red-600 mt-1">{usernameError}</p>}
            </Field>

            <Field label={t("influencerSignup.location")} hint={t("influencerSignup.locationHint")}>
              <select
                value={city}
                onChange={(e) => {
                  const loc = svcLocations.find((l) => l.city === e.target.value);
                  setCity(e.target.value);
                  setCountry(loc?.country || "Lebanon");
                }}
                className="w-full h-11 px-3 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="">{t("influencerSignup.selectCity")}</option>
                {Array.from(
                  svcLocations.reduce((m, l) => {
                    const k = l.area || "Other";
                    m.set(k, [...(m.get(k) ?? []), l]);
                    return m;
                  }, new Map<string, typeof svcLocations>())
                ).map(([area, list]) => (
                  <optgroup key={area} label={area}>
                    {list.map((l) => <option key={l.city} value={l.city}>{l.city}</option>)}
                  </optgroup>
                ))}
              </select>
            </Field>

            <Field label={t("influencerSignup.shortBio")} hint={t("influencerSignup.bioHint")}>
              <TextArea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="I create food & travel content for Gen-Z audiences..." />
              {bioError && <p className="text-xs text-red-600 mt-1">{bioError}</p>}
            </Field>

            {!profileReady && (
              <p className="text-xs text-amber-600 mb-3">
                {!isValidFullName(fullName)
                  ? t("influencerSignup.enterNameToContinue")
                  : !country.trim()
                    ? t("influencerSignup.selectCountryToContinue")
                    : igLinkToken && !email.trim()
                      ? t("influencerSignup.enterEmailToContinue")
                      : t("influencerSignup.fixHighlightedFields")}
              </p>
            )}

            <PrimaryButton disabled={!profileReady} onClick={() => setStep("photo")}>
              {t("influencerSignup.continueBtn")} <ChevronRight className="inline w-4 h-4 ml-1" />
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
            <Heading title={t("influencerSignup.addProfilePhoto")} sub={t("influencerSignup.photoSub")} />
            <div className="flex flex-col items-center gap-4 mb-6">
              <div className="w-32 h-32 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-slate-400 text-sm">{t("influencerSignup.noPhoto")}</span>
                )}
              </div>
              <label className="inline-flex items-center gap-2 px-4 h-10 rounded-lg border border-slate-200 cursor-pointer hover:border-primary text-sm font-medium text-slate-700">
                {avatarFile ? t("influencerSignup.changePhoto") : t("influencerSignup.uploadPhoto")}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onFile(e.target.files?.[0] ?? null)}
                />
              </label>
              {avatarFile && (
                <button onClick={() => onFile(null)} className="text-xs text-slate-500 hover:text-primary">
                  {t("influencerSignup.remove")}
                </button>
              )}
            </div>
            <PrimaryButton onClick={() => setStep("niche")}>
              {avatarFile ? t("influencerSignup.continueBtn") : t("influencerSignup.skipForNow")} <ChevronRight className="inline w-4 h-4 ml-1" />
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
            <Heading title={t("influencerSignup.pickNiches")} sub={t("influencerSignup.pickNichesSub")} />
            <div className="flex flex-wrap gap-2 mb-6">
              {niches.map((n) => {
                const active = selectedNiches.includes(n.name);
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => toggleNiche(n.name)}
                    className={`px-3 h-9 rounded-full border text-sm transition ${
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-white text-slate-700 border-slate-200 hover:border-primary"
                    }`}
                  >
                    {n.name}
                  </button>
                );
              })}
            </div>
            <PrimaryButton disabled={submitting || selectedNiches.length === 0} onClick={handleFinalize}>
              {submitting ? t("influencerSignup.creatingYourAccount") : t("influencerSignup.finishAndEnter")}
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
          <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <Heading
            title={t("influencerSignup.underReview")}
            sub={t("influencerSignup.underReviewSub")}
          />
          <PrimaryButton onClick={() => navigate("/login")}>{t("venueSignup.backToSignIn")}</PrimaryButton>
        </Card>
      </div>
    </Page>
  );
};

export default InfluencerSignup;
