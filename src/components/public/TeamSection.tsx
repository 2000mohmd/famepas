import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Maximize2, Send, Zap, Gift } from "lucide-react";

const features = [
  {
    icon: Maximize2,
    title: "Full-Service Agency",
    description: "End-to-end creator campaign execution.",
    iconBg: "bg-purple-glow/15 text-purple-glow",
  },
  {
    icon: Send,
    title: "Customer Success Team",
    description: "Industry experts to drive success across all program types.",
    iconBg: "bg-orange-400/15 text-orange-400",
  },
  {
    icon: Zap,
    title: "Performance-First Execution",
    description: "Content creation and paid media services that move the needle.",
    iconBg: "bg-lime-400/15 text-lime-400",
  },
  {
    icon: Gift,
    title: "Community Insight",
    description: "Connect with other marketers through the FamePass ecosystem.",
    iconBg: "bg-sky-400/15 text-sky-400",
  },
];

const TeamSection = () => (
  <section className="py-16 relative">
    <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
        {/* Left: heading + copy + CTAs */}
        <div>
          <h2 className="font-display font-normal leading-[1.05] tracking-tight text-4xl sm:text-5xl lg:text-6xl">
            A team that's run it all before &amp;{" "}
            <span className="italic gradient-text">peers who get it.</span>
          </h2>
          <p className="text-muted-foreground mt-6 text-lg leading-relaxed max-w-xl">
            Expert execution across every type of creator campaign. With 10+ years of campaigns under our belt,
            we combine proprietary tech with our expert team to turn your brand goals into measurable business growth.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button asChild size="lg" className="gradient-gold text-accent-foreground hover:opacity-90 rounded-full px-8 h-13 font-semibold">
              <Link to="/contact">Talk to an Expert</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full px-8 h-13 border-border glass hover:border-gold/40">
              <Link to="/about">Learn More</Link>
            </Button>
          </div>
        </div>

        {/* Right: 2x2 feature grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {features.map(({ icon: Icon, title, description, iconBg }) => (
            <div
              key={title}
              className="premium-card rounded-3xl p-7 hover:-translate-y-1 transition-all duration-500"
            >
              <div className={`w-12 h-12 rounded-2xl ${iconBg} flex items-center justify-center mb-6`}>
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="font-display font-semibold text-foreground text-xl leading-tight mb-2">
                {title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

export default TeamSection;
