/** Human-readable labels for raw database enum/slug values. */
const OVERRIDES: Record<string, string> = {
  food_dining: "Food & Dining",
  food_and_drink: "Food & Drink",
  health_fitness: "Health & Fitness",
  beauty_spa: "Beauty & Spa",
  in_progress: "In progress",
  pending_review: "Pending review",
  rising_star: "Rising Star",
  top_creator: "Top Creator",
  no_show: "No show",
  checked_in: "Checked in",
  ugc: "UGC",
  qr: "QR",
};

/** snake_case / kebab-case → Title Case, with domain overrides. */
export const prettyLabel = (value?: string | null): string => {
  if (!value) return "—";
  const key = String(value).trim().toLowerCase();
  if (OVERRIDES[key]) return OVERRIDES[key];
  return key
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
};
