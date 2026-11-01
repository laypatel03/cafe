import { applyWebhook } from "@/lib/whatsapp/events";
import { parseWebhook, verifySignature } from "@/lib/whatsapp/webhook";

export const dynamic = "force-dynamic";

/** Meta checks the webhook URL once: echo the challenge if the verify token matches. */
export function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const token = process.env.WHATSAPP_VERIFY_TOKEN?.trim();
  if (q.get("hub.mode") === "subscribe" && token && q.get("hub.verify_token") === token)
    return new Response(q.get("hub.challenge") ?? "", { headers: { "Content-Type": "text/plain" } });
  return new Response("Forbidden", { status: 403 });
}

/** Delivery status of our messages, and guests' STOP / START replies. Signed with the app secret. */
export async function POST(req: Request) {
  const raw = await req.text();
  const secret = process.env.WHATSAPP_APP_SECRET?.trim() ?? "";
  if (!verifySignature(raw, req.headers.get("x-hub-signature-256"), secret))
    return new Response("Bad signature", { status: 401 });
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }
  await applyWebhook(parseWebhook(body));
  // always 200 once it's ours, or Meta keeps retrying the same call
  return new Response("OK");
}
