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

export interface Lead {
  id: string;
  venue_name: string;
  category: string | null;
  area: string | null;
  city: string | null;
  address: string | null;
  contact_name: string;
  contact_role: string | null;
  phone: string;
  instagram_handle: string | null;
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
