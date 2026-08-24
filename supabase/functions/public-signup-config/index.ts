import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Public, read-only signup configuration. Catalog tables are authenticated-only,
// so the signup screens read this whitelisted subset through the service role.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const [settingsRes, categoriesRes, locationsRes] = await Promise.all([
      supabase.rpc("get_public_platform_settings"),
      supabase.from("categories").select("name").eq("is_active", true).order("name"),
      supabase.from("service_locations").select("country").eq("is_active", true),
    ]);

    const settings: Record<string, unknown> = {};
    for (const row of (settingsRes.data ?? []) as { key: string; value: unknown }[]) {
      settings[row.key] = row.value;
    }

    return new Response(
      JSON.stringify({
        settings,
        categories: ((categoriesRes.data ?? []) as { name: string }[]).map((c) => c.name),
        countries: Array.from(
          new Set(((locationsRes.data ?? []) as { country: string | null }[])
            .map((r) => r.country)
            .filter((c): c is string => !!c)),
        ),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (_e) {
    return new Response(JSON.stringify({ error: "Unable to load signup configuration" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
