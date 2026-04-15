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
    <section id="categories" className="py-20 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-foreground">
            Browse by <span className="text-gold">Category</span>
          </h2>
          <p className="text-muted-foreground mt-3 max-w-lg mx-auto">
            Explore venues and offers across different categories
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-4">
          <button
            onClick={() => onSelect(null)}
            className={`px-6 py-4 rounded-2xl border transition-all duration-300 flex flex-col items-center gap-2 min-w-[120px] ${
              !selected
                ? "bg-accent/15 border-accent/40 shadow-lg shadow-accent/10"
                : "bg-card border-border hover:border-accent/30 hover:bg-card/80"
            }`}
          >
            <span className="text-2xl">🏠</span>
            <span className="text-sm font-medium text-foreground">All</span>
          </button>
          {categories?.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onSelect(cat.name)}
              className={`px-6 py-4 rounded-2xl border transition-all duration-300 flex flex-col items-center gap-2 min-w-[120px] ${
                selected === cat.name
                  ? "bg-accent/15 border-accent/40 shadow-lg shadow-accent/10"
                  : "bg-card border-border hover:border-accent/30 hover:bg-card/80"
              }`}
            >
              <span className="text-2xl">{cat.icon || "🏢"}</span>
              <span className="text-sm font-medium text-foreground">{cat.name}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategoriesSection;
