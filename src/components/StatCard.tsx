import { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: string;
  trendUp?: boolean;
  /**
   * Red is reserved for an actual problem (an overdue count, an SLA breach) —
   * pass "danger" explicitly for those. A trend that's merely "below target
   * so far" (trendUp=false, the default for e.g. "0 this week") renders
   * neutral grey with no arrow, not a down-arrow in red, which previously
   * made every card alarm-colored and drowned out the ones that mattered
   * (Adnan, "CRM DESIGN": "Every KPI card currently shows a red down arrow,
   * so nothing stands out").
   */
  tone?: "danger";
}

const StatCard = ({ title, value, icon, trend, trendUp, tone }: StatCardProps) => (
  <div className="gradient-card rounded-xl border border-border p-6 glow-purple transition-all hover:border-gold/20">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-muted-foreground font-medium">{title}</p>
        <p className="text-3xl font-display font-bold text-foreground mt-2">{value}</p>
        {trend && (
          <p className={`text-xs mt-2 font-medium ${
            tone === "danger" ? "text-destructive" : trendUp ? "text-success" : "text-muted-foreground"
          }`}>
            {tone === "danger" ? "⚠ " : trendUp ? "↑ " : ""}{trend}
          </p>
        )}
      </div>
      <div className="p-3 rounded-lg bg-primary/10 text-gold">{icon}</div>
    </div>
  </div>
);

export default StatCard;
