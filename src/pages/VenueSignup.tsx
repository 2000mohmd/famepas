import { useEffect, useMemo, useRef, useState } from "react";
import BrandLogo from "@/components/BrandLogo";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useGoogleMaps } from "@/contexts/GoogleMapsContext";
import { useToast } from "@/hooks/use-toast";
import { Store, UserCheck, ChevronRight, Check, ArrowLeft, MapPin, Pencil, Mail } from "lucide-react";
import { isValidEmail, isValidName, isValidPhoneNumber, normalizePhone, isVenueMediaComplete, normalizeHandle, VENUE_MIN_PHOTOS } from "@/lib/validation";
import LanguageSwitcher from "@/components/LanguageSwitcher";

/** Downscale an image to a JPEG data URL so signup uploads stay small. */
const compressImage = (file: File, maxSide: number): Promise<string | null> =>
  new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
      c.getContext("2d")?.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
import { useServiceCountryCodes } from "@/lib/serviceCountries";
import { fetchSignupConfig, isRegistrationOpen } from "@/lib/signupConfig";

/* ============================================================
   Joli-style light-mode business signup wizard
   Route: /signup/business
   ============================================================ */

type Step =
  | "account"
  | "check-inbox"
  | "details"
  | "hear"
  | "business-check"
  | "brand"
  | "media"
  | "location-search"
  | "location-details"
  | "done";

type PlaceSuggestion = {
  placeId: string;
  mainText: string;
  secondaryText: string;
  description: string;
};

type OpeningHours = Record<string, { open: string; close: string; closed: boolean }>;

const HEAR_OPTIONS = [
  "Instagram", "TikTok", "LinkedIn", "Google/Bing etc.",
  "Podcast", "Friend/Colleague", "FamePass Influencer",
  "FamePass Partner", "FamePass Team", "Other",
];

const DEFAULT_CATEGORIES = [
  "Activities", "Bars/Pubs/Clubs", "Cafe/Coffee", "Delivery",
  "Events", "Festivals", "Hotels", "Restaurants",
  "Gyms", "Retail", "Spa", "Street Food", "Takeaway", "Other",
];

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

const getPasswordChecks = (value: string) => ({
  length: value.length >= 8,
  letter: /[a-zA-Z]/.test(value),
  number: /\d/.test(value),
});

const isStrongPassword = (value: string) => Object.values(getPasswordChecks(value)).every(Boolean);
const isPasswordAllowed = (value: string) => value.length >= 6;
const isValidPhone = (v: string) => isValidPhoneNumber(v);

const createDefaultHours = (): OpeningHours =>
  Object.fromEntries(DAYS.map((day) => [day, { open: "10:00", close: "18:00", closed: false }])) as OpeningHours;

/* ---------- shared light-mode UI primitives ---------- */

const Page = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen bg-background text-foreground">
    <header className="px-8 py-6 flex items-center justify-between">
      <Link to="/" className="flex items-center gap-2">
        <BrandLogo tone="gold" size={24} />
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
  <div className={`w-full max-w-xl bg-card text-card-foreground rounded-2xl shadow-sm border border-border p-8 ${className}`}>
    {children}
  </div>
);

const Heading = ({ title, sub }: { title: string; sub?: React.ReactNode }) => (
  <div className="mb-6">
    <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
    {sub && <p className="text-slate-500 mt-2 text-sm">{sub}</p>}
  </div>
);

const Field = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <div className="mb-5">
    <label className="block text-sm font-semibold text-slate-800 mb-1">{label}</label>
    {hint && <p className="text-xs text-slate-500 mb-2">{hint}</p>}
    {children}
  </div>
);

const TextInput = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...props}
    className={`w-full h-12 px-4 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition ${props.className ?? ""}`}
  />
);

const PrimaryButton = ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    {...props}
    className={`w-full h-12 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground font-semibold transition ${props.className ?? ""}`}
  >
    {children}
  </button>
);

const ChoicePill = ({
  selected, onClick, children,
}: { selected: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex items-center justify-between w-full h-12 px-4 rounded-lg border text-left text-sm font-medium transition
      ${selected ? "border-primary bg-primary/10 text-primary" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"}`}
  >
    <span>{children}</span>
    <span className={`w-5 h-5 rounded-full border flex items-center justify-center
      ${selected ? "border-primary bg-primary" : "border-slate-300"}`}>
      {selected && <Check className="w-3 h-3 text-primary-foreground" strokeWidth={3} />}
    </span>
  </button>
);

const BackBar = ({ onBack, step, total }: { onBack: () => void; step: number; total: number }) => {
  const { t } = useTranslation();
  return (
  <div className="w-full max-w-xl mb-4 flex items-center justify-between">
    <button onClick={onBack} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
      <ArrowLeft className="w-4 h-4" /> {t("signup.back")}
    </button>
    <div className="flex gap-1">
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} className={`w-2 h-2 rounded-full ${i < step ? "bg-primary" : "bg-slate-200"}`} />
      ))}
    </div>
  </div>
  );
};

/* ---------- main component ---------- */

const VenueSignup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isLoaded } = useGoogleMaps();
  const { t } = useTranslation();

  const [step, setStep] = useState<Step>("account");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [registrationOpen, setRegistrationOpen] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      const config = await fetchSignupConfig();
      setRegistrationOpen(isRegistrationOpen(config, "venue_registration_open"));
      if (config.categories.length) setCategories(config.categories);
    })();
  }, []);


  // form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [hear, setHear] = useState<string[]>([]);
  const [phone, setPhone] = useState("");
  const [brandName, setBrandName] = useState("");
  const [brandCategories, setBrandCategories] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [venueCity, setVenueCity] = useState("");
  const [cities, setCities] = useState<{ city: string; area: string | null }[]>([]);

  const [addressQuery, setAddressQuery] = useState("");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [locationSearchStatus, setLocationSearchStatus] = useState("");
  const [locationSearchUnavailable, setLocationSearchUnavailable] = useState(false);
  const [locationName, setLocationName] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [locationEmail, setLocationEmail] = useState("");
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [hours, setHours] = useState<OpeningHours>(createDefaultHours);
  const [editHours, setEditHours] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [logoData, setLogoData] = useState<string | null>(null);
  const [photosData, setPhotosData] = useState<string[]>([]);
  const [instagram, setInstagram] = useState("");

  // Opened from a rep's lead link (/signup/business?lead=<id>): prefill what
  // the rep already captured. Best effort only — a bad or already-converted
  // id just yields an ordinary blank signup, never an error page.
  useEffect(() => {
    const leadId = new URLSearchParams(window.location.search).get("lead");
    if (!leadId) return;
    // Cast: generated Supabase types predate this function.
    (supabase as any).rpc("get_lead_prefill", { _lead_id: leadId }).then(({ data }: any) => {
      const lead = (data as any[])?.[0];
      if (!lead) return;
      setBrandName((v) => v || lead.venue_name || "");
      setPhone((v) => v || lead.phone || "");
      setVenueCity((v) => v || lead.city || lead.area || "");
      if (lead.category) setBrandCategories((v) => (v.length ? v : [lead.category]));
      const [first, ...rest] = (lead.contact_name || "").split(" ");
      if (first) setFirstName((v) => v || first);
      if (rest.length) setLastName((v) => v || rest.join(" "));
    });
  }, []);

  // load categories from db (fallback to defaults)
  useEffect(() => {
    supabase.from("categories").select("name").eq("is_active", true).order("name").then(({ data }) => {
      if (data && data.length) setCategories(data.map((c) => c.name));
    });
  }, []);

  // load the active city list — the same allow-list AdminVenues validates against
  useEffect(() => {
    supabase.functions.invoke("public-signup-config").then(({ data }) => {
      const locs = (data as { locations?: { city: string; area: string | null }[] } | null)?.locations;
      if (locs && locs.length) setCities(locs);
    });
  }, []);

  // google places autocomplete
  const serviceCountryCodes = useServiceCountryCodes();
  const autocompleteSession = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  useEffect(() => {
    if (isLoaded && window.google?.maps?.places && !autocompleteSession.current) {
      autocompleteSession.current = new google.maps.places.AutocompleteSessionToken();
    }
  }, [isLoaded]);

  useEffect(() => {
    if (addressQuery.trim().length < 3) { setSuggestions([]); setLocationSearchStatus(""); setLocationSearchUnavailable(false); return; }
    if (!isLoaded || !window.google?.maps?.places?.AutocompleteSuggestion) {
      setLocationSearchStatus(t("venueSignup.addressSearchLoading"));
      return;
    }
    const timer = setTimeout(() => {
      setLocationSearchStatus(t("venueSignup.searching"));
      setLocationSearchUnavailable(false);
      google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: addressQuery.trim(),
        includedRegionCodes: serviceCountryCodes,
        sessionToken: autocompleteSession.current,
      }).then(({ suggestions: results }) => {
        const mapped = (results ?? []).map((item) => {
          const prediction = item.placePrediction;
          return {
            placeId: prediction?.placeId ?? "",
            mainText: prediction?.mainText?.text ?? prediction?.text?.text ?? "Location",
            secondaryText: prediction?.secondaryText?.text ?? "",
            description: prediction?.text?.text ?? [prediction?.mainText?.text, prediction?.secondaryText?.text].filter(Boolean).join(", "),
          };
        }).filter((item: PlaceSuggestion) => item.placeId || item.description);
        setSuggestions(mapped);
        setLocationSearchStatus(mapped.length ? "" : t("venueSignup.noLocationsFound"));
      }).catch(() => { setLocationSearchStatus(t("venueSignup.locationSearchUnavailable")); setLocationSearchUnavailable(true); });
    }, 250);
    return () => clearTimeout(timer);
  }, [addressQuery, isLoaded, serviceCountryCodes]);

  // sync email to confirm screen
  useEffect(() => { if (email && !locationEmail) setLocationEmail(email); }, [email, locationEmail]);

  const stepIndex = useMemo(() => {
    const order: Step[] = ["account","details","hear","brand","media","location-search","location-details"];
    return order.indexOf(step);
  }, [step]);

  const passwordChecks = useMemo(() => getPasswordChecks(password), [password]);
  const passwordReady = useMemo(() => isStrongPassword(password), [password]);

  const toggle = (arr: string[], v: string, setter: (a: string[]) => void) => {
    setter(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);
  };

  /* ----- final submit ----- */
  const resolveCoordinates = async (): Promise<{ lat: number | null; lng: number | null }> => {
    if (!selectedPlaceId || !isLoaded || !window.google?.maps) return { lat: null, lng: null };
    try {
      const { Place } = (await google.maps.importLibrary("places")) as google.maps.PlacesLibrary;
      const place = new Place({ id: selectedPlaceId });
      await place.fetchFields({ fields: ["location"] });
      const loc = place.location;
      if (loc) return { lat: loc.lat(), lng: loc.lng() };
    } catch (err) {
      console.error("Could not resolve place coordinates", err);
    }
    return { lat: null, lng: null };
  };

  const handleFinalize = async () => {
    setSubmitting(true);
    try {
      const fullName = `${firstName} ${lastName}`.trim();
      const addressParts = locationAddress.split(",").map(p => p.trim()).filter(Boolean);
      const countryGuess = addressParts.length ? addressParts[addressParts.length - 1] : "";
      const { lat, lng } = await resolveCoordinates();
      const { data, error } = await supabase.functions.invoke("signup-user", {
        body: {
          email,
          password,
          role: "venue",
          referred_by:
            (new URLSearchParams(window.location.search).get("ref") || "").trim() || null,
          full_name: fullName,
          venue_name: brandName,
          venue_category: brandCategories[0],
          venue_categories: brandCategories,
          venue_city: venueCity,
          address_line1: locationAddress,
          contact_person_name: fullName,
          contact_phone: normalizePhone(phone) ?? phone.trim(),
          signup_completed: true,
          organization_name: brandName,
          organization_country: countryGuess || null,
          brand_name: brandName,
          location_name: locationName || null,
          location_email: locationEmail || null,
          opening_hours: hours,
          hear_about_us: hear,
          latitude: lat,
          longitude: lng,
          venue_logo_data: logoData,
          venue_photos_data: photosData,
          venue_instagram: normalizeHandle(instagram),
        },
      });
      // Parse possible error payload from edge function (supabase-js may surface non-2xx as error)
      let parsed: any = data ?? null;
      if (error) {
        try {
          const ctx: any = (error as any).context;
          if (ctx && typeof ctx.json === "function") parsed = await ctx.json();
          else if (ctx && typeof ctx.text === "function") {
            const t = await ctx.text();
            try { parsed = JSON.parse(t); } catch { parsed = { error: t }; }
          }
        } catch { /* ignore */ }
      }
      if (parsed?.code === "email_exists" || /already registered|already been registered/i.test(parsed?.error || "")) {
        toast({
          title: "Email already registered",
          description: "Please sign in with this email instead.",
        });
        navigate("/login");
        return;
      }
      if (error || parsed?.error) {
        toast({
          title: "Signup failed",
          description: parsed?.error || (error as any)?.message || "Please try again.",
          variant: "destructive",
        });
        return;
      }
      // Venues start as pending — never route into the dashboard before approval.
      await supabase.auth.signOut();
      setStep("done");
    } catch (e) {
      toast({ title: "Signup failed", description: e instanceof Error ? e.message : "Please try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };


  /* ============ render per step ============ */

  if (registrationOpen === false) {
    return (
      <Page>
        <div className="w-full max-w-md">
          <Card>
            <Heading title={t("venueSignup.registrationsClosed")} />
            <p className="text-slate-600 mb-6">
              {t("venueSignup.registrationsClosedSub")}
            </p>
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
        <div className="w-full max-w-md">
          <Card>
            <Heading title={t("venueSignup.createAccountTitle")} />

            <Field label={t("login.email")} hint={t("venueSignup.emailHint")}>
              <TextInput type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@business.com" />
            </Field>
            <Field label={t("login.password")}>
              <div className="relative">
                <TextInput type={showPwd ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder={t("venueSignup.createPassword")} className="pr-16" />
                <button type="button" onClick={() => setShowPwd(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-primary">
                  {showPwd ? t("login.hide") : t("login.show")}
                </button>
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-2 mb-4 text-xs text-slate-600">
              {[
                ["length", t("venueSignup.pwLength")],
                ["letter", t("venueSignup.pwLetter")],
                ["number", t("venueSignup.pwNumber")],
              ].map(([key, label]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center ${passwordChecks[key as keyof typeof passwordChecks] ? "bg-primary" : "bg-slate-200"}`}>
                    {passwordChecks[key as keyof typeof passwordChecks] && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                  </span>
                  {label}
                </div>
              ))}
            </div>
            {password.length >= 6 && !passwordReady && (
              <p className="text-xs text-amber-600 mb-4">{t("venueSignup.weakPasswordHint")}</p>
            )}
            <Field label={t("venueSignup.confirmPassword")}>
              <div className="relative">
                <TextInput type={showConfirmPwd ? "text" : "password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder={t("venueSignup.reenterPassword")} className="pr-16" />
                <button type="button" onClick={() => setShowConfirmPwd(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-primary">
                  {showConfirmPwd ? t("login.hide") : t("login.show")}
                </button>
              </div>
              {confirmPassword.length > 0 && !passwordsMatch && (
                <p className="text-xs text-red-500 mt-1">{t("venueSignup.passwordsDontMatch")}</p>
              )}
            </Field>
            <PrimaryButton
              disabled={!email || password.length < 6 || !passwordsMatch}
              onClick={() => setStep("check-inbox")}
            >
              {t("venueSignup.createAccountBtn")}
            </PrimaryButton>
            <p className="mt-4 text-center text-xs text-slate-500">
              {t("venueSignup.agreeToPrivacy")} <Link to="/privacy-policy" className="text-primary hover:underline">{t("venueSignup.privacyPolicy")}</Link> {t("venueSignup.andTerms")}
            </p>
          </Card>
          <p className="mt-5 text-center text-sm text-slate-500">
            {t("welcome.alreadyHaveAccount")}{" "}
            <button onClick={() => navigate("/login")} className="text-primary font-semibold hover:underline">{t("welcome.login")}</button>
          </p>
        </div>
      </Page>
    );
  }

  if (step === "check-inbox") {
    return (
      <Page>
        <div className="w-full max-w-xl">
          <BackBar onBack={() => setStep("account")} step={1} total={8} />
          <Card className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 mx-auto flex items-center justify-center mb-4">
              <Mail className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{t("venueSignup.finishSetup")}</h1>
            <p className="text-slate-500 mt-2 text-sm">
              {t("venueSignup.finishSetupSub1")} <span className="font-semibold text-slate-800">{email}</span> {t("venueSignup.finishSetupSub2")}
            </p>
            <div className="text-left bg-[#faf8f3] border border-slate-100 rounded-xl p-4 my-6 text-sm text-slate-600 space-y-2">
              <p className="font-semibold text-slate-800">{t("venueSignup.whatsNext")}</p>
              <p>{t("venueSignup.whatsNext1")}</p>
              <p>{t("venueSignup.whatsNext2")}</p>
              <p>{t("venueSignup.whatsNext3")}</p>
            </div>
            <PrimaryButton onClick={() => setStep("details")}>{t("venueSignup.continueSetup")}</PrimaryButton>
          </Card>
        </div>
      </Page>
    );
  }


  if (step === "details") {
    return (
      <Page>
        <div className="w-full max-w-xl">
          <BackBar onBack={() => setStep("check-inbox")} step={2} total={8} />
          <Card>
            <Heading title={t("venueSignup.confirmDetails")} />
            <Field label={t("signup.firstName")}>
              <TextInput value={firstName} onChange={e => setFirstName(e.target.value)} />
              {firstName.trim() && !isValidName(firstName) && <p className="text-xs text-red-600 mt-1">{t("venueSignup.min2Chars")}</p>}
            </Field>
            <Field label={t("signup.lastName")}>
              <TextInput value={lastName} onChange={e => setLastName(e.target.value)} />
              {lastName.trim() && !isValidName(lastName) && <p className="text-xs text-red-600 mt-1">{t("venueSignup.min2Chars")}</p>}
            </Field>
            <Field label={t("login.email")}>
              <div className="relative">
                <TextInput value={email} readOnly className="pr-10 bg-slate-50" />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                </div>
              </div>
            </Field>
            <Field label={t("signup.phone")}>
              <TextInput type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+961 70 000 000" />
              {phone.trim() && !isValidPhone(phone) && <p className="text-xs text-red-600 mt-1">{t("venueSignup.invalidPhone")}</p>}
            </Field>
            <PrimaryButton disabled={!isValidName(firstName) || !isValidName(lastName) || !isValidPhone(phone)} onClick={() => setStep("hear")}>{t("signup.next")}</PrimaryButton>
          </Card>
        </div>
      </Page>
    );
  }

  if (step === "hear") {
    return (
      <Page>
        <div className="w-full max-w-xl">
          <BackBar onBack={() => setStep("details")} step={3} total={8} />
          <Card>
            <Heading title={t("signup.hearAbout")} sub={t("venueSignup.pickAnyApply")} />
            <div className="grid grid-cols-2 gap-3 mb-6">
              {HEAR_OPTIONS.map(opt => (
                <ChoicePill key={opt} selected={hear.includes(opt)} onClick={() => toggle(hear, opt, setHear)}>
                  {opt}
                </ChoicePill>
              ))}
            </div>
            <PrimaryButton disabled={hear.length === 0} onClick={() => setStep("business-check")}>{t("signup.next")}</PrimaryButton>
          </Card>
        </div>
      </Page>
    );
  }

  if (step === "business-check") {
    return (
      <Page>
        <div className="w-full max-w-xl">
          <BackBar onBack={() => setStep("hear")} step={4} total={8} />
          <Card>
            <Heading title={t("signup.businessCheckTitle")} sub={t("signup.businessCheckSub")} />
            <div className="space-y-3">
              <PrimaryButton onClick={() => setStep("brand")}>{t("venueSignup.yesBusiness")}</PrimaryButton>
              <button
                type="button"
                onClick={() => navigate("/signup/influencer")}
                className="w-full h-12 rounded-lg border border-slate-200 bg-white text-slate-700 font-semibold hover:border-slate-300 transition"
              >
                {t("venueSignup.noCreator")}
              </button>
            </div>
          </Card>
        </div>
      </Page>
    );
  }

  if (step === "brand") {
    return (
      <Page>
        <div className="w-full max-w-xl">
          <BackBar onBack={() => setStep("business-check")} step={5} total={8} />
          <Card>
            <Heading title={t("signup.brandTitle")} />
            <Field label={t("signup.brandName")}>
              <TextInput value={brandName} onChange={e => setBrandName(e.target.value)} placeholder="e.g. Honest Burgers" />
              {brandName.trim() && !isValidName(brandName) && <p className="text-xs text-red-600 mt-1">{t("venueSignup.min2Chars")}</p>}
            </Field>
            <Field label={t("venueSignup.category")} hint={t("venueSignup.categoryHint")}>
              <div className="grid grid-cols-2 gap-3">
                {categories.map(c => (
                  <ChoicePill key={c} selected={brandCategories.includes(c)} onClick={() => toggle(brandCategories, c, setBrandCategories)}>
                    {c}
                  </ChoicePill>
                ))}
              </div>
            </Field>
            <Field label={t("venueSignup.city")} hint={t("venueSignup.cityHint")}>
              <select
                value={venueCity}
                onChange={e => setVenueCity(e.target.value)}
                className="w-full h-12 px-4 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="">{t("venueSignup.selectCity")}</option>
                {(() => {
                  const groups = new Map<string, string[]>();
                  cities.forEach(({ city, area }) => {
                    const key = area || "Other";
                    groups.set(key, [...(groups.get(key) ?? []), city]);
                  });
                  return Array.from(groups.entries()).map(([area, list]) => (
                    <optgroup key={area} label={area}>
                      {list.map(c => <option key={c} value={c}>{c}</option>)}
                    </optgroup>
                  ));
                })()}
              </select>
            </Field>
            <PrimaryButton disabled={!isValidName(brandName) || brandCategories.length === 0 || !venueCity} onClick={() => setStep("media")}>{t("signup.next")}</PrimaryButton>
          </Card>
        </div>
      </Page>
    );
  }

  if (step === "media") {
    const ready = isVenueMediaComplete({ hasLogo: !!logoData, photoCount: photosData.length, instagram });
    return (
      <Page>
        <div className="w-full max-w-xl">
          <BackBar onBack={() => setStep("brand")} step={6} total={8} />
          <Card>
            <Heading title={t("signup.mediaTitle")} sub={t("signup.mediaSub")} />
            <Field label={t("venueSignup.logo")}>
              <div className="flex items-center gap-3">
                {logoData && <img src={logoData} alt="Logo preview" className="w-16 h-16 rounded-lg object-cover border border-slate-200" />}
                <input type="file" accept="image/*" onChange={async e => { const f = e.target.files?.[0]; if (f) setLogoData(await compressImage(f, 600)); }} className="text-sm" />
              </div>
            </Field>
            <Field label={t("venueSignup.photosLabel", { count: photosData.length, min: VENUE_MIN_PHOTOS })}>
              <div className="grid grid-cols-3 gap-2 mb-2">
                {photosData.map((p, i) => (
                  <div key={i} className="relative">
                    <img src={p} alt={`Venue photo ${i + 1}`} className="w-full aspect-square rounded-lg object-cover border border-slate-200" />
                    <button type="button" onClick={() => setPhotosData(a => a.filter((_, j) => j !== i))} className="absolute top-1 right-1 bg-white/90 rounded-full w-6 h-6 text-xs text-slate-700">✕</button>
                  </div>
                ))}
              </div>
              {photosData.length < 6 && (
                <input type="file" accept="image/*" multiple onChange={async e => {
                  const files = Array.from(e.target.files ?? []).slice(0, 6 - photosData.length);
                  const out = await Promise.all(files.map(f => compressImage(f, 1600)));
                  setPhotosData(a => [...a, ...out.filter(Boolean) as string[]]);
                  e.target.value = "";
                }} className="text-sm" />
              )}
            </Field>
            <Field label={t("venueSignup.instagramHandle")}>
              <TextInput value={instagram} onChange={e => setInstagram(e.target.value)} placeholder="@yourvenue" />
              {instagram.trim() && !isVenueMediaComplete({ hasLogo: true, photoCount: VENUE_MIN_PHOTOS, instagram }) && <p className="text-xs text-red-600 mt-1">{t("venueSignup.invalidInstagram")}</p>}
            </Field>
            <PrimaryButton disabled={!ready} onClick={() => setStep("location-search")}>{t("signup.next")}</PrimaryButton>
          </Card>
        </div>
      </Page>
    );
  }

  if (step === "location-search") {
    return (
      <Page>
        <div className="w-full max-w-xl">
          <BackBar onBack={() => setStep("media")} step={7} total={8} />
          <Card>
            <Heading title={t("signup.locationTitle")} sub={t("venueSignup.locationSub")} />
            <Field label={t("venueSignup.searchAddress")}>
              <TextInput
                value={addressQuery}
                onChange={e => setAddressQuery(e.target.value)}
                placeholder={t("venueSignup.startTypingAddress")}
                autoFocus
              />
            </Field>
            {suggestions.length > 0 && (
              <div className="mt-2 border border-slate-100 rounded-lg overflow-hidden">
                {suggestions.map(s => (
                  <button
                    key={s.placeId || s.description}
                    onClick={() => {
                      setLocationAddress(s.description);
                      setLocationName(s.mainText);
                      setSelectedPlaceId(s.placeId || null);
                      setAddressQuery(s.description);
                      setSuggestions([]);
                      setStep("location-details");
                    }}
                    className="w-full px-4 py-3 text-left text-sm text-slate-700 hover:bg-primary/10 flex items-center gap-2 border-b border-slate-100 last:border-0"
                  >
                    <MapPin className="w-4 h-4 text-primary shrink-0" />
                    <span><span className="block font-medium text-slate-800">{s.mainText}</span>{s.secondaryText && <span className="block text-xs text-slate-500">{s.secondaryText}</span>}</span>
                  </button>
                ))}
              </div>
            )}
            {locationSearchStatus && <p className="text-xs text-slate-400 mt-2">{locationSearchStatus}</p>}
            {!isLoaded && (
              <p className="text-xs text-slate-400 mt-2">{t("venueSignup.loadingAddressSearch")}</p>
            )}
            {(!isLoaded || locationSearchUnavailable) && <button
              onClick={() => { setLocationAddress(addressQuery); setSelectedPlaceId(null); setStep("location-details"); }}
              className="mt-4 text-sm text-primary font-medium"
            >
              {t("venueSignup.mapSearchNotWorking")}
            </button>}
            <p className="text-xs text-slate-500 mt-3">{t("venueSignup.pickVenueFromMap")}</p>
          </Card>
        </div>
      </Page>
    );
  }

  if (step === "location-details") {
    return (
      <Page>
        <div className="w-full max-w-xl">
          <BackBar onBack={() => setStep("location-search")} step={8} total={8} />
          <Card>
            <Heading title={t("signup.locationTitle")} />
            <Field label={t("venueSignup.locationName")}>
              <TextInput value={locationName} onChange={e => setLocationName(e.target.value)} placeholder="e.g. Downtown Branch" />
            </Field>
            <Field label={t("venueSignup.address")}>
              <textarea
                value={locationAddress}
                onChange={e => setLocationAddress(e.target.value)}
                rows={2}
                className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </Field>
            <Field label={t("login.email")} hint={t("venueSignup.locationEmailHint")}>
              <TextInput type="email" value={locationEmail} onChange={e => setLocationEmail(e.target.value)} />
              {locationEmail.trim() && !isValidEmail(locationEmail) && (
                <p className="text-xs text-red-600 mt-1">{t("venueSignup.invalidEmail")}</p>
              )}
            </Field>

            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold text-slate-800">{t("venueSignup.openingHours")}</div>
                <button onClick={() => setEditHours(v => !v)} className="text-sm text-primary font-medium inline-flex items-center gap-1">
                  <Pencil className="w-3.5 h-3.5" /> {editHours ? t("venueSignup.done") : t("venueSignup.edit")}
                </button>
              </div>
              <div className="space-y-2">
                {DAYS.map(d => (
                  <div key={d} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-slate-700 w-24 shrink-0">{d}</span>
                    {editHours ? (
                      <div className="flex items-center gap-2 flex-wrap justify-end">
                        <label className="flex items-center gap-1.5 text-xs text-slate-600 select-none">
                          <input
                            type="checkbox"
                            checked={hours[d].closed}
                            onChange={e => setHours(h => ({ ...h, [d]: { ...h[d], closed: e.target.checked } }))}
                            className="w-4 h-4 accent-primary"
                          />
                          {t("venueSignup.closed")}
                        </label>
                        {!hours[d].closed && (
                          <>
                            <input type="time" value={hours[d].open} onChange={e => setHours(h => ({ ...h, [d]: { ...h[d], open: e.target.value } }))} className="h-9 px-2 rounded border border-slate-200" />
                            <span className="text-slate-400">-</span>
                            <input type="time" value={hours[d].close} onChange={e => setHours(h => ({ ...h, [d]: { ...h[d], close: e.target.value } }))} className="h-9 px-2 rounded border border-slate-200" />
                          </>
                        )}
                      </div>
                    ) : (
                      <span className={hours[d].closed ? "text-slate-400" : "text-slate-600"}>
                        {hours[d].closed ? t("venueSignup.closed") : `${hours[d].open} - ${hours[d].close}`}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <PrimaryButton
              disabled={!isValidName(locationName) || !locationAddress.trim() || !isValidEmail(locationEmail) || submitting}
              onClick={handleFinalize}
            >
              {submitting ? t("venueSignup.creatingAccount") : t("common.save")}
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
          <div className="w-16 h-16 rounded-full bg-primary/10 mx-auto flex items-center justify-center mb-4">
            <Check className="w-8 h-8 text-primary" strokeWidth={3} />
          </div>
          <Heading title={t("venueSignup.applicationReceived")} sub={t("venueSignup.applicationReceivedSub")} />
          <PrimaryButton onClick={() => navigate("/login")}>{t("venueSignup.goToSignIn")}</PrimaryButton>
        </Card>
      </div>
    </Page>
  );
};

export default VenueSignup;
