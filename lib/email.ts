// Resend wrapper. If RESEND_API_KEY is not set, sending is a no-op (logged
// to console). The caller always also shows the invite link in the UI so
// the host can copy/paste it manually until email is configured.
import { logger } from "@/lib/logger";

type SendInviteArgs = {
  to: string;
  inviterName: string;
  tripTitle: string;
  inviteUrl: string;
};

export async function sendInviteEmail(args: SendInviteArgs): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.RESEND_FROM_EMAIL || "GetGoin <onboarding@resend.dev>";

  if (!apiKey) {
    logger.info("email", "RESEND_API_KEY not set — skipping send", {
      to: args.to,
      url: args.inviteUrl,
    });
    return { ok: true };
  }

  const subject = `${args.inviterName} invited you to "${args.tripTitle}"`;
  const html = `
    <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #171717;">
      <h2 style="margin: 0 0 8px;">You've been invited to a trip</h2>
      <p style="color: #525252; margin: 0 0 24px;">
        <strong>${escapeHtml(args.inviterName)}</strong> invited you to join
        <strong>${escapeHtml(args.tripTitle)}</strong> on GetGoin.
      </p>
      <a href="${args.inviteUrl}"
         style="display: inline-block; background: #171717; color: white; padding: 12px 20px;
                border-radius: 6px; text-decoration: none; font-weight: 500;">
        View invitation
      </a>
      <p style="color: #a3a3a3; font-size: 12px; margin-top: 24px;">
        Or open this link: <br />
        <a href="${args.inviteUrl}" style="color: #525252;">${args.inviteUrl}</a>
      </p>
    </div>
  `;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: args.to,
        subject,
        html,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error("[email] Resend error:", res.status, body);
      return { ok: false, error: `Resend ${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    console.error("[email] fetch failed:", e);
    return { ok: false, error: e instanceof Error ? e.message : "send failed" };
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
