// Shared FamePass email helpers (Resend via Lovable connector gateway).

export const FAMEPASS_FROM = "FamePass <notify@famepass.app>";

export function firstName(fullName?: string | null): string {
  const n = (fullName ?? "").trim();
  if (!n) return "there";
  return n.split(/\s+/)[0];
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string
  ));
}

/** Standard FamePass email layout — matches the existing admin notification style. */
export function emailLayout(opts: {
  heading: string;
  /** Already-escaped/safe HTML paragraphs. */
  bodyHtml: string;
  button?: { label: string; url: string };
}): string {
  const button = opts.button
    ? `<p style="margin-top:24px;">
        <a href="${opts.button.url}" style="background:#b8860b;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold;">${escapeHtml(opts.button.label)}</a>
      </p>
      <p style="font-size:13px;color:#666;margin-top:24px;">If the button doesn't work, open ${opts.button.url}</p>`
    : "";
  return `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#ffffff;color:#111;">
      <h1 style="color:#b8860b;margin:0 0 12px;">${escapeHtml(opts.heading)}</h1>
      ${opts.bodyHtml}
      ${button}
      <p style="font-size:16px;line-height:1.5;margin-top:24px;">Best,<br/>The FamePass Team</p>
    </div>`;
}

export function paragraph(text: string): string {
  return `<p style="font-size:16px;line-height:1.5;">${escapeHtml(text)}</p>`;
}

export function quote(text: string): string {
  return `<blockquote style="font-size:16px;line-height:1.5;border-left:3px solid #b8860b;margin:16px 0;padding:4px 0 4px 12px;color:#333;">${escapeHtml(text)}</blockquote>`;
}

/**
 * Sends an email through the Resend connector gateway.
 * Never throws — returns a result object so callers can ignore failures.
 */
export async function sendEmail(args: { to: string; subject: string; html: string }): Promise<{ ok: boolean; error?: string }> {
  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.error("Email skipped — missing RESEND_API_KEY");
      return { ok: false, error: "Email service is not configured" };
    }
    if (!args.to) {
      console.error("Email skipped — no recipient address");
      return { ok: false, error: "No recipient" };
    }
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({ from: FAMEPASS_FROM, to: [args.to], subject: args.subject, html: args.html }),
    });
    if (!res.ok) {
      const details = await res.text();
      console.error(`Resend request failed [${res.status}]: ${details}`);
      return { ok: false, error: `Provider error ${res.status}: ${details}` };
    }
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("sendEmail failed:", message);
    return { ok: false, error: message };
  }
}
