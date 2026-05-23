import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Leaf,
  Sparkles,
  Shirt,
  Smartphone,
  UtensilsCrossed,
  PawPrint,
  Baby,
  Cpu,
  Home,
  Tag,
  LayoutGrid,
} from "lucide-react";
import { useState, type ComponentType } from "react";

interface Props {
  selected: string | null;
  onSelect: (cat: string | null) => void;
}

const iconMap: Record<string, ComponentType<{ className?: string }>> = {
  health: Leaf,
  wellness: Leaf,
  beauty: Sparkles,
  cosmetics: Sparkles,
  apparel: Shirt,
  fashion: Shirt,
  apps: Smartphone,
  digital: Smartphone,
  food: UtensilsCrossed,
  beverage: UtensilsCrossed,
  dining: UtensilsCrossed,
  pets: PawPrint,
  children: Baby,
  family: Baby,
  technology: Cpu,
  gadgets: Cpu,
  home: Home,
  lifestyle: Home,
};

const getIcon = (name: string) => {
  const key = Object.keys(iconMap).find((k) => name.toLowerCase().includes(k));
  return key ? iconMap[key] : Tag;
};

const CategoriesSection = ({ selected, onSelect }: Props) => {
  const [tab, setTab] = useState<"categories" | "campaigns">("categories");

  const { data: categories } = useQuery({
    queryKey: ["public-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*").eq("is_active", true);
      return data ?? [];
    },
  });

  return (
    <section id="categories" className="py-24 relative">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <h2 className="font-display font-normal leading-[1.05] tracking-tight text-4xl sm:text-5xl lg:text-6xl">
            Browse by <span className="italic gradient-text">Category</span>
          </h2>
          <p className="text-muted-foreground mt-5 text-lg leading-relaxed">
            Explore venues and offers across every vertical — from beauty to wellness, dining to lifestyle.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex items-center gap-1 p-1.5 rounded-full glass border border-border">
            {(["categories", "campaigns"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-6 py-2.5 rounded-full text-sm font-semibold capitalize transition-all ${
                  tab === t
                    ? "bg-gold text-accent-foreground shadow-lg shadow-primary/20"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Category pills with icons */}
        <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
          <button
            onClick={() => onSelect(null)}
            className={`inline-flex items-center gap-2.5 px-6 py-3.5 rounded-full border text-sm font-semibold transition-all ${
              !selected
                ? "bg-foreground text-background border-foreground shadow-xl"
                : "glass border-border hover:border-gold/50 text-foreground/80 hover:-translate-y-0.5"
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            All
          </button>
          {categories?.map((cat: any) => {
            const Icon = getIcon(cat.name);
            const active = selected === cat.name;
            return (
              <button
                key={cat.id}
                onClick={() => onSelect(cat.name)}
                className={`inline-flex items-center gap-2.5 px-6 py-3.5 rounded-full border text-sm font-semibold capitalize transition-all ${
                  active
                    ? "bg-foreground text-background border-foreground shadow-xl"
                    : "glass border-border hover:border-gold/50 text-foreground/80 hover:-translate-y-0.5"
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? "" : "text-gold"}`} />
                {cat.name}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default CategoriesSection;
