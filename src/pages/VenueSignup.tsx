import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useGoogleMaps } from "@/contexts/GoogleMapsContext";
import { useToast } from "@/hooks/use-toast";
import { Store, UserCheck, ChevronRight, Check, ArrowLeft, MapPin, Pencil, Mail } from "lucide-react";
import { isValidEmail, isValidName } from "@/lib/validation";
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
  | "brand"
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

const createDefaultHours = (): OpeningHours =>
  Object.fromEntries(DAYS.map((day) => [day, { open: "10:00", close: "18:00", closed: false }])) as OpeningHours;

/* ---------- shared light-mode UI primitives ---------- */

const Page = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen bg-[#f7f5f0] text-slate-900">
    <header className="px-8 py-6 flex items-center justify-between">
      <Link to="/" className="flex items-center gap-2">
        <span className="font-display text-2xl font-bold text-slate-900">
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
  <div className={`w-full max-w-xl bg-white rounded-2xl shadow-sm border border-slate-100 p-8 ${className}`}>
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
    className={`w-full h-12 px-4 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#b8923a] focus:ring-2 focus:ring-[#b8923a]/20 transition ${props.className ?? ""}`}
  />
);

const PrimaryButton = ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    {...props}
    className={`w-full h-12 rounded-lg bg-[#b8923a] hover:bg-[#9a7a30] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition ${props.className ?? ""}`}
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
      ${selected ? "border-[#b8923a] bg-[#fbf6e8] text-[#b8923a]" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"}`}
  >
    <span>{children}</span>
    <span className={`w-5 h-5 rounded-full border flex items-center justify-center
      ${selected ? "border-[#b8923a] bg-[#b8923a]" : "border-slate-300"}`}>
      {selected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
    </span>
  </button>
);

const BackBar = ({ onBack, step, total }: { onBack: () => void; step: number; total: number }) => (
  <div className="w-full max-w-xl mb-4 flex items-center justify-between">
    <button onClick={onBack} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
      <ArrowLeft className="w-4 h-4" /> Back
    </button>
    <div className="flex gap-1">
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} className={`w-2 h-2 rounded-full ${i < step ? "bg-[#b8923a]" : "bg-slate-200"}`} />
      ))}
    </div>
  </div>
);

/* ---------- main component ---------- */

const VenueSignup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isLoaded } = useGoogleMaps();

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
  const [brandName, setBrandName] = useState("");
  const [brandCategories, setBrandCategories] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);

  const [addressQuery, setAddressQuery] = useState("");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [locationSearchStatus, setLocationSearchStatus] = useState("");
  const [locationName, setLocationName] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [locationEmail, setLocationEmail] = useState("");
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [hours, setHours] = useState<OpeningHours>(createDefaultHours);
  const [editHours, setEditHours] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  // load categories from db (fallback to defaults)
  useEffect(() => {
    supabase.from("categories").select("name").eq("is_active", true).order("name").then(({ data }) => {
      if (data && data.length) setCategories(data.map((c) => c.name));
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
    if (addressQuery.trim().length < 3) { setSuggestions([]); setLocationSearchStatus(""); return; }
    if (!isLoaded || !window.google?.maps?.places?.AutocompleteSuggestion) {
      setLocationSearchStatus("Address search is still loading…");
      return;
    }
    const t = setTimeout(() => {
      setLocationSearchStatus("Searching…");
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
        setLocationSearchStatus(mapped.length ? "" : "No matching locations found");
      }).catch(() => setLocationSearchStatus("Location search is unavailable. You can enter the address manually."));
    }, 250);
    return () => clearTimeout(t);
  }, [addressQuery, isLoaded, serviceCountryCodes]);

  // sync email to confirm screen
  useEffect(() => { if (email && !locationEmail) setLocationEmail(email); }, [email, locationEmail]);

  const stepIndex = useMemo(() => {
    const order: Step[] = ["account","details","hear","brand","location-search","location-details"];
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
      const cityGuess = addressParts.length > 1 ? addressParts[addressParts.length - 2] : "";
      const countryGuess = addressParts.length ? addressParts[addressParts.length - 1] : "";
      const { lat, lng } = await resolveCoordinates();
      const { data, error } = await supabase.functions.invoke("signup-user", {
        body: {
          email,
          password,
          role: "venue",
          full_name: fullName,
          venue_name: brandName,
          venue_category: brandCategories[0] ?? "dining",
          venue_categories: brandCategories,
          venue_city: cityGuess,
          address_line1: locationAddress,
          contact_person_name: fullName,
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


  const handleSocial = async () => {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}/venue` });
    if (result.error) {
      toast({ title: "Google sign-in failed", description: String(result.error), variant: "destructive" });
    }
  };

  /* ============ render per step ============ */

  if (registrationOpen === false) {
    return (
      <Page>
        <div className="w-full max-w-md">
          <Card>
            <Heading title="Registrations are closed" />
            <p className="text-slate-600 mb-6">
              Venue signups are temporarily disabled. Please check back soon.
            </p>
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
        <div className="w-full max-w-md">
          <Card>
            <Heading title="Create your FamePass business account" />
            <div className="space-y-2.5 mb-5">
              <button
                type="button"
                onClick={handleSocial}
                className="w-full h-12 rounded-lg border border-slate-200 hover:border-slate-300 bg-white text-slate-800 font-medium flex items-center justify-center gap-2 transition"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                Sign up with Google
              </button>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-400 mb-5">
              <div className="h-px flex-1 bg-slate-200" />OR<div className="h-px flex-1 bg-slate-200" />
            </div>

            <Field label="Email" hint="This will be your login email, and where we'll send approval and account updates.">
              <TextInput type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@business.com" />
            </Field>
            <Field label="Password">
              <div className="relative">
                <TextInput type={showPwd ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Create a password" className="pr-16" />
                <button type="button" onClick={() => setShowPwd(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-[#b8923a]">
                  {showPwd ? "Hide" : "Show"}
                </button>
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-2 mb-4 text-xs text-slate-600">
              {[
                ["length", "8+ characters"],
                ["letter", "A letter"],
                ["number", "A number"],
              ].map(([key, label]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center ${passwordChecks[key as keyof typeof passwordChecks] ? "bg-[#b8923a]" : "bg-slate-200"}`}>
                    {passwordChecks[key as keyof typeof passwordChecks] && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                  </span>
                  {label}
                </div>
              ))}
            </div>
            {password.length >= 6 && !passwordReady && (
              <p className="text-xs text-amber-600 mb-4">For better security, we recommend a stronger password — but you can continue.</p>
            )}
            <Field label="Confirm password">
              <div className="relative">
                <TextInput type={showConfirmPwd ? "text" : "password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter password" className="pr-16" />
                <button type="button" onClick={() => setShowConfirmPwd(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-[#b8923a]">
                  {showConfirmPwd ? "Hide" : "Show"}
                </button>
              </div>
              {confirmPassword.length > 0 && !passwordsMatch && (
                <p className="text-xs text-red-500 mt-1">Passwords do not match.</p>
              )}
            </Field>
            <PrimaryButton
              disabled={!email || password.length < 6 || !passwordsMatch}
              onClick={() => setStep("check-inbox")}
            >
              Create Account
            </PrimaryButton>
            <p className="mt-4 text-center text-xs text-slate-500">
              By continuing you agree to FamePass's <Link to="/privacy-policy" className="text-[#b8923a] hover:underline">Privacy Policy</Link> and Terms of Service.
            </p>
          </Card>
          <p className="mt-5 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <button onClick={() => navigate("/login")} className="text-[#b8923a] font-semibold hover:underline">Log in</button>
          </p>
        </div>
      </Page>
    );
  }

  if (step === "check-inbox") {
    return (
      <Page>
        <div className="w-full max-w-xl">
          <BackBar onBack={() => setStep("account")} step={1} total={6} />
          <Card className="text-center">
            <div className="w-16 h-16 rounded-full bg-[#fbf6e8] mx-auto flex items-center justify-center mb-4">
              <Mail className="w-7 h-7 text-[#b8923a]" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Let's finish your setup</h1>
            <p className="text-slate-500 mt-2 text-sm">
              We'll email <span className="font-semibold text-slate-800">{email}</span> as soon as you complete
              the next few steps — your account isn't created until then.
            </p>
            <div className="text-left bg-[#faf8f3] border border-slate-100 rounded-xl p-4 my-6 text-sm text-slate-600 space-y-2">
              <p className="font-semibold text-slate-800">What's next</p>
              <p>1. Tell us about you and your brand</p>
              <p>2. Add your first location</p>
              <p>3. We send your confirmation email and open your dashboard</p>
            </div>
            <PrimaryButton onClick={() => setStep("details")}>Continue setup</PrimaryButton>
          </Card>
        </div>
      </Page>
    );
  }


  if (step === "details") {
    return (
      <Page>
        <div className="w-full max-w-xl">
          <BackBar onBack={() => setStep("check-inbox")} step={2} total={6} />
          <Card>
            <Heading title="Confirm your details" />
            <Field label="First Name">
              <TextInput value={firstName} onChange={e => setFirstName(e.target.value)} />
              {firstName.trim() && !isValidName(firstName) && <p className="text-xs text-red-600 mt-1">Please enter at least 2 characters.</p>}
            </Field>
            <Field label="Last Name">
              <TextInput value={lastName} onChange={e => setLastName(e.target.value)} />
              {lastName.trim() && !isValidName(lastName) && <p className="text-xs text-red-600 mt-1">Please enter at least 2 characters.</p>}
            </Field>
            <Field label="Email">
              <div className="relative">
                <TextInput value={email} readOnly className="pr-10 bg-slate-50" />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#b8923a] flex items-center justify-center">
                  <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                </div>
              </div>
            </Field>
            <PrimaryButton disabled={!isValidName(firstName) || !isValidName(lastName)} onClick={() => setStep("hear")}>Next</PrimaryButton>
          </Card>
        </div>
      </Page>
    );
  }

  if (step === "hear") {
    return (
      <Page>
        <div className="w-full max-w-xl">
          <BackBar onBack={() => setStep("details")} step={3} total={6} />
          <Card>
            <Heading title="How did you hear about us?" sub="Please pick any that apply:" />
            <div className="grid grid-cols-2 gap-3 mb-6">
              {HEAR_OPTIONS.map(opt => (
                <ChoicePill key={opt} selected={hear.includes(opt)} onClick={() => toggle(hear, opt, setHear)}>
                  {opt}
                </ChoicePill>
              ))}
            </div>
            <PrimaryButton disabled={hear.length === 0} onClick={() => setStep("brand")}>Next</PrimaryButton>
          </Card>
        </div>
      </Page>
    );
  }

  if (step === "brand") {
    return (
      <Page>
        <div className="w-full max-w-xl">
          <BackBar onBack={() => setStep("hear")} step={4} total={6} />
          <Card>
            <Heading title="Describe your business" />
            <Field label="Name">
              <TextInput value={brandName} onChange={e => setBrandName(e.target.value)} placeholder="e.g. Honest Burgers" />
              {brandName.trim() && !isValidName(brandName) && <p className="text-xs text-red-600 mt-1">Please enter at least 2 characters.</p>}
            </Field>
            <Field label="Category" hint="Pick all that apply — this helps us find the right influencers">
              <div className="grid grid-cols-2 gap-3">
                {categories.map(c => (
                  <ChoicePill key={c} selected={brandCategories.includes(c)} onClick={() => toggle(brandCategories, c, setBrandCategories)}>
                    {c}
                  </ChoicePill>
                ))}
              </div>
            </Field>
            <PrimaryButton disabled={!isValidName(brandName) || brandCategories.length === 0} onClick={() => setStep("location-search")}>Next</PrimaryButton>
          </Card>
        </div>
      </Page>
    );
  }

  if (step === "location-search") {
    return (
      <Page>
        <div className="w-full max-w-xl">
          <BackBar onBack={() => setStep("brand")} step={5} total={6} />
          <Card>
            <Heading title="Add your first location" sub="A location can be any physical place for influencer visits, such as hotels, restaurants, cafes, entertainment venues, and more" />
            <Field label="Search for address">
              <TextInput
                value={addressQuery}
                onChange={e => setAddressQuery(e.target.value)}
                placeholder="Start typing an address..."
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
                    className="w-full px-4 py-3 text-left text-sm text-slate-700 hover:bg-[#fbf6e8] flex items-center gap-2 border-b border-slate-100 last:border-0"
                  >
                    <MapPin className="w-4 h-4 text-[#b8923a] shrink-0" />
                    <span><span className="block font-medium text-slate-800">{s.mainText}</span>{s.secondaryText && <span className="block text-xs text-slate-500">{s.secondaryText}</span>}</span>
                  </button>
                ))}
              </div>
            )}
            {locationSearchStatus && <p className="text-xs text-slate-400 mt-2">{locationSearchStatus}</p>}
            {!isLoaded && (
              <p className="text-xs text-slate-400 mt-2">Loading address search…</p>
            )}
            <button
              onClick={() => { setLocationAddress(addressQuery); setSelectedPlaceId(null); setStep("location-details"); }}
              className="mt-4 text-sm text-[#b8923a] font-medium"
            >
              Skip — enter manually
            </button>
          </Card>
        </div>
      </Page>
    );
  }

  if (step === "location-details") {
    return (
      <Page>
        <div className="w-full max-w-xl">
          <BackBar onBack={() => setStep("location-search")} step={6} total={6} />
          <Card>
            <Heading title="Add your first location" />
            <Field label="Name">
              <TextInput value={locationName} onChange={e => setLocationName(e.target.value)} placeholder="e.g. Downtown Branch" />
            </Field>
            <Field label="Address">
              <textarea
                value={locationAddress}
                onChange={e => setLocationAddress(e.target.value)}
                rows={2}
                className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-[#b8923a] focus:ring-2 focus:ring-[#b8923a]/20"
              />
            </Field>
            <Field label="Email" hint="This email will receive notifications when a booking is confirmed at this location.">
              <TextInput type="email" value={locationEmail} onChange={e => setLocationEmail(e.target.value)} />
              {locationEmail.trim() && !isValidEmail(locationEmail) && (
                <p className="text-xs text-red-600 mt-1">Please enter a valid email address.</p>
              )}
            </Field>

            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold text-slate-800">Opening Hours</div>
                <button onClick={() => setEditHours(v => !v)} className="text-sm text-[#b8923a] font-medium inline-flex items-center gap-1">
                  <Pencil className="w-3.5 h-3.5" /> {editHours ? "Done" : "Edit"}
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
                            className="w-4 h-4 accent-[#b8923a]"
                          />
                          Closed
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
                        {hours[d].closed ? "Closed" : `${hours[d].open} - ${hours[d].close}`}
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
              {submitting ? "Creating account..." : "Save"}
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
          <div className="w-16 h-16 rounded-full bg-[#fbf6e8] mx-auto flex items-center justify-center mb-4">
            <Check className="w-8 h-8 text-[#b8923a]" strokeWidth={3} />
          </div>
          <Heading title="Application received" sub="Thanks! An admin will review your venue and email you as soon as it's approved. You can sign in once your account is active." />
          <PrimaryButton onClick={() => navigate("/login")}>Go to Sign In</PrimaryButton>
        </Card>
      </div>
    </Page>
  );
};

export default VenueSignup;
