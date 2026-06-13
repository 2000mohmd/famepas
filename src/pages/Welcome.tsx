import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles, Store, Instagram, Facebook, X, Mail, LogIn } from "lucide-react";
import famepassLogo from "@/assets/famepass-logo.png";
import imgHospitality from "@/assets/onboarding-hospitality.jpg";
import imgCreator from "@/assets/onboarding-creator.jpg";
import imgNightlife from "@/assets/onboarding-nightlife.jpg";
import imgInfluencer from "@/assets/hero-influencer.jpg";
import imgVenue from "@/assets/hero-venue.jpg";
import { toast } from "@/hooks/use-toast";

const SLIDES = [
  { src: imgHospitality, title: "Discover premium venues",   tag: "Hospitality" },
  { src: imgCreator,     title: "Collaborate with brands",   tag: "Creators"     },
  { src: imgNightlife,   title: "Get paid in experiences",   tag: "Nightlife"    },
  { src: imgInfluencer,  title: "Grow your social presence", tag: "Influence"    },
  { src: imgVenue,       title: "Fill your tables",          tag: "Venues"       },
];

// TikTok inline icon (lucide doesn't ship one)
const TikTokIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M16.5 3a5.5 5.5 0 0 0 4.5 4.5v3a8.5 8.5 0 0 1-4.5-1.3v6.6a6.3 6.3 0 1 1-6.3-6.3c.35 0 .69.03 1.02.09v3.18a3.2 3.2 0 1 0 2.28 3.06V3h3z"/>
  </svg>
);

const Welcome = () => {
  const navigate = useNavigate();
  const [idx, setIdx] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % SLIDES.length), 3200);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (sheetOpen) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [sheetOpen]);

  const handleSocial = (provider: string) => {
    toast({
      title: `${provider} connection coming soon`,
      description: "For now, finish your profile manually — you can add your social handle in the next step.",
    });
    setSheetOpen(false);
    navigate("/signup/influencer");
  };

  return (
    <div className="min-h-screen bg-[#0c0613] text-white flex flex-col relative overflow-hidden">
      <header className="px-6 pt-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={famepassLogo} alt="FamePass" className="w-10 h-10 rounded-xl" />
          <span className="font-display text-xl font-bold">
            Fame<span className="text-[#ec4178]">Pass</span>
          </span>
        </div>
        <button onClick={() => navigate("/login")} className="text-sm text-white/70 hover:text-white">
          Sign in
        </button>
      </header>

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
                <img src={s.src} alt={s.title} className="w-full h-full object-cover" loading={i === 0 ? undefined : "lazy"} />
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

      <div className="flex justify-center gap-1.5 mb-5">
        {SLIDES.map((_, i) => (
          <span key={i} className={`h-1.5 rounded-full transition-all ${i === idx ? "w-6 bg-[#ec4178]" : "w-1.5 bg-white/25"}`} />
        ))}
      </div>

      <div className="px-6 pb-10">
        <h1 className="text-center text-3xl font-extrabold tracking-tight">
          Welcome to <span className="bg-gradient-to-r from-[#ec4178] to-[#f5b86b] bg-clip-text text-transparent">FamePass</span>
        </h1>
        <p className="mt-2 text-center text-sm text-white/60">
          The collab platform connecting venues with creators.
        </p>

        <div className="mt-6 space-y-3">
          <button
            onClick={() => setSheetOpen(true)}
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-[#ec4178] to-[#f5b86b] text-black font-bold flex items-center justify-center gap-2 shadow-[0_10px_30px_-10px_rgba(236,65,120,0.7)] active:scale-[0.99] transition"
          >
            <Sparkles className="w-5 h-5" /> I'm an Influencer
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>
          <button
            onClick={() => navigate("/signup/business")}
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

      {/* Influencer bottom sheet */}
      <div
        className={`fixed inset-0 z-50 transition-opacity duration-300 ${sheetOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        aria-hidden={!sheetOpen}
      >
        <div
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={() => setSheetOpen(false)}
        />
        <div
          className={`absolute inset-x-0 bottom-0 bg-[#16101e] rounded-t-3xl border-t border-white/10 shadow-[0_-20px_60px_-20px_rgba(236,65,120,0.6)] transition-transform duration-300 ease-out ${
            sheetOpen ? "translate-y-0" : "translate-y-full"
          }`}
        >
          <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-white/20" />
          <div className="px-6 pt-4 pb-8 max-w-md mx-auto">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">Join as a Creator</h2>
                <p className="text-sm text-white/60 mt-1">
                  Continue with social or sign up manually.
                </p>
              </div>
              <button
                onClick={() => setSheetOpen(false)}
                className="w-9 h-9 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center hover:bg-white/10"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-5 space-y-2.5">
              <button
                onClick={() => handleSocial("Instagram")}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-[#f58529] via-[#dd2a7b] to-[#8134af] text-white font-semibold flex items-center justify-center gap-2 active:scale-[0.99] transition"
              >
                <Instagram className="w-5 h-5" /> Continue with Instagram
              </button>
              <button
                onClick={() => handleSocial("TikTok")}
                className="w-full h-12 rounded-xl bg-black text-white font-semibold flex items-center justify-center gap-2 border border-white/15 active:scale-[0.99] transition"
              >
                <TikTokIcon /> Continue with TikTok
              </button>
              <button
                onClick={() => handleSocial("Facebook")}
                className="w-full h-12 rounded-xl bg-[#1877F2] text-white font-semibold flex items-center justify-center gap-2 active:scale-[0.99] transition"
              >
                <Facebook className="w-5 h-5" /> Continue with Facebook
              </button>
            </div>

            <div className="my-5 flex items-center gap-3 text-xs text-white/40">
              <div className="h-px flex-1 bg-white/10" />
              OR
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <div className="space-y-2.5">
              <button
                onClick={() => { setSheetOpen(false); navigate("/signup/influencer"); }}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-[#ec4178] to-[#f5b86b] text-black font-bold flex items-center justify-center gap-2 active:scale-[0.99] transition"
              >
                <Mail className="w-5 h-5" /> Sign Up
              </button>
              <button
                onClick={() => { setSheetOpen(false); navigate("/login"); }}
                className="w-full h-12 rounded-xl bg-white/[0.06] border border-white/15 text-white font-semibold flex items-center justify-center gap-2 hover:bg-white/10 active:scale-[0.99] transition"
              >
                <LogIn className="w-5 h-5 text-[#f5b86b]" /> Login
              </button>
            </div>

            <p className="mt-5 text-center text-[11px] text-white/40 leading-relaxed">
              By continuing you agree to FamePass's Terms & Privacy Policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Welcome;
