# Deploying the WhatsApp branch (`feat/whatsapp-bills-reminders`)

For the developer merging this and putting it on the server. Meta account and template details:
[`whatsapp-setup.md`](./whatsapp-setup.md). Decisions: `PLAN.md` → "WhatsApp bills & due reminders".

## What this branch changes

| Area | Change |
|---|---|
| Bill paid at the counter | Bill PDF sent to the guest on WhatsApp by itself (template `bill_reciept_pdf`) |
| Bill put on pay later | Nothing at once; one `pay_later_thanks` per guest **30 min after closing** (no PDF) |
| Pay-later bills paid off | One `payment_received` with a receipt PDF and what's still due |
| Weekly / monthly | `due_reminder` with a statement PDF of everything unpaid (Settings → WhatsApp) |
| Live orders | Pay-later bills grouped per guest; tick which bills they pay; order sound on by default |
| Counter order | Owner picks a saved customer while typing number or name |
| New pages | Admin → WhatsApp (message log, retry, account card); Settings → WhatsApp tab |
| Removed | Old thank-you SMS popup and "Text receipt"; "WhatsApp bill" button in Order history |
| Database | 3 migrations, **additive only** (new table, columns, enum values) – nothing dropped |
| Dependencies | None added (`@react-pdf/renderer` was already used for the menu PDF) |

## How it runs (no worker, no queue)

- **The web app** (`pnpm start`, i.e. `next start`) does all the sending. A bill PDF goes out from the
  same process right after the payment request (`after()` in Next.js) – the cashier never waits.
- **A systemd timer** calls `POST /api/cron/due-reminders` on the running app **every 5 minutes**
  (`scripts/whatsapp/run-reminders.sh`, secret `CRON_SECRET`). The app decides what is due: pay-later notes
  30 min after closing, reminders at the day and hour in Settings. Every note and reminder goes once, so
  extra calls send nothing. Like cron calling a Django view – there is no Celery/Redis equivalent to run.
- **Meta calls the webhook** `POST /api/whatsapp/webhook` with delivery status and STOP/START replies.

So on the server: the app (already needed) + **one timer** + the webhook URL in Meta.

## Steps

### 1. Code and database
```bash
git fetch origin && git checkout main && git merge origin/feat/whatsapp-bills-reminders
pnpm install            # also runs prisma generate
pnpm db:deploy          # prisma migrate deploy – applies the 3 migrations below
pnpm build
```
Migrations (all additive, safe on live data):
- `20261101090000_whatsapp` – `WhatsAppMessage` table, reminder settings on `CafeSettings`,
  `remindersPaused` / `whatsappOptOutAt` on `Customer`
- `20261101160000_whatsapp_pay_later` – message kind `PAY_LATER`
- `20261101180000_whatsapp_payment_received` – kind `PAYMENT_RECEIVED`, `WhatsAppMessage.billIds`

Never run `prisma migrate dev` on the server (it can reset the database).

### 2. `.env` on the server
Add these (see `.env.example`; values are in WhatsApp Manager / the Meta app – ask the owner):

| Variable | Required | What |
|---|---|---|
| `WHATSAPP_TOKEN` | yes | System user token (does not expire) |
| `WHATSAPP_PHONE_NUMBER_ID` | yes | API setup → Phone number ID of +91 90819 86882 |
| `WHATSAPP_API_VERSION` | no | Default `v23.0` |
| `WHATSAPP_BILL_TEMPLATE` | yes | `bill_reciept_pdf` (spelled like that in WhatsApp Manager) |
| `WHATSAPP_REMINDER_TEMPLATE` | no | Empty = `due_reminder` |
| `WHATSAPP_PAYLATER_TEMPLATE` | yes* | `pay_later_thanks` – empty = no pay-later notes |
| `WHATSAPP_PAYMENT_TEMPLATE` | yes* | `payment_received` – empty = nothing on paying off |
| `WHATSAPP_TEMPLATE_LANGUAGE` | no | Empty = `en` |
| `WHATSAPP_*_TEMPLATE_ID` | no | Kept for a future template editor; not used to send |
| `WHATSAPP_VERIFY_TOKEN` | yes | Any long random text – the same text goes in Meta's webhook form |
| `WHATSAPP_APP_SECRET` | yes | Meta app → App settings → Basic → App secret (checks webhook signatures) |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | no | The **WhatsApp Business Account** ID (not the business portfolio ID) – shows "Charged by Meta this month" |
| `CRON_SECRET` | yes | `openssl rand -hex 32` – used by the timer; generate a new one for the server |
| `APP_URL` | yes | Where the timer reaches the app on the server, e.g. `http://127.0.0.1:3000` |

\* All four templates are already **approved** on the café's account. Without `WHATSAPP_TOKEN` +
`WHATSAPP_PHONE_NUMBER_ID` nothing is sent automatically (staff get `wa.me` links instead).

Restart the app after changing `.env`.

### 3. Webhook in Meta (needs the live HTTPS address)
developers.facebook.com → the app → WhatsApp → **Configuration** → Webhook:
- Callback URL: `https://<café domain>/api/whatsapp/webhook`
- Verify token: the value of `WHATSAPP_VERIFY_TOKEN` → **Verify and save**
- Webhook fields: subscribe to **messages**

Without it, sending still works, but every message stays "Sent": failures that WhatsApp reports later
(number not on WhatsApp, undeliverable…) never show, and STOP replies aren't recorded. Meta has no API to
look a message's status up afterwards – the webhook is the only way.

### 4. The 5-minute timer (systemd)
```bash
sudo cp scripts/whatsapp/healthy-hunger-reminders.service scripts/whatsapp/healthy-hunger-reminders.timer /etc/systemd/system/
```
Edit `/etc/systemd/system/healthy-hunger-reminders.service` if the app doesn't run as user `cafe` from
`/srv/healthy-hunger` (`User=`, `WorkingDirectory=` – the folder with `.env`). Then:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now healthy-hunger-reminders.timer
systemctl list-timers healthy-hunger-reminders.timer        # next run within 5 min
sudo systemctl start healthy-hunger-reminders.service       # run once now
journalctl -u healthy-hunger-reminders.service -n 20        # what it printed
```
A good run prints JSON like `{"payLater":{"ran":false,"reason":"Not 30 minutes past closing yet."},
"reminders":{"ran":false,"reason":"Not time for reminders yet."}}`. `status=217/USER` means the `User=` in
the service doesn't exist; `curl: (7)` means the app isn't reachable at `APP_URL`.

If the app runs in **Docker**, keep the timer on the host and point `APP_URL` at the container's published
port; the script only needs `curl` and the `.env` file.

### 5. In the app (owner login)
- **Settings → WhatsApp**: all three lines say "Ready". Set the reminder day and time (default
  **Monday 11:00 am**, weekly) and the minimum amount.
- **Settings → Café**: real phone number (it's printed at the top of the PDFs – the local test data has a
  placeholder) and correct **opening hours** – the pay-later note time is closing + 30 min (11 pm if a day
  has no hours).
- **Admin → WhatsApp**: the account card shows the number +91 90819 86882, quality and daily limit.

### 6. Smoke test (use your own phone number)
1. Counter order with your number → served → bill → **Cash**: the bill PDF arrives.
2. Another order → **Complete · pay later**: nothing at once; after closing + 30 min, one pay-later note.
3. Live orders → your pay-later card → pay it: one "Payment received" with the receipt PDF.
4. Customer page → **Send reminder now**: the reminder with the statement PDF.
5. Admin → WhatsApp: each message listed; with the webhook on they move to Delivered / Read.

## Running it

- **Turn sending off quickly**: Settings → WhatsApp → "Send bills on WhatsApp" (bills, pay-later notes,
  payment received) and reminders → Off. Or empty `WHATSAPP_TOKEN` and restart (everything stops).
- **Failures**: Admin → WhatsApp → Failed shows Meta's reason; **Retry** sends again.
- **A guest replied STOP**: their customer page says so; they get nothing until they send START.
- **Rollback**: deploying the previous code is fine – the migrations only add things; the extra table and
  columns are simply unused. Disable the timer (`systemctl disable --now healthy-hunger-reminders.timer`).
- **PDF fonts and logo** are read from `src/lib/menu-pdf/fonts/` and `public/brand/` at runtime (same as the
  menu PDF). If the build ever switches to `output: "standalone"`, copy those folders into the image.
