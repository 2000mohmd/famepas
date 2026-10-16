// deno test supabase/functions/sales-activity-digest/digest_test.ts
import { buildEmail, describe, type DigestEvent } from "./digest.ts";

const ev = (p: Partial<DigestEvent>): DigestEvent => ({ at: "2026-10-16T10:05:00Z", kind: "call", actor_id: "rep-1", actor: "Tony", lead_id: "L1", lead: "Cafe Tony", detail: null, ...p });
const eq = (a: unknown, b: unknown, what: string) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${what}: got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`); };

Deno.test("describes every kind Sarah listed", () => {
  eq(describe(ev({ kind: "lead_added" })), "Added a new lead: Cafe Tony", "new lead");
  eq(describe(ev({ kind: "signup_lead" })), "New venue sign-up became a lead: Cafe Tony", "signup lead");
  eq(describe(ev({ kind: "stage_change", detail: "new -> meeting_done" })), "Moved Cafe Tony from New to Meeting done", "stage");
  eq(describe(ev({ kind: "stage_change", detail: "contacted -> lost", lost_reason: "Too expensive" })), "Marked Cafe Tony as Lost (Too expensive)", "lost");
  eq(describe(ev({ kind: "whatsapp", detail: "interested · send menu" })), "WhatsApp with Cafe Tony: interested · send menu", "whatsapp");
  for (const k of ["call", "visit", "meeting", "note"]) if (!describe(ev({ kind: k })).includes("Cafe Tony")) throw new Error(k);
});

Deno.test("email groups by rep, skips the recipient's own actions and owner changes", () => {
  const events = [
    ev({ actor: "Tony", actor_id: "rep-1" }),
    ev({ actor: "Rita", actor_id: "rep-2", kind: "visit" }),
    ev({ actor: "Sarah", actor_id: "sarah", kind: "note" }),
    ev({ actor: "Admin", actor_id: "adm", kind: "owner_change", detail: "A -> B" }),
  ];
  const mail = buildEmail(events, "sarah")!;
  eq(mail.subject, "Sales activity: 2 new updates", "subject");
  if (!mail.html.includes("Tony") || !mail.html.includes("Rita")) throw new Error("reps missing");
  if (mail.html.includes("A -&gt; B") || mail.html.includes(">Sarah<")) throw new Error("owner change or own action leaked");
});

Deno.test("nothing to send returns null; HTML is escaped", () => {
  eq(buildEmail([ev({ actor_id: "sarah" })], "sarah"), null, "own only");
  eq(buildEmail([], "sarah"), null, "empty");
  const mail = buildEmail([ev({ lead: "<script>x</script>" })], "sarah")!;
  if (mail.html.includes("<script>")) throw new Error("not escaped");
});

Deno.test("new lead mentions its starting stage unless New", () => {
  eq(describe(ev({ kind: "lead_added", detail: "meeting_done" })), "Added a new lead: Cafe Tony (Meeting done)", "with stage");
  eq(describe(ev({ kind: "lead_added", detail: "new" })), "Added a new lead: Cafe Tony", "new");
});
