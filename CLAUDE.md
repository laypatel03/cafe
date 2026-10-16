@AGENTS.md

# Healthy Hunger – project brief for Claude

Café landing page + phone-first QR menu + staff dashboard. One Next.js app, PostgreSQL.
Scope: `doc/goal` · Phases & design: `doc/PLAN.md` · **Work queue: `doc/TASKS.md`** (do one task per session).

## Stack
Next.js 16 (App Router, RSC, `src/proxy.ts` not middleware) · React 19 · TypeScript strict · Tailwind v4 (tokens in `src/app/globals.css`) · shadcn/ui (radix-nova, `src/components/ui`) · Motion · zustand (cart) · Zod 4 · Prisma 7 + `@prisma/adapter-pg` (client generated to `src/generated/prisma` – never edit) · jose JWT sessions + argon2 · sharp.

## Layout
- `src/app/` – routes: `/` landing, `/menu`, `/media/[...path]` (serves uploads). Admin goes under `src/app/admin/`.
- `src/components/` – `landing/`, `menu/`, `brand/`, `theme/`, `ui/` (shadcn).
- `src/lib/` – `db.ts` (Prisma singleton), `auth/` (`session.ts` JWT cookie, `dal.ts` `getCurrentUser`/`requireUser`, `password.ts`), `data/menu.ts` (cached public reads, tags `menu`/`settings`), `money.ts` (paise ↔ ₹), `rate-limit.ts` (Postgres), `uploads.ts` (WebP via sharp), `cart-store.ts`.
- `prisma/` – `schema.prisma`, `migrations/`, `seed.ts`.

## Rules
- Read the relevant doc in `node_modules/next/dist/docs/` before using a Next API you're unsure of (v16 differs from older versions).
- Every admin page/action calls `requireUser(role?)` from `lib/auth/dal.ts`; the proxy is only an optimistic redirect.
- Admin forms submit with `useFormAction` (`src/hooks/use-form-action.ts`), not `<form action>` – React resets `action` forms even on a validation error, wiping input.
- Validate every server input with Zod. Money is stored as integer paise; convert with `lib/money.ts`.
- Prices are copied into `OrderItem`; totals are computed on the server only.
- After a menu/settings write call `updateTag(MENU_TAG | SETTINGS_TAG)`.
- The landing hero is a stack of dish cards from the live menu (`landing/hero.tsx`); no WebGL anywhere.
- Brand: green `#15803D`, orange `#FF8A00` (dark text on orange; orange text = `#C2410C`). Status colours always with a text label.
- Match surrounding code style; short comments only where the "why" isn't obvious.

## Commands
`pnpm dev` · `pnpm typecheck` · `pnpm lint` · `pnpm build` · `pnpm format`
DB: `pnpm db:setup` (local Postgres) · `pnpm db:migrate` · `pnpm db:seed` · `pnpm db:demo` (fake customers/orders, local only; `--clear` removes) · `pnpm db:studio`
After a schema change: `npx prisma generate`, then **restart `pnpm dev`** – the running server keeps the old Prisma client in memory (`db.<newModel>` is undefined until restart).
Before calling a task done: `pnpm typecheck && pnpm lint`.

## Working style
- One task from `doc/TASKS.md` per session; tick it when done and note any decision in `doc/PLAN.md`.
- When a task changes what the café can do, update `doc/STATUS.md` (everyday words, for the owner) and give any new open task a `Plain:` line.
- Then refresh the team status board: `node scripts/status-board.mjs <scratchpad>/build-board.html` and republish it to https://claude.ai/artifact/GC4ttoJYv6kkz93LDh6oAa (pass it as `url`).
- Be brief in replies; don't re-read `doc/goal` unless the task needs scope detail.
