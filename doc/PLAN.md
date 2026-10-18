# Healthy Hunger – Build Plan

Source of truth for scope: [`doc/goal`](./goal). This file covers **how** we build it: the skills/stack, the 3D design approach, and the phases. Day-to-day work queue: [`TASKS.md`](./TASKS.md).

Decision: **Next.js only** (App Router, TypeScript) + **PostgreSQL**. No separate backend.

---

## 1. Skills & stack

### Frontend
| Skill / tool | Used for |
|---|---|
| Next.js App Router (RSC, Server Components, ISR / `revalidateTag`) | Pre-rendered landing + menu, refreshed when the owner edits the menu |
| React 19 + TypeScript (strict) | Everything |
| Tailwind CSS v4 with the café palette as tokens | Styling, light/dark mode |
| shadcn/ui (Radix) | Dashboard tables, dialogs, sheets, forms, toasts |
| React Hook Form + Zod | Order form, admin forms (same Zod schema on server) |
| Zustand (persisted) | Cart state on the customer side |
| TanStack Query | Live orders polling (5 s), optimistic status changes |
| Motion (Framer Motion) | Page/sheet transitions, add-to-cart micro-interactions, CSS-3D card tilt |
| `next/font` | Bricolage Grotesque, Figtree, IBM Plex Mono |
| `next/image` (WebP/AVIF, lazy) | Menu photos |
| Recharts | Reports (sales by hour/day, top items) |

### 3D
| Skill / tool | Used for |
|---|---|
| Three.js | WebGL engine |
| React Three Fiber (R3F) | Three.js as React components inside Next.js |
| @react-three/drei | Camera controls, `Float`, `ContactShadows`, `Environment`, `useGLTF`, `ScrollControls`, `PerformanceMonitor` |
| GSAP + ScrollTrigger (or drei `ScrollControls`) | Scroll-driven camera moves on the landing page |
| detect-gpu | Pick quality tier; fall back to a static image on weak phones |
| Blender + gltf-transform / gltfjsx (Draco/Meshopt, KTX2) | Only if we move from procedural models to real GLB models later |

### Backend (inside Next.js)
| Skill / tool | Used for |
|---|---|
| Server Actions + Route Handlers | Orders, status changes, admin CRUD, polling endpoint, CSV export |
| Prisma ORM + migrations | PostgreSQL schema (10 tables from the goal doc), seed script |
| Zod | Validate every input on the server |
| Signed session cookie (jose) + argon2id | Staff/owner login; proxy does a quick redirect check, every page and action re-checks the user and role in the database |
| Rate limiting (Postgres-backed or in-memory LRU on a single VPS) | Order form, login, per-phone/hour limit |
| `qrcode` + print CSS / `@react-pdf/renderer` | Per-table QR cards |
| Server-Sent Events (later) | Replace polling if needed |

### Quality & DevOps
Vitest (unit: price/tax/order rules), Playwright (order flow end-to-end on a phone viewport), ESLint + Prettier, Lighthouse CI (menu < 2 s on 4G), Docker Compose (Next.js + Postgres + Caddy), `pg_dump` cron with 30-day retention, Mumbai VPS.

---

## 2. Design direction – "modern, warm, 3D"

**Brand updated (4 Oct 2026)** – see `doc/brand-guide.jpg`: Primary Green `#15803D`, Light Green `#22C55E`, Primary Orange `#FF8A00`, Light Orange `#FFA933`; logo files in `public/brand/`; headings in Baloo 2. White text fails on orange (2.4:1), so orange buttons carry dark text and orange text on light backgrounds uses `#C2410C`. This replaces the wall palette in the goal doc. 3D must feel premium **without** breaking the 2-second menu budget, so 3D is used where it impresses and kept out of where people order.

| Surface | 3D treatment | Tech |
|---|---|---|
| **Landing hero** | A 3D salad bowl (lettuce, radicchio, paneer, chickpeas, corn, cherry tomatoes, cucumber, avocado, onion) slowly rotating, with ingredients floating around it; reacts to mouse / device tilt; soft warm studio light, contact shadow | R3F canvas, procedural geometry (`LatheGeometry` bowl, generated leaf meshes, instanced toppings) – no model files to download |
| **Scroll story** | As you scroll, the camera moves: bowl → ingredients separate into a "nutrition explode" view showing protein/kcal labels → settles into "Today's Pick" | GSAP ScrollTrigger driving the R3F camera |
| **Promise points** | Three small floating 3D icons (leaf, protein, sun) | Same canvas or tiny separate scenes, `frameloop="demand"` |
| **Today's Pick / Bestsellers** | Cards with CSS 3D tilt + glare, depth on hover | Motion, CSS `perspective` (no WebGL) |
| **QR menu** | **No WebGL.** Layered depth: tilt cards, bottom sheet that lifts with shadow, "fly to cart" animation, smooth category transitions | Motion + CSS 3D only |
| **Admin** | None – clean, fast, readable shadcn UI with muted status colours + text labels | – |

Performance guard rails for the 3D:
- Canvas is `dynamic(..., { ssr: false })` and mounts **after** first paint; a static poster image (rendered from the same scene) shows first, so LCP is an image.
- `detect-gpu` tier + `prefers-reduced-motion` → low tier gets the poster only.
- DPR clamped to `[1, 1.5]`, `PerformanceMonitor` lowers quality on frame drops, rendering pauses when the hero is off-screen.
- Three.js bundle loads only on `/` – never on `/menu`, `/t/*` or `/admin`.

---

## 3. Architecture

```
app/
  (public)/
    page.tsx                 landing (+ <HeroScene/> lazy)
    menu/page.tsx            QR menu (general)
    t/[table]/page.tsx       QR menu with table pre-filled
    order/[id]/page.tsx      live order status
    privacy/page.tsx
  admin/
    login/page.tsx
    (dashboard)/
      page.tsx               Live orders (tables / parcel / board)
      orders/                history, bill / KOT print
      menu/                  menu manager
      tables/                tables & QR
      customers/             owner only
      reports/               owner only
      settings/              owner only
  api/
    orders/live/route.ts     polling endpoint
    customers/export/route.ts
components/
  three/                     HeroScene, Bowl, Ingredients, lights
  menu/  cart/  admin/  ui/ (shadcn)
lib/
  db.ts  auth.ts  rbac.ts  validators/  pricing.ts  rate-limit.ts  phone-mask.ts
prisma/
  schema.prisma  seed.ts
```

Key rules baked into the server layer:
- Prices copied into `OrderItem` at order time; total calculated on the server, never trusted from the client.
- One open dine-in order per table; per-phone hourly limit; ordering-off switch checked on every order.
- Every status change writes `OrderStatusLog` with the staff user.
- Phone masked (`98xxxxxx21`) for staff role; full phone + CSV only for owner.
- Menu edits call `revalidateTag('menu')` so the static menu refreshes instantly.

---

## 4. Phases

Phase 0 is added in front of the doc's five phases so the look and the 3D are agreed before features are built on top.

### Phase 0 – Design system & 3D prototype ✅ built, awaiting sign-off
- Scaffold Next.js + TS + Tailwind v4 + shadcn/ui, ESLint/Prettier, fonts.
- Palette tokens (light + dark), type scale, spacing, radius, shadow/depth tokens; status colours (muted, with labels); veg mark component.
- 3D hero prototype: procedural bowl + floating ingredients, lighting, mouse/tilt parallax, poster fallback, GPU-tier switch.
- Menu card + item sheet + cart bar built as static components with motion.
- **Done when:** the hero runs at 60 fps on a laptop and stays smooth on a mid-range Android; you approve the look.

### Phase 1 – Foundation ✅ built (4 Oct 2026)
- Docker Compose Postgres for local dev; Prisma schema (Category, MenuItem, AddOn, CafeTable, Customer, Order, OrderItem, OrderStatusLog, StaffUser, CafeSettings); migrations; seed with the current menu data.
- Auth.js credentials login, roles (staff / owner), middleware protecting `/admin`, role checks in actions.
- Admin shell (sidebar, header, offline indicator) and **Menu manager**: categories, items, prices, protein/kcal, tags, photos (upload + WebP), add-ons, hide, sold-out.
- **Done when:** owner can edit the full menu in the dashboard.

### Phase 2A → 2B – from shared lists to orders & bills (5 Oct 2026)
**Update 7 Oct 2026 – one QR, guests order themselves (supersedes the cashier-confirms flow below):** one café QR for everyone (opens `/menu`; old `/t/*` links redirect there), no tables. The guest picks items, chooses **Dine-in or Takeaway**, enters **name + phone** (+ optional note, consent) and places the order → it arrives as **New** with a chime → staff **Accept** (can edit items / cancel) → kitchen → served / ready → picked up. Dine-in food is served by order number + name; the dine-in bill combines one guest's served orders (same customer); takeaway is billed per order. Guard rails: ordering-off switch, 5 orders/hour per phone, 10/hour per network. The `CafeTable` model, `tableId` columns and the selection READY step were dropped on 7 Oct (migration `drop_tables`).

2A shipped a list-only version (guests pick, staff see it). The owner then clarified the core flow: **staff see picks live → guest taps Confirm (done selecting) → cashier confirms at the table with the guest's name + phone → kitchen → served → cashier bill → paid**. "Keep it simple" only ever meant minor extras. Live updates: Server-Sent Events backed by Postgres LISTEN/NOTIFY (no separate socket server; works across processes). Decisions: the cashier (not the guest) enters name + phone, no tax for now (Settings switch later), one bill per table visit, customers never see totals. Deferred minor extras: thermal KOT printing, discounts, reports, WhatsApp updates, online payment.

18 Oct: thank-you/receipt SMS (P2B-11) switched on – sent by staff from the counter phone via an `sms:` link (free, no provider, no DLT). Automatic sending stays in Later.

### Phase 2 – Customer site
- Landing page: 3D hero + scroll story, Today's Pick, promise points, bestsellers (from DB), Visit us, footer, SEO metadata + OG image.
- QR menu `/menu` and `/t/[table]`: category tabs, filters (High protein, Light, Bestseller), search, item cards, detail sheet with add-ons/qty, sticky cart, nutrition note, dark mode, view-only mode.
- Order form (dine-in / parcel), returning-customer autofill by phone, consent tick box, privacy note link.
- Order placement action with all guard rails; `/order/[id]` live status page (polling).
- **Done when:** a test order can be placed from a phone and the menu scores < 2 s on throttled 4G.

### Phase 3 – Live dashboard
- Live orders: Tables view, Parcel lane, Board view (5 s polling, optimistic updates).
- New-order sound + highlight until accepted; status transitions; cancel with reason; mark paid (cash / UPI / card); add items to open table order.
- Counter order for walk-ins; order history with filters; bill / KOT print layouts.
- Offline banner + catch-up on reconnect.
- **Done when:** staff run a 20-order mock service without help.

### Phase 4 – Customers & reports
- Customer upsert on every order (visit count, spend, first/last visit, favourites, consent + date).
- Customer list/search, profile, staff notes, delete-on-request, CSV export (owner only).
- Reports: today's sales, orders by type, top items, sales by hour / day / month.
- Tables & QR: add/rename tables, print-ready QR cards. Settings page (café details, ordering on/off, tax %, staff accounts).
- **Done when:** owner can see yesterday's sales and repeat customers.

### Phase 5 – Launch
- VPS (Mumbai) with Docker Compose: Next.js + Postgres + Caddy (auto HTTPS); domain DNS.
- Daily `pg_dump` backup with 30-day retention + a tested restore.
  Decided 15 Oct: a systemd timer (`OnCalendar=… 03:00:00 Asia/Kolkata`, `Persistent=true`) rather than cron, so it's 03:00 IST whatever the server's clock zone and a missed night still runs. Mail is sent with `curl` over SMTP – no mail package in the app. The email carries a summary only, never the backup itself (it holds guests' phone numbers). Copies stay on the server only for now; an off-server copy is still worth adding (a full disk or a lost VPS loses them too).
  Install: copy `scripts/backup/healthy-hunger-backup.{service,timer}` to `/etc/systemd/system/` (set `User` and `WorkingDirectory`), `systemctl daemon-reload && systemctl enable --now healthy-hunger-backup.timer`; test with `systemctl start healthy-hunger-backup.service`; `systemctl list-timers` shows the next run.
  Before the server exists it runs on the Mac: `scripts/backup/install-mac.sh` (launchd every 30 min → `run-if-due.sh` backs up once a day after 03:00 IST, since launchd only knows the Mac's clock). `BACKUP_KEEP_DAYS="0"` keeps every copy (owner asked not to delete anything yet).
- Rate limits verified, security headers, privacy page final, Lighthouse + Playwright pass.
- Print per-table QR cards.
- **Done when:** live at the café domain on opening day.

### Later (after the first month)
Online UPI (Razorpay), WhatsApp updates, kitchen screen, SSE instead of polling, loyalty / coupons, Hindi / Gujarati menu, thermal printer KOT, optional real GLB models of signature dishes.

---

## 5. Open questions that block specific phases

Resolved: brand colours (new green/orange brand, 4 Oct 2026); dine-in needs name + phone, no tax for now, one bill per table visit (5 Oct 2026).
| Question (from goal doc) | What the answer unlocks |
|---|---|
| Prices for the 3 sandwiches, the 3 overnight oats, and the MRP of Diet Coke, Coke Zero and water | Showing those 9 dishes to guests (they are loaded but hidden) |
| Are any of the 12 old dishes still sold (e.g. Chole Bowl, Rajma Tikki, Lemon Iced Tea)? They are not on the printed menus, so they were hidden | Showing them again, with real prices |
| Café address, phone, WhatsApp, Instagram and opening hours | The home page and printed bills |
| Is the café GST-registered? If yes, the GSTIN. The toast and smoothie menus say "prices exclusive of 5% GST" | Showing tax on bills (none is charged or shown until then) |
| Is there a thermal printer at the counter or in the kitchen? | Kitchen tickets and the receipt size |
| How many staff logins are needed at launch? | Setting up staff accounts |
| The web address (domain) and the opening date | Going live, and the launch timeline |
| For the home-page 3D dish: scan one of our own dishes, or use a free online model with a credit line? | The real-looking 3D dish |
