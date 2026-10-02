import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// A venue owner creates a scan-only login for their door staff.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Not signed in" }, 401);
    const caller = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await caller.auth.getUser();
    if (!user) return json({ error: "Not signed in" }, 401);

    const { venue_id, email, password, full_name } = await req.json();
    if (!venue_id || !email || !full_name || !password || String(password).length < 8) {
      return json({ error: "Name, email and a password of at least 8 characters are required" }, 400);
    }

    // Only the venue's own owner (or a platform admin) may add staff to it.
    const { data: venue } = await admin.from("venues").select("id, owner_id").eq("id", venue_id).maybeSingle();
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!venue || (venue.owner_id !== user.id && !isAdmin)) return json({ error: "Not your venue" }, 403);

    // The role is assigned here, server-side, not passed through signup
    // metadata — the signup trigger deliberately doesn't grant it.
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: String(email).trim().toLowerCase(),
      password,
      email_confirm: true,
      // A role the trigger doesn't recognise, so it neither grants it nor
      // falls back to making this account a creator.
      user_metadata: { full_name: String(full_name).trim(), role: "venue_staff" },
    });
    if (createErr || !created.user) {
      const exists = /already|registered|exists/i.test(createErr?.message ?? "");
      return json({ error: exists ? "That email already has a FamePass account" : createErr?.message ?? "Couldn't create the login" }, 200);
    }
    const staffId = created.user.id;

    // The signup trigger defaults a role-less account to influencer; door
    // staff must not carry that role.
    await admin.from("user_roles").delete().eq("user_id", staffId);
    await admin.from("influencer_settings").delete().eq("influencer_id", staffId);
    await admin.from("reward_points").delete().eq("user_id", staffId);

    const { error: roleErr } = await admin.from("user_roles").insert({ user_id: staffId, role: "venue_staff" });
    const { error: linkErr } = await admin.from("venue_staff").insert({ venue_id, user_id: staffId, added_by: user.id });
    if (roleErr || linkErr) {
      await admin.auth.admin.deleteUser(staffId);
      return json({ error: (roleErr ?? linkErr)!.message }, 500);
    }
    await admin.from("profiles").update({ approval_status: "approved" }).eq("user_id", staffId);

    return json({ ok: true, user_id: staffId });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
