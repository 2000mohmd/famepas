// Supabase Auth "Send Email" hook → routes verification, recovery, magic-link, etc. via Resend.
// Setup (one-time, in Lovable Cloud → Users → Authentication Settings → Hooks → Send Email):
//   1) Enable the Send Email hook
//   2) URL: https://<your-project-ref>.functions.supabase.co/send-auth-email
//   3) Generate the secret and save it as edge function secret SEND_EMAIL_HOOK_SECRET
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, webhook-id, webhook-timestamp, webhook-signature",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

const FROM_EMAIL = Deno.env.get("AUTH_EMAIL_FROM") ?? "FamePass <onboarding@resend.dev>";
const APP_NAME = "FamePass";

function buildEmail(actionType: string, confirmationUrl: string, token: string): { subject: string; html: string } {
  const button = (label: string, url: string) =>
    `<a href="${url}" style="display:inline-block;background:#D4AF37;color:#0b0b0b;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-family:Arial,sans-serif">${label}</a>`;
  const wrap = (title: string, body: string) => `
    <div style="background:#ffffff;padding:32px;font-family:Arial,sans-serif;color:#111;max-width:560px;margin:0 auto">
      <h1 style="font-size:22px;margin:0 0 16px">${title}</h1>
      ${body}
      <p style="font-size:12px;color:#777;margin-top:32px">If you didn't request this, you can ignore this email.</p>
      <p style="font-size:12px;color:#777">— The ${APP_NAME} Team</p>
    </div>`;

  switch (actionType) {
    case "signup":
      return {
        subject: `Confirm your ${APP_NAME} account`,
        html: wrap("Welcome to FamePass 👋", `<p>Click below to verify your email address.</p><p style="margin:24px 0">${button("Verify email", confirmationUrl)}</p><p style="font-size:13px;color:#555">Or use this code: <b>${token}</b></p>`),
      };
    case "recovery":
      return {
        subject: `Reset your ${APP_NAME} password`,
        html: wrap("Password reset", `<p>Use the link below to reset your password.</p><p style="margin:24px 0">${button("Reset password", confirmationUrl)}</p>`),
      };
    case "magiclink":
      return {
        subject: `Your ${APP_NAME} sign-in link`,
        html: wrap("Sign in", `<p>Click to sign in:</p><p style="margin:24px 0">${button("Sign in", confirmationUrl)}</p>`),
      };
    case "invite":
      return {
        subject: `You've been invited to ${APP_NAME}`,
        html: wrap("You're invited", `<p>Accept the invite:</p><p style="margin:24px 0">${button("Accept invite", confirmationUrl)}</p>`),
      };
    case "email_change":
      return {
        subject: `Confirm your new email for ${APP_NAME}`,
        html: wrap("Confirm new email", `<p>Click to confirm your new email.</p><p style="margin:24px 0">${button("Confirm email", confirmationUrl)}</p>`),
      };
    default:
      return {
        subject: `${APP_NAME} notification`,
        html: wrap("Notification", `<p style="margin:24px 0">${button("Open", confirmationUrl)}</p>`),
      };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const HOOK_SECRET = Deno.env.get("SEND_EMAIL_HOOK_SECRET");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured (link the Resend connector)");
    if (!HOOK_SECRET) throw new Error("SEND_EMAIL_HOOK_SECRET not configured");

    const payload = await req.text();
    const headers = Object.fromEntries(req.headers);

    // Verify webhook signature (Supabase uses standard webhooks, secret prefixed with v1,whsec_)
    const wh = new Webhook(HOOK_SECRET.replace(/^v1,whsec_/, ""));
    const event = wh.verify(payload, headers) as {
      user: { email: string };
      email_data: { token: string; token_hash: string; redirect_to: string; email_action_type: string; site_url: string };
    };

    const { token, token_hash, redirect_to, email_action_type, site_url } = event.email_data;
    const confirmationUrl = `${site_url}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`;
    const { subject, html } = buildEmail(email_action_type, confirmationUrl, token);

    const res = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
      },
      body: JSON.stringify({ from: FROM_EMAIL, to: [event.user.email], subject, html }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(`Resend send failed [${res.status}]: ${JSON.stringify(body)}`);

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("send-auth-email error:", msg);
    return new Response(JSON.stringify({ error: msg }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
