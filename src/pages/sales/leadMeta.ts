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
