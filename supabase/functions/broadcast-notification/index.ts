import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { emailLayout, firstName, paragraph, sendEmail } from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Audience = "all_venues" | "all_influencers" | "venue" | "influencer";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Unauthorized" }, 401);
    const { data: userRes } = await admin.auth.getUser(token);
    if (!userRes?.user) return json({ error: "Unauthorized" }, 401);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: userRes.user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "Admins only" }, 403);

    const body = await req.json();
    const audience: Audience = body.audience;
    const targetId: string | undefined = body.target_id;
    const subject: string = (body.subject ?? "").trim();
    const message: string = (body.message ?? "").trim();
    if (!subject || !message) return json({ error: "Subject and message are required" }, 400);
    if (!audience) return json({ error: "audience is required" }, 400);
    if ((audience === "venue" || audience === "influencer") && !targetId) {
      return json({ error: "target_id is required for a single venue/influencer" }, 400);
    }

    type Recipient = { email: string; name: string };
    let recipients: Recipient[] = [];

    if (audience === "all_venues" || audience === "venue") {
      let q = admin.from("venues").select("email, owner_id, name, contact_person_name");
      if (audience === "venue") q = q.eq("id", targetId);
      const { data: venues } = await q;
      recipients = await Promise.all(
        (venues ?? []).map(async (v: any) => {
          const email = v.email ?? (v.owner_id ? (await admin.auth.admin.getUserById(v.owner_id)).data?.user?.email : null);
          return { email: email ?? "", name: firstName(v.contact_person_name ?? v.name) };
        }),
      );
    } else {
      let ids: string[];
      if (audience === "influencer") {
        ids = [targetId!];
      } else {
        const { data: roles } = await admin.from("user_roles").select("user_id, role");
        const infIds = (roles ?? []).filter((r: any) => r.role === "influencer").map((r: any) => r.user_id);
        const staffIds = new Set((roles ?? []).filter((r: any) => r.role !== "influencer").map((r: any) => r.user_id));
        ids = [...new Set(infIds)].filter((id) => !staffIds.has(id));
      }
      const { data: profiles } = await admin.from("profiles").select("user_id, full_name").in("user_id", ids);
      recipients = await Promise.all(
        ids.map(async (id) => {
          const email = (await admin.auth.admin.getUserById(id)).data?.user?.email ?? "";
          const name = profiles?.find((p: any) => p.user_id === id)?.full_name;
          return { email, name: firstName(name) };
        }),
      );
    }

    recipients = recipients.filter((r) => r.email);
    if (!recipients.length) return json({ error: "No recipients with an email on record" }, 400);

    const results = await Promise.allSettled(
      recipients.map((r) =>
        sendEmail({
          to: r.email,
          subject,
          html: emailLayout({
            heading: subject,
            bodyHtml: paragraph(`Hi ${r.name},`) + paragraph(message),
          }),
        }),
      ),
    );
    const sent = results.filter((r) => r.status === "fulfilled" && (r.value as any).ok).length;

    return json({ ok: true, sent, total: recipients.length });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
