export interface CareEmail {
  direction: "patient_invites_clinician" | "clinician_requests_patient";
  recipient: string;
  recipientFirstName: string;
  patientFirstName: string;
  clinicianName: string;
  link: string;
  expiresAt: Date;
}
export interface CareEmailPayload {
  from: string;
  to: string[];
  reply_to?: string;
  subject: string;
  text: string;
  html: string;
}
type SendCareEmail = (payload: CareEmailPayload) => Promise<{ ok: boolean } | void>;
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function careDeliveryResponse(result: { invite: unknown; suppressed: boolean; link: string }, environment: string | undefined) {
  return { invite: result.invite, suppressed: result.suppressed,
    ...(result.suppressed && environment === "development" ? { developmentLink: result.link } : {}) };
}

export function renderCareEmail(input: CareEmail) {
  const patientInvite = input.direction === "patient_invites_clinician";
  const date = input.expiresAt.toLocaleDateString("en-US", { timeZone: "UTC", year: "numeric", month: "long", day: "numeric" });
  const first = input.patientFirstName;
  const clinician = input.clinicianName;
  const subject = patientInvite ? `${first} invited you to view their Stillwell journal` : `${clinician} asked you to share your Stillwell journal`;
  const heading = patientInvite ? `${first} invited you to view their recovery journal` : `${clinician} asked you to share your recovery journal`;
  const body = patientInvite
    ? `Hi ${input.recipientFirstName}, ${first} uses Stillwell, a private recovery journal, and would like you to be able to read it.`
    : `Hi ${input.recipientFirstName}, ${clinician} would like to be able to read your Stillwell journal, a private place to note how you're feeling day to day.`;
  const box = patientInvite ? null : `You decide. Nothing is shared unless you agree, and you can stop sharing anytime. Stillwell doesn't verify clinicians, so only agree if you know ${clinician}.`;
  const button = patientInvite ? "Accept invite" : "Review the request";
  const note = patientInvite
    ? `Read-only: you can't change anything, and ${first} can remove access at any time. Accept by signing in with this email address. The invite expires on ${date}.`
    : `New to Stillwell? You'll set up your private journal first, then decide about sharing. This request expires on ${date}.`;
  const ignore = `Didn't expect this? You can ignore this email. Nothing is shared unless you ${patientInvite ? "accept" : "agree"}.`;
  const footer = `Stillwell is an educational recovery journal. It does not diagnose or replace clinical care.${patientInvite ? "" : " It's not for emergencies."} You're receiving this because a Stillwell user entered your email address.`;
  const text = [heading, body, box, `${button}: ${input.link}`, note, ignore, footer].filter(Boolean).join("\n\n");
  const p = (v: string) => `<p>${escapeHtml(v)}</p>`;
  const html = `<!doctype html><html><body style="margin:0;background:#f5f4ed;color:#243d31;font-family:Arial,sans-serif"><main style="max-width:560px;margin:auto;padding:32px"><h1 style="font-family:Georgia,serif">${escapeHtml(heading)}</h1>${p(body)}${box ? `<div style="padding:20px;background:#e6eee7;border-radius:20px">${p(box)}</div>` : ""}<p style="margin:28px 0"><a href="${escapeHtml(input.link)}" style="display:inline-block;background:#315b49;color:#fff;text-decoration:none;border-radius:99px;padding:14px 24px">${button}</a></p>${p(note)}${p(ignore)}<footer style="font-size:12px">${p(footer)}</footer></main></body></html>`;
  return { subject, text, html };
}

export async function sendCareEmail(
  input: CareEmail,
  options: {
    apiKey?: string;
    from?: string;
    replyTo?: string;
    logSuppressed: () => void;
    fetcher?: typeof fetch;
    send?: SendCareEmail;
  },
) {
  if (!options.send && !options.apiKey) {
    options.logSuppressed();
    return { suppressed: true };
  }
  if (!options.from) throw new Error("Email configuration unavailable");
  const url = new URL(input.link);
  if (url.protocol !== "https:") throw new Error("Email URL configuration unavailable");
  const payload: CareEmailPayload = {
    from: options.from,
    to: [input.recipient],
    ...(options.replyTo ? { reply_to: options.replyTo } : {}),
    ...renderCareEmail(input),
  };
  try {
    if (options.send) {
      const response = await options.send(payload);
      if (response && !response.ok) throw new Error("Email delivery failed");
    } else {
      const response = await (options.fetcher ?? fetch)("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${options.apiKey}`, "Content-Type": "application/json" },
        signal: AbortSignal.timeout(10000),
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Email delivery failed");
    }
  } catch {
    // Provider errors may contain recipient details; only expose a generic delivery failure.
    throw new Error("Email delivery failed");
  }
  return { suppressed: false };
}
