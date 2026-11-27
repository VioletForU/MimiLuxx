import nodemailer from "nodemailer";

/**
 * Sends mail from ONE dedicated address (for example notifications@yourdomain.com)
 * through any SMTP provider. Server-only: never import this from a "use client" file.
 *
 * Environment variables:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS   your provider's SMTP login
 *   EMAIL_FROM        the dedicated sender, e.g.  MimiLuxx <notifications@yourdomain.com>
 *   EMAIL_REPLY_TO    optional, where replies go
 * If any of the required ones is missing, email is simply switched off (in-app
 * notifications keep working).
 */
export function isEmailConfigured(): boolean {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.EMAIL_FROM);
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

let transport: nodemailer.Transporter | null = null;

function getTransport() {
  if (!transport) {
    const port = Number(process.env.SMTP_PORT || 465);
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465, // 465 = TLS from the start; 587 upgrades with STARTTLS
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transport;
}

export async function sendEmail({ to, subject, text, html }: { to: string; subject: string; text: string; html: string }) {
  await getTransport().sendMail({
    from: process.env.EMAIL_FROM,
    replyTo: process.env.EMAIL_REPLY_TO || undefined,
    to,
    subject,
    text,
    html,
  });
}

/** The "a lead added a file to your folder" email. Everything inserted is escaped. */
export function folderFilesEmail({
  leadName,
  orgName,
  committeeName,
  fileNames,
  url,
}: {
  leadName: string;
  orgName: string;
  committeeName: string | null;
  fileNames: string[];
  url: string | null;
}) {
  const shown = fileNames.slice(0, 5);
  const more = fileNames.length - shown.length;
  const where = committeeName ? `${committeeName}, ${orgName}` : orgName;
  const headline =
    fileNames.length === 1
      ? `${leadName} added a file to your folder`
      : `${leadName} added ${fileNames.length} files to your folder`;

  const subject = `${headline} · ${orgName}`;

  const text = [
    headline + ".",
    `Folder: ${where}`,
    "",
    ...shown.map((f) => `  - ${f}`),
    ...(more > 0 ? [`  - and ${more} more`] : []),
    "",
    url ? `Open your folder: ${url}` : "Open MimiLuxx to see it.",
    "",
    "You can turn these emails off in Settings > Notifications.",
  ].join("\n");

  const items =
    shown.map((f) => `<li style="margin:2px 0">${escapeHtml(f)}</li>`).join("") +
    (more > 0 ? `<li style="margin:2px 0;color:#6b6b6b">and ${more} more</li>` : "");

  const html = `<!doctype html><html><body style="margin:0;background:#E8EAEF;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#111">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:16px;padding:28px">
      <tr><td style="font-size:26px;font-weight:900;letter-spacing:-0.5px">Mimi<span style="color:#E5252A">Luxx</span></td></tr>
      <tr><td style="padding-top:20px;font-size:18px;font-weight:700">${escapeHtml(headline)}</td></tr>
      <tr><td style="padding-top:4px;font-size:13px;color:#6b6b6b">${escapeHtml(where)}</td></tr>
      <tr><td style="padding-top:14px;font-size:14px"><ul style="margin:0;padding-left:18px">${items}</ul></td></tr>
      ${
        url
          ? `<tr><td style="padding-top:22px"><a href="${escapeHtml(url)}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:11px 22px;border-radius:999px">Open your folder</a></td></tr>`
          : ""
      }
      <tr><td style="padding-top:24px;font-size:12px;color:#8a8a8a">You can turn these emails off in Settings &rsaquo; Notifications.</td></tr>
    </table>
  </td></tr></table></body></html>`;

  return { subject, text, html };
}
