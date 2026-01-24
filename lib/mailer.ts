import nodemailer from "nodemailer"

type SendInviteEmailInput = {
  to: string
  from: string
  subject: string
  jobTitle: string
  inviteLink: string
  candidateName?: string | null
}

function getSmtpConfig() {
  const host = process.env.SMTP_HOST || "smtp.gmail.com"
  const port = Number(process.env.SMTP_PORT || 465)
  const secure = String(process.env.SMTP_SECURE || "true") === "true"
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  return { host, port, secure, user, pass }
}

function requireSmtpAuth() {
  const cfg = getSmtpConfig()
  if (!cfg.user || !cfg.pass) {
    throw new Error("Missing SMTP_USER/SMTP_PASS")
  }
  return cfg
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

export async function sendInviteEmail(input: SendInviteEmailInput) {
  const { host, port, secure, user, pass } = requireSmtpAuth()

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass }
  })

  const candidateLine = input.candidateName ? `Hi ${escapeHtml(input.candidateName)},` : "Hi,"

  const html = `
  <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;line-height:1.5;color:#111827">
    <p style="margin:0 0 16px">${candidateLine}</p>
    <p style="margin:0 0 16px">You’ve been invited to apply for <strong>${escapeHtml(input.jobTitle)}</strong> at Truckinzy.</p>
    <p style="margin:0 0 18px">
      <a href="${escapeHtml(input.inviteLink)}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:9999px">
        View invite & apply
      </a>
    </p>
    <p style="margin:0 0 8px;color:#6b7280;font-size:13px">If the button doesn’t work, copy and paste this link:</p>
    <p style="margin:0;color:#374151;font-size:13px;word-break:break-all">${escapeHtml(input.inviteLink)}</p>
  </div>
  `.trim()

  const info = await transporter.sendMail({
    from: input.from,
    to: input.to,
    subject: input.subject,
    html
  })

  return { messageId: info.messageId }
}

