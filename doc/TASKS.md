# Healthy Hunger – Task queue

One task = one session. Prompt: **"Do task P1-03 from doc/TASKS.md."**
Tick `[x]` when done; `[~]` = covered by other work or no longer needed (say why on a `↪` line). Each task ends with `pnpm typecheck && pnpm lint` passing.
Every open task has a `Plain:` line – what it means for the café, in everyday words – which the status board shows. Keep [`STATUS.md`](./STATUS.md) (what works today, for the owner) in step with finished work.
Status board (for the team): https://claude.ai/artifact/GC4ttoJYv6kkz93LDh6oAa – after ticking tasks, regenerate with `node scripts/status-board.mjs <scratch>/build-board.html` and republish to that URL.

**Next up (in order):** P5-01 → P5-03 → P5-04 → P5-05 → P3-13. P5-02 needs the domain; P0-02 needs a 3D scan.
Phases and design reasoning live in [`PLAN.md`](./PLAN.md); scope in [`goal`](./goal).

Legend: **Files** = where the work goes · **Done when** = the check that closes it · ⛔ = blocked by an open question (PLAN.md §5).

---

## Phase 0 – Design & 3D prototype
- [ ] **P0-01 Owner signs off the look** – Owner reviews `/` and `/menu` on laptop + mid-range Android.
  Done when: owner approves; hero ≥ 55 fps laptop, smooth on Android (else open a perf task).
  Plain: The owner looks at the website and menu on a laptop and an Android phone and says yes to the look.
- [ ] **P0-02 Real-looking 3D dish** – feedback: current bowl looks animated/CGI. Replace code-built salad with a real
  photo-scanned GLB (own dish via Polycam = best; or a CC-BY Sketchfab veg salad scan + credit line).
  Keep: lazy load on `/` only, poster fallback, scroll story. Add: HDRI studio light, ACES tone mapping, DOF, Draco/Meshopt GLB ≤ 3 MB.
  Done when: owner says it looks real; LCP unaffected (poster first).
  Plain: Swap the cartoon-style 3D salad on the home page for a real, photo-scanned dish so it looks appetising.

## Phase 1 – Foundation
- [x] **P1-01 Load the real menu** – `prisma/seed-data.ts`, `scripts/load-menu.ts`.
  ✅ 10 Oct: the owner's six printed menus + Tea & Coffee card → 40 dishes in 7 categories and 12 add-ons. `pnpm menu:load` shows what would change, `--yes` applies it (overwrites the menu from the file, keeps photos, hides dishes not in the file). 31 dishes live; 12 old placeholder dishes hidden (kept for order history).
- [ ] **P1-10 Prices for 9 hidden dishes** ⛔ prices from the owner – the printed menus show no price for the 3 sandwiches and 3 overnight oats, and "MRP" for Diet Coke, Coke Zero and water.
  Plain: Nine dishes are loaded but hidden from guests until the owner types a price for each (Menu → edit the dish → Price, then switch on "Show on menu").
- [x] **P1-02 Login page + actions** – `src/app/admin/login/page.tsx`, `src/app/admin/login/actions.ts`.
  Zod-validated, rate-limited (`rate-limit.ts`), sets session cookie; logout action.
  Done when: seeded owner can log in/out; 6th bad attempt in the window is refused.
  ✅ Built 4 Oct: `src/app/admin/login/`; also `/admin/session-ended` clears stale cookies (no redirect loop).
- [x] **P1-03 Admin shell** – `src/app/admin/(dashboard)/layout.tsx`, `src/components/admin/sidebar.tsx`, `header.tsx`.
  Sidebar links filtered by role, user menu + logout, offline indicator.
  Done when: `/admin` shows shell for staff + owner; owner-only links hidden for staff.
  ✅ Built 4 Oct: `src/components/admin/admin-nav.tsx` (sidebar + mobile sheet), `offline-banner.tsx`.
- [x] **P1-04 Menu manager – categories** – `src/app/admin/(dashboard)/menu/` (page + actions).
  Add / rename / reorder / hide; `updateTag(MENU_TAG)` after writes.
  Done when: change shows on `/menu` immediately.
  ✅ Built 4 Oct: Categories tab in `src/components/admin/menu/`.
- [x] **P1-05 Menu manager – items list + edit form** – same folder, `item-form.tsx`.
  Name, desc, price, protein, kcal, tags, category, visible, sort.
  Done when: owner edits an item price and `/menu` updates.
  ✅ Built 4 Oct: `item-form.tsx`; high-protein tag is automatic (≥15 g), bestseller is a switch.
- [x] **P1-06 Item photos** – upload in item form via `saveMenuPhoto`; delete old file on replace.
  Done when: phone photo uploads as ≤1200px WebP and shows on the menu card.
  ✅ Built 4 Oct: verified 1600px JPEG → 1200px WebP; old file deleted on replace/remove.
- [x] **P1-07 Add-ons CRUD + link to items** – add-on table + multiselect in item form.
  Done when: add-ons appear in the item sheet on `/menu`.
  ✅ Built 4 Oct: Add-ons tab + checkboxes in item form.
- [x] **P1-08 Sold-out switch (staff too)** – one-tap toggle in item list; staff allowed.
  Done when: staff marks item sold out; card shows "Sold out" on `/menu`.
  ✅ Built 4 Oct: staff see only sold-out switches.
- [x] **P1-09 Move seed data out of `src/`** – `src/lib/mock-menu.ts` is now only used by `prisma/seed.ts`; move it to `prisma/seed-data.ts`, update imports + README.
  Done when: nothing in `src/` imports it; `pnpm db:seed` + build pass.
  ✅ 5 Oct: now `prisma/seed-data.ts` (menu + café defaults); `src/lib/cafe.ts` keeps only `NUTRITION_NOTE`.

## Phase 2A – Shared lists (replaced by 2B)
Built 5 Oct (P2A-01…04): table QR route, guest list without totals, list synced to staff, "Table lists" screen.
The owner clarified that the real flow needs order confirmation and billing, so Phase 2B turns the list into orders.

## Phase 2B – Orders & bills
Flow: guest picks items (**staff see it live**) → guest taps **Confirm – I'm done** → cashier goes to the table and **confirms the order on the dashboard with the guest's name + phone** → **Send to kitchen** → **Served** / **Ready to collect** → cashier **Generate bill** (one per table visit) → **Paid**. Customers never see totals; no tax for now.
- [x] **P2B-01 Order + bill data model** – reuse `Order`/`OrderItem`/`OrderStatusLog`; add `Bill` (number, table, orders, subtotal, tax, total, payment method, paid at) and `Order.billId`.
  ✅ 5 Oct: `Bill` + `Order.billId` (payment on the bill); `src/lib/pricing.ts` with tests.
- [x] **P2B-02 Live selections + cashier confirms** – guest list mirrors live to the dashboard (`Selection` per device: SELECTING → READY → CONFIRMED); guest "Confirm – I'm done" marks READY; cashier's "Confirm order" dialog (edit items, phone → returning name, note, consent) creates the Order as ACCEPTED with server prices and a status log; guest's phone shows "Order #N confirmed".
  ✅ 5 Oct: realtime = Server-Sent Events on Postgres LISTEN/NOTIFY (`src/lib/realtime.ts`, `/api/admin/live/stream`, `/api/guest/stream`). Verified two tabs: pick → dashboard in ~0.7 s; Ready + chime; cashier confirmed #4 (₹397, tea qty edited); guest phone updated by itself.
- [x] **P2B-03 Customer order status** – guest sees their confirmed order's items (no prices) and live status (Confirmed → In kitchen → Served) via `/api/guest/stream`; new picks after an order start a new round for the same table.
  Done when: status changes made by staff appear on the guest's phone within a second.
  ✅ 5 Oct: `order-tracker.tsx` – step bar (dine-in Confirmed → In the kitchen → Served; takeaway adds Ready to collect / Picked up), items without prices, cancel reason; bar shows "Order #N · status"; active orders also shown under a new list. Verified live on #5.
- [x] **P2B-04 Staff: kitchen + served** – on the Live orders screen: Send to kitchen, Served / Ready to collect, Cancel with reason; columns or filters by status; status log; live via the existing stream.
  Done when: staff take an order from Confirmed to Served without reloading.
  ✅ 5 Oct: `orders-panel.tsx` – groups Confirmed / In the kitchen / Ready to collect / Done today; Send to kitchen, Served, Ready to collect, Picked up, Cancel with reason (quick reasons); rules in `src/lib/order-flow.ts` (tested). Owner request: staff can **edit items** (qty / remove / add from a searchable menu with add-ons) in the Confirm dialog and on a confirmed order until it goes to the kitchen – re-priced and logged. Verified #5: added Green Tea, edited to 2 (₹407), kitchen → served, guest updated live; #2 cancelled with reason. Takeaway steps covered by unit tests only so far.
- [x] **P2B-05 Cashier: bill + payment** – per table "Generate bill" combines served, unbilled rounds; bill view (print-friendly); Paid with Cash / UPI / Card; table frees up; customer visits + spend updated. Takeaway: bill per order.
  Done when: a two-round table visit produces one bill and is marked paid.
  ✅ 6 Oct: `billing-panel.tsx` (To bill grouped by table, waits while a round is unserved; Awaiting payment with Cash/UPI/Card, Print, Undo), `/admin/print/bill/[id]` 80 mm receipt, `src/lib/billing.ts` (tested). Verified T6: #5 + #6 → Bill #1 ₹526, paid by UPI, orders PAID, customer 1 visit / ₹526 spend; Undo on T5 works.
- [x] **P2B-06 Order history** – find bills/orders by date, number, phone, table; reprint a bill.
  ✅ 6 Oct: `/admin/orders` – date range, one search box (#order / #bill / phone / table / name), type + status, 50 per page, step history, reprint link; staff see masked phones.
- [x] **P2B-09 One QR, guests order themselves** (owner, 7 Oct) – no per-table QR or tables; guest picks Dine-in/Takeaway, enters name + phone and places the order (NEW); staff Accept → kitchen.
  ✅ 7 Oct: `placeOrder` in `src/app/selection-actions.ts` (server prices, ordering-off check, rate limits per phone + network, customer upsert); list sheet with Dine-in/Takeaway + details step (`cart-bar.tsx`, name/phone remembered on the device); dashboard "New orders" (chime) → Accept → "Accepted" → kitchen; dine-in bill = one guest's served orders; `/admin/qr` + `/admin/print/qr` (one code, 4 cards per A4); `/t/*` redirects to `/menu`; Tables screen removed. Verified #11 + #12 (same guest) → Bill #8 ₹348 by card; guest phone followed every step. Owner, 7 Oct: **Dine-in is preselected** (guest can switch to Takeaway).
- [x] **P2B-10 Drop unused table data** – remove `CafeTable`, `Order/Bill/Selection.tableId` and Selection READY with a migration (safe once no one needs old table history).
  ✅ 7 Oct: migration `20261007190000_drop_tables` (written with `prisma migrate diff`, reviewed, applied with `migrate deploy`) drops `CafeTable`, the three `tableId` columns, `Selection.readyAt` and `SelectionStatus.READY`. Old orders/bills keep items and amounts. `/t/*` still redirects to `/menu` for any old printed cards. **Found while testing:** the server's Postgres LISTEN connection went silent in dev (no error), freezing guests' order status until reload. Fix in `src/lib/realtime.ts`: the listener NOTIFYs itself every 25 s and reconnects if the ping doesn't return within 5 s (also retries a failed reconnect), then sends `resync` so open screens reload; guests' phones also re-check their orders every 30 s. Verified: listener killed → back in ~2 s → guest phone showed "Paid" for #17.
- [x] **P2B-11 Text the receipt** (owner, 8 Oct; switched on 18 Oct – `RECEIPT_SMS_ENABLED` in `src/lib/receipt.ts`) – after payment, offer to SMS the guest their receipt from the counter phone (free, café's own number; no SMS provider).
  8 Oct: `receiptSms` action + `src/lib/receipt.ts` (message + `sms:` link, tested); dialog after "Paid" (`receipt-sms.tsx`, lives in the billing panel so it survives the bill card closing) with Open messages / Copy / Skip; "Text receipt" in order history for paid bills. Staff see the masked number; the full number is only in the link. Message: "Thank you for visiting Healthy Hunger! Bill #14 – ₹249 paid by UPI. See you again soon." Automatic sending later: Android phone as SMS gateway (sms-gate.app) or a DLT-registered provider.
  ✅ 18 Oct: owner asked for a thank-you text after each visit → switched on as built (staff tap Send on the counter phone; no automatic sending yet). Owner's wording (18 Oct): "Thank you for visiting Healthy Hunger! 🥗 Enjoyed your meal? Please leave us a quick review: <Google review link> · Menu: healthyhungercafe.com" – no bill number or amount; review link + site are constants in `receipt.ts`.
- [x] **P2B-07 Void bills instead of deleting them** – Undo bill currently deletes the bill, leaving a gap in bill numbers; keep it as VOID with a reason so numbering stays continuous (needed before GST invoices).
  ✅ 7 Oct: migration `void_bills` (`Bill.voidedAt/voidReason/voidedById/voidedOrderNumbers`); "Void bill…" asks a reason (quick picks), keeps the bill, unlinks its orders back to "To bill" and logs "Bill #N voided: reason" on each order; void bills can't be paid; print shows a VOID stamp. Verified: Bill #9 voided → #13 re-billed as #10 (no gap), history + print correct.
- [x] **P2B-08 Takeaway run-through in the browser** – Ready to collect → bill → Picked up is unit-tested only so far.
  ✅ 7 Oct: ran #9/#10 guest phone ↔ dashboard. **Bug fixed:** paying a takeaway bill before pickup jumped READY → PAID, so the parcel vanished from "Ready to collect" and the guest saw "Paid" before collecting. Now paying keeps it READY (card shows "Paid", Cancel hidden – also refused on the server), and "Picked up" finishes it as PAID (`statusOnPayment` in `order-flow.ts`, tested). Verified #10: kitchen → ready → Bill #7 UPI → still waiting → Picked up → Paid; history 6 steps.

## Phase 2 – Customer site
- [x] **P2-01 Landing from DB** – Today's Pick + bestsellers read via `getPublicMenu`; café details from `CafeSettings`.
  ✅ Built 4 Oct: `src/app/page.tsx` + `getCafeDetails` (rendered per request, data cached).
- [x] **P2-02 Landing scroll story** – camera moves bowl → "nutrition explode" → Today's Pick (GSAP or drei `ScrollControls`).
  Done when: smooth on laptop; low GPU tier / reduced motion gets poster only.
  ✅ Built 4 Oct (salad bowl, motion `useScroll`); realism rework tracked in P0-02.
- [x] **P2-03 SEO** – metadata, OG image, Maps link, `sitemap`/`robots`.
  ✅ Built 5 Oct: `opengraph-image.jpg` (64 KB, WhatsApp-safe), `robots.ts` (hides /admin, /api, /t), `sitemap.ts`, schema.org café JSON-LD. Set `SITE_URL` to the real domain at deploy (P5-02).
- [x] **P2-04 Menu filters + search** – High protein (≥15 g), Light (<300 kcal), Bestseller, name search.
- [~] **P2-05 Table route** – `src/app/t/[table]/page.tsx` reuses menu, table pre-filled; unknown/inactive table → `/menu`.
  ↪ No tables any more – one café QR opens the menu; old table links redirect there.
- [x] **P2-06 View-only mode** – ordering-off setting hides cart/ordering with a notice.
  ✅ Menu side built (`orderingEnabled` from CafeSettings); the on/off switch itself arrives with P4-06.
- [~] **P2-07 Order form UI** (default: phone required for both types, per goal doc; switchable later) – dine-in/parcel, pickup slot, note, consent, privacy link (RHF + Zod).
  ↪ Built as the guest's "Your details" step in P2B-09 (no pickup-time slot – takeaway is as soon as it's ready).
- [~] **P2-08 Returning-customer autofill** – lookup by phone (rate-limited, returns name/email only).
  ↪ The guest's phone remembers their name and number (P2B-09) – no lookup by phone needed.
- [~] **P2-09 Place-order action** (tax from `CafeSettings.taxBasisPoints`, 0 until GST is confirmed) – server pricing from DB, one open order per table, per-phone hourly limit, ordering-off check, customer upsert, status log.
  ↪ Built in P2B-09 (`placeOrder`: server prices, ordering-off check, per-phone and per-network limits).
  Done when: unit tests (Vitest) cover pricing + guard rails.
- [~] **P2-10 Order status page** – `src/app/order/[id]/page.tsx` with polling.
  ↪ The guest follows their order live on the menu page (P2B-03).
- [x] **P2-11 Privacy page** – `src/app/privacy/page.tsx`, linked from footer + form.
  ✅ Built 5 Oct: describes the selection-only flow; lists auto-deleted after 24 h (`purgeOldSelections`). Have it legally checked before launch.
- [x] **P2-12 Perf check** – Lighthouse on `/menu`, throttled 4G < 2 s; no three.js in menu bundle.
  ✅ 5 Oct, prod build, Lighthouse mobile with devtools throttling (562 ms RTT, 1.5 Mbps, CPU ×4): LCP 1.7–1.8 s, perf 94, CLS 0; no three.js in the 14 menu scripts (334 KiB). Fix: menu cards no longer render hidden for an entrance animation (`AnimatePresence initial={false}`); favicon 149 KB → small. Follow-up idea: TTI 4.8 s – lazy-load the item/list sheets if taps feel slow on phones.

## Phase 3 – Live dashboard
- [~] **P3-01 Live orders API** – `src/app/api/orders/live/route.ts` (staff auth, changes since timestamp).
  ↪ Built in P2B-02 – live push to the dashboard, no polling needed.
- [~] **P3-02 Tables view** – grid of table cards, 5 s polling (TanStack Query).
  ↪ No tables any more (P2B-09).
- [~] **P3-03 Parcel lane** – sorted by pickup time; masked phone for staff.
  ↪ "Ready to collect" group on Live orders (P2B-04); staff see masked phones.
- [~] **P3-04 Board view** – columns New → Done.
  ↪ Live orders is grouped New → Accepted → In the kitchen → Ready → Done (P2B-04, P2B-09).
- [~] **P3-05 Status actions** – accept/prepare/ready/served, cancel with reason, optimistic updates, `OrderStatusLog`.
  ↪ Built in P2B-04 / P2B-09 with a full status history.
- [~] **P3-06 New-order alert** – sound + highlight until accepted.
  ↪ Chime + "New orders" group until accepted (P2B-09).
- [~] **P3-07 Mark paid** – cash / UPI / card.
  ↪ Cash / UPI / Card on the bill (P2B-05).
- [~] **P3-08 Add items to an open order**
  ↪ Staff can edit items until the kitchen starts; a guest's extra orders go on the same bill (P2B-04, P2B-09).
- [x] **P3-09 Counter order** – same form for walk-ins.
  ✅ 8 Oct: "New counter order" on Live orders (`counter-order-dialog.tsx`, reuses the item picker): Dine-in/Takeaway, name required, phone optional (owner's choice), note. `createCounterOrder` prices from the menu, creates it as ACCEPTED with "Counter order taken by …"; with a phone it counts toward the customer. Verified #20 (no phone) → kitchen → served → Bill #16 paid in cash.
  ✅ 10 Oct (owner: "staff should see the same UI as the customer"): the dialog is replaced by `/admin/counter-order` – the guest `MenuBrowser` in `counter` mode (same cards, search, filters, dish sheet, list bar). Separate list (`useCounterCart`, chosen through `CartStoreContext`) so it never mixes with a guest list on the same device; nothing is mirrored or tracked; details step asks the guest's name (phone optional), then returns to Live orders. Works even when guest ordering is switched off. Verified #23 (Takeaway, 2 dishes, no phone, ₹218).
- [~] **P3-10 Order history** – filters (date, number, phone, table, type, status).
  ↪ Built in P2B-06.
- [ ] **P3-11 Kitchen ticket (KOT) print** ⛔ thermal printer – print CSS layouts (bill print is already built).
  Plain: Print a kitchen ticket for each order. Waiting to hear whether the café has a thermal printer.
- [~] **P3-12 Offline banner + catch-up**
  ↪ Offline banner (P1-03); screens catch up on reconnect, and the live link checks itself (P2B-10).
- [ ] **P3-13 Practice service with staff** – 20-order run with staff. Done when: no help needed.
  Plain: A practice session where staff handle about 20 test orders on their own, to catch anything confusing before opening day.

## Phase 4 – Customers & reports
- [x] **P4-01 Customer list + search** (owner).
  ✅ 7 Oct: `/admin/customers` – totals (customers, said yes to offers, total spend), search by name or phone digits, sort by last visit / most visits / top spend / newest, "Offers only" filter, 50 per page, tap-to-call, link to the guest's orders (profile comes in P4-02). Visits = paid bills.
- [x] **P4-02 Customer profile** – history, visits, spend, favourites, notes, consent.
  ✅ 7 Oct: `/admin/customers/[id]` (name links from the list) – phone (tap to call), visits, total spend, average bill, customer since, last visit; favourite dishes (`favouriteItems` in `src/lib/customer-stats.ts`, tested; cancelled orders ignored); staff notes (save); consent with date + "Stop offers" (owner can only withdraw – opting in stays with the guest); latest 20 orders with status, items, total, bill no. + Full history link.
- [x] **P4-03 Delete-on-request + CSV export** (owner) – `src/app/api/customers/export/route.ts`.
  ✅ 7 Oct: "Delete data" on the profile (confirm) removes the customer record and anonymises their old orders + bills ("Deleted on request", phone removed, amounts kept) and their order rate-limit row. "Export CSV" on the list (follows "Offers only") – owner-only route, `src/lib/csv.ts` (tested: quoting, formula-injection guard, BOM for Excel). Verified: Takeaway Test deleted → orders #9/#10 + bills #6/#7 anonymised.
- [x] **P4-04 Reports** – today, by type, top items, by hour/day/month (Recharts).
  ✅ 7 Oct: `/admin/reports` (owner) – Today / Yesterday / 7 / 30 days / This month or custom dates; tiles (sales, bills, average, guests + regulars with 2+ visits, dine-in vs takeaway, cancelled orders); sales by hour, by day (ranges > 1 day), top 10 items, last 12 months. Sales = paid, non-void bills grouped in IST (`src/lib/data/reports.ts`); ranges + buckets in `src/lib/reports.ts` (tested). Charts are plain HTML bars (no Recharts – no extra JS): peak labelled, hover/focus tooltip, "Show as table"; bar colour validated for light + dark (`--chart-1`). Verified against the database (30 days ₹3,853 / 9 bills, yesterday ₹817).
- [x] **P4-05 QR code** – print-ready QR cards (was per table; now one café QR since 7 Oct).
  ✅ 5 Oct: per-table QR screen. 7 Oct: replaced by `/admin/qr` + `/admin/print/qr` – one café QR, 4 cards per A4 (warns while SITE_URL is localhost).
- [x] **P4-07 PDF menu + PDF QR** – the menu as an A4 PDF made from the live menu; a view-only QR opens it.
  ✅ 11 Oct: `/menu/pdf` (`src/lib/menu-pdf/`, @react-pdf/renderer, Figtree TTFs for the ₹ sign). Two columns, categories kept whole, add-ons per category, nutrition note in the footer; hidden items left out, sold-out marked, price 0 shows "MRP". `/admin/qr` has a second "PDF menu QR" (`/admin/print/qr?for=pdf`); "Menu PDF" buttons on Admin → Menu and the public menu. Verified: price changed in Admin → Menu shows in the PDF on the next open.
- [x] **P4-06 Settings** – café details, ordering on/off, tax %, staff accounts (owner).
  ✅ 5 Oct: `/admin/settings` – Café (details, hours, Today's pick, "Guests can make lists" switch), Staff logins (create with one-time password, new password, switch off – both end their sessions), My password. Tax % left out while there are no totals.

## Phase 4B – Cash & expenses (owner, 8 Oct 2026)
- [x] **P4B-01 Expenses** – record what the café spends; staff add, owner edits/deletes and sees any period; in Reports.
  ✅ 8 Oct: `Expense` model (category, paid with cash/UPI/card/bank, paid to, note); `/admin/expenses` (staff: add + today; owner: date ranges, totals by category, edit, delete); `src/lib/expenses.ts` labels; `ExpenseSchema` (tested). Reports: Expenses, Sales minus expenses, "Where the money went". A cash expense on a day whose drawer is closed is refused.
- [x] **P4B-02 Cash counter** – open and close the drawer each day; opening carries over when nobody enters it.
  ✅ 8 Oct: `CashDay` model + `/admin/cash`. Expected = opening + cash sales − cash expenses (`src/lib/cash.ts`, tested). Not entered → carried from the last day: its closing count if closed, otherwise its opening + its net cash, plus any days in between. Closing saves the day's totals (snapshot) with the count; live "Short by / Extra" preview while typing. Owner: last 14 days and reopen today. Verified: ₹2,000 + ₹737 − ₹450 = ₹2,287, counted ₹2,250 → short ₹37; carry tested both ways (₹1,500 closed count; ₹1,000 + ₹1,694 = ₹2,694 when left open).

- [x] **P4B-03 Money book** – sales by how guests paid (cash, Google Pay, credit card, debit card), card machine fees, expenses and profit, per day and per month.
  ✅ 13 Oct: `/admin/money` (owner) + `/api/money/export?month=` (CSV). `PaymentMethod` gains `CREDIT_CARD`/`DEBIT_CARD` (old `CARD` bills count as credit); billing offers Cash · Google Pay · Credit card · Debit card. `ExtraSale` for sales that never got a bill (cash ones count toward the drawer). Card fee % in `CafeSettings` (basis points), rounded to the rupee per day; a month's fees = sum of its days. Pure maths in `src/lib/money-book.ts` (tested).

## Phase 5 – Launch
- [ ] **P5-01 Package for the server** – Next.js + Postgres + Caddy; production env.
  Plain: Package the app so it runs the same way on the café's server as on our computers.
- [ ] **P5-02 Go live on the café's web address** ⛔ domain – DNS + HTTPS.
  Plain: Put the site live on a server in Mumbai at the café's own web address, with the padlock (HTTPS).
- [ ] **P5-03 Daily backups** – daily `pg_dump`, 30-day retention, tested restore.
  Plain: Save a copy of all orders, bills and customers every day, keep 30 days, and prove we can restore one.
  15 Oct: built – `scripts/backup/backup.sh` (database `pg_dump -Fc` + dish photos tar, saved in `BACKUP_DIR`, each night restored into a throwaway `<db>_restore_check` database and counted, 30-day cleanup, email OK/FAILED over SMTP with curl), `restore.sh`, systemd `healthy-hunger-backup.timer` at 03:00 Asia/Kolkata. Verified locally: backup + restore check (20 orders, 18 bills, 40 dishes), failure path, cleanup. Left: install on the server (P5-01), set SMTP in `.env`, confirm the email arrives.
- [ ] **P5-04 Security check** – security headers, rate limits verified, final privacy page.
  Plain: A security check before going live, plus the final privacy note.
- [ ] **P5-05 Automatic order tests** – Playwright order flow on phone viewport; Lighthouse pass.
  Plain: Automatic tests that place a full order on a phone-sized screen, so future changes can't quietly break ordering.
- [ ] **P5-06 Print the café QR cards** – from Dashboard → QR code once the site is live.
  Plain: Print the QR cards for tables, the counter and the door – after the site has its real web address.
