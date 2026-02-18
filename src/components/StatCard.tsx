import { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: string;
  trendUp?: boolean;
}

const StatCard = ({ title, value, icon, trend, trendUp }: StatCardProps) => (
  <div className="gradient-card rounded-xl border border-border p-6 glow-purple transition-all hover:border-gold/20">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-muted-foreground font-medium">{title}</p>
        <p className="text-3xl font-display font-bold text-foreground mt-2">{value}</p>
        {trend && (
          <p className={`text-xs mt-2 font-medium ${trendUp ? "text-success" : "text-destructive"}`}>
            {trendUp ? "↑" : "↓"} {trend}
          </p>
        )}
      </div>
      <div className="p-3 rounded-lg bg-primary/10 text-gold">{icon}</div>
    </div>
  </div>
);

export default StatCard;
