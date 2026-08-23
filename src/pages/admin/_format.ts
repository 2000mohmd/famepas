// Small helper to turn raw snake_case / db-slug values into readable labels.
const OVERRIDES: Record<string, string> = {
  food_dining: "Food & Dining",
  in_progress: "In Progress",
  pending_review: "Pending Review",
  rising_star: "Rising Star",
};

export function formatLabel(value: string | null | undefined): string {
  if (!value) return "—";
  const key = value.toLowerCase().trim();
  if (OVERRIDES[key]) return OVERRIDES[key];
  return key
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
