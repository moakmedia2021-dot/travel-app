// Resend templates for the waitlist flow. Gracefully no-ops when
// RESEND_API_KEY isn't set (logs and returns ok).
import { logger } from "@/lib/logger";

type SendResult = { ok: true } | { ok: false; error: string };

function fromAddress(): string {
  return process.env.RESEND_FROM_EMAIL || "GetGoin <onboarding@resend.dev>";
}

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

async function sendEmail(args: { to: string; subject: string; html: string }): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    logger.info("waitlist email", "RESEND_API_KEY not set — skipping", { to: args.to });
    return { ok: true };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress(),
        to: args.to,
        subject: args.subject,
        html: args.html,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: `Resend ${res.status}: ${body.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "send failed" };
  }
}

const wrap = (innerHtml: string) => `
<div style="font-family:-apple-system,system-ui,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#171717;">
  ${innerHtml}
  <p style="margin-top:32px;color:#a3a3a3;font-size:12px;">GetGoin · plan trips together</p>
</div>`;

const button = (href: string, label: string) => `
<a href="${href}" style="display:inline-block;background:#171717;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">${label}</a>`;

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendWaitlistWelcomeEmail(args: {
  to: string;
  name: string | null;
  position: number;
  referralCode: string;
}): Promise<SendResult> {
  const referralLink = `${siteUrl()}/join?ref=${args.referralCode}`;
  const personalPage = `${siteUrl()}/waitlist/${args.referralCode}`;
  const greeting = args.name ? `Hey ${esc(args.name)},` : "Hey,";
  const html = wrap(`
    <h1 style="margin:0 0 12px;font-size:24px;">You're on the list 🎉</h1>
    <p style="margin:0 0 16px;color:#525252;font-size:15px;line-height:1.6;">${greeting}</p>
    <p style="margin:0 0 24px;color:#525252;font-size:15px;line-height:1.6;">
      You're <strong style="color:#171717;">#${args.position}</strong> on the waitlist for GetGoin.
      We'll email you the moment your spot opens.
    </p>
    <div style="background:#f5f5f5;border-radius:8px;padding:16px 20px;margin:0 0 24px;">
      <p style="margin:0 0 8px;font-size:13px;color:#737373;text-transform:uppercase;letter-spacing:.05em;font-weight:600;">Move up the list</p>
      <p style="margin:0 0 12px;font-size:14px;color:#525252;line-height:1.5;">Share your referral link — <strong>each signup moves you up 5 spots</strong>.</p>
      <p style="margin:0 0 12px;font-family:ui-monospace,monospace;font-size:13px;color:#171717;word-break:break-all;">${esc(referralLink)}</p>
    </div>
    <div style="margin:0 0 16px;">${button(personalPage, "View my waitlist page")}</div>
  `);

  return sendEmail({ to: args.to, subject: "You're on the GetGoin waitlist", html });
}

export async function sendAccessGrantedEmail(args: {
  to: string;
  name: string | null;
  magicLink: string;
}): Promise<SendResult> {
  const greeting = args.name ? `${esc(args.name)},` : "Hey,";
  const html = wrap(`
    <h1 style="margin:0 0 12px;font-size:24px;">Your spot is ready 🛫</h1>
    <p style="margin:0 0 16px;color:#525252;font-size:15px;line-height:1.6;">${greeting}</p>
    <p style="margin:0 0 24px;color:#525252;font-size:15px;line-height:1.6;">
      You're in. Early access to GetGoin is yours — use the link below to set up your account.
    </p>
    <div style="margin:0 0 24px;">${button(args.magicLink, "Set up my account")}</div>
    <p style="margin:0;color:#a3a3a3;font-size:12px;line-height:1.5;">
      This link expires in 24 hours. If you didn't expect this email you can ignore it.
    </p>
  `);

  return sendEmail({ to: args.to, subject: "Your GetGoin access is ready", html });
}
