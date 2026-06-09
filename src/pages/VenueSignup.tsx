import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useGoogleMaps } from "@/contexts/GoogleMapsContext";
import { useToast } from "@/hooks/use-toast";
import famepassLogo from "@/assets/famepass-logo.png";
import { Store, UserCheck, ChevronRight, Check, ArrowLeft, MapPin, Pencil } from "lucide-react";

/* ============================================================
   Joli-style light-mode business signup wizard
   Route: /signup/business
   ============================================================ */

type Step =
  | "welcome"
  | "account"
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

const HEAR_OPTIONS = [
  "Instagram", "TikTok", "LinkedIn", "Google/Bing etc.",
  "Podcast", "Friend/Colleague", "FamePass Influencer",
  "FamePass Partner", "FamePass Team", "Other",
];

const DEFAULT_CATEGORIES = [
  "Activities", "Bars/Pubs/Clubs", "Cafe/Coffee", "Delivery",
  "Events", "Festivals", "Hotels", "Restaurants",
  "Retail", "Street Food", "Takeaway", "Other",
];

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

const getPasswordChecks = (value: string) => ({
  length: value.length >= 8,
  uppercase: /[A-Z]/.test(value),
  lowercase: /[a-z]/.test(value),
  number: /\d/.test(value),
});

const isStrongPassword = (value: string) => Object.values(getPasswordChecks(value)).every(Boolean);

/* ---------- shared light-mode UI primitives ---------- */

const Page = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen bg-[#fff5f3] text-slate-900">
    <header className="px-8 py-6 flex items-center justify-between">
      <Link to="/" className="flex items-center gap-2">
        <img src={famepassLogo} alt="FamePass" className="w-9 h-9 rounded-lg" />
        <span className="font-display text-2xl font-bold text-slate-900">
          Fame<span className="text-[#ec4178]">Pass</span>
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
    className={`w-full h-12 px-4 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#ec4178] focus:ring-2 focus:ring-[#ec4178]/20 transition ${props.className ?? ""}`}
  />
);

const PrimaryButton = ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    {...props}
    className={`w-full h-12 rounded-lg bg-[#ec4178] hover:bg-[#d83669] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition ${props.className ?? ""}`}
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
      ${selected ? "border-[#ec4178] bg-[#fff0f5] text-[#ec4178]" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"}`}
  >
    <span>{children}</span>
    <span className={`w-5 h-5 rounded-full border flex items-center justify-center
      ${selected ? "border-[#ec4178] bg-[#ec4178]" : "border-slate-300"}`}>
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
        <span key={i} className={`w-2 h-2 rounded-full ${i < step ? "bg-[#ec4178]" : "bg-slate-200"}`} />
      ))}
    </div>
  </div>
);

/* ---------- main component ---------- */

const VenueSignup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isLoaded } = useGoogleMaps();

  const [step, setStep] = useState<Step>("welcome");

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
  const [hours, setHours] = useState<Record<string, { open: string; close: string; closed: boolean }>>(
    Object.fromEntries(DAYS.map(d => [d, { open: "10:00", close: "18:00", closed: false }])) as any
  );
  const [editHours, setEditHours] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  // load categories from db (fallback to defaults)
  useEffect(() => {
    supabase.from("categories").select("name").eq("is_active", true).order("name").then(({ data }) => {
      if (data && data.length) setCategories(data.map((c: any) => c.name));
    });
  }, []);

  // google places autocomplete
  const autocompleteSession = useRef<any>(null);
  useEffect(() => {
    if (isLoaded && (window as any).google?.maps?.places && !autocompleteSession.current) {
      autocompleteSession.current = new google.maps.places.AutocompleteSessionToken();
    }
  }, [isLoaded]);

  useEffect(() => {
    if (addressQuery.trim().length < 3) { setSuggestions([]); setLocationSearchStatus(""); return; }
    if (!isLoaded || !(window as any).google?.maps?.places?.AutocompleteSuggestion) {
      setLocationSearchStatus("Address search is still loading…");
      return;
    }
    const t = setTimeout(() => {
      setLocationSearchStatus("Searching…");
      (google.maps.places as any).AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: addressQuery.trim(),
        sessionToken: autocompleteSession.current,
      }).then(({ suggestions: results }: any) => {
        const mapped = (results ?? []).map((item: any) => {
          const prediction = item.placePrediction;
          return {
            placeId: prediction?.placeId ?? prediction?.place_id ?? "",
            mainText: prediction?.mainText?.text ?? prediction?.structuredFormat?.mainText?.text ?? prediction?.text?.text ?? "Location",
            secondaryText: prediction?.secondaryText?.text ?? prediction?.structuredFormat?.secondaryText?.text ?? "",
            description: prediction?.text?.text ?? [prediction?.mainText?.text, prediction?.secondaryText?.text].filter(Boolean).join(", "),
          };
        }).filter((item: PlaceSuggestion) => item.placeId || item.description);
        setSuggestions(mapped);
        setLocationSearchStatus(mapped.length ? "" : "No matching locations found");
      }).catch(() => setLocationSearchStatus("Location search is unavailable. You can enter the address manually."));
    }, 250);
    return () => clearTimeout(t);
  }, [addressQuery, isLoaded]);

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
  const handleFinalize = async () => {
    setSubmitting(true);
    try {
      const fullName = `${firstName} ${lastName}`.trim();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: "venue",
            full_name: fullName,
            venue_name: brandName,
            venue_category: brandCategories[0] ?? "",
            venue_city: locationAddress.split(",").slice(-2, -1)[0]?.trim() ?? "",
            signup_source: hear,
            location: {
              name: locationName,
              address: locationAddress,
              email: locationEmail,
              hours,
            },
          },
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });
      if (error) throw error;
      await supabase.auth.signOut();
      setStep("done");
    } catch (e: any) {
      toast({ title: "Signup failed", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  /* ============ render per step ============ */

  if (step === "welcome") {
    return (
      <Page>
        <div className="w-full max-w-xl">
          <div className="text-center mb-8">
            <img src={famepassLogo} className="w-14 h-14 mx-auto mb-4 rounded-xl" alt="" />
          </div>
          <Card>
            <Heading title="Welcome to FamePass 👋" sub="To get started, let us know what best describes you" />
            <button
              onClick={() => setStep("account")}
              className="w-full mb-3 p-4 rounded-xl border border-slate-200 hover:border-[#ec4178] transition flex items-center gap-4 text-left bg-white"
            >
              <div className="w-12 h-12 rounded-full bg-[#fff0f5] flex items-center justify-center">
                <Store className="w-6 h-6 text-[#ec4178]" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-slate-900">I'm a Business</div>
                <div className="text-sm text-slate-500">Login or create a free account</div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </button>
            <button
              onClick={() => navigate("/login")}
              className="w-full p-4 rounded-xl border border-slate-200 hover:border-[#ec4178] transition flex items-center gap-4 text-left bg-white"
            >
              <div className="w-12 h-12 rounded-full bg-[#fff0f5] flex items-center justify-center">
                <UserCheck className="w-6 h-6 text-[#ec4178]" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-slate-900">I'm a Content Creator</div>
                <div className="text-sm text-slate-500">Sign in to your creator account</div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </button>
          </Card>
        </div>
      </Page>
    );
  }

  if (step === "account") {
    return (
      <Page>
        <div className="w-full max-w-xl">
          <BackBar onBack={() => setStep("welcome")} step={1} total={6} />
          <Card>
            <Heading title="Create your account" sub="We'll use this to sign you in" />
            <Field label="Email">
              <TextInput type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@business.com" />
            </Field>
            <Field label="Password" hint="Use a stronger password now so you do not have to come back later">
              <TextInput type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
            </Field>
            <div className="grid grid-cols-2 gap-2 mb-5 text-xs text-slate-600">
              {[
                ["length", "8+ characters"],
                ["uppercase", "Uppercase letter"],
                ["lowercase", "Lowercase letter"],
                ["number", "Number"],
              ].map(([key, label]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center ${passwordChecks[key as keyof typeof passwordChecks] ? "bg-[#ec4178]" : "bg-slate-200"}`}>
                    {passwordChecks[key as keyof typeof passwordChecks] && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                  </span>
                  {label}
                </div>
              ))}
            </div>
            <PrimaryButton disabled={!email || !passwordReady} onClick={() => setStep("details")}>Next</PrimaryButton>
          </Card>
        </div>
      </Page>
    );
  }

  if (step === "details") {
    return (
      <Page>
        <div className="w-full max-w-xl">
          <BackBar onBack={() => setStep("account")} step={2} total={6} />
          <Card>
            <Heading title="Confirm your details" />
            <Field label="First Name">
              <TextInput value={firstName} onChange={e => setFirstName(e.target.value)} />
            </Field>
            <Field label="Last Name">
              <TextInput value={lastName} onChange={e => setLastName(e.target.value)} />
            </Field>
            <Field label="Email">
              <div className="relative">
                <TextInput value={email} readOnly className="pr-10 bg-slate-50" />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#ec4178] flex items-center justify-center">
                  <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                </div>
              </div>
            </Field>
            <PrimaryButton disabled={!firstName || !lastName} onClick={() => setStep("hear")}>Next</PrimaryButton>
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
            <Heading title="Describe your business" sub={<>Looking to join an existing team? <a className="text-[#ec4178] font-medium">Chat to us</a></>} />
            <Field label="Name">
              <TextInput value={brandName} onChange={e => setBrandName(e.target.value)} placeholder="e.g. Honest Burgers" />
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
            <PrimaryButton disabled={!brandName || brandCategories.length === 0} onClick={() => setStep("location-search")}>Next</PrimaryButton>
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
                      setAddressQuery(s.description);
                      setSuggestions([]);
                      setStep("location-details");
                    }}
                    className="w-full px-4 py-3 text-left text-sm text-slate-700 hover:bg-[#fff0f5] flex items-center gap-2 border-b border-slate-100 last:border-0"
                  >
                    <MapPin className="w-4 h-4 text-[#ec4178] shrink-0" />
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
              onClick={() => { setLocationAddress(addressQuery); setStep("location-details"); }}
              className="mt-4 text-sm text-[#ec4178] font-medium"
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
                className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-[#ec4178] focus:ring-2 focus:ring-[#ec4178]/20"
              />
            </Field>
            <Field label="Email" hint="Add the location's email to let them know about confirmed bookings">
              <TextInput type="email" value={locationEmail} onChange={e => setLocationEmail(e.target.value)} />
            </Field>

            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold text-slate-800">Opening Hours</div>
                <button onClick={() => setEditHours(v => !v)} className="text-sm text-[#ec4178] font-medium inline-flex items-center gap-1">
                  <Pencil className="w-3.5 h-3.5" /> {editHours ? "Done" : "Edit"}
                </button>
              </div>
              <div className="space-y-2">
                {DAYS.map(d => (
                  <div key={d} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700 w-28">{d}</span>
                    {editHours ? (
                      <div className="flex items-center gap-2">
                        <input type="time" value={hours[d].open} onChange={e => setHours(h => ({ ...h, [d]: { ...h[d], open: e.target.value } }))} className="h-9 px-2 rounded border border-slate-200" />
                        <span className="text-slate-400">-</span>
                        <input type="time" value={hours[d].close} onChange={e => setHours(h => ({ ...h, [d]: { ...h[d], close: e.target.value } }))} className="h-9 px-2 rounded border border-slate-200" />
                      </div>
                    ) : (
                      <span className="text-slate-600">{hours[d].open} - {hours[d].close}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <PrimaryButton
              disabled={!locationName || !locationAddress || !locationEmail || submitting}
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
          <div className="w-16 h-16 rounded-full bg-[#fff0f5] mx-auto flex items-center justify-center mb-4">
            <Check className="w-8 h-8 text-[#ec4178]" strokeWidth={3} />
          </div>
          <Heading title="Check your email" sub="We sent a verification link. After verifying, an admin will review and approve your account." />
          <PrimaryButton onClick={() => navigate("/login")}>Go to Sign In</PrimaryButton>
        </Card>
      </div>
    </Page>
  );
};

export default VenueSignup;
