/**
 * Transactional email helpers. Configure one of:
 * - RESEND_API_KEY + optional CCS_EMAIL_FROM (default Resend sandbox sender)
 * Without a key, outbound mail is skipped and the reset URL is logged (dev / backup).
 */

export function publicAppBaseUrl() {
  const u = String(process.env.CCS_PUBLIC_URL || process.env.NEXT_PUBLIC_APP_URL || "").trim();
  if (u) return u.replace(/\/$/, "");
  return "";
}

/** @returns {{ via: string, ok: boolean, error?: string }} */
export async function sendPasswordResetEmail({ toEmail, resetUrl }) {
  const to = String(toEmail || "").trim();
  if (!to) return { via: "skipped", ok: false };

  const from =
    String(process.env.CCS_EMAIL_FROM || "").trim() ||
    "CCS Talks <ccs-talks@resend.dev>";

  const key = String(process.env.RESEND_API_KEY || "").trim();
  if (!key) {
    /* eslint-disable no-console */
    console.warn("[ccs-mail] RESEND_API_KEY not set — password reset link (do not log in production crowds):", resetUrl);
    /* eslint-enable no-console */
    return { via: "console", ok: true };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: "Reset your CCS Talks password",
        text: `Someone requested a password reset for your CCS Talks account.\n\nOpen this link within 1 hour:\n${resetUrl}\n\nIf you did not ask for this, ignore this email.`,
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      return { via: "resend", ok: false, error: errText || String(res.status) };
    }
    return { via: "resend", ok: true };
  } catch (e) {
    return { via: "resend", ok: false, error: e?.message || "send failed" };
  }
}
