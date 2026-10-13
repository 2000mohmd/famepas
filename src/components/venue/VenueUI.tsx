import { ReactNode } from "react";
import { Link } from "react-router-dom";

/* Shared premium building blocks for every venue page, matching the
   Home/Discover redesign: burgundy hero bands, pill tabs, designed empty
   states and weighted stat tiles. */

const brand = { background: "hsl(var(--venue-brand))", color: "hsl(var(--venue-brand-foreground))" };

/** Burgundy hero band at the top of a page. */
export const VenueHero = ({ eyebrow, title, subtitle, actions, aside }: {
  eyebrow?: string; title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; aside?: ReactNode;
}) => (
  <section className="relative overflow-hidden rounded-[2rem] p-7 md:p-10" style={brand}>
    <span aria-hidden className="pointer-events-none absolute -right-28 -top-28 w-96 h-96 rounded-full border" style={{ borderColor: "hsl(var(--primary) / .25)" }} />
    <span aria-hidden className="pointer-events-none absolute -right-8 top-24 w-96 h-96 rounded-full border" style={{ borderColor: "hsl(var(--primary) / .18)" }} />
    <div className="relative flex flex-wrap items-end justify-between gap-6">
      <div className="min-w-0 max-w-3xl">
        {eyebrow && <p className="text-xs font-bold uppercase tracking-[0.18em] mb-3" style={{ color: "hsl(var(--gold-light))" }}>{eyebrow}</p>}
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.02]" style={{ color: "hsl(var(--venue-brand-foreground))" }}>{title}</h1>
        {subtitle && <p className="mt-4 text-base md:text-lg leading-relaxed opacity-75">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
    {aside && <div className="relative mt-8">{aside}</div>}
  </section>
);

/** Gold call-to-action used on dark heroes. */
export const HeroButton = ({ to, onClick, children, variant = "solid" }: { to?: string; onClick?: () => void; children: ReactNode; variant?: "solid" | "ghost" }) => {
  const cls = "inline-flex items-center gap-2 h-12 px-6 rounded-full font-bold text-sm transition hover:brightness-105 [&_svg]:w-4 [&_svg]:h-4";
  const style = variant === "solid"
    ? { background: "hsl(var(--primary))", color: "hsl(var(--venue-brand))" }
    : { background: "hsl(var(--venue-brand-foreground) / .1)", color: "hsl(var(--venue-brand-foreground))", border: "1px solid hsl(var(--venue-brand-foreground) / .25)" };
  return to
    ? <Link to={to} className={cls} style={style}>{children}</Link>
    : <button type="button" onClick={onClick} className={cls} style={style}>{children}</button>;
};

/** Pill segmented tabs. */
export function VenueTabs<T extends string>({ value, onChange, tabs }: {
  value: T; onChange: (v: T) => void; tabs: { key: T; label: string; count?: number }[];
}) {
  return (
    <div role="tablist" className="inline-flex flex-wrap gap-1 p-1.5 rounded-full bg-card border border-border shadow-[var(--venue-shadow)]">
      {tabs.map((t) => {
        const active = t.key === value;
        return (
          <button
            key={t.key} role="tab" aria-selected={active} type="button" onClick={() => onChange(t.key)}
            className={`inline-flex items-center gap-2 h-10 px-5 rounded-full text-sm font-semibold transition ${active ? "" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
            style={active ? brand : undefined}
          >
            {t.label}
            {t.count !== undefined && (
              <span className="min-w-[22px] h-[22px] px-1.5 rounded-full text-[11px] font-bold inline-flex items-center justify-center"
                style={active ? { background: "hsl(var(--primary))", color: "hsl(var(--venue-brand))" } : { background: "hsl(var(--muted))" }}>
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Designed empty state: icon medallion, headline, copy, actions. */
export const VenueEmpty = ({ icon: Icon, title, body, actions, compact = false }: {
  icon: any; title: string; body?: ReactNode; actions?: ReactNode; compact?: boolean;
}) => (
  <div className={`rounded-[2rem] bg-card border border-border text-center ${compact ? "px-6 py-10" : "px-6 py-16 md:py-20"}`}>
    <span className="mx-auto mb-6 flex items-center justify-center w-20 h-20 rounded-full"
      style={{ background: "radial-gradient(circle at 30% 30%, hsl(var(--gold-light)), hsl(var(--primary)))", boxShadow: "0 0 0 10px hsl(var(--primary) / .12)" }}>
      <Icon className="w-8 h-8" style={{ color: "hsl(var(--venue-brand))" }} />
    </span>
    <h3 className="text-2xl font-extrabold text-foreground">{title}</h3>
    {body && <p className="mt-2 text-muted-foreground max-w-md mx-auto leading-relaxed">{body}</p>}
    {actions && <div className="mt-7 flex flex-wrap justify-center gap-3">{actions}</div>}
  </div>
);

/** Brand-filled pill button for light surfaces. */
export const BrandButton = ({ to, onClick, children, disabled }: { to?: string; onClick?: () => void; children: ReactNode; disabled?: boolean }) => {
  const cls = "inline-flex items-center gap-2 h-12 px-6 rounded-full font-bold text-sm transition hover:opacity-90 disabled:opacity-50 [&_svg]:w-4 [&_svg]:h-4";
  return to
    ? <Link to={to} className={cls} style={brand}>{children}</Link>
    : <button type="button" onClick={onClick} disabled={disabled} className={cls} style={brand}>{children}</button>;
};

/** KPI tile. */
export const VenueStat = ({ icon: Icon, label, value, hint, accent = false }: {
  icon: any; label: string; value: ReactNode; hint?: ReactNode; accent?: boolean;
}) => (
  <div className="rounded-3xl p-6 flex flex-col justify-between min-h-[168px] border border-border shadow-[var(--venue-shadow)]"
    style={accent ? brand : { background: "hsl(var(--card))" }}>
    <div className="flex items-start justify-between gap-3">
      <span className="text-sm font-semibold" style={accent ? { opacity: .75 } : { color: "hsl(var(--muted-foreground))" }}>{label}</span>
      <span className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
        style={accent ? { background: "hsl(var(--primary))", color: "hsl(var(--venue-brand))" } : { background: "hsl(var(--primary) / .16)", color: "hsl(var(--venue-brand))" }}>
        <Icon className="w-5 h-5" />
      </span>
    </div>
    <div>
      <p className="text-4xl font-extrabold tracking-tight leading-none" style={accent ? undefined : { color: "hsl(var(--foreground))" }}>{value}</p>
      {hint && <p className="text-xs mt-2" style={accent ? { opacity: .7 } : { color: "hsl(var(--muted-foreground))" }}>{hint}</p>}
    </div>
  </div>
);

/** White panel with a header row. */
export const VenuePanel = ({ title, action, children, className = "" }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) => (
  <section className={`rounded-[2rem] bg-card border border-border p-6 md:p-8 shadow-[var(--venue-shadow)] ${className}`}>
    {(title || action) && (
      <div className="flex items-center justify-between gap-4 mb-6">
        {title && <h2 className="text-xl font-extrabold text-foreground">{title}</h2>}
        {action}
      </div>
    )}
    {children}
  </section>
);

/** Small section heading between blocks. */
export const SectionLabel = ({ children }: { children: ReactNode }) => (
  <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">{children}</h2>
);
