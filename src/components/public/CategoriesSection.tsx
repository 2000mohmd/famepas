import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  selected: string | null;
  onSelect: (cat: string | null) => void;
}

const CategoriesSection = ({ selected, onSelect }: Props) => {
  const { data: categories } = useQuery({
    queryKey: ["public-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*").eq("is_active", true);
      return data ?? [];
    },
  });

  return (
    <section id="categories" className="py-20 bg-background relative">
      {/* Subtle background accent */}
      <div className="absolute inset-0 bg-gradient-to-b from-card/20 to-transparent pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <p className="text-accent text-sm font-semibold tracking-widest uppercase mb-3">Explore</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-foreground">
            Browse by <span className="text-gold">Category</span>
          </h2>
          <p className="text-muted-foreground mt-4 max-w-lg mx-auto text-base">
            Explore venues and offers across different categories
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-4">
          <button
            onClick={() => onSelect(null)}
            className={`group px-7 py-5 rounded-2xl border transition-all duration-300 flex flex-col items-center gap-3 min-w-[130px] hover:scale-105 ${
              !selected
                ? "bg-accent/15 border-accent/40 shadow-lg shadow-accent/10 scale-105"
                : "bg-card border-border hover:border-accent/30"
            }`}
          >
            <span className="text-3xl">🏠</span>
            <span className="text-sm font-semibold text-foreground">All</span>
          </button>
          {categories?.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onSelect(cat.name)}
              className={`group px-7 py-5 rounded-2xl border transition-all duration-300 flex flex-col items-center gap-3 min-w-[130px] hover:scale-105 ${
                selected === cat.name
                  ? "bg-accent/15 border-accent/40 shadow-lg shadow-accent/10 scale-105"
                  : "bg-card border-border hover:border-accent/30"
              }`}
            >
              <span className="text-3xl">{cat.icon || "🏢"}</span>
              <span className="text-sm font-semibold text-foreground">{cat.name}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategoriesSection;
