# WhatsApp setup (bills and due reminders)

What the app does once this is set up: every bill goes to the guest as a PDF when it's paid or put on
pay later (Settings → WhatsApp → "Send bills on WhatsApp", on by default), and guests who owe money get a
reminder with a PDF of their unpaid bills every week (or month – Settings → WhatsApp). Until it's set up,
nothing is sent by itself; "WhatsApp bill" and "Send reminder now" open WhatsApp on the counter phone
with the text filled in (no PDF).

**Deploying the branch to the server: [`whatsapp-deploy.md`](./whatsapp-deploy.md).**

Code: `src/lib/whatsapp/` (sender, messages, webhook), `src/lib/bill-pdf/` (PDFs),
`/api/whatsapp/webhook`, `/api/cron/due-reminders`, `scripts/whatsapp/`. Decisions: `PLAN.md`.

## 1. Meta account and number (owner, once)

1. Create a **Meta Business** account (business.facebook.com) for the café and verify the business.
2. developers.facebook.com → **Create app** → type **Business** → add the **WhatsApp** product.
3. WhatsApp → **API setup** → **Add phone number**: the number guests will see messages from. A number
   already in the WhatsApp Business app can be moved over (check Meta's current rules about using
   one number in both the app and the API before moving the café's main number).
4. Add a payment method in WhatsApp Manager – Meta charges per template message (Utility rate, India).
5. Business settings → **System users** → add one (Admin) → **Generate token** for the app with
   `whatsapp_business_messaging` and `whatsapp_business_management` → copy it (it doesn't expire).

## 2. Templates (submit in WhatsApp Manager → Message templates)

Both: category **Utility**, language **English** (`en` – not English (US)/(UK)), variable type
**Number**, header **Document** (upload the sample PDF), the footer below, no buttons. Body and footer
exactly as here (from `src/lib/whatsapp/messages.ts` – change both together). No offers or discounts in
them, or Meta moves them to Marketing.

**`bill_receipt`**

```
Hi {{1}} 👋

Thank you for eating with us at {{2}}! 🥗

🧾 Bill #{{3}}
💰 Total: {{4}}
📌 Status: {{5}}

Your bill is attached as a PDF. We hope to see you again soon! 💚
```

Footer: `Eat well, live well`. Samples: `Asha`, `Healthy Hunger`, `14`, `₹249`, `Paid by UPI`.

**`due_reminder`**

```
Hi {{1}} 👋

A gentle reminder from {{2}} 🥗

💰 Amount due: {{3}}
🧾 For: {{4}}

The details are attached as a PDF. You can pay at the counter on your next visit.

Thank you for being with us! 💚
```

Footer: `Reply STOP to stop these reminders`. Samples: `Ravi`, `Healthy Hunger`, `₹1,509`, `2 orders`.

**`pay_later_thanks`** (no header – no PDF)

```
Hi {{1}} 👋

Thank you for eating with us at {{2}}! 🥗 We hope you enjoyed your meal.

🧾 {{3}} has been added to your account, to pay on your next visit.

See you again soon! 💚
```

Footer: `Eat well, live well`. Samples: `Ravi`, `Healthy Hunger`, `₹418`. Sent 30 minutes after closing (Settings → Café hours; 11 pm if the day has none), one per guest for all
that day's pay-later bills not paid since, only once `WHATSAPP_PAYLATER_TEMPLATE` is set.

**`payment_received`** (header **Document** – upload the sample receipt PDF)

```
Hi {{1}} 👋

Thank you! We've received {{2}} for {{3}} at {{4}}. 🙏

💰 Still to pay: {{5}}

Your receipt is attached as a PDF. See you again soon! 💚
```

Footer: `Eat well, live well`. Samples: `Ravi`, `₹815`, `2 bills`, `Healthy Hunger`, `₹328`. Sent once when
pay-later bills are paid off (one or several at once), only once `WHATSAPP_PAYMENT_TEMPLATE` is set.
{{5}} is the amount still due, or "nothing – all paid up ✅".

Approval usually takes from a few minutes to a day. Until a template is approved, sending it fails with
Meta's reason on Admin → WhatsApp.

## 3. `.env` on the server

```
WHATSAPP_TOKEN="<system user token>"
WHATSAPP_PHONE_NUMBER_ID="<API setup → Phone number ID>"
WHATSAPP_API_VERSION="v23.0"
# optional: WhatsApp Manager → Account tools → WhatsApp account ID – Admin → WhatsApp then shows what Meta charged this month
WHATSAPP_BUSINESS_ACCOUNT_ID=""
# only if the templates' names or language differ from bill_receipt / due_reminder / en
WHATSAPP_BILL_TEMPLATE=""
WHATSAPP_REMINDER_TEMPLATE=""
WHATSAPP_TEMPLATE_LANGUAGE=""
# template IDs (WhatsApp Manager) – not used to send; kept for editing templates from the app later
WHATSAPP_BILL_TEMPLATE_ID=""
WHATSAPP_REMINDER_TEMPLATE_ID=""
WHATSAPP_VERIFY_TOKEN="<any long random text>"
WHATSAPP_APP_SECRET="<App settings → Basic → App secret>"
CRON_SECRET="<openssl rand -hex 32>"
APP_URL="http://127.0.0.1:3000"
```

Restart the app. Settings → WhatsApp shows "Ready" for each line that's set.

## 4. Webhook (delivery status and STOP replies)

WhatsApp → **Configuration** → Webhook: callback URL `https://<café domain>/api/whatsapp/webhook`,
verify token = `WHATSAPP_VERIFY_TOKEN` → Verify and save → subscribe to **messages**. Needs the live
HTTPS address (P5-02); locally, test with a tunnel (e.g. `cloudflared tunnel --url http://localhost:3000`).

## 5. Hourly reminder timer (server)

```
sudo cp scripts/whatsapp/healthy-hunger-reminders.{service,timer} /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now healthy-hunger-reminders.timer
```

It runs every 5 minutes; the app sends pay-later notes 30 minutes after closing and reminders at the
day and hour set in Settings, each once, so an extra run never sends twice. After changing the timer
file, copy it again and run `sudo systemctl daemon-reload`. Run it by hand: `pnpm reminders:run`
(prints what it did, e.g. `{"ran":true,"periodKey":"WEEKLY:2026-11-02","sent":3,…}`).

## 6. Test before guests get anything

- Meta's test number only sends to numbers added under API setup → "To" – add your own first.
- Pay a test bill with your number → the PDF arrives; Admin → WhatsApp shows Sent → Delivered → Read.
- Put a bill on pay later → Settings → set reminders to today, an hour that has just passed →
  `pnpm reminders:run` → reminder with the statement PDF. Run it again → `"sent":0` (no double send).
- Reply STOP → the customer page says so and nothing more is sent; START turns it back on.
