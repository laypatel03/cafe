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
- Rules: numbers are the café's own estimates from ingredients – say so wherever they appear (`NUTRITION_NOTE`); no health, certification or sourcing claims; allergy note points to staff.
- Code: `lib/cafe.ts`, `brand/nutrition-label.tsx`, `landing/sections.tsx`, `lib/menu-pdf/document.tsx`.

**G-08 – Home page, PDF menu, blog, privacy**
*As a visitor I want to learn about the café, download the menu and read articles so that I decide to visit.*
- Rules: hero is a stack of real dish cards from the live menu (no WebGL); Today's pick + bestsellers from the DB; café details from `CafeSettings`; `/menu/pdf` is generated from the live menu; blog hidden unless `blogEnabled` (logged-in staff can preview); privacy page matches what is stored.
- Code: `app/page.tsx`, `landing/*`, `app/menu/pdf/route.ts`, `lib/menu-pdf/*`, `app/blog/*`, `lib/articles.ts`, `lib/data/blog-access.ts`, `app/privacy/page.tsx`.

---

## Staff (logged in, role STAFF)

**S-01 – Log in safely**
*As staff I want to log in on the counter tablet so that only we can use the dashboard.*
- Rules: rate-limited login; JWT cookie checked optimistically by `proxy.ts`, really by `getCurrentUser` (active + `sessionVersion`); stale cookie → `/admin/session-ended`.
- Code: `app/admin/login/*`, `lib/auth/*`, `src/proxy.ts`.

**S-02 – See new orders and live picks**
*As staff I want new orders to appear instantly with a chime so that no guest waits.*
- Rules: SSE from Postgres NOTIFY; chime + highlight until accepted; guests' live pick lists visible; offline banner and catch-up (`resync`) when the connection returns.
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
- Rules: name required, phone optional; typing a known mobile fills the name (typed name wins) and shows visit count; works any time (ignores hours); staff can't preselect a customer (they only see masked phones).
- Code: `app/admin/counter-order/page.tsx`, `lib/cart-store.ts#useCounterCart`, `(dashboard)/actions.ts#createCounterOrder/findGuestByPhone`.

**S-06 – Bill and take payment**
*As staff I want one bill per dine-in visit and per takeaway order, paid by cash / UPI / card, so that billing is quick and correct.*
- Rules: dine-in bill combines a guest's served, unbilled orders (waits while one is unserved); totals from server; methods Cash, UPI (Google Pay), Credit card, Debit card (legacy `CARD` = credit); "Pay later" bills show on the live board only on that day; wrong bills are voided with a reason, never deleted – numbers stay continuous; print 80 mm receipt; optional thank-you SMS via `sms:` link.
- Code: `admin/billing-panel.tsx`, `lib/billing.ts`, `(dashboard)/actions.ts#generateBill/markBillPaid/markBillPayLater/voidBill/receiptSms`, `app/admin/print/bill/[id]/page.tsx`, `lib/receipt.ts`, `admin/receipt-sms.tsx`.

**S-07 – Find past orders**
*As staff I want to search orders and bills by number, phone, name or date so that I can reprint or collect payment.*
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

## Owner (role OWNER – everything staff can do, plus)

**O-01 – Manage the menu**
*As the owner I want to edit categories, dishes, prices, nutrition, photos and add-ons so that the menu is always right.*
- Rules: prices in paise; photos converted to WebP ≤1200 px, old file deleted on replace; hidden ≠ sold out; reorder with move buttons; `updateTag(MENU_TAG)` after every write; bulk load from `prisma/seed-data.ts` via `pnpm menu:load`.
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
- Rules: hours rejected if they can't be parsed; switches: ordering, blog, order edits, customer edits; resetting a password/deactivating bumps `sessionVersion` (logs out); `updateTag(SETTINGS_TAG)` after writes.
- Code: `(dashboard)/settings/*`, `admin/settings/settings-screen.tsx`, `lib/validators/settings.ts`, `lib/cafe-hours.ts`.

**O-08 – QR cards**
*As the owner I want to print the café QR so that guests can scan it at every table.*
- Rules: one QR → `/menu` (`SITE_URL`); warns when the site URL is local; A4 sheet with four cards; a view-only QR opens the PDF menu.
- Code: `(dashboard)/qr/page.tsx`, `app/admin/print/qr/page.tsx`, `lib/qr.ts`.

---

## Developer / operator

**D-01 – Safe data** – Nightly `pg_dump` at 03:00 IST with restore check and email summary (never the dump). Code: `scripts/backup/*`, PLAN.md Phase 5.
**D-02 – Local setup** – `pnpm db:setup`, `db:migrate`, `db:seed` (`SEED_DEV_ADMIN` adds admin/admin locally), `db:demo` for fake data. Code: `scripts/*`, `prisma/seed.ts`.
**D-03 – Correctness** – Pure rules live in `lib/*.ts` with tests in `lib/__tests__/`; run `pnpm check` (typecheck + lint + test) before done.

---

## Not built yet (see TASKS.md)

FSSAI number on site and bills (P2-14) · kitchen ticket printing (P3-11) · server packaging, domain, security check, Playwright tests (P5-*) · real prices for 9 hidden dishes (P1-10) · online UPI, WhatsApp updates, loyalty (Later).
