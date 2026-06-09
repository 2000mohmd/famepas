import { ReactNode } from "react";

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
    <div className="bg-white border border-border rounded-2xl p-16 text-center">
      {icon && <div className="mx-auto mb-5 flex items-center justify-center text-muted-foreground">{icon}</div>}
      <h3 className="text-xl font-bold text-foreground mb-2">{title}</h3>
      {description && <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">{description}</p>}
      {action}
    </div>
  );
};

export const ClipboardIllustration = () => (
  <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
    <rect x="32" y="22" width="56" height="72" rx="6" fill="#fce7eb" stroke="#e8547a" strokeWidth="2"/>
    <rect x="46" y="14" width="28" height="14" rx="3" fill="#e8547a"/>
    <rect x="44" y="42" width="32" height="3" rx="1.5" fill="#e8547a" opacity="0.4"/>
    <rect x="44" y="52" width="24" height="3" rx="1.5" fill="#e8547a" opacity="0.3"/>
    <rect x="44" y="62" width="28" height="3" rx="1.5" fill="#e8547a" opacity="0.3"/>
    <rect x="22" y="32" width="56" height="72" rx="6" fill="white" stroke="#e8547a" strokeWidth="2"/>
    <rect x="36" y="24" width="28" height="14" rx="3" fill="#e8547a"/>
    <rect x="34" y="52" width="32" height="3" rx="1.5" fill="#e8547a" opacity="0.5"/>
    <rect x="34" y="62" width="24" height="3" rx="1.5" fill="#e8547a" opacity="0.4"/>
    <rect x="34" y="72" width="28" height="3" rx="1.5" fill="#e8547a" opacity="0.4"/>
    <rect x="34" y="82" width="20" height="3" rx="1.5" fill="#e8547a" opacity="0.4"/>
  </svg>
);
