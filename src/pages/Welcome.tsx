import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles, Store } from "lucide-react";
import famepassLogo from "@/assets/famepass-logo.png";
import imgHospitality from "@/assets/onboarding-hospitality.jpg";
import imgCreator from "@/assets/onboarding-creator.jpg";
import imgNightlife from "@/assets/onboarding-nightlife.jpg";
import imgInfluencer from "@/assets/hero-influencer.jpg";
import imgVenue from "@/assets/hero-venue.jpg";

/**
 * Premium mobile-first welcome / role selection screen.
 * Joli-style structure (rotating lifestyle hero cards) with FamePass branding.
 * Route: /signup (and exposed via /welcome)
 */

const SLIDES = [
  { src: imgHospitality, title: "Discover premium venues",   tag: "Hospitality" },
  { src: imgCreator,     title: "Collaborate with brands",   tag: "Creators"     },
  { src: imgNightlife,   title: "Get paid in experiences",   tag: "Nightlife"    },
  { src: imgInfluencer,  title: "Grow your social presence", tag: "Influence"    },
  { src: imgVenue,       title: "Fill your tables",          tag: "Venues"       },
];

const Welcome = () => {
  const navigate = useNavigate();
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % SLIDES.length), 3200);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen bg-[#0c0613] text-white flex flex-col">
      {/* Top brand */}
      <header className="px-6 pt-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={famepassLogo} alt="FamePass" className="w-10 h-10 rounded-xl" />
          <span className="font-display text-xl font-bold">
            Fame<span className="text-[#ec4178]">Pass</span>
          </span>
        </div>
        <button
          onClick={() => navigate("/login")}
          className="text-sm text-white/70 hover:text-white"
        >
          Sign in
        </button>
      </header>

      {/* Hero image stack */}
      <div className="relative flex-1 px-6 pt-8 pb-6 flex items-center justify-center">
        <div className="relative w-full max-w-sm aspect-[3/4]">
          {SLIDES.map((s, i) => {
            const offset = (i - idx + SLIDES.length) % SLIDES.length;
            const isActive = offset === 0;
            const isNext = offset === 1;
            const isPrev = offset === SLIDES.length - 1;
            const visible = isActive || isNext || isPrev;
            const style: React.CSSProperties = {
              transform: isActive
                ? "translate(0,0) rotate(-2deg) scale(1)"
                : isNext
                ? "translate(14px, 22px) rotate(4deg) scale(0.94)"
                : isPrev
                ? "translate(-14px, 18px) rotate(-6deg) scale(0.9)"
                : "translate(0,0) scale(0.8)",
              zIndex: isActive ? 30 : isNext ? 20 : 10,
              opacity: visible ? 1 : 0,
            };
            return (
              <div
                key={i}
                className="absolute inset-0 rounded-3xl overflow-hidden shadow-[0_25px_60px_-15px_rgba(236,65,120,0.55)] ring-1 ring-white/10 transition-all duration-700 ease-out"
                style={style}
              >
                <img
                  src={s.src}
                  alt={s.title}
                  className="w-full h-full object-cover"
                  loading={i === 0 ? undefined : "lazy"}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                {isActive && (
                  <div className="absolute bottom-5 left-5 right-5">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#ec4178]/90 text-[11px] font-semibold uppercase tracking-wide">
                      <Sparkles className="w-3 h-3" /> {s.tag}
                    </span>
                    <h3 className="mt-2 text-xl font-bold leading-tight">{s.title}</h3>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Dots */}
      <div className="flex justify-center gap-1.5 mb-5">
        {SLIDES.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all ${
              i === idx ? "w-6 bg-[#ec4178]" : "w-1.5 bg-white/25"
            }`}
          />
        ))}
      </div>

      {/* Headline + CTAs */}
      <div className="px-6 pb-10">
        <h1 className="text-center text-3xl font-extrabold tracking-tight">
          Welcome to <span className="bg-gradient-to-r from-[#ec4178] to-[#f5b86b] bg-clip-text text-transparent">FamePass</span>
        </h1>
        <p className="mt-2 text-center text-sm text-white/60">
          The collab platform connecting venues with creators.
        </p>

        <div className="mt-6 space-y-3">
          <button
            onClick={() => navigate("/signup/influencer")}
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-[#ec4178] to-[#f5b86b] text-black font-bold flex items-center justify-center gap-2 shadow-[0_10px_30px_-10px_rgba(236,65,120,0.7)] active:scale-[0.99] transition"
          >
            <Sparkles className="w-5 h-5" /> I'm an Influencer
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>
          <button
            onClick={() => navigate("/login")}
            className="w-full h-14 rounded-2xl bg-white/[0.06] border border-white/15 text-white font-semibold flex items-center justify-center gap-2 hover:bg-white/10 active:scale-[0.99] transition"
          >
            <Store className="w-5 h-5 text-[#f5b86b]" /> I'm a Business
            <ArrowRight className="w-4 h-4 ml-1 text-white/60" />
          </button>
        </div>

        <p className="mt-5 text-center text-sm text-white/50">
          Already have an account?{" "}
          <button onClick={() => navigate("/login")} className="text-[#f5b86b] font-semibold hover:underline">
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
};

export default Welcome;
