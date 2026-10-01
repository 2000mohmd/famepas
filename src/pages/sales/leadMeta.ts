export const STAGES = [
  { key: "new", label: "New" },
  { key: "contacted", label: "Contacted" },
  { key: "meeting_booked", label: "Meeting booked" },
  { key: "meeting_done", label: "Meeting done" },
  { key: "signed_up", label: "Signed up" },
  { key: "approved", label: "Approved" },
  { key: "live", label: "Live" },
  { key: "lost", label: "Lost" },
] as const;

export type Stage = (typeof STAGES)[number]["key"];

/** Stages that require a next action + date, mirroring the DB check constraint. */
export const isOpenStage = (stage: string) => stage !== "live" && stage !== "lost";

export const SOURCES = [
  { key: "walk_in", label: "Walk-in" },
  { key: "referral", label: "Referral" },
  { key: "instagram", label: "Instagram" },
  { key: "google_maps", label: "Google Maps" },
  { key: "inbound_signup", label: "Inbound signup" },
  { key: "event", label: "Event" },
] as const;

export const LOST_REASONS = [
  { key: "price", label: "Price" },
  { key: "no_interest", label: "No interest" },
  { key: "bad_timing", label: "Bad timing" },
  { key: "closed", label: "Closed down" },
  { key: "other", label: "Other" },
] as const;

export const ACTIVITY_TYPES = [
  { key: "call", label: "Call" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "visit", label: "Visit" },
  { key: "meeting", label: "Meeting" },
  { key: "note", label: "Note" },
] as const;

export const PRICE_LEVELS = [
  { key: "1", label: "$" },
  { key: "2", label: "$$" },
  { key: "3", label: "$$$" },
  { key: "4", label: "$$$$" },
] as const;

export interface Lead {
  id: string;
  venue_name: string;
  category: string | null;
  area: string | null;
  city: string | null;
  address: string | null;
  maps_place_id: string | null;
  contact_name: string;
  contact_role: string | null;
  phone: string;
  instagram_handle: string | null;
  instagram_followers: number | null;
  google_rating: number | null;
  google_review_count: number | null;
  price_level: number | null;
  plan_pitched_id: string | null;
  source: string;
  stage: Stage;
  owner_id: string;
  next_action: string | null;
  next_action_date: string | null;
  lost_reason: string | null;
  notes: string | null;
  venue_id: string | null;
  created_at: string;
  stage_changed_at: string;
}

export interface LeadActivity {
  id: string;
  lead_id: string;
  user_id: string | null;
  type: string;
  outcome: string | null;
  happened_at: string;
}

export const stageLabel = (key: string) => STAGES.find((s) => s.key === key)?.label ?? key;
export const sourceLabel = (key: string) => SOURCES.find((s) => s.key === key)?.label ?? key;
export const lostReasonLabel = (key: string) => LOST_REASONS.find((s) => s.key === key)?.label ?? key;

/** Local-midnight ISO date (YYYY-MM-DD); toISOString() would shift Beirut dates back a day. */
export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const isOverdue = (lead: Pick<Lead, "stage" | "next_action_date">) =>
  isOpenStage(lead.stage) && !!lead.next_action_date && lead.next_action_date < todayISO();

export const isDueToday = (lead: Pick<Lead, "stage" | "next_action_date">) =>
  isOpenStage(lead.stage) && lead.next_action_date === todayISO();

/** Excel opens CSVs by locale, so quote anything that could be mis-split. */
const csvCell = (value: unknown) => {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const toCsv = (headers: string[], rows: unknown[][]) =>
  [headers, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");

export const median = (values: number[]) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

/** Days each lead has been sitting in the stage it's in now. */
export const daysInStage = (lead: Pick<Lead, "stage_changed_at">, now = Date.now()) =>
  Math.floor((now - new Date(lead.stage_changed_at).getTime()) / 86400000);

export interface ScoreConfig {
  weights: {
    category: number; area: number; google_rating: number;
    google_reviews: number; instagram_followers: number; price_level: number;
  };
  preferred_categories: string[];
  preferred_areas: string[];
  targets: { google_reviews: number; instagram_followers: number };
}

export const DEFAULT_SCORE_CONFIG: ScoreConfig = {
  weights: { category: 20, area: 20, google_rating: 20, google_reviews: 15, instagram_followers: 15, price_level: 10 },
  preferred_categories: [],
  preferred_areas: [],
  targets: { google_reviews: 200, instagram_followers: 10000 },
};

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/**
 * 0–100, or null when the lead carries none of the scored data — null shows as
 * "—" rather than a zero, which would read as "bad lead" instead of "unknown".
 * Each component only counts if it has both a weight and a value, so the score
 * is a weighted average of what's actually known.
 */
export const leadScore = (
  lead: Pick<Lead, "category" | "area" | "google_rating" | "google_review_count" | "instagram_followers" | "price_level">,
  cfg: ScoreConfig = DEFAULT_SCORE_CONFIG,
): number | null => {
  const parts: { weight: number; value: number }[] = [];
  const add = (weight: number, value: number) => {
    if (weight > 0) parts.push({ weight, value: clamp01(value) });
  };

  // An empty preference list means "no preference stated yet", so category and
  // area sit out rather than scoring every lead zero.
  if (cfg.preferred_categories.length && lead.category) {
    add(cfg.weights.category, cfg.preferred_categories.includes(lead.category) ? 1 : 0);
  }
  if (cfg.preferred_areas.length && lead.area) {
    add(cfg.weights.area, cfg.preferred_areas.includes(lead.area) ? 1 : 0);
  }
  if (lead.google_rating !== null && lead.google_rating !== undefined) {
    add(cfg.weights.google_rating, lead.google_rating / 5);
  }
  if (lead.google_review_count !== null && lead.google_review_count !== undefined) {
    add(cfg.weights.google_reviews, lead.google_review_count / (cfg.targets.google_reviews || 1));
  }
  if (lead.instagram_followers !== null && lead.instagram_followers !== undefined) {
    add(cfg.weights.instagram_followers, lead.instagram_followers / (cfg.targets.instagram_followers || 1));
  }
  if (lead.price_level !== null && lead.price_level !== undefined) {
    add(cfg.weights.price_level, lead.price_level / 4);
  }

  const totalWeight = parts.reduce((sum, p) => sum + p.weight, 0);
  if (!totalWeight) return null;
  return Math.round((parts.reduce((sum, p) => sum + p.weight * p.value, 0) / totalWeight) * 100);
};
