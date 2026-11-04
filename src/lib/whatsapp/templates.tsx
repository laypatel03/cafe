import "server-only";
import { Document, Page, renderToBuffer, Text } from "@react-pdf/renderer";
import { db } from "@/lib/db";
import { templateIds, whatsapp } from "./index";
import {
  checkTemplateText,
  fillTemplate,
  WA_TEMPLATE_INFO,
  WA_TEMPLATES,
  type WaMessage,
  type WaTemplateKey,
} from "./messages";

// Editing the WhatsApp messages from Settings. Meta keeps the real wording and must approve every
// change; the app keeps a copy of the approved wording for the message log and wa.me links.

export const WA_TEMPLATE_KEYS = Object.keys(WA_TEMPLATES) as WaTemplateKey[];

export type TemplateRow = {
  key: WaTemplateKey;
  label: string;
  vars: string[];
  samples: string[];
  /** the template ID is in .env, so it can be read and edited */
  linked: boolean;
  /** APPROVED, PENDING (Meta is reviewing), REJECTED, PAUSED … or UNKNOWN */
  status: string;
  reason: string | null;
  body: string;
  footer: string;
  /** when an edit was last sent to Meta (ISO), for the once-a-day limit */
  submittedAt: string | null;
  error: string | null;
};

/** The message as the guest reads it, in the approved wording Meta has (the code's text until known). */
export async function withLiveText(msg: WaMessage): Promise<WaMessage> {
  const row = await db.whatsAppTemplate.findUnique({ where: { key: msg.template }, select: { body: true } });
  return row ? { ...msg, text: fillTemplate(row.body, msg.params) } : msg;
}

/**
 * Asks Meta for every linked template's status and wording, and keeps the approved wording. For the
 * Settings page; templates without an ID show the code's wording and can't be edited.
 */
export async function syncTemplates(): Promise<TemplateRow[]> {
  const wa = whatsapp();
  const ids = templateIds();
  const saved = new Map((await db.whatsAppTemplate.findMany()).map((r) => [r.key, r]));
  return Promise.all(
    WA_TEMPLATE_KEYS.map(async (key): Promise<TemplateRow> => {
      const info = WA_TEMPLATE_INFO[key];
      const row = saved.get(key);
      const base: TemplateRow = {
        key,
        label: info.label,
        vars: info.vars,
        samples: info.samples,
        linked: false,
        status: row?.status ?? "UNKNOWN",
        reason: row?.reason ?? null,
        body: row?.body ?? WA_TEMPLATES[key].body,
        footer: row?.footer ?? WA_TEMPLATES[key].footer,
        submittedAt: row?.submittedAt?.toISOString() ?? null,
        error: null,
      };
      const id = ids[key];
      if (!wa || !id) return base;
      const res = await wa.templateInfo(id);
      if (!res.ok) return { ...base, linked: true, error: res.error };
      const t = res.template;
      const approved = t.status === "APPROVED";
      await db.whatsAppTemplate.upsert({
        where: { key },
        create: { key, body: t.body, footer: t.footer, status: t.status, reason: t.reason },
        // only approved wording is what guests get
        update: { status: t.status, reason: t.reason, ...(approved && { body: t.body, footer: t.footer }) },
      });
      return { ...base, linked: true, status: t.status, reason: t.reason, body: t.body, footer: t.footer };
    }),
  );
}

/** A one-page sample PDF – Meta reviews a Document heading with an example file. */
async function samplePdf(label: string) {
  const buf = await renderToBuffer(
    <Document>
      <Page size="A6" style={{ padding: 24 }}>
        <Text style={{ fontSize: 16 }}>Healthy Hunger</Text>
        <Text style={{ fontSize: 11, marginTop: 8 }}>Sample – {label}</Text>
      </Page>
    </Document>,
  );
  return new Uint8Array(buf);
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Sends a new wording for one message to Meta for review. Guests keep getting the old one until approved. */
export async function submitTemplate(
  key: WaTemplateKey,
  body: string,
  footer: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const problem = checkTemplateText(key, body, footer);
  if (problem) return { ok: false, error: problem };
  const wa = whatsapp();
  const id = templateIds()[key];
  if (!wa || !id) return { ok: false, error: "This message isn't linked to Meta yet (template ID in .env)." };
  const row = await db.whatsAppTemplate.findUnique({ where: { key } });
  if (row?.status === "PENDING")
    return { ok: false, error: "Meta is still reviewing the last change – wait for it first." };
  if (row?.status === "APPROVED" && row.submittedAt && Date.now() - row.submittedAt.getTime() < DAY_MS)
    return { ok: false, error: "Meta allows one change a day to an approved message – try again tomorrow." };

  const info = WA_TEMPLATE_INFO[key];
  let pdfSample: string | undefined;
  if (info.pdf) {
    const up = await wa.uploadTemplateSample(await samplePdf(info.label));
    if (!up.ok) return { ok: false, error: `Couldn't upload the sample PDF: ${up.error}` };
    pdfSample = up.id;
  }
  const res = await wa.editTemplate(id, {
    body: body.trim(),
    footer: footer.trim(),
    samples: info.samples,
    pdfSample,
  });
  if (!res.ok) return res;
  await db.whatsAppTemplate.upsert({
    where: { key },
    // the approved wording stays until Meta approves the new one
    create: {
      key,
      body: WA_TEMPLATES[key].body,
      footer: WA_TEMPLATES[key].footer,
      status: "PENDING",
      submittedAt: new Date(),
    },
    update: { status: "PENDING", reason: null, submittedAt: new Date() },
  });
  return { ok: true };
}
