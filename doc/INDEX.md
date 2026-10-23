# Code index – read this before searching

A map from "what I need to change" to "which files". Open only the files listed for your topic.
User stories with acceptance rules: [`USER-STORIES.md`](./USER-STORIES.md). Work queue: [`TASKS.md`](./TASKS.md).
Keep this file current: when you add, move or rename a module, update its row here in the same commit.

Heads-up: `PLAN.md` §1–3 still describe the original WebGL hero, tables and polling. Those were replaced –
no WebGL (hero = dish card stack), no tables (one café QR, `/t/*` redirects), live updates via SSE.

## 1. Routes

| URL | File | Who | Notes |
|---|---|---|---|
| `/` | `src/app/page.tsx` → `components/landing/{hero,sections,google-reviews,site-header,site-footer,cafe-json-ld}.tsx` | public | Hero = stack of dish cards from live menu |
| `/menu` | `src/app/menu/page.tsx` → `components/menu/menu-browser.tsx` | public | QR menu; ordering gated by `orderingEnabled` + opening hours |
| `/menu/pdf` | `src/app/menu/pdf/route.ts` → `lib/menu-pdf/{document.tsx,layout.ts}` | public | A4 PDF from live menu (`@react-pdf/renderer`) |
| `/t/[table]` | `src/app/t/[table]/page.tsx` | public | Legacy – redirects to `/menu` |
| `/blog`, `/blog/[slug]` | `src/app/blog/…` + `lib/articles.ts`, `components/blog/*` | public if `blogEnabled` | Staff can preview when off (`lib/data/blog-access.ts`) |
| `/privacy` | `src/app/privacy/page.tsx` | public | Keep in step with stored data |
| `/media/[...path]` | `src/app/media/[...path]/route.ts` | public | Serves uploads from `UPLOAD_DIR` |
| `/admin/login` | `src/app/admin/login/{page,login-form}.tsx`, `actions.ts` | – | Rate-limited login |
| `/admin` | `(dashboard)/page.tsx` → `components/admin/live-board.tsx` (`orders-panel`, `billing-panel`) | staff | Live orders + billing |
| `/admin/menu` | `(dashboard)/menu/{page,actions}.ts(x)`, `menu/items/{new,[id]}`, `components/admin/menu/*` | staff (sold-out only) / owner | |
| `/admin/orders` | `(dashboard)/orders/{page,actions}.ts(x)`, `components/admin/orders/*` | staff / owner | History, filters, pay-later, edit (owner switch) |
| `/admin/counter-order` | `src/app/admin/counter-order/page.tsx` (reuses `menu-browser` + `useCounterCart`) | staff | Walk-in orders; `?customer=` owner only |
| `/admin/cash` | `(dashboard)/cash/{page,actions}.ts(x)`, `components/admin/cash/cash-forms.tsx` | staff | Drawer open/close |
| `/admin/expenses` | `(dashboard)/expenses/page.tsx` (actions in `cash/actions.ts`) | staff (today) / owner (any period) | |
| `/admin/money` | `(dashboard)/money/{page,actions}.ts(x)`, `components/admin/money/*` | owner | Money book |
| `/admin/customers`, `/[id]` | `(dashboard)/customers/…`, `components/admin/customer-*.tsx` | owner | Owed money, notes, delete, CSV |
| `/admin/reports` | `(dashboard)/reports/page.tsx`, `components/admin/reports/bar-chart.tsx` | owner | |
| `/admin/qr`, `/admin/print/qr` | `(dashboard)/qr/page.tsx`, `admin/print/qr/page.tsx`, `lib/qr.ts` | owner | |
| `/admin/print/bill/[id]` | `src/app/admin/print/bill/[id]/page.tsx` | staff | 80 mm receipt |
| `/admin/settings` | `(dashboard)/settings/{page,actions}.ts(x)`, `components/admin/settings/settings-screen.tsx` | owner | Details, hours, switches, staff logins |
| `/admin/session-ended` | `src/app/admin/session-ended/route.ts` | – | Clears stale cookie (avoids redirect loop) |
| `/api/admin/live` (+`/stream`) | `src/app/api/admin/live/…` → `lib/data/live.ts`, `lib/realtime.ts` | staff | Live board JSON + SSE |
| `/api/guest/stream` | `src/app/api/guest/stream/route.ts` | guest | SSE for the guest's own orders |
| `/api/customers/export`, `/api/money/export` | `src/app/api/…/route.ts` + `lib/csv.ts` | owner | CSV downloads |

`(dashboard)` = `src/app/admin/(dashboard)/`. Sidebar entries & roles: `components/admin/nav-items.ts`.

## 2. Server actions (where writes happen)

| File | Actions |
|---|---|
| `src/app/selection-actions.ts` | **Guest**: `syncSelection` (live pick list), `placeOrder`, `getGuestOrders` |
| `(dashboard)/actions.ts` | **Live board**: `createCounterOrder`, `findGuestByPhone`, `removeSelection`, `updateOrderItems`, `advanceOrder`, `undoOrderStep`, `cancelOrder`, `generateBill`, `markBillPaid`, `markBillPayLater`, `voidBill`, `receiptSms` |
| `(dashboard)/orders/actions.ts` | `addPastOrder`, `editOrder`, `deleteOrder` (soft), `changeBillPayment` |
| `(dashboard)/menu/actions.ts` | items / categories / add-ons CRUD, move, `setMenuItemOrder` (drag), `setItemAvailable` (staff) |
| `(dashboard)/cash/actions.ts` | `setOpeningCash`, `closeDay`, `reopenDay`, `saveExpense`, `deleteExpense` |
| `(dashboard)/money/actions.ts` | `addExtraSale`, `deleteExtraSale`, `saveCardFees` |
| `(dashboard)/customers/actions.ts` | notes, `withdrawConsent`, `deleteCustomer`, `addCustomer`, `updateCustomer` |
| `(dashboard)/settings/actions.ts` | `saveCafeDetails`, switches (`setOrderingEnabled`, `setBlogEnabled`, `setOrderEdits`, `setCustomerEdits`), staff accounts, `changeMyPassword` |
| `src/app/admin/login/actions.ts` | `login`, `logout` |

Every action: `assertUser(access?)` (throws) → Zod parse (`lib/validators/*`) → `db` write → `publish()` (realtime) and/or `updateTag(MENU_TAG|SETTINGS_TAG)`.

## 3. `src/lib` modules

**Pure logic (unit-tested in `src/lib/__tests__/<name>.test.ts`)** – change these first, test with `pnpm test`:

| Module | Does |
|---|---|
| `pricing.ts` | `priceLines` (server prices from DB, add-ons, qty cap), `billTotals` (tax) |
| `order-flow.ts` | Status machine: `nextStatus`, `availableActions`, `canCancel`, `canEditItems`, `stepToUndo`, `statusOnPayment` |
| `billing.ts` | `billFromOrders`, `mergeBillLines` (one dine-in bill per visit) |
| `order-edit.ts` | Owner edits/past orders, `customerTotals` |
| `custom-lines.ts` | "Other item" lines (negative = discount, total ≥ 0) |
| `cash.ts` | Drawer: `expectedCash`, `compareCount`, `carriedOpening` |
| `money-book.ts` | Per-day/month sales by method, card fees, profit, month helpers |
| `reports.ts` | Ranges (`resolveRange`, presets), hour/day/month buckets |
| `cafe-hours.ts` | Parse owner-typed hours, `isWithinWorkingHours` (IST) |
| `customer-stats.ts` | `favouriteItems` |
| `paging.ts` | Admin list pages (10/25/50) |
| `receipt.ts` | Thank-you SMS text + `sms:` link (`RECEIPT_SMS_ENABLED`) |
| `csv.ts` | Spreadsheet-safe CSV |
| `phone-mask.ts` | `98xxxxxx10` for staff |
| `format.ts` | `CAFE_TZ`, `startOfCafeDay`, `formatINR` |
| `money.ts` | `toPaise` / `toRupees` |

**Data reads (`lib/data/`, server-only):**

| Module | Reads |
|---|---|
| `menu.ts` | `getPublicMenu`, `getCafeDetails` (cached, tags `menu`/`settings`), `mediaUrl` |
| `google-reviews.ts` | `getGoogleReviews(placeId)` – Places API (New), cached 3 h (tag `google-reviews`); parsing in `lib/google-reviews.ts` → `landing/google-reviews.tsx` |
| `admin-menu.ts` | Menu manager lists, `getMenuItemForEdit` |
| `menu-prices.ts` | `loadMenuPrices` – DB prices for `pricing.ts` |
| `live.ts` | `getLiveBoard` – selections, active orders, bills to make/pay |
| `cash.ts` | `today`, `dayBounds`, `moneyBetween`, drawer day + history |
| `money-book.ts` | `getMoneyBook` |
| `reports.ts` | `getReport` |
| `owed.ts` | `owedOrdersWhere`, `owedByCustomer` (unpaid earlier days + pay-later) |
| `edit-switches.ts` | Owner switches for order/customer editing |
| `blog-access.ts` | Blog visible to this viewer? |

**Infra:** `db.ts` (Prisma singleton) · `auth/{session,dal,password}.ts` · `realtime.ts` (Postgres LISTEN/NOTIFY → SSE; events `selection`/`order`/`resync`) · `rate-limit.ts` (Postgres fixed window) · `request-ip.ts` · `uploads.ts` (sharp → WebP ≤1200px) · `qr.ts` · `site-url.ts` · `cart-store.ts` (zustand; guest `useCart`, counter `useCounterCart`) · `menu-types.ts` (client menu types, `HIGH_PROTEIN_MIN_G`=15, `LIGHT_MAX_KCAL`=300) · `payments.ts`, `expenses.ts` (labels for enums) · `articles.ts` (blog list) · `menu-pdf/`.

**Validators (`lib/validators/`):** `place-order` (guest + counter), `selection`, `menu`, `order-edit`, `cash`, `money-book`, `settings`, `phone` (`INDIAN_MOBILE`).

**Hooks:** `hooks/use-form-action.ts` (all admin forms), `hooks/use-open-now.ts` (menu opens/closes by hours client-side).

## 4. Data model (`prisma/schema.prisma`)

| Model | Key facts |
|---|---|
| `Category` / `MenuItem` / `AddOn` | `pricePaise`, `proteinG`, `kcal`; `available`=sold-out (staff), `visible`=hidden (owner); add-ons many-to-many |
| `Order` | `number` autoinc; `type` DINE_IN/PARCEL; `status` NEW→ACCEPTED→PREPARING→(READY)→SERVED→PAID / CANCELLED; snapshot `customerName/Phone`; `deletedAt` = soft delete (excluded from money/reports); `billId` |
| `OrderItem` | Price snapshot (`unitPricePaise`, `addOns` JSON, `lineTotalPaise`); `custom`=Other item |
| `OrderStatusLog` | Every status change with staff user (used by Undo) |
| `Bill` | Dine-in: one per visit; takeaway: per order. `paymentMethod`, `paidAt`, `payLaterAt`; voided never deleted (`voidedAt`, `voidedOrderNumbers`) |
| `Customer` | Keyed by 10-digit `phone`; consent, notes, counters |
| `Selection` | Guest's live pick list per device (12 h TTL); staff watch it |
| `StaffUser` | `role` STAFF/OWNER/DEVELOPER; `sessionVersion` bump = logout everywhere |
| `CafeSettings` | Single row id=1: details, `fssaiLicence`, `gaMeasurementId` (→ `components/analytics/*` in root layout), `googlePlaceId` (home page reviews), `hours` JSON, switches, tax bps, card fee bps, `todaysPickId` |
| `Expense`, `CashDay`, `ExtraSale` | Money book / cash drawer; `CashDay.day` = `yyyy-mm-dd` IST |
| `RateLimit` | Fixed window counters |

Enum labels for UI: `PaymentMethod` → `lib/payments.ts` (legacy `CARD` = credit card); `ExpenseCategory`/`ExpensePayment` → `lib/expenses.ts`; status → `components/admin/order-status-badge.tsx`.

## 5. Cross-cutting rules & gotchas

- **Auth:** pages `requireUser(access?)` (redirects to `homeFor(role)`), actions `assertUser(access?)` (throws `AuthError`). Access in `lib/auth/dal.ts`: `team` (default: staff + owner), `OWNER`, `website` (owner + developer), `anyone`. `src/proxy.ts` only checks the cookie signature.
- **Owner-only:** money, customers, reports, QR, settings, menu edits, Other items, editing past orders (also needs Settings switch), full phone numbers. Staff see `maskPhone()`.
- **Time:** server runs `TZ=Asia/Kolkata` (`package.json` scripts + `instrumentation.ts`); "today" = `startOfCafeDay` / `lib/data/cash.ts#today`.
- **Money:** integer paise everywhere; server recomputes totals (`pricing.ts`); never trust client prices.
- **Guest order guard rails** (`selection-actions.ts#placeOrder`): `orderingEnabled` + `isWithinWorkingHours`, 10 orders/h per IP, 5/h per phone.
- **Cache:** after menu/settings writes `updateTag(MENU_TAG | SETTINGS_TAG)` (`lib/data/menu.ts`).
- **Realtime:** after order/selection writes `publish({type: "order" | "selection", …})`; clients reload on `resync`.
- **Forms:** `useFormAction`, never `<form action>`.
- **Nutrition wording:** plain numbers ("15 g+ protein"), no "High protein"/"Light"/health claims; show `NUTRITION_NOTE` (`lib/cafe.ts`).
- **Schema change:** `pnpm db:migrate` → `npx prisma generate` → restart `pnpm dev`. Never edit `src/generated/`.

## 6. Scripts & ops

`scripts/load-menu.ts` (`pnpm menu:load [--yes]`, source `prisma/seed-data.ts`) · `scripts/add-staff.ts` · `scripts/demo-data.ts` (`pnpm db:demo [--clear]`) · `scripts/setup-local-db.sh` · `scripts/backup/*` (systemd timer / macOS launchd, 03:00 IST, see PLAN.md Phase 5) · `scripts/status-board.mjs` (team board from TASKS/STATUS). Env vars: `.env.example`.

## 7. Topic → files (quick lookup)

| Topic | Open |
|---|---|
| Guest cart / placing an order | `components/menu/cart-bar.tsx`, `lib/cart-store.ts`, `selection-actions.ts`, `validators/place-order.ts`, `lib/pricing.ts` |
| Guest order status | `components/menu/order-tracker.tsx`, `api/guest/stream/route.ts` |
| Menu filters / search / item sheet | `components/menu/{menu-browser,item-sheet,menu-item-card,list-line}.tsx`, `lib/menu-types.ts` |
| Order status buttons / undo | `lib/order-flow.ts`, `components/admin/{orders-panel,undo-step}.ts(x)`, `(dashboard)/actions.ts` |
| Editing items on an order | `components/admin/item-lines-editor.tsx`, `lib/custom-lines.ts`, `updateOrderItems` |
| Bills, pay later, void | `components/admin/billing-panel.tsx`, `lib/billing.ts`, `generateBill`/`markBill*`/`voidBill` |
| Order history filters / owed | `(dashboard)/orders/page.tsx`, `lib/data/owed.ts`, `lib/paging.ts` |
| Opening hours | `lib/cafe-hours.ts`, `hooks/use-open-now.ts`, `validators/settings.ts#hoursFromForm` |
| Login / sessions / staff accounts | `lib/auth/*`, `admin/login/*`, `settings/actions.ts` |
| Photos | `lib/uploads.ts`, `media/[...path]/route.ts`, `components/menu/item-art.tsx` |
| Brand / theme tokens | `src/app/globals.css`, `components/brand/*`, `components/theme/*` |
| Landing content | `components/landing/sections.tsx`, `components/landing/hero.tsx` |
