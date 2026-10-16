// Formatting for the sales activity email (Sarah's request, 2026-10-16).
// Events come from public.claim_sales_activity_digest().
import { emailLayout, escapeHtml } from "../_shared/email.ts";

export type DigestEvent = {
  at: string; kind: string; actor_id: string | null; actor: string;
  lead_id: string; lead: string; detail: string | null; lost_reason?: string | null;
};

const STAGES: Record<string, string> = {
  new: "New", contacted: "Contacted", meeting_booked: "Meeting booked", meeting_done: "Meeting done",
  signed_up: "Signed up", approved: "Approved", live: "Live", lost: "Lost",
};
const TYPES: Record<string, string> = { call: "Call", whatsapp: "WhatsApp", visit: "Visit", meeting: "Meeting", note: "Note" };
const stage = (k: string) => STAGES[k.trim()] ?? k.trim();

/** One line per event, plain text (escaped later). */
export function describe(e: DigestEvent): string {
  const lead = e.lead || "a lead";
  switch (e.kind) {
    case "lead_added": return `Added a new lead: ${lead}${e.detail && e.detail !== "new" ? ` (${stage(e.detail)})` : ""}`;
    case "signup_lead": return `New venue sign-up became a lead: ${lead}`;
    case "stage_change": {
      const [from, to] = String(e.detail ?? "").split("->").map((s) => s.trim());
      if (to === "lost") return `Marked ${lead} as Lost${e.lost_reason ? ` (${e.lost_reason})` : ""}`;
      return to ? `Moved ${lead} from ${stage(from || "?")} to ${stage(to)}` : `Changed the stage of ${lead}`;
    }
    default: {
      const type = TYPES[e.kind] ?? e.kind;
      return `${type} with ${lead}${e.detail ? `: ${e.detail}` : ""}`;
    }
  }
}

/** Kinds Sarah asked for (owner changes are bulk admin actions, not rep activity). */
export const WANTED = new Set(["lead_added", "signup_lead", "stage_change", "call", "whatsapp", "visit", "meeting", "note"]);

/** Email for one recipient: their own actions left out, grouped by rep, oldest first. null if nothing to send. */
export function buildEmail(events: DigestEvent[], recipientId: string | null, siteUrl = "https://famepass.app") {
  const mine = events.filter((e) => WANTED.has(e.kind) && (!recipientId || e.actor_id !== recipientId));
  if (!mine.length) return null;
  const byRep = new Map<string, DigestEvent[]>();
  for (const e of mine) byRep.set(e.actor, [...(byRep.get(e.actor) ?? []), e]);
  const time = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Beirut" });
  const sections = [...byRep.entries()].map(([rep, list]) =>
    `<p style="font-size:16px;margin:20px 0 6px;"><strong>${escapeHtml(rep)}</strong></p>` +
    `<ul style="margin:0;padding-left:20px;font-size:15px;line-height:1.6;">` +
    list.map((e) => `<li>${escapeHtml(time(e.at))} · ${escapeHtml(describe(e))}</li>`).join("") +
    `</ul>`).join("");
  const n = mine.length;
  return {
    subject: `Sales activity: ${n} new update${n === 1 ? "" : "s"}`,
    html: emailLayout({
      heading: "New sales activity",
      bodyHtml: sections,
      button: { label: "Open the sales dashboard", url: `${siteUrl}/sales/dashboard` },
    }),
  };
}
