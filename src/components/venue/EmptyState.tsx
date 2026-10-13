import { ReactNode } from "react";
import { ClipboardList } from "lucide-react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  variant?: "default" | "dashed-orange";
}

export const EmptyState = ({ icon, title, description, action, variant = "default" }: EmptyStateProps) => {
  if (variant === "dashed-orange") {
    return (
      <div className="border-2 border-dashed rounded-xl p-8 text-center" style={{ borderColor: "#fbbf78" }}>
        <div className="flex items-center justify-center gap-2 text-[#c2410c]">
          {icon}
          <span className="text-sm font-medium">{title}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[2rem] bg-card border border-border px-6 py-16 md:py-20 text-center shadow-[var(--venue-shadow)]">
      {icon && <div className="mx-auto mb-6 flex items-center justify-center">{icon}</div>}
      <h3 className="text-2xl font-extrabold text-foreground mb-2">{title}</h3>
      {description && <p className="text-muted-foreground mb-7 max-w-md mx-auto leading-relaxed">{description}</p>}
      {action && <div className="flex flex-wrap justify-center gap-3 [&_button]:rounded-full [&_button]:h-12 [&_button]:px-6 [&_button]:font-bold [&_a]:rounded-full">{action}</div>}
    </div>
  );
};

export const ClipboardIllustration = () => (
  <span className="flex items-center justify-center w-20 h-20 rounded-full"
    style={{ background: "radial-gradient(circle at 30% 30%, hsl(var(--gold-light)), hsl(var(--primary)))", boxShadow: "0 0 0 10px hsl(var(--primary) / .12)" }}>
    <ClipboardList className="w-8 h-8" style={{ color: "hsl(var(--venue-brand))" }} />
  </span>
);

export const LegacyClipboardIllustration = () => (
  <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
    <rect x="32" y="22" width="56" height="72" rx="6" fill="#fce7eb" stroke="#b8923a" strokeWidth="2"/>
    <rect x="46" y="14" width="28" height="14" rx="3" fill="#b8923a"/>
    <rect x="44" y="42" width="32" height="3" rx="1.5" fill="#b8923a" opacity="0.4"/>
    <rect x="44" y="52" width="24" height="3" rx="1.5" fill="#b8923a" opacity="0.3"/>
    <rect x="44" y="62" width="28" height="3" rx="1.5" fill="#b8923a" opacity="0.3"/>
    <rect x="22" y="32" width="56" height="72" rx="6" fill="white" stroke="#b8923a" strokeWidth="2"/>
    <rect x="36" y="24" width="28" height="14" rx="3" fill="#b8923a"/>
    <rect x="34" y="52" width="32" height="3" rx="1.5" fill="#b8923a" opacity="0.5"/>
    <rect x="34" y="62" width="24" height="3" rx="1.5" fill="#b8923a" opacity="0.4"/>
    <rect x="34" y="72" width="28" height="3" rx="1.5" fill="#b8923a" opacity="0.4"/>
    <rect x="34" y="82" width="20" height="3" rx="1.5" fill="#b8923a" opacity="0.4"/>
  </svg>
);
