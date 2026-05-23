import { useState } from "react";
import { Search, Megaphone, Tag, BarChart3, Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const tabs = [
  {
    key: "discover",
    label: "Discover & Connect",
    icon: Search,
    title: "Find the right creators in seconds",
    features: [
      { title: "Creator Marketplace", desc: "Browse a curated network of vetted influencers across every vertical." },
      { title: "Smart Discovery", desc: "Filter by location, niche, audience size, and engagement quality." },
      { title: "Unified Inbox", desc: "Every creator, every conversation, in one organized view." },
      { title: "Personalized Invites", desc: "Send tailored campaign briefs that get answered." },
    ],
  },
  {
    key: "manage",
    label: "Manage Campaigns",
    icon: Megaphone,
    title: "Run every campaign from one workspace",
    features: [
      { title: "Campaign Manager", desc: "Plan, launch, and track every collaboration in real time." },
      { title: "Content Approvals", desc: "Review and approve creator content with a single click." },
      { title: "Automated Workflows", desc: "Smart reminders, status updates, and triggers save hours." },
      { title: "Custom Agreements", desc: "Set expectations and protect every relationship upfront." },
    ],
  },
  {
    key: "offers",
    label: "Offers & Rewards",
    icon: Tag,
    title: "Reward creators the way they deserve",
    features: [
      { title: "Exclusive Offers", desc: "Publish premium experiences that creators line up to claim." },
      { title: "Promo Codes", desc: "Distribute trackable discount codes tied to creator performance." },
      { title: "Tiered Payouts", desc: "Flat, percentage, or tiered commissions per creator." },
      { title: "Instant Bookings", desc: "Let creators redeem offers without back-and-forth." },
    ],
  },
  {
    key: "measure",
    label: "Measure & Refine",
    icon: BarChart3,
    title: "Know what works. Double down on it.",
    features: [
      { title: "Impact Dashboard", desc: "Reach, engagement, and conversions in real time." },
      { title: "Revenue Tracking", desc: "Connect bookings and redemptions back to each creator." },
      { title: "Social Analytics", desc: "Know which posts, formats, and creators drive value." },
      { title: "Budget Ledger", desc: "Track every dollar before it ever goes out." },
    ],
  },
];

const PlatformSection = () => {
  const [active, setActive] = useState(tabs[0].key);
  const current = tabs.find((t) => t.key === active)!;

  return (
    <section className="py-24 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <h2 className="font-display font-normal leading-[1.05] tracking-tight text-4xl sm:text-5xl lg:text-6xl">
            The all-in-one <span className="italic gradient-text">creator platform</span>
          </h2>
          <p className="text-muted-foreground mt-5 text-lg leading-relaxed">
            Everything your venue needs — from first discovery to final report.
          </p>
        </div>

        {/* Tab bar */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setActive(t.key)}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full border text-sm font-medium transition-all ${
                  active === t.key
                    ? "gradient-gold text-accent-foreground border-transparent shadow-lg shadow-primary/20"
                    : "glass border-border text-foreground/70 hover:border-gold/40"
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Content card */}
        <div className="premium-card rounded-3xl p-8 lg:p-12 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase mb-4">{current.label}</p>
            <h3 className="font-display font-normal text-3xl lg:text-4xl leading-tight mb-6">
              {current.title}
            </h3>
            <div className="space-y-4">
              {current.features.map((f) => (
                <div key={f.title} className="flex gap-3">
                  <div className="w-6 h-6 rounded-full gradient-gold flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5 text-accent-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{f.title}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Visual mockup */}
          <div className="relative aspect-square rounded-3xl gradient-purple overflow-hidden glow-purple p-6 flex flex-col justify-between">
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="glass rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full gradient-gold flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="h-2 rounded-full bg-foreground/20 w-24 mb-1.5" />
                    <div className="h-1.5 rounded-full bg-foreground/10 w-32" />
                  </div>
                  <div className="w-12 h-6 rounded-full bg-success/20 border border-success/30" />
                </div>
              ))}
            </div>
            <div className="glass rounded-2xl p-5">
              <p className="text-xs text-muted-foreground mb-2">{current.label}</p>
              <p className="font-display text-2xl font-bold gradient-text">{current.title.split(".")[0]}</p>
            </div>
          </div>
        </div>

        <div className="mt-12 text-center">
          <Button asChild className="gradient-gold text-accent-foreground hover:opacity-90 rounded-full px-8 h-12 font-semibold">
            <Link to="/login">Get started <ArrowRight className="w-4 h-4 ml-2" /></Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default PlatformSection;
