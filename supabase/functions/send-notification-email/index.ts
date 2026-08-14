import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { emailLayout, firstName, paragraph, quote, sendEmail } from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const LOGIN_URL = "https://famepass.app/login";
const VENUE_BOOKINGS_URL = "https://famepass.app/venue/bookings";
const VENUE_CONTENT_URL = "https://famepass.app/venue/content";

type Admin = ReturnType<typeof createClient>;

async function authEmail(admin: Admin, userId?: string | null): Promise<string | null> {
  if (!userId) return null;
  const { data } = await admin.auth.admin.getUserById(userId);
  return data?.user?.email ?? null;
}

async function influencerRecipient(admin: Admin, userId: string) {
  const { data: profile } = await admin.from("profiles").select("full_name").eq("user_id", userId).maybeSingle();
  return { email: await authEmail(admin, userId), name: firstName(profile?.full_name), fullName: profile?.full_name ?? "An influencer" };
}

async function venueRecipient(admin: Admin, venueId: string) {
  const { data: venue } = await admin
    .from("venues")
    .select("name, email, owner_id, contact_person_name")
    .eq("id", venueId)
    .maybeSingle();
  if (!venue) return null;
  const email = venue.email ?? (await authEmail(admin, venue.owner_id));
  return {
    email,
    ownerId: venue.owner_id as string,
    venueName: (venue.name as string) ?? "your venue",
    name: firstName((venue.contact_person_name as string) ?? (venue.name as string)),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!token) return json({ success: false, error: "Unauthorized" }, 401);
    const { data: userRes, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userRes?.user) return json({ success: false, error: "Unauthorized" }, 401);
    const callerId = userRes.user.id;
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: callerId, _role: "admin" });

    const body = await req.json().catch(() => ({}));
    const event: string = body?.event ?? "";

    const requireAdmin = () => !!isAdmin;

    switch (event) {
      case "venue_approved":
      case "venue_rejected": {
        if (!requireAdmin()) return json({ success: false, error: "Forbidden" }, 403);
        const v = await venueRecipient(admin, body.venue_id);
        if (!v?.email) return json({ success: false, error: "No email on record" });
        const approved = event === "venue_approved";
        const html = emailLayout({
          heading: approved ? "You're approved 🎉" : "Update on your application",
          bodyHtml:
            paragraph(`Hi ${v.name},`) +
            (approved
              ? paragraph("Great news — your venue has been approved on FamePass. You can now log in and start posting offers.")
              : paragraph("Thank you for your interest in FamePass. After review, we're unable to approve your venue application at this time. If you have questions, reply to this email.")),
          button: approved ? { label: "Sign in to FamePass", url: LOGIN_URL } : undefined,
        });
        const r = await sendEmail({
          to: v.email,
          subject: approved ? "Your FamePass venue account is approved!" : "Update on your FamePass application",
          html,
        });
        return json({ success: r.ok, error: r.error });
      }

      case "influencer_approved":
      case "influencer_rejected": {
        if (!requireAdmin()) return json({ success: false, error: "Forbidden" }, 403);
        const inf = await influencerRecipient(admin, body.user_id);
        if (!inf.email) return json({ success: false, error: "No email on record" });
        const approved = event === "influencer_approved";
        const html = emailLayout({
          heading: approved ? "You're approved 🎉" : "Update on your application",
          bodyHtml:
            paragraph(`Hi ${inf.name},`) +
            (approved
              ? paragraph("Your FamePass account has been activated. Log in now to start browsing offers from venues near you.")
              : paragraph("Thank you for applying to FamePass. After review, we're unable to activate your account at this time. If you have questions, reply to this email.")),
          button: approved ? { label: "Sign in to FamePass", url: LOGIN_URL } : undefined,
        });
        const r = await sendEmail({
          to: inf.email,
          subject: approved ? "You're approved on FamePass!" : "Update on your FamePass application",
          html,
        });
        return json({ success: r.ok, error: r.error });
      }

      case "application_submitted":
      case "application_approved":
      case "application_rejected": {
        const { data: red } = await admin
          .from("offer_redemptions")
          .select("id, influencer_id, offer_id")
          .eq("id", body.redemption_id)
          .maybeSingle();
        if (!red) return json({ success: false, error: "Application not found" });
        const { data: offer } = await admin.from("offers").select("title, venue_id").eq("id", red.offer_id).maybeSingle();
        if (!offer) return json({ success: false, error: "Offer not found" });
        const v = await venueRecipient(admin, offer.venue_id as string);
        const inf = await influencerRecipient(admin, red.influencer_id as string);
        const offerTitle = (offer.title as string) ?? "your offer";

        if (event === "application_submitted") {
          if (!isAdmin && callerId !== red.influencer_id) return json({ success: false, error: "Forbidden" }, 403);
          if (!v?.email) return json({ success: false, error: "No email on record" });
          const html = emailLayout({
            heading: "New applicant for your offer",
            bodyHtml:
              paragraph(`Hi ${v.name},`) +
              paragraph(`${inf.fullName} just applied to your offer "${offerTitle}". Review their profile and respond in your FamePass dashboard.`),
            button: { label: "Review application", url: VENUE_BOOKINGS_URL },
          });
          const r = await sendEmail({ to: v.email, subject: "New applicant for your offer", html });
          return json({ success: r.ok, error: r.error });
        }

        if (!isAdmin && callerId !== v?.ownerId) return json({ success: false, error: "Forbidden" }, 403);
        if (!inf.email) return json({ success: false, error: "No email on record" });
        const approved = event === "application_approved";
        const html = emailLayout({
          heading: approved ? "You're confirmed!" : "Update on your application",
          bodyHtml:
            paragraph(`Hi ${inf.name},`) +
            (approved
              ? paragraph(`${v?.venueName} approved your application for "${offerTitle}". Check the app for next steps and deliverable details.`)
              : paragraph(`${v?.venueName} wasn't able to move forward with your application for "${offerTitle}" this time. Keep browsing — new offers are added regularly.`)),
          button: { label: approved ? "Open FamePass" : "Browse offers", url: LOGIN_URL },
        });
        const r = await sendEmail({
          to: inf.email,
          subject: approved ? `You're confirmed for ${offerTitle}!` : "Update on your FamePass application",
          html,
        });
        return json({ success: r.ok, error: r.error });
      }

      case "content_submitted":
      case "content_approved":
      case "content_rejected": {
        const { data: del } = await admin
          .from("deliverables")
          .select("id, influencer_id, booking_id, feedback, rejection_note")
          .eq("id", body.deliverable_id)
          .maybeSingle();
        if (!del) return json({ success: false, error: "Deliverable not found" });
        const { data: booking } = await admin
          .from("bookings")
          .select("venue_id, offer_id")
          .eq("id", del.booking_id)
          .maybeSingle();
        if (!booking) return json({ success: false, error: "Booking not found" });
        const { data: offer } = booking.offer_id
          ? await admin.from("offers").select("title").eq("id", booking.offer_id).maybeSingle()
          : { data: null as any };
        const offerTitle = (offer?.title as string) ?? "your collaboration";
        const v = await venueRecipient(admin, booking.venue_id as string);
        const inf = await influencerRecipient(admin, del.influencer_id as string);

        if (event === "content_submitted") {
          if (!isAdmin && callerId !== del.influencer_id) return json({ success: false, error: "Forbidden" }, 403);
          if (!v?.email) return json({ success: false, error: "No email on record" });
          const html = emailLayout({
            heading: "New content submitted for review",
            bodyHtml:
              paragraph(`Hi ${v.name},`) +
              paragraph(`${inf.fullName} just submitted content for "${offerTitle}". Review it in your FamePass dashboard.`),
            button: { label: "Review content", url: VENUE_CONTENT_URL },
          });
          const r = await sendEmail({ to: v.email, subject: "New content submitted for review", html });
          return json({ success: r.ok, error: r.error });
        }

        if (!isAdmin && callerId !== v?.ownerId) return json({ success: false, error: "Forbidden" }, 403);
        if (!inf.email) return json({ success: false, error: "No email on record" });
        const approved = event === "content_approved";
        const feedback: string = body.feedback ?? del.feedback ?? del.rejection_note ?? "";
        const html = emailLayout({
          heading: approved ? "Your content was approved!" : "Feedback on your content submission",
          bodyHtml:
            paragraph(`Hi ${inf.name},`) +
            (approved
              ? paragraph(`${v?.venueName} approved your content for "${offerTitle}". Nice work!`)
              : paragraph(`${v?.venueName} requested changes to your content for "${offerTitle}":`) +
                (feedback ? quote(feedback) : "") +
                paragraph("Please review and resubmit in the app.")),
          button: { label: "Open FamePass", url: LOGIN_URL },
        });
        const r = await sendEmail({
          to: inf.email,
          subject: approved ? "Your content was approved!" : "Feedback on your content submission",
          html,
        });
        return json({ success: r.ok, error: r.error });
      }

      default:
        return json({ success: false, error: `Unknown event: ${event}` }, 400);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("send-notification-email failed:", message);
    return json({ success: false, error: message }, 200);
  }
});
