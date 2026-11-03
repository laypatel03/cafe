import { describe, expect, it, vi } from "vitest";

import { createWhatsAppClient } from "@/lib/whatsapp/client";
import {
  billMessage,
  cleanParam,
  dueReminderMessage,
  fillTemplate,
  payLaterMessage,
  paymentReceivedMessage,
  waLink,
} from "@/lib/whatsapp/messages";

const config = { token: "t0k", phoneNumberId: "123", apiVersion: "v23.0" };
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("WhatsApp messages", () => {
  it("fills the bill template for a paid bill", () => {
    const m = billMessage({
      guestName: "Asha  Mehta",
      cafeName: "Healthy Hunger",
      number: 14,
      totalPaise: 24900,
      status: { kind: "PAID", method: "UPI" },
    });
    expect(m.params).toEqual(["Asha", "Healthy Hunger", "14", "₹249", "Paid by UPI"]);
    expect(m.text).toBe(
      "Hi Asha 👋\n\nThank you for eating with us at Healthy Hunger! 🥗\n\n🧾 Bill #14\n💰 Total: ₹249\n📌 Status: Paid by UPI\n\nYour bill is attached as a PDF. We hope to see you again soon! 💚",
    );
  });

  it("says pay later, and greets a guest with no name", () => {
    const m = billMessage({
      guestName: " ",
      cafeName: "Healthy Hunger",
      number: 3,
      totalPaise: 10000,
      status: { kind: "PAY_LATER" },
    });
    expect(m.params[0]).toBe("there");
    expect(m.params[4]).toBe("Pay later – added to your dues");
  });

  it("fills the due reminder with the amount and order count", () => {
    const m = dueReminderMessage({
      guestName: "Ravi",
      cafeName: "Healthy Hunger",
      duePaise: 150900,
      orders: 1,
    });
    expect(m.text).toBe(
      "Hi Ravi 👋\n\nA gentle reminder from Healthy Hunger 🥗\n\n💰 Amount due: ₹1,509\n🧾 For: 1 order\n\nThe details are attached as a PDF. You can pay at the counter on your next visit.\n\nThank you for being with us! 💚",
    );
  });

  it("thanks a pay-later guest with the amount added, and no PDF", () => {
    const m = payLaterMessage({ guestName: "yash", cafeName: "Healthy Hunger", totalPaise: 41800 });
    expect(m.template).toBe("payLater");
    expect(m.params).toEqual(["yash", "Healthy Hunger", "₹418"]);
    expect(m.text).toContain("₹418 has been added to your account, to pay on your next visit.");
  });

  it("says what came in for how many bills, and what's still due (or all paid)", () => {
    const part = paymentReceivedMessage({
      guestName: "yash",
      cafeName: "Healthy Hunger",
      receivedPaise: 81500,
      bills: 2,
      stillDuePaise: 32800,
    });
    expect(part.params).toEqual(["yash", "₹815", "2 bills", "Healthy Hunger", "₹328"]);
    expect(part.text).toContain("We've received ₹815 for 2 bills at Healthy Hunger.");
    const all = paymentReceivedMessage({
      guestName: "yash",
      cafeName: "Healthy Hunger",
      receivedPaise: 32800,
      bills: 1,
      stillDuePaise: 0,
    });
    expect(all.params[2]).toBe("1 bill");
    expect(all.params[4]).toBe("nothing – all paid up ✅");
  });

  it("removes new lines and long spaces Meta refuses in parameters", () => {
    expect(cleanParam("a\nb\t   c")).toBe("a b c");
    expect(cleanParam("   ")).toBe("–");
    expect(fillTemplate("{{1}} and {{3}}", ["x"])).toBe("x and {{3}}");
  });

  it("builds a wa.me link with the Indian number and encoded text", () => {
    expect(waLink("9876543210", "Bill #1 – ₹5 & more")).toBe(
      "https://wa.me/919876543210?text=Bill%20%231%20%E2%80%93%20%E2%82%B95%20%26%20more",
    );
  });
});

describe("WhatsApp client", () => {
  const msg = billMessage({
    guestName: "Asha",
    cafeName: "Healthy Hunger",
    number: 14,
    totalPaise: 24900,
    status: { kind: "PAID", method: "CASH" },
  });

  it("uploads the PDF, then sends the template with it in the header", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(json({ id: "media-1" }))
      .mockResolvedValueOnce(json({ messages: [{ id: "wamid.1" }] }));
    const wa = createWhatsAppClient(config, fetch);

    const res = await wa.sendTemplateWithPdf("9876543210", msg, {
      bytes: new Uint8Array([37, 80, 68, 70]),
      filename: "Bill-14.pdf",
    });

    expect(res).toEqual({ ok: true, id: "wamid.1" });
    const [uploadUrl, upload] = fetch.mock.calls[0];
    expect(uploadUrl).toBe("https://graph.facebook.com/v23.0/123/media");
    expect((upload?.headers as Record<string, string>).Authorization).toBe("Bearer t0k");
    expect((upload?.body as FormData).get("type")).toBe("application/pdf");

    const [sendUrl, send] = fetch.mock.calls[1];
    expect(sendUrl).toBe("https://graph.facebook.com/v23.0/123/messages");
    const body = JSON.parse(send?.body as string);
    expect(body.to).toBe("919876543210");
    expect(body.template.name).toBe("bill_receipt");
    expect(body.template.components[0]).toEqual({
      type: "header",
      parameters: [{ type: "document", document: { id: "media-1", filename: "Bill-14.pdf" } }],
    });
    expect(body.template.components[1].parameters.map((p: { text: string }) => p.text)).toEqual(msg.params);
  });

  it("returns Meta's reason when sending fails, and doesn't send if the upload fails", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(
        json(
          { error: { message: "(#131030)", error_data: { details: "Recipient not in allowed list" } } },
          400,
        ),
      );
    const wa = createWhatsAppClient(config, fetch);
    const res = await wa.sendTemplateWithPdf("9876543210", msg, {
      bytes: new Uint8Array(),
      filename: "a.pdf",
    });
    expect(res).toEqual({ ok: false, error: "Recipient not in allowed list" });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("uses the template name and language set for the café's account", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(json({ messages: [{ id: "wamid.2" }] }));
    const wa = createWhatsAppClient(
      { ...config, templates: { bill: "simple_bill_receipt" }, language: "en_US" },
      fetch,
    );
    await wa.sendTemplate("9876543210", msg);
    const body = JSON.parse(fetch.mock.calls[0][1]?.body as string);
    expect(body.template.name).toBe("simple_bill_receipt");
    expect(body.template.language).toEqual({ code: "en_US" });
  });

  it("explains a network failure", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockRejectedValueOnce(new TypeError("fetch failed"));
    const res = await createWhatsAppClient(config, fetch).sendTemplate("9876543210", msg);
    expect(res).toEqual({ ok: false, error: "Couldn't reach WhatsApp – check the internet connection." });
  });
});
