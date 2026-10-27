import { env } from "./cloudflare";

export interface MailInput {
  to: string;
  subject: string;
  text: string;
  /** Knock workflow key (e.g. email_verification / password_reset). */
  workflow: string;
  data: Record<string, unknown>;
}

export interface MailResult {
  delivered: boolean;
  mode: "knock" | "unconfigured";
  detail?: string;
}

/** True when a Knock API key is configured, i.e. real email delivery is possible. */
export function emailDeliveryEnabled(): boolean {
  return Boolean(env().KNOCK_API_KEY);
}

/**
 * Sends a transactional email through Knock (notification infrastructure).
 * When no API key is configured the caller falls back to a local dev flow.
 */
export async function sendMail(input: MailInput): Promise<MailResult> {
  const apiKey = env().KNOCK_API_KEY;
  if (!apiKey) return { delivered: false, mode: "unconfigured" };

  try {
    const res = await fetch("https://api.knock.app/v1/notifications", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipients: [{ id: input.to }],
        workflow: input.workflow,
        data: { ...input.data, subject: input.subject, body: input.text },
      }),
    });
    if (!res.ok) {
      const detail = (await res.text()).slice(0, 500);
      console.error(`Knock workflow "${input.workflow}" failed: ${res.status} ${detail}`);
      return { delivered: false, mode: "knock", detail };
    }
    return { delivered: true, mode: "knock" };
  } catch (err) {
    console.error("Knock request failed:", err);
    return { delivered: false, mode: "knock", detail: String(err) };
  }
}
