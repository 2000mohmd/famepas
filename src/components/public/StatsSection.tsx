import CountUp from "./CountUp";

const stats = [
  { label: "Premium Venues", value: 1240, suffix: "+" },
  { label: "Verified Creators", value: 18500, suffix: "+" },
  { label: "Campaigns Launched", value: 7800, suffix: "+" },
  { label: "Avg. Engagement Lift", value: 312, suffix: "%" },
];

const StatsSection = () => (
  <section className="py-32 relative">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center max-w-2xl mx-auto mb-16">
        <p className="text-gold text-xs font-semibold tracking-[0.3em] uppercase mb-4">— By the numbers</p>
        <h2 className="font-display font-normal leading-[0.98] tracking-[-0.03em] text-4xl sm:text-5xl lg:text-6xl">
          A network built on <span className="italic gradient-text">measurable results</span>
        </h2>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border/60 rounded-3xl overflow-hidden">
        {stats.map((s) => (
          <div key={s.label} className="bg-background px-6 py-12 text-center">
            <p className="font-display text-5xl lg:text-6xl gradient-text tracking-tight">
              <CountUp to={s.value} suffix={s.suffix} />
            </p>
            <p className="mt-4 text-xs sm:text-sm text-muted-foreground tracking-[0.2em] uppercase">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default StatsSection;
