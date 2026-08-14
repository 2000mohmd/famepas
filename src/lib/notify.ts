import { supabase } from "@/integrations/supabase/client";

type NotifyPayload =
  | { event: "venue_approved" | "venue_rejected"; venue_id: string }
  | { event: "influencer_approved" | "influencer_rejected"; user_id: string }
  | { event: "application_submitted" | "application_approved" | "application_rejected"; redemption_id: string }
  | { event: "content_submitted" | "content_approved"; deliverable_id: string }
  | { event: "content_rejected"; deliverable_id: string; feedback?: string };

/**
 * Fire-and-forget notification email. Never throws — a failed or skipped email
 * must never block the underlying action from completing.
 */
export async function notifyEmail(payload: NotifyPayload): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke("send-notification-email", { body: payload });
    if (error || (data as any)?.success === false) {
      console.error("notifyEmail failed", payload.event, error ?? (data as any)?.error);
      return false;
    }
    return true;
  } catch (e) {
    console.error("notifyEmail threw", payload.event, e);
    return false;
  }
}
