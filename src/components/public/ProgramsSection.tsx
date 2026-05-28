import { Users, Sparkles, BarChart3, ShoppingBag, Gift, Megaphone } from "lucide-react";

const programs = [
  {
    icon: Users,
    title: "Ambassador Program",
    description: "Build a community of loyal creators that champion your brand long-term.",
    accent: "from-purple-glow/20 to-purple-glow/5",
  },
  {
    icon: Sparkles,
    title: "UGC & Content",
    description: "Create a library of brand-safe assets to use across all channels.",
    accent: "from-gold/20 to-gold/5",
  },
  {
    icon: BarChart3,
    title: "Affiliate Marketing",
    description: "Track performance, attribute sales and reward your top creators automatically.",
    accent: "from-emerald-500/20 to-emerald-500/5",
  },
  {
    icon: ShoppingBag,
    title: "Social Commerce",
    description: "Turn every post into a storefront with seamless creator-led shopping.",
    accent: "from-rose-500/20 to-rose-500/5",
  },
  {
    icon: Gift,
    title: "Gifting Campaigns",
    description: "Send products to vetted influencers and unlock authentic organic coverage.",
    accent: "from-sky-500/20 to-sky-500/5",
  },
  {
    icon: Megaphone,
    title: "Paid Partnerships",
    description: "Run end-to-end sponsored campaigns with full visibility and ROI tracking.",
    accent: "from-amber-500/20 to-amber-500/5",
  },
];

const ProgramsSection = () => (
  <section className="py-24 relative">
    <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mb-14">
        <h2 className="font-display font-normal leading-[1.05] tracking-tight text-4xl sm:text-5xl lg:text-6xl">
          Whatever program you're running,{" "}
          <span className="italic gradient-text">FamePass is built for it.</span>
        </h2>
        <p className="text-muted-foreground mt-5 text-lg leading-relaxed">
          From ambassador networks to performance affiliate, manage every type of creator campaign in one platform.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {programs.map(({ icon: Icon, title, description, accent }) => (
          <div
            key={title}
            className="group premium-card rounded-3xl p-8 hover:-translate-y-1 transition-all duration-500 relative overflow-hidden"
          >
            <div className={`absolute -top-16 -right-16 w-48 h-48 rounded-full bg-gradient-to-br ${accent} blur-3xl opacity-60 group-hover:opacity-100 transition-opacity`} />
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl glass border border-gold/20 flex items-center justify-center mb-6">
                <Icon className="w-5 h-5 text-gold" />
              </div>
              <h3 className="font-display font-semibold text-foreground text-2xl leading-tight mb-3">
                {title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default ProgramsSection;
