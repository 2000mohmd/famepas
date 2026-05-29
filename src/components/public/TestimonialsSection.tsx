import { Quote } from "lucide-react";

const testimonials = [
  {
    quote: "FamePass turned our launch into the most talked-about opening of the season. The creator quality is genuinely unmatched.",
    name: "Amara Sinclair",
    role: "Founder, Maison Dorée",
  },
  {
    quote: "We finally have a system that respects both the venue and the creator. Every campaign now closes itself.",
    name: "Julien Marchetti",
    role: "Marketing Director, Hôtel Numéro Six",
  },
  {
    quote: "The reporting alone made the platform worth it. We see exactly which creator drove which booking, in real time.",
    name: "Priya Raman",
    role: "Brand Lead, Lumen Spa Group",
  },
];

const TestimonialsSection = () => (
  <section className="py-32 relative">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center max-w-2xl mx-auto mb-20">
        <p className="text-gold text-xs font-semibold tracking-[0.3em] uppercase mb-4">— Voices from the network</p>
        <h2 className="font-display font-normal leading-[0.98] tracking-[-0.03em] text-4xl sm:text-5xl lg:text-6xl">
          Trusted by venues who care about <span className="italic gradient-text">the details</span>
        </h2>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {testimonials.map((t, i) => (
          <figure
            key={i}
            className="premium-card rounded-3xl p-8 lg:p-10 flex flex-col gap-6"
          >
            <Quote className="w-8 h-8 text-gold/60" />
            <blockquote className="font-display text-xl lg:text-2xl leading-[1.35] tracking-[-0.01em] text-foreground/95">
              "{t.quote}"
            </blockquote>
            <figcaption className="mt-auto pt-6 border-t border-border/60">
              <p className="font-semibold text-foreground text-sm">{t.name}</p>
              <p className="text-xs text-muted-foreground mt-1">{t.role}</p>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  </section>
);

export default TestimonialsSection;
