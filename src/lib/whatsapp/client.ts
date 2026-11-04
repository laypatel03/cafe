// WhatsApp Cloud API (Meta Graph API) – upload a PDF and send an approved template with it.
// No env or database here: config and fetch are passed in, so it's unit-tested with a fake fetch.

import { WA_LANGUAGE, WA_TEMPLATES, type WaMessage, type WaTemplateKey, waNumber } from "./messages";

export type WaConfig = {
  token: string;
  phoneNumberId: string;
  apiVersion: string;
  /** names as created in WhatsApp Manager, when they differ from WA_TEMPLATES */
  templates?: Partial<Record<WaTemplateKey, string>>;
  /** template language code, when not "en" (e.g. "en_US") */
  language?: string;
};

export type WaResult = { ok: true; id: string } | { ok: false; error: string };

export type WaDocument = { id: string; filename: string };

export type WaNumberInfo = {
  number: string;
  name: string;
  /** GREEN / YELLOW / RED / UNKNOWN – how guests are reacting (blocks, reports) */
  quality: string;
  /** new guests the number may message per day: "250", "1K", … or "Unlimited" */
  dailyLimit: string | null;
  live: boolean;
};

export type WaSpend = { cost: number; messages: number };

/** A message template as Meta has it: APPROVED, PENDING (in review), REJECTED, PAUSED, DISABLED… */
export type WaTemplateState = {
  name: string;
  status: string;
  reason: string | null;
  body: string;
  footer: string;
};

const TIMEOUT_MS = 15_000;

type GraphError = { error?: { message?: string; error_data?: { details?: string } } };

/** Meta's own explanation when there is one ("Recipient phone number not in allowed list" …). */
async function graphError(res: Response): Promise<string> {
  const body = (await res.json().catch(() => ({}))) as GraphError;
  return body.error?.error_data?.details ?? body.error?.message ?? `WhatsApp said ${res.status}`;
}

export function createWhatsAppClient(config: WaConfig, fetchImpl: typeof fetch = fetch) {
  const base = `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}`;
  const auth = { Authorization: `Bearer ${config.token}` };

  async function get<T>(url: string): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
    try {
      const res = await fetchImpl(url, {
        headers: auth,
        signal: AbortSignal.timeout(TIMEOUT_MS),
        cache: "no-store",
      });
      if (!res.ok) return { ok: false, error: await graphError(res) };
      return { ok: true, data: (await res.json()) as T };
    } catch {
      return { ok: false, error: "Couldn't reach WhatsApp – check the internet connection." };
    }
  }

  async function post(path: string, body: BodyInit, json: boolean): Promise<Response | string> {
    try {
      return await fetchImpl(`${base}/${path}`, {
        method: "POST",
        headers: json ? { ...auth, "Content-Type": "application/json" } : auth,
        body,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      return "Couldn't reach WhatsApp – check the internet connection.";
    }
  }

  /** Uploads a PDF to WhatsApp (kept by Meta for 30 days) – no public link to the file. */
  async function uploadPdf(bytes: Uint8Array, filename: string): Promise<WaResult> {
    const form = new FormData();
    form.append("messaging_product", "whatsapp");
    form.append("type", "application/pdf");
    form.append("file", new Blob([new Uint8Array(bytes)], { type: "application/pdf" }), filename);
    const res = await post("media", form, false);
    if (typeof res === "string") return { ok: false, error: res };
    if (!res.ok) return { ok: false, error: await graphError(res) };
    const { id } = (await res.json()) as { id?: string };
    return id ? { ok: true, id } : { ok: false, error: "WhatsApp didn't return the uploaded file." };
  }

  /** Sends an approved template to a 10-digit Indian mobile, with a PDF in the header if given. */
  async function sendTemplate(phone: string, msg: WaMessage, document?: WaDocument): Promise<WaResult> {
    const components: object[] = [
      { type: "body", parameters: msg.params.map((text) => ({ type: "text", text })) },
    ];
    if (document)
      components.unshift({
        type: "header",
        parameters: [{ type: "document", document: { id: document.id, filename: document.filename } }],
      });
    const res = await post(
      "messages",
      JSON.stringify({
        messaging_product: "whatsapp",
        to: waNumber(phone),
        type: "template",
        template: {
          name: config.templates?.[msg.template] || WA_TEMPLATES[msg.template].name,
          language: { code: config.language || WA_LANGUAGE },
          components,
        },
      }),
      true,
    );
    if (typeof res === "string") return { ok: false, error: res };
    if (!res.ok) return { ok: false, error: await graphError(res) };
    const body = (await res.json()) as { messages?: { id?: string }[] };
    const id = body.messages?.[0]?.id;
    return id ? { ok: true, id } : { ok: false, error: "WhatsApp didn't confirm the message." };
  }

  /** Upload, then send – the usual way a bill or a dues statement goes out. */
  async function sendTemplateWithPdf(
    phone: string,
    msg: WaMessage,
    pdf: { bytes: Uint8Array; filename: string },
  ): Promise<WaResult> {
    const media = await uploadPdf(pdf.bytes, pdf.filename);
    if (!media.ok) return media;
    return sendTemplate(phone, msg, { id: media.id, filename: pdf.filename });
  }

  /** The café's number as Meta sees it: name, quality rating and daily limit. */
  async function numberInfo() {
    const res = await get<{
      display_phone_number?: string;
      verified_name?: string;
      quality_rating?: string;
      messaging_limit_tier?: string;
      account_mode?: string;
    }>(`${base}?fields=display_phone_number,verified_name,quality_rating,messaging_limit_tier,account_mode`);
    if (!res.ok) return res;
    const d = res.data;
    const tier = d.messaging_limit_tier?.replace(/^TIER_/, "") ?? null;
    const info: WaNumberInfo = {
      number: d.display_phone_number ?? "",
      name: d.verified_name ?? "",
      quality: d.quality_rating ?? "UNKNOWN",
      dailyLimit: tier === "UNLIMITED" ? "Unlimited" : tier,
      live: d.account_mode !== "SANDBOX",
    };
    return { ok: true as const, info };
  }

  /**
   * What Meta charged between two moments, from the WhatsApp Business Account's pricing analytics
   * (in the account's currency). Meta has no "balance left" – payment is on the card in WhatsApp Manager.
   */
  async function spend(businessAccountId: string, from: Date, to: Date) {
    const secs = (d: Date) => Math.floor(d.getTime() / 1000);
    const field = `pricing_analytics.start(${secs(from)}).end(${secs(to)}).granularity(DAILY)`;
    const url = `https://graph.facebook.com/${config.apiVersion}/${businessAccountId}?fields=${encodeURIComponent(field)}`;
    const res = await get<{
      pricing_analytics?: { data?: { data_points?: { cost?: number; volume?: number }[] }[] };
    }>(url);
    if (!res.ok)
      return /nonexisting field \(pricing_analytics\)/.test(res.error)
        ? {
            ok: false as const,
            error:
              "That ID isn't a WhatsApp Business Account – it looks like the business portfolio ID. Use the WhatsApp Business Account ID (WhatsApp Manager, or the app's WhatsApp → API setup page).",
          }
        : res;
    const points = res.data.pricing_analytics?.data?.flatMap((d) => d.data_points ?? []) ?? [];
    const total: WaSpend = {
      cost: points.reduce((s, p) => s + (p.cost ?? 0), 0),
      messages: points.reduce((s, p) => s + (p.volume ?? 0), 0),
    };
    return { ok: true as const, spend: total };
  }

  const graph = `https://graph.facebook.com/${config.apiVersion}`;

  /** One template's status, rejection reason and current wording (WhatsApp Manager → template ID). */
  async function templateInfo(templateId: string) {
    const res = await get<{
      name?: string;
      status?: string;
      rejected_reason?: string;
      components?: { type?: string; text?: string }[];
    }>(`${graph}/${templateId}?fields=name,status,rejected_reason,components`);
    if (!res.ok) return res;
    const part = (type: string) => res.data.components?.find((c) => c.type === type)?.text ?? "";
    const reason = res.data.rejected_reason;
    const template: WaTemplateState = {
      name: res.data.name ?? "",
      status: res.data.status ?? "UNKNOWN",
      reason: reason && reason !== "NONE" ? reason : null,
      body: part("BODY"),
      footer: part("FOOTER"),
    };
    return { ok: true as const, template };
  }

  /**
   * A sample PDF for a template's Document heading, through Meta's resumable upload (needs the app the
   * token belongs to). Returns the handle Meta reviews the template with.
   */
  async function uploadTemplateSample(bytes: Uint8Array): Promise<WaResult> {
    const app = await get<{ id?: string }>(`${graph}/app`);
    if (!app.ok) return app;
    if (!app.data.id) return { ok: false, error: "Couldn't find the Meta app for this token." };
    try {
      const start = await fetchImpl(
        `${graph}/${app.data.id}/uploads?file_name=sample.pdf&file_length=${bytes.length}&file_type=application/pdf`,
        { method: "POST", headers: auth, signal: AbortSignal.timeout(TIMEOUT_MS) },
      );
      if (!start.ok) return { ok: false, error: await graphError(start) };
      const { id: session } = (await start.json()) as { id?: string };
      if (!session) return { ok: false, error: "Meta didn't start the upload." };
      const done = await fetchImpl(`${graph}/${session}`, {
        method: "POST",
        headers: { Authorization: `OAuth ${config.token}`, file_offset: "0" },
        body: new Blob([new Uint8Array(bytes)], { type: "application/pdf" }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!done.ok) return { ok: false, error: await graphError(done) };
      const { h } = (await done.json()) as { h?: string };
      return h ? { ok: true, id: h } : { ok: false, error: "Meta didn't return the sample file." };
    } catch {
      return { ok: false, error: "Couldn't reach WhatsApp – check the internet connection." };
    }
  }

  /**
   * Sends a new wording to Meta for review. Meta replaces every part of the template, so the PDF
   * heading (with a sample) goes again too. An approved template can be edited once a day.
   */
  async function editTemplate(
    templateId: string,
    t: { body: string; footer: string; samples: string[]; pdfSample?: string },
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    const components: object[] = [{ type: "BODY", text: t.body, example: { body_text: [t.samples] } }];
    if (t.pdfSample)
      components.unshift({ type: "HEADER", format: "DOCUMENT", example: { header_handle: [t.pdfSample] } });
    if (t.footer) components.push({ type: "FOOTER", text: t.footer });
    try {
      const res = await fetchImpl(`${graph}/${templateId}`, {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({ components }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) return { ok: false, error: await graphError(res) };
      return { ok: true };
    } catch {
      return { ok: false, error: "Couldn't reach WhatsApp – check the internet connection." };
    }
  }

  return {
    uploadPdf,
    sendTemplate,
    sendTemplateWithPdf,
    numberInfo,
    spend,
    templateInfo,
    uploadTemplateSample,
    editTemplate,
  };
}

export type WhatsAppClient = ReturnType<typeof createWhatsAppClient>;
