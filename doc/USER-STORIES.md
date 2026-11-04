# User stories

What each person can do, the rules that must keep holding, and where the code lives.
Use it to understand intent before changing behaviour; file paths are short forms from [`INDEX.md`](./INDEX.md)
(`(dashboard)` = `src/app/admin/(dashboard)/`, `lib/` = `src/lib/`, components under `src/components/`).
When a task adds or changes behaviour, add or edit the story here. IDs are stable – don't renumber.

Format: **ID – title** · *As a … I want … so that …* · **Rules** (acceptance, must stay true) · **Code**.

---

## Guest (phone, no login)

**G-01 – Open the menu from the café QR**
*As a guest I want to scan one QR and see the menu fast so that I can choose without waiting.*
- Rules: one QR for every table/counter → `/menu`; old `/t/*` links redirect; loads < 2 s on 4G; no WebGL on the menu.
- Code: `app/menu/page.tsx`, `menu/menu-browser.tsx`, `lib/data/menu.ts#getPublicMenu`, `app/t/[table]/page.tsx`.

**G-02 – Browse, filter and search**
*As a guest I want to filter by protein, calories and bestsellers and search by name so that I find a dish quickly.*
- Rules: filters are "15 g+ protein" (`HIGH_PROTEIN_MIN_G`), "under 300 kcal" (`LIGHT_MAX_KCAL`), Bestseller – plain numbers, never "High protein"/"Light"; every dish shows veg mark, protein, kcal, price; sold-out dishes say "Sold out"; hidden dishes/categories never appear.
- Code: `menu/menu-browser.tsx`, `menu/menu-item-card.tsx`, `lib/menu-types.ts`, `brand/veg-mark.tsx`.

**G-03 – Pick dishes and add-ons**
*As a guest I want to add dishes with add-ons and change quantities so that my order is exactly right.*
- Rules: cart persists on the device; staff see the list live while I pick (`Selection`, 12 h TTL); sync is rate-limited per IP.
- Code: `menu/item-sheet.tsx`, `menu/list-line.tsx`, `menu/cart-bar.tsx`, `lib/cart-store.ts#useCart`, `selection-actions.ts#syncSelection`.

**G-04 – Place an order**
*As a guest I want to choose dine-in or takeaway, enter name and mobile and place the order so that the kitchen starts on it.*
- Rules: dine-in preselected; name + 10-digit Indian mobile required (`INDIAN_MOBILE`); optional note and offers consent; prices/totals computed on the server from the DB (`pricing.ts`), never from the browser; refused when ordering is off or outside opening hours; max 5 orders/h per phone, 10/h per network; order starts as `NEW` and is upserted onto the `Customer`; device remembers name/phone.
- Code: `menu/cart-bar.tsx`, `selection-actions.ts#placeOrder`, `lib/validators/place-order.ts`, `lib/pricing.ts`, `lib/data/menu-prices.ts`, `lib/rate-limit.ts`.

**G-05 – Ordering follows opening hours**
*As a guest I want the menu to tell me when the café is closed so that I don't place an order nobody will see.*
- Rules: hours come from Settings (owner-typed text, parsed in IST); an already-open menu opens/closes on time by itself; view-only notice when closed or switched off; counter orders ignore hours.
- Code: `lib/cafe-hours.ts`, `hooks/use-open-now.ts`, `menu/menu-browser.tsx`.

**G-06 – Follow my order live**
*As a guest I want to see my order's status update by itself so that I know when it's ready.*
- Rules: steps Waiting for staff → Accepted → In the kitchen → Served (dine-in) / Ready to collect → Picked up (takeaway) → Paid; cancellations show the reason; items shown without prices; updates within ~1 s via SSE.
- Code: `menu/order-tracker.tsx`, `selection-actions.ts#getGuestOrders`, `app/api/guest/stream/route.ts`, `lib/realtime.ts`.

**G-07 – Honest nutrition numbers**
*As a guest I want to know where the protein/calorie numbers come from so that I can trust them.*
- Rules: numbers are the café's own estimates from ingredients – say so wherever they appear (`NUTRITION_NOTE`); no health, certification or sourcing claims; allergy note points to staff; photos are "for reference only" (`PHOTO_NOTE`, menu footer box + item sheet when it has a photo).
- Code: `lib/cafe.ts`, `brand/nutrition-label.tsx`, `landing/sections.tsx`, `lib/menu-pdf/document.tsx`.

**G-08 – Home page, PDF menu, blog, privacy**
*As a visitor I want to learn about the café, download the menu and read articles so that I decide to visit.*
- Rules: hero is a stack of real dish cards from the live menu (no WebGL); Today's pick + bestsellers from the DB; café details from `CafeSettings`; `/menu/pdf` is generated from the live menu; Google reviews section only when `GOOGLE_MAPS_API_KEY` + `googlePlaceId` are set (Places API (New), `unstable_cache` 3 h; errors aren't cached and hide the section; only 4★+ reviews listed (overall rating + count stay Google's, summary under the hero buttons); menu dish names in a review are highlighted (text unchanged, `markDishes`) and become "Loved for" filter chips; last tile is an "Our promise" card, shown unedited with author + Google credit, never stored in our DB); blog hidden unless `blogEnabled` (logged-in staff can preview); privacy page matches what is stored.
- Code: `app/page.tsx`, `landing/*`, `app/menu/pdf/route.ts`, `lib/menu-pdf/*`, `app/blog/*`, `lib/articles.ts`, `lib/data/blog-access.ts`, `app/privacy/page.tsx`.

---

## Staff (logged in, role STAFF)

**S-01 – Log in safely**
*As staff I want to log in on the counter tablet so that only we can use the dashboard.*
- Rules: rate-limited login; JWT cookie checked optimistically by `proxy.ts`, really by `getCurrentUser` (active + `sessionVersion`); stale cookie → `/admin/session-ended`.
- Code: `app/admin/login/*`, `lib/auth/*`, `src/proxy.ts`.

**S-02 – See new orders and live picks**
*As staff I want new orders to appear instantly with a chime so that no guest waits.*
- Rules: SSE from Postgres NOTIFY; chime + highlight until accepted (sound on by default, unlocked by the first tap/key press – browser rule; "off" remembered per device in localStorage `hh-order-sound`); guests' live pick lists visible; offline banner and catch-up (`resync`) when the connection returns.
- Code: `admin/live-board.tsx`, `lib/data/live.ts`, `app/api/admin/live/*`, `lib/realtime.ts`, `admin/offline-banner.tsx`.

**S-03 – Move an order through its steps**
*As staff I want Accept → Send to kitchen → Served / Ready → Picked up buttons so that the board matches reality.*
- Rules: allowed steps come only from `order-flow.ts`; every change writes `OrderStatusLog` with the user; cancel needs a reason; Undo takes back the last step one at a time (not payments); status colours always have a text label.
- Code: `lib/order-flow.ts`, `admin/orders-panel.tsx`, `admin/undo-step.ts`, `(dashboard)/actions.ts#advanceOrder/undoOrderStep/cancelOrder`, `admin/order-status-badge.tsx`.

**S-04 – Edit an order's items**
*As staff I want to change quantities, remove or add dishes before it goes to the kitchen so that mistakes are fixed early.*
- Rules: only while `canEditItems`; re-priced on the server and logged; staff see "Other item" lines but can't change them (server keeps existing ones).
- Code: `admin/item-lines-editor.tsx`, `(dashboard)/actions.ts#updateOrderItems`, `lib/custom-lines.ts`.

**S-05 – Take a counter order**
*As staff I want to order for a walk-in using the guest menu so that everything goes through one system.*
- Rules: name required, phone optional; typing a known mobile fills the name (typed name wins) and shows visit count; owner only: typing 3+ digits of a number or 2+ letters of a name lists up to 6 saved customers (full numbers, latest visit first) – picking one fills both (`searchGuests`, owner-gated; never on the guest QR menu); works any time (ignores hours); staff can't preselect a customer (they only see masked phones).
- Code: `app/admin/counter-order/page.tsx`, `lib/cart-store.ts#useCounterCart`, `(dashboard)/actions.ts#createCounterOrder/findGuestByPhone/searchGuests`, `menu/guest-suggestions.tsx`.

**S-06 – Bill and take payment**
*As staff I want one bill per dine-in visit and per takeaway order, paid by cash / UPI / card, so that billing is quick and correct.*
- Rules: dine-in bill combines a guest's served, unbilled orders (waits while one is unserved); totals from server; methods Cash, UPI (Google Pay), Credit card, Debit card (legacy `CARD` = credit); "Pay later" bills show on the live board on that day, one card per guest (grouped by phone) with that guest's earlier unpaid pay-later bills added – tick which ones they're paying, one tap pays them all by one method (`markBillsPaid`, each bill paid as on its own); wrong bills are voided with a reason, never deleted – numbers stay continuous; print 80 mm receipt; the bill goes to the guest on WhatsApp by itself on payment (O-12) – the old thank-you SMS was removed 1 Nov.
- Code: `admin/billing-panel.tsx`, `lib/billing.ts`, `(dashboard)/actions.ts#generateBill/markBillPaid/markBillsPaid/markBillPayLater/voidBill`, `app/admin/print/bill/[id]/page.tsx`.

**L-01 – Sort lists (4 Nov)**
*As the owner I want to change the order of a list with one tap.*
- Rules: "Sort" buttons above the list, kept in the URL (`?sort=`) with the other filters, the chosen one filled. Customers: Last visit (default), Most visits, Top spend, Newest, Name A–Z, Owes most (only guests who owe; unpaid orders + paid less, ranked in code). Expenses: Newest (default), Oldest, Highest amount, Category – keeps the period. Order history: Newest (default), Oldest, Highest amount. Meal passes: Newest (default), Ends soonest, Most meals left. The old "Sort by" box in the Customers filter was replaced by the buttons.
- Code: `components/admin/sort-buttons.tsx`, the four pages.

**S-08 – All bills (4 Nov)**
*As staff or the owner I want one list of every bill so that I can find, reprint or collect any of them.*
- Rules: `/admin/bills` (staff + owner; staff see masked phones), side menu under Order history. Filters: search (bill #, phone, name), From/To (default today), Status – Paid, Part paid (paid short and still owed, `shortBillsDue`), Pay later, Not paid, Void – Paid with, Type; a number/phone search or Part paid / Pay later / Not paid look across all dates. Cards: Bills, Billed (not void), Received (paid bills at total + difference). Sort: Newest, Oldest, Highest amount, Bill number. Each row: status with a word, guest, date, orders, how/when paid, who billed, void reason; amount with "Paid ₹X / ₹Y still to pay" or "Owes ₹X"; Print/Reprint; Record payment on pay-later/unpaid bills.
- Code: `(dashboard)/bills/page.tsx`, `components/admin/{paid-difference,sort-buttons}.tsx`, `orders/record-payment-button.tsx`.

**S-07 – Find past orders**
*As staff I want to search orders and bills by number, phone, name or date so that I can reprint or collect payment.*
- Still owed (4 Nov): Payment filter "Still owed – any kind" (`?pay=OWED`, first in the list) = unpaid from an earlier day, on pay later, or a bill paid short whose rest is still owed (`shortBillsDue`); today's orders still being served/billed don't count. The banner above the filters says "Still owed: ₹X · N orders – unpaid from earlier days, pay later, or paid less" (unpaid orders in full, short bills only what's left) with "Show them"; it replaced "N orders from earlier days still need payment". Unpaid owed rows show "Owes ₹X" under the amount. Customer links ("Show what they owe", the customers list) open this filter.
- Rules: filters by date, type, status, payment (pending, earlier-days pending, pay later, paid by method); reminder of unpaid earlier-day orders with total; paged 10/25/50; staff see masked phones; record payment for pay-later bills.
- Code: `(dashboard)/orders/page.tsx`, `lib/data/owed.ts`, `lib/paging.ts`, `admin/{pager,page-size-select}.tsx`, `admin/orders/record-payment-button.tsx`.

**S-08 – Mark a dish sold out**
*As staff I want a one-tap sold-out switch so that guests can't order what we've run out of.*
- Rules: staff see only the sold-out switches on Menu; change shows on `/menu` immediately (`updateTag(MENU_TAG)`).
- Code: `(dashboard)/menu/actions.ts#setItemAvailable/setAddOnAvailable`, `admin/menu/menu-manager.tsx`, `admin/action-switch.tsx`.

**S-09 – Cash drawer**
*As staff I want to enter the morning cash and count at closing so that shortages are caught the same day.*
- Rules: opening carries over from last closing if nobody enters it; expected = opening + cash sales − cash expenses; closing snapshots totals; days are IST `yyyy-mm-dd`.
- Code: `(dashboard)/cash/*`, `admin/cash/cash-forms.tsx`, `lib/cash.ts`, `lib/data/cash.ts`, `lib/validators/cash.ts`.

**S-10 – Record expenses**
*As staff I want to record what was bought and how it was paid so that the books are complete.*
- Rules: staff add and see today's only; cash expenses come off the drawer; categories/payment labels from `lib/expenses.ts`.
- Code: `(dashboard)/expenses/page.tsx`, `(dashboard)/cash/actions.ts#saveExpense`.

---

## Developer (role DEVELOPER – website only)

- Can: Menu (everything the owner can: dishes, prices, photos, add-ons, categories, order, sold out), Today's offer, QR code, Settings → Café (details, hours, FSSAI, Analytics, Place ID, Today's pick), Settings → Editing → "Website and QR menu" switches, My password.
- Can't: Live orders, Order history, counter orders, bills, Cash counter, Expenses, Money book, Customers, Reports, Staff logins, the "Fixing past records" switches, CSV exports. Those pages redirect to `/admin/menu`; the actions and APIs refuse.
- Created by an owner in Settings → Staff logins.

---

## Owner (role OWNER – everything staff can do, plus)

**O-01 – Manage the menu**
*As the owner I want to edit categories, dishes, prices, nutrition, photos and add-ons so that the menu is always right.*
- Rules: prices in paise; photos converted to WebP ≤1200 px, old file deleted on replace; hidden ≠ sold out; reorder items by drag (grip, within a category; `setMenuItemOrder` saves the full order, rejects if the item set changed) or move buttons (keyboard); no drag while searching; `updateTag(MENU_TAG)` after every write; bulk load from `prisma/seed-data.ts` via `pnpm menu:load`.
- Code: `(dashboard)/menu/*`, `admin/menu/*`, `lib/validators/menu.ts`, `lib/uploads.ts`, `lib/data/admin-menu.ts`, `scripts/load-menu.ts`.

**O-02 – Other items and discounts**
*As the owner I want to add a free-text line with any price (minus = discount) so that I can handle anything not on the menu.*
- Rules: owner only (live board edit + Order history); total never below ₹0; not counted as dishes in reports or favourites.
- Code: `lib/custom-lines.ts`, `admin/item-lines-editor.tsx`, `OrderItem.custom`.

**O-03 – Fix past orders and payments**
*As the owner I want to add missed orders, edit or delete past ones and change how a bill was paid so that records match reality.*
- Rules: needs Settings switch "order edits"; deleted orders are soft-deleted (`deletedAt`), shown in red, left out of money book and reports; can set a paid bill back to pending.
- Code: `(dashboard)/orders/actions.ts`, `admin/orders/order-record-dialog.tsx`, `lib/order-edit.ts`, `lib/validators/order-edit.ts`, `lib/data/edit-switches.ts`.

**O-04 – Customers**
*As the owner I want to see guests with visits, spend, favourites, notes and who still owes money so that I know my regulars.*
- Rules: full phone numbers only here; owed = unpaid earlier-day orders + pay-later bills (not today's in-progress); stop offers, delete on request (orders keep the name/phone snapshot), CSV export; add/edit customers needs Settings switch; start a counter order from a profile.
- Code: `(dashboard)/customers/*`, `admin/customer-*.tsx`, `lib/data/owed.ts`, `lib/customer-stats.ts`, `app/api/customers/export/route.ts`.

**O-05 – Reports**
*As the owner I want sales by hour/day/month, dine-in vs takeaway, top dishes, regulars and expenses so that I can plan.*
- Rules: from paid bills only, void bills and deleted orders excluded; IST days.
- Code: `(dashboard)/reports/page.tsx`, `lib/reports.ts`, `lib/data/reports.ts`, `admin/reports/bar-chart.tsx`.

**O-06 – Money book**
*As the owner I want each day's sales by payment method, card fees, expenses and profit so that I know what I actually earned.*
- Rules: card fees in basis points from Settings; extra sales (paper sales) can be added; per day and per month; CSV export.
- Code: `(dashboard)/money/*`, `admin/money/*`, `lib/money-book.ts`, `lib/data/money-book.ts`, `app/api/money/export/route.ts`.

**O-07 – Settings**
*As the owner I want to set café details, hours, Today's pick, switches and staff logins so that the app fits how we work.*
- Rules: hours rejected if they can't be parsed; FSSAI licence is 14 digits (spaces stripped) or empty, footer badge shows only when set; GA ID must be `G-` + 4–15 letters/digits (it's put in an inline script), loaded only off `/admin` and the privacy note switches its cookie sentence when set; switches: ordering, blog, order edits, customer edits; resetting a password/deactivating bumps `sessionVersion` (logs out); owner can delete a login (`deleteStaff`, after a confirm) – not their own, not the last active owner; history rows keep their data with the staff link set to null (no name shown); `updateTag(SETTINGS_TAG)` after writes.
- Code: `(dashboard)/settings/*`, `admin/settings/settings-screen.tsx`, `lib/validators/settings.ts`, `lib/cafe-hours.ts`.

**O-09 – Today's offer** (owner + developer)
*As the owner I want to put a lower price on a dish for a day or a few days so that guests notice it and order it.*
- Rules: one dish, offer price below the menu price, optional short line (≤60), first and last day (IST, inclusive, last day not past); `/` shows a "Today's offer" section under the hero and `/menu` a strip at the top (hidden while searching/filtering), cards show the offer price in orange with the regular price struck through and an "Offer" tag; no offer → nothing shows. Orders (guest, counter, live-board edits) are charged the offer price via `loadMenuPrices`; owner past-order edits start from regular prices; PDF menu and blog keep regular prices. Ending an offer doesn't change orders already placed. Offer ignored if the menu price drops to or below it, or the dish is hidden.
- Code: `lib/offers.ts`, `lib/data/offers.ts`, `(dashboard)/offers/*`, `components/landing/todays-offers.tsx`, `components/menu/{price,offers-strip}.tsx`.

**O-11 – Customer balance (paid extra / paid less)**
*As the owner I want money a guest paid over or under a bill remembered so that it's settled on their next visit.*
- Rules: on an unpaid bill card with a known customer, optional "Received (₹)"; a difference ≠ 0 makes a `CustomerBalanceEntry` (PAID_EXTRA +, PAID_LESS −) and is stored as `Bill.differencePaise`; the money book and cash drawer count bills at total + difference (what was received), so a short bill counts only what came in and the rest counts on the day it is paid back. No phone on the order → only exact payment. Balance = Σ entries, leaving out SETTLED ones on cancelled/deleted orders. "To bill" card shows "Credit ₹X · paid extra on bill #N" / "Owes ₹X · paid less on bills #N, #M" → "Use ₹X credit" (−line, up to the orders' total) / "Add ₹X owed" (+line) on the last order, the line named after those bills ("Still owed from bill #407, #408"; "an earlier visit" when the amount came from a hand entry – `balanceBills`, oldest bills cleared first); once per set of orders, "Undo balance" before billing (after: void first); item edits refused while the line exists. Owner on the customer page: Balance (state + last 20 entries) and a form – paid extra / paid less / paid back / extra given back, amount, cash-card-UPI, note → entry + ± `ExtraSale`; "paid less" by hand asks no method and makes no sale (2 Nov) – it only records what they owe. Staff can't add entries by hand. Money-book notes carry no names. Customers list: "Owes ₹X · paid less" (orange, counted in "Still to pay" and the "Owes money" filter) or "Credit ₹X · paid extra" (green) per row. Each row also has a **Balance** column (5 Nov): "Owes ₹X" = unpaid bills from earlier days / pay later + paid less, "Credit ₹X", or ₹0; rows that owe link to "What they owe" (Order history `?pay=OWED`). Printed bill shows "Paid extra (credit)" when paid over; when paid short: "Paid at the counter", "Paid later" (what has been paid back since) and the current "Still to pay" (`shortBillsDue`) or "Fully paid", and the footer says "PART PAID" while something is still owed; Order history shows "Paid ₹X" (orange when short, green when extra; "Bill paid ₹X of ₹Y" when the bill has several orders) under the order total, and "paid less / paid extra by …" in the row note. The customer page's order list shows the same. A short bill counts as **still to pay** while the guest's balance is minus – what they've paid back clears their oldest short bills first (`shortBillsDue` → pure `shortfallsLeft`, tested) – so Order history's "Payment pending" filters and the "earlier days" banner (counting only what's left on those bills) include it; once paid it says "the rest paid since". The Customers list's "Owes money" filter already included guests who paid less. Money book: a "Paid less: ₹X still owed by N guests" note (like Pay later), and balance/meal-pass sales are tagged and can't be deleted there (`deleteExtraSale` refuses them).
- Code: `lib/customer-balance.ts`, `lib/data/customer-balance.ts`, `(dashboard)/customers/balance-actions.ts`, `components/admin/balance-box.tsx`, `components/admin/balance-entry-form.tsx`, `billing-panel.tsx`, `markBillPaid` in `(dashboard)/actions.ts`.

**O-10 – Meal passes**
*As the owner I want to sell monthly meal passes so that regulars prepay and staff can take meals off at the counter.*
- Rules: owner makes plans (name, price, days, and 1–6 **meal types** the owner names – e.g. Bowl, Smoothie, Toast – each with a meal count, "counts dishes from" categories (tick several) and a price cap; "Add meal type" / remove; type names must differ) and switches them on/off (never deleted); owner sells on the customer page (plan, paid with, start today–+31 days) → `MealPass` copies the plan + a `ExtraSale` for the price that day. Staff on a "To bill" card with an active pass: "Use meal pass" lists covered dishes (category match, pass pays up to the cap, add-ons and the rest charged), pick counts, server re-checks inside a transaction. **Swaps**: a dish from another category can count as a meal (the first meal type with meals left), never preselected, marked "Swap" and saved as `MealPassUse.swap` – staff only for dishes priced within the cap (fully covered), the owner for any dish (guest pays above the cap); "Undo meal pass" before billing (after billing: void first). Item edits refused while pass lines exist. A category in two types uses the first one with meals left. Meals left (per type) = counts − uses on orders not cancelled/deleted. Pass status: upcoming/active/used up/lapsed (after `endsOn`)/refunded. Refund (≤ price, how paid back, reason) only with Settings → Editing → "Refund meal passes" on → minus `ExtraSale` today, pass stops. Customer delete anonymises passes; money-book notes carry no names.
- Code: `lib/meal-pass.ts`, `lib/data/meal-passes.ts`, `(dashboard)/passes/*`, `components/admin/passes/pass-forms.tsx`, `components/admin/billing-panel.tsx`.

**O-12 – WhatsApp bills and due reminders**
*As the owner I want each bill sent to the guest on WhatsApp, and guests who owe money reminded every week or month with a PDF of what's unpaid, so that I get paid without chasing.*
- Rules: Meta Cloud API, approved Utility templates `bill_receipt` / `due_reminder` with a PDF header (bodies in `lib/whatsapp/messages.ts`); bill PDF sent after `markBillPaid` via `after()`; bills put on pay later get one short `pay_later_thanks` per guest 30 min after closing (no PDF, `runPayLaterNotes`, once `WHATSAPP_PAYLATER_TEMPLATE` is set); pay-later bills paid off (one or several via `markBillsPaid`) → one `payment_received` with a receipt PDF and what's still due (once `WHATSAPP_PAYMENT_TEMPLATE` is set), never a PDF per bill when Settings "Send bills on WhatsApp" is on (default) and the bill has a phone; Reminders: café-wide Weekly (default) / Monthly / Off, weekday or day 1–28, hour (IST), minimum due; hourly timer → `/api/cron/due-reminders` (`CRON_SECRET`); due from the set hour for 24 h; one per guest per period (unique `customerId + kind + periodKey`, failed or stuck rows retried up to 3 times); amount = `owed.ts` (unpaid earlier-day orders + pay-later bills). Owner can pause a guest or "Send reminder now" (not counted as the period's). Reply STOP → `whatsappOptOutAt`, no bills or reminders; START undoes. Not connected → wa.me link with the text, no PDF, nothing automatic. Every send logged in `WhatsAppMessage` (status from the signed webhook, never moves backwards); `/admin/whatsapp` lists them with Retry. Delete-on-request removes the guest's messages.
- Messages (5 Nov): Settings → WhatsApp → **Messages** lists the five templates with Meta's status (Approved / Meta is reviewing / Rejected + reason / Paused / Not linked), read live from Meta with `WHATSAPP_*_TEMPLATE_ID` (`syncTemplates`). The owner edits the body and footer, sees the blanks' meaning and a preview with samples, and presses "Send to Meta for approval" (`saveTemplateText` → `submitTemplate`: checked by `checkTemplateText` – same {{1}}…{{n}}, each once, not first/last, not side by side, ≤1024 / footer ≤60; the whole template is resent, with a sample PDF uploaded for Document headings). Guests keep getting the approved wording until Meta approves; one change a day per approved message; none while one is in review. The approved wording is kept in `WhatsAppTemplate` and used for the message log and wa.me links (`withLiveText`).
- Per guest (4 Nov): the customer page's WhatsApp card has **Bills** and **Reminders** switches (owner). Bills off (`Customer.waBillsPaused`) → no bill PDF, pay-later note or payment received for that guest, sent automatically or by hand (`sendBill` / `sendPayLaterNote` / `sendPaymentReceived` skip them); reminders and the welcome are separate.
- Welcome (4 Nov): new guests (Customer created in the last 2 days) get `welcome_review` once – a thank-you with the Google review link from `googlePlaceId` – 1 h after their first bill is paid or put on pay later, 9 am–9 pm IST, sent by the hourly timer (so 1–2 h after the bill) (`runWelcomes`); one per guest for all time (`periodKey` "first-visit"); needs `WHATSAPP_WELCOME_TEMPLATE`, the Place ID and Settings → WhatsApp → "Welcome message" on (default on); STOP is respected; failed ones can be retried on Admin → WhatsApp (Welcome tab).
- Code: `lib/whatsapp/*`, `lib/bill-pdf/document.tsx`, `lib/dues-statement.ts`, `lib/reminder-schedule.ts`, `(dashboard)/whatsapp/*`, `admin/whatsapp/wa-buttons.tsx`, `app/api/{whatsapp/webhook,cron/due-reminders}/route.ts`, `scripts/whatsapp/*`, `doc/whatsapp-setup.md`.

**O-08 – QR cards**
*As the owner I want to print the café QR so that guests can scan it at every table.*
- Rules: one QR → `/menu` (`SITE_URL`); warns when the site URL is local; A4 sheet with one card (2 Nov; was four) in a size set in inches (`?w=&h=`, 1.5–7.4 × 1.5–10.8, default 3.7 × 5.4); a view-only QR opens the PDF menu.
- Code: `(dashboard)/qr/page.tsx`, `app/admin/print/qr/page.tsx`, `lib/qr.ts`.

---

## Developer / operator

**D-01 – Safe data** – Nightly `pg_dump` at 03:00 IST with restore check and email summary (never the dump). Code: `scripts/backup/*`, PLAN.md Phase 5.
**D-02 – Local setup** – `pnpm db:setup`, `db:migrate`, `db:seed` (`SEED_DEV_ADMIN` adds admin/admin locally), `db:demo` for fake data. Code: `scripts/*`, `prisma/seed.ts`.
**D-03 – Correctness** – Pure rules live in `lib/*.ts` with tests in `lib/__tests__/`; run `pnpm check` (typecheck + lint + test) before done.

---

## Not built yet (see TASKS.md)

FSSAI number on site and bills (P2-14) · kitchen ticket printing (P3-11) · server packaging, domain, security check, Playwright tests (P5-*) · real prices for 9 hidden dishes (P1-10) · online UPI, loyalty (Later).
