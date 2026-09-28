import { useEffect, useState } from "react";
import { ArrowRight, Menu, X, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import famepassLogo from "@/assets/famepass-logo.png";

/* ============================================================
   FamePass marketing homepage — recreated as real React code
   from the compiled public/site/ bundle (same content, same
   design tokens), so it can actually be edited and fixed going
   forward instead of living as an opaque pre-built asset.

   Content fixes applied vs. the original:
   - Categories are fetched live from the same `categories` table
     the admin panel uses, so this list can never drift out of
     sync with it again.
   - The "Experiences" section (originally 6 fictional cards, two
     tagged Dubai/Riyadh) now shows real top creators instead, via
     a new public-safe RPC (get_top_creators_public — deliberately
     narrower than the existing authenticated-only profile lookups,
     exposing only name/photo/handle/follower count). Renders
     nothing if fewer than 3 qualify, rather than show a half-empty
     grid — as of this build only 2 approved creators have a photo,
     so this section won't show until the approval queue moves.

   Known asset debt, not fixed here (can't be coded around):
   every image in public/site/images/ is a low-resolution
   placeholder (125–535px wide) — fine for this recreation since
   it matches what's already live, but needs real photography
   before this ships to real users. The hero photo also has a
   duplicate nav bar baked into the image itself; cropped out via
   CSS below, but the underlying photo should be replaced.
   ============================================================ */

const IMG = "/site/images";
const heading = { fontFamily: "'Barlow Condensed', sans-serif" };
const body = { fontFamily: "'DM Sans', sans-serif" };
const script = { fontFamily: "'Mrs Saint Delafield', cursive" };

const GOLD_BTN =
  "inline-flex items-center justify-center gap-3 rounded-[3px] border border-[#c8aa68] px-6 py-3 text-xs font-semibold tracking-wide text-[#272218] whitespace-nowrap transition hover:-translate-y-0.5";
const GOLD_BG = { background: "linear-gradient(110deg,#f0d9a3,#d4ad61)" };

const NAV_LINKS: [string, string][] = [
  ["Experiences", "experiences"],
  ["For Creators", "creators"],
  ["For Venues", "venues"],
  ["About", "about"],
];

const CATEGORY_META: Record<string, { image: string; line: string }> = {
  "Restaurants": { image: "dining", line: "A table worth talking about" },
  "Cafés": { image: "dining", line: "A table worth talking about" },
  "Pastry & Desserts": { image: "dining", line: "A table worth talking about" },
  "Hotels": { image: "hotel", line: "Check in. Switch off." },
  "Bars & Nightlife": { image: "nightlife", line: "Let the evening unfold" },
  "Spa": { image: "wellness", line: "A little time for you" },
  "Beauty Centers": { image: "wellness", line: "A little time for you" },
  "Aesthetic Clinics": { image: "wellness", line: "A little time for you" },
  "Gyms": { image: "fitness", line: "Find your next high" },
  "Beach Resorts": { image: "coast", line: "Beyond the everyday" },
  "Fashion & Retail": { image: "coast", line: "Beyond the everyday" },
};
const DEFAULT_CATEGORY_META = { image: "coast", line: "Beyond the everyday" };

interface TopCreator {
  full_name: string | null;
  avatar_url: string | null;
  instagram_handle: string | null;
  tiktok_handle: string | null;
  follower_count: number;
}

const stripAt = (h?: string | null) => (h ? h.replace(/^@+/, "") : "");
const formatFollowers = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K` : String(n));

const AUDIENCES = [
  {
    id: "creators", image: "creator", alt: "A creator enjoying a café visit",
    eyebrow: "YOUR INFLUENCE. YOUR ACCESS.", title: "FOR CREATORS",
    copy: "Turn your creativity into extraordinary experiences. Discover places you love. Share your world.",
    points: ["Access exceptional venues", "Create content that feels like you", "Build meaningful connections"],
    action: "JOIN AS A CREATOR", href: "/signup/influencer",
  },
  {
    id: "venues", image: "venue", alt: "A hospitality professional in a black apron",
    eyebrow: "REMARKABLE PLACES. REAL CONNECTIONS.", title: "FOR VENUES",
    copy: "Bring the right creators through your doors. Turn authentic experiences into stories that travel.",
    points: ["Connect with relevant creators", "Receive authentic lifestyle content", "Manage visits and campaigns"],
    action: "PARTNER WITH US", href: "/signup/business",
  },
];

const Eyebrow = ({ children, dark }: { children: string; dark?: boolean }) => (
  <p className={`text-[11px] font-semibold tracking-[2px] ${dark ? "text-white/80" : "text-[#8a6f36]"}`} style={body}>
    {children}
  </p>
);

const MarketingHome = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [categories, setCategories] = useState<string[]>(Object.keys(CATEGORY_META));
  const [topCreators, setTopCreators] = useState<TopCreator[]>([]);

  useEffect(() => {
    supabase.from("categories").select("name").eq("is_active", true).order("name").then(({ data }) => {
      if (data && data.length) setCategories(data.map((c) => c.name));
    });
    (supabase.rpc as (fn: string, args?: Record<string, unknown>) => { then: (cb: (r: { data: unknown }) => void) => void })(
      "get_top_creators_public",
      { _limit: 6 }
    ).then(({ data }) => {
      if (Array.isArray(data) && data.length >= 3) setTopCreators(data as unknown as TopCreator[]);
    });
  }, []);

  const scrollTo = (id: string) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-white text-[#272218]" style={body}>
      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between gap-4 border-b border-black/5 bg-white/95 px-5 py-3 backdrop-blur md:px-10">
        <a href="/" aria-label="FamePass home" className="shrink-0">
          <img src={famepassLogo} alt="FamePass" className="h-11 w-auto" />
        </a>
        <nav aria-label="Main navigation" className={`${menuOpen ? "flex" : "hidden"} absolute inset-x-0 top-full flex-col gap-1 border-b border-black/5 bg-white p-5 md:static md:flex md:flex-row md:gap-8 md:border-0 md:bg-transparent md:p-0`}>
          {NAV_LINKS.map(([label, id]) => (
            <button key={id} onClick={() => scrollTo(id)} className="py-2 text-left text-sm font-medium tracking-wide text-[#272218]/80 hover:text-[#272218] md:py-0" style={body}>
              {label}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <a href="/login" className="hidden text-sm font-medium text-[#272218]/80 hover:text-[#272218] sm:inline" style={body}>Log in</a>
          <a href="/welcome" className={`${GOLD_BTN} !min-h-[39px] !py-2 !text-[13px]`} style={GOLD_BG}>
            Join FamePass <ArrowRight size={15} />
          </a>
          <button aria-label="Toggle navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen((v) => !v)} className="md:hidden">
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative mx-auto max-h-[570px] min-h-[420px] max-w-[1500px] overflow-hidden bg-[#e9edeb] md:min-h-[570px]">
          <div className="absolute inset-y-0 right-0 w-full overflow-hidden md:w-[65%]">
            {/* Cropped to remove a duplicate nav bar baked into the source image — see file header note. */}
            <img
              src={`${IMG}/hero.jpg`}
              alt="A woman enjoying a glass of wine in an elegant restaurant"
              className="h-[125%] w-full -translate-y-[10%] object-cover object-[50%_47%]"
            />
          </div>
          <div className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(90deg,#eef1ed 0% 27%,#eef1ede6 42%,#eef1ed35 61%,#00000005 100%)" }} />
          <div className="relative z-[2] max-w-[820px] px-7 py-14 md:py-16 md:pl-12">
            <Eyebrow>PEOPLE. PLACES. EXPERIENCES.</Eyebrow>
            <h1 className="mt-3 text-[42px] font-semibold uppercase leading-[0.95] tracking-tight md:text-[64px]" style={heading}>
              Your pass to<br />the extraordinary<span className="text-[#c8aa68]">.</span>
            </h1>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-[#272218]/80" style={body}>
              Discover remarkable places. Create unforgettable stories. FamePass connects creators with a world of exceptional experiences.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="/welcome" className={GOLD_BTN} style={GOLD_BG}>Join FamePass <ArrowRight size={16} /></a>
              <button onClick={() => scrollTo("about")} className="inline-flex min-h-[46px] items-center justify-center rounded-[3px] border border-[#272218]/20 px-6 text-xs font-semibold tracking-wide hover:border-[#272218]/40" style={body}>
                How it works
              </button>
            </div>
          </div>
        </section>

        {/* Categories */}
        <section className="mx-auto max-w-[1500px] px-5 py-16 md:px-10">
          <div className="mb-8 flex items-end justify-between gap-4">
            <h2 className="text-3xl font-semibold uppercase tracking-tight md:text-4xl" style={heading}>What are you into?</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
            {categories.map((name) => {
              const meta = CATEGORY_META[name] ?? DEFAULT_CATEGORY_META;
              return (
                <div key={name} className="group relative aspect-[3/4] overflow-hidden rounded-lg bg-[#e9edeb]">
                  <img src={`${IMG}/${meta.image}.jpg`} alt={name} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-white" style={heading}>{name}</p>
                    <p className="text-[10px] text-white/70" style={body}>{meta.line}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Experiences */}
        {topCreators.length >= 3 && (
          <section id="experiences" className="bg-[#faf9f6] px-5 py-16 md:px-10">
            <div className="mx-auto max-w-[1500px]">
              <div className="mb-10 text-center">
                <Eyebrow>REAL CREATORS. REAL REACH.</Eyebrow>
                <h2 className="mt-2 text-3xl font-semibold uppercase tracking-tight md:text-4xl" style={heading}>Meet our top creators</h2>
              </div>
              <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
                {topCreators.map((c) => {
                  const handle = c.instagram_handle ? { label: stripAt(c.instagram_handle), url: `https://instagram.com/${stripAt(c.instagram_handle)}` }
                    : c.tiktok_handle ? { label: stripAt(c.tiktok_handle), url: `https://tiktok.com/@${stripAt(c.tiktok_handle)}` }
                    : null;
                  return (
                    <article key={c.full_name} className="overflow-hidden rounded-lg border border-black/5 bg-white text-center">
                      <div className="aspect-square">
                        <img src={c.avatar_url ?? ""} alt={c.full_name ?? "FamePass creator"} loading="lazy" className="h-full w-full object-cover" />
                      </div>
                      <div className="p-4">
                        <h3 className="text-base font-semibold" style={heading}>{c.full_name}</h3>
                        {handle && (
                          <a href={handle.url} target="_blank" rel="noreferrer" className="text-xs text-[#8a6f36] hover:underline" style={body}>@{handle.label}</a>
                        )}
                        <p className="mt-1 text-sm font-medium text-[#272218]/70" style={body}>{formatFollowers(c.follower_count)} followers</p>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Creators / Venues */}
        {AUDIENCES.map((a, i) => (
          <section key={a.id} id={a.id} className={`mx-auto flex max-w-[1500px] flex-col gap-10 px-5 py-16 md:px-10 lg:flex-row lg:items-center ${i % 2 ? "lg:flex-row-reverse" : ""}`}>
            <img src={`${IMG}/${a.image}.jpg`} alt={a.alt} loading="lazy" className="aspect-[4/3] w-full rounded-lg object-cover lg:w-1/2" />
            <div className="lg:w-1/2">
              <Eyebrow>{a.eyebrow}</Eyebrow>
              <h2 className="mt-2 text-3xl font-semibold uppercase tracking-tight md:text-4xl" style={heading}>{a.title}</h2>
              <p className="mt-4 max-w-md text-[15px] leading-relaxed text-[#272218]/75" style={body}>{a.copy}</p>
              <ul className="mt-5 space-y-2">
                {a.points.map((p) => (
                  <li key={p} className="flex items-center gap-2.5 text-sm text-[#272218]/85" style={body}>
                    <Check size={15} className="shrink-0 text-[#c8aa68]" /> {p}
                  </li>
                ))}
              </ul>
              <a href={a.href} className={`${GOLD_BTN} mt-7`} style={GOLD_BG}>{a.action} <ArrowRight size={16} /></a>
            </div>
          </section>
        ))}

        {/* Community strip */}
        <section className="bg-[#faf9f6] px-5 py-16 md:px-10">
          <div className="mx-auto max-w-[1500px]">
            <div className="mb-8 text-center">
              <h2 className="text-3xl font-semibold uppercase tracking-tight md:text-4xl" style={heading}>The FamePass community</h2>
              <p className="mt-2 text-xs font-semibold tracking-[2px] text-[#8a6f36]" style={body}>REAL MOMENTS. SHARED STORIES.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              {["creator", "dining", "hero", "venue"].map((img, i) => (
                <img key={img} src={`${IMG}/${img}.jpg`} loading="lazy"
                  alt={["Connecting over coffee", "An evening out", "A moment worth remembering", "The people behind the experience"][i]}
                  className="aspect-[3/4] w-full rounded-lg object-cover" />
              ))}
              <div className="flex aspect-[3/4] flex-col items-center justify-center rounded-lg bg-[#272218] text-center text-white">
                <p className="text-2xl font-semibold uppercase leading-tight" style={heading}>A more<br />extraordinary<br /><span style={script} className="text-[#e6c878]">You.</span></p>
              </div>
            </div>
          </div>
        </section>

        {/* About */}
        <section id="about" className="mx-auto grid max-w-[1500px] grid-cols-1 gap-10 px-5 py-16 md:px-10 lg:grid-cols-2 lg:items-center">
          <div>
            <Eyebrow>THE IDEA BEHIND FAMEPASS</Eyebrow>
            <h2 className="mt-2 text-3xl font-semibold uppercase leading-tight tracking-tight md:text-4xl" style={heading}>
              Good connections.<br />Extraordinary possibilities.
            </h2>
          </div>
          <div>
            <p className="text-[15px] leading-relaxed text-[#272218]/75" style={body}>
              We bring creators and hospitality together through experiences worth sharing. From a favourite neighbourhood café to a remarkable escape, FamePass connects the people who tell stories with the places that inspire them.
            </p>
            <p className="mt-3 text-[15px] font-medium" style={body}>Discover. Connect. Experience. Create.</p>
          </div>
        </section>

        {/* CTA */}
        <section className="relative mx-auto max-w-[1500px] overflow-hidden">
          <img src={`${IMG}/hotel.jpg`} alt="An inviting poolside escape" loading="lazy" className="h-72 w-full object-cover md:h-96" />
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 px-5 text-center text-white">
            <Eyebrow dark>YOUR NEXT CHAPTER STARTS HERE</Eyebrow>
            <h2 className="mt-2 text-3xl font-semibold uppercase leading-tight tracking-tight md:text-4xl" style={heading}>
              Ready to unlock<br />extraordinary experiences?
            </h2>
            <p className="mt-3 text-sm text-white/80" style={body}>A world of people, places and possibilities awaits.</p>
            <a href="/welcome" className={`${GOLD_BTN} mt-6`} style={GOLD_BG}>Join FamePass <ArrowRight size={18} /></a>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-black/5 px-5 py-10 md:px-10">
        <div className="mx-auto flex max-w-[1500px] flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <img src={famepassLogo} alt="FamePass" className="h-10 w-auto" />
          <nav aria-label="Footer navigation" className="flex flex-wrap gap-5 text-sm text-[#272218]/70" style={body}>
            <button onClick={() => scrollTo("experiences")}>Experiences</button>
            <button onClick={() => scrollTo("creators")}>For Creators</button>
            <button onClick={() => scrollTo("venues")}>For Venues</button>
            <button onClick={() => scrollTo("about")}>About</button>
            <a href="/contact">Contact</a>
          </nav>
          <span className="text-xs font-semibold tracking-[1.5px] text-[#8a6f36]" style={body}>A MORE EXTRAORDINARY YOU</span>
        </div>
        <div className="mx-auto mt-6 flex max-w-[1500px] items-center justify-between border-t border-black/5 pt-6 text-xs text-[#272218]/50" style={body}>
          <span>© {new Date().getFullYear()} FamePass</span>
          <a href="/privacy" className="hover:text-[#272218]">Privacy & Terms</a>
        </div>
      </footer>
    </div>
  );
};

export default MarketingHome;
