// Small transactional-mail helper for rejection notifications. Uses Resend's REST
// API when RESEND_API_KEY is set; otherwise returns a skipped marker so the
// decision flow never breaks just because mail is unconfigured.

export type MailResult = { sent: boolean; detail: string };

export async function sendRejectionEmail(to: string, word: string, reason: string): Promise<MailResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: false, detail: "RESEND_API_KEY not set — notification skipped" };
  const from = process.env.MAIL_FROM ?? "AI Neologism <onboarding@resend.dev>";

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to,
        subject: `Your word "${word}" was not published on AI Neologism`,
        html: [
          `<p>Your submission <strong>${word}</strong> was reviewed and <strong>not published</strong>.</p>`,
          `<p><strong>Reviewer's reason:</strong></p>`,
          `<blockquote>${reason.replace(/</g, "&lt;").replace(/\n/g, "<br>")}</blockquote>`,
          `<p>You can revise the entry and resubmit it via the API with your contribution key. This is the only use of the email address you provided; it is not shown anywhere on the site.</p>`,
        ].join("\n"),
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { sent: false, detail: `Resend HTTP ${res.status}: ${body.slice(0, 200)}` };
    }
    return { sent: true, detail: "sent" };
  } catch (e) {
    return { sent: false, detail: e instanceof Error ? e.message : "mail failed" };
  }
}
