import { useMemo, useRef } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Search } from "lucide-react";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

/** Names that don't start A–Z (Arabic, digits, symbols) group under "#". */
const bucketOf = (name: string) => {
  const first = (name.trim()[0] ?? "").toUpperCase();
  return LETTERS.includes(first) ? first : "#";
};

interface Props {
  label: string;
  options: { id: string; name: string }[];
  selected: string[];
  onToggle: (id: string) => void;
  onClear: () => void;
  search: string;
  onSearch: (v: string) => void;
}

const RecipientPicker = ({ label, options, selected, onToggle, onClear, search, onSearch }: Props) => {
  const listRef = useRef<HTMLDivElement>(null);

  const sorted = useMemo(
    () => [...options].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })),
    [options],
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? sorted.filter((o) => o.name.toLowerCase().includes(q)) : sorted;
  }, [sorted, search]);

  // Only letters that actually have someone under them are clickable — a rail
  // full of dead letters is worse than no rail.
  const present = useMemo(() => new Set(visible.map((o) => bucketOf(o.name))), [visible]);

  const jumpTo = (letter: string) => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-bucket="${letter}"]`);
    el?.scrollIntoView({ block: "start", behavior: "smooth" });
  };

  let lastBucket = "";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-muted-foreground">{label}</Label>
        {selected.length > 0 && (
          <button onClick={onClear} className="text-xs text-muted-foreground hover:text-foreground underline">
            Clear {selected.length} selected
          </button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={`Search ${label.toLowerCase()}...`}
          className="pl-10 bg-secondary border-border"
        />
      </div>

      <div className="flex gap-1 rounded-lg border border-border bg-secondary/40">
        <div ref={listRef} className="flex-1 max-h-72 overflow-y-auto p-1">
          {visible.length === 0 ? (
            <p className="text-sm text-muted-foreground p-3">No matches.</p>
          ) : (
            visible.map((o) => {
              const bucket = bucketOf(o.name);
              const isNewBucket = bucket !== lastBucket;
              lastBucket = bucket;
              return (
                <div key={o.id}>
                  {isNewBucket && (
                    <p
                      data-bucket={bucket}
                      className="sticky top-0 bg-card/95 backdrop-blur px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
                    >
                      {bucket}
                    </p>
                  )}
                  <label className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-secondary cursor-pointer">
                    <Checkbox checked={selected.includes(o.id)} onCheckedChange={() => onToggle(o.id)} />
                    <span className="text-sm text-foreground truncate">{o.name}</span>
                  </label>
                </div>
              );
            })
          )}
        </div>

        <div className="flex flex-col items-center justify-start py-1 px-0.5 border-l border-border select-none">
          {["#", ...LETTERS].map((letter) => {
            const active = present.has(letter);
            return (
              <button
                key={letter}
                type="button"
                disabled={!active}
                onClick={() => jumpTo(letter)}
                aria-label={`Jump to ${letter}`}
                className={`text-[9px] leading-[1.15] px-1 ${
                  active ? "text-gold hover:font-bold cursor-pointer" : "text-muted-foreground/30 cursor-default"
                }`}
              >
                {letter}
              </button>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {selected.length === 0
          ? "Tick everyone who should receive this."
          : `${selected.length} selected.`}
      </p>
    </div>
  );
};

export default RecipientPicker;
