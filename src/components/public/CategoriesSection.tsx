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
    <section id="categories" className="py-24 relative">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-14">
          <h2 className="font-display font-normal leading-[1.05] tracking-tight text-4xl sm:text-5xl lg:text-6xl">
            Browse by <span className="italic gradient-text">Category</span>
          </h2>
          <p className="text-muted-foreground mt-5 text-lg leading-relaxed">
            Explore venues and offers across every vertical — from beauty to wellness, dining to lifestyle.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => onSelect(null)}
            className={`px-5 py-2.5 rounded-full border text-sm font-medium transition-all ${
              !selected
                ? "bg-gold text-accent-foreground border-gold"
                : "glass border-border hover:border-gold/40 text-foreground/80"
            }`}
          >
            All
          </button>
          {categories?.map((cat: any) => (
            <button
              key={cat.id}
              onClick={() => onSelect(cat.name)}
              className={`px-5 py-2.5 rounded-full border text-sm font-medium capitalize transition-all ${
                selected === cat.name
                  ? "bg-gold text-accent-foreground border-gold"
                  : "glass border-border hover:border-gold/40 text-foreground/80"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategoriesSection;
