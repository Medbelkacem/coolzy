# Coolzy — coffee shop operating system

The operating system of **Coolzy**, a coffee shop in Batna, Algeria: a dark, photographic client menu with cart, table and delivery ordering, live receipts, a realtime worker board, and an oat-paper admin with menu management, staff and salaries, expenses and statistics. Trilingual (French, English, Arabic with full RTL). Ships with an **empty database** — the admin builds the catalogue through the UI.

Live: **https://coolzy-batna.vercel.app** (production, `main` branch).

| Client menu | Worker board | Admin overview |
|---|---|---|
| ![Client menu](docs/screenshots/menu-mobile.png) | ![Worker board](docs/screenshots/board-tablet.png) | ![Admin overview](docs/screenshots/admin-overview.png) |

## What it does

- **Clients** order without an account: browse the menu, add items with notes, order to a table or for delivery (300 DA fee itemised), get a permanent receipt page that doubles as live tracking, download it as PDF, print it on 80 mm thermal paper, share it to WhatsApp, reorder in one tap, and rate their drinks once the order is done. History follows the browser, and can be claimed on another device with a phone number and a one-time code.
- **Workers** log in to the board and almost nothing else: orders arrive live with a chime, one big action per card, elapsed time that turns amber after 8 minutes and red after 15, cancel with a required reason. They see their own 7-day history and their own payslips, and can mark an item sold out for the day.
- **Admins** manage categories and products in three languages with photos, prices and cost prices; see every order and export CSV; run staff, salaries and expenses; read sales, profit, best sellers, table vs delivery, and a busiest-hours heatmap; moderate reviews; and configure hours, tables, delivery and house rules.

Authorisation is enforced on the server in one place ([`src/lib/permissions.ts`](src/lib/permissions.ts)) with a unit test per row of the permission table. Totals are always recomputed on the server. Order events are append-only and record which worker did what.

## Stack

Next.js 15 (App Router, Server Components, Server Actions) · TypeScript strict · Tailwind CSS v4 · PostgreSQL via Prisma 7 · Auth.js (credentials, argon2) · Zod · next-intl · Recharts · Server-Sent Events with polling fallback · Vercel Blob for photos · Vitest + Playwright.

## Local setup

```bash
git clone https://github.com/Medbelkacem/coolzy.git
cd coolzy
pnpm install
cp .env.example .env            # fill DATABASE_URL, AUTH_SECRET, SETUP_TOKEN, NEXT_PUBLIC_APP_URL
pnpm db:migrate                 # applies prisma/migrations to your Postgres
pnpm dev                        # http://localhost:3000
```

A local Postgres in Docker works fine:

```bash
docker run -d --name coolzy-pg -e POSTGRES_PASSWORD=coolzy -e POSTGRES_DB=coolzy -p 127.0.0.1:5433:5432 postgres:17-alpine
# DATABASE_URL=postgresql://postgres:coolzy@127.0.0.1:5433/coolzy
```

Without `BLOB_READ_WRITE_TOKEN`, product photos are stored in `./uploads` and served by the app (development only).

Tests: `pnpm test` (unit) · `pnpm test:e2e` (Playwright, needs the dev server) · `pnpm typecheck` · `pnpm lint` · `pnpm messages:check` (fails on any missing translation).

## Environment variables

| Variable | Required | What it does |
|---|---|---|
| `DATABASE_URL` | yes | Pooled Postgres connection used at runtime (Neon pooled URL on Vercel). |
| `DATABASE_URL_UNPOOLED` | on Vercel | Direct connection used by `prisma migrate deploy` during the build. Falls back to `DATABASE_URL`. |
| `AUTH_SECRET` | yes | Signs Auth.js session tokens. `openssl rand -base64 48`. |
| `NEXT_PUBLIC_APP_URL` | yes | Public origin without trailing slash; used in receipt links, WhatsApp share and PDF rendering. |
| `SETUP_TOKEN` | yes | One-time token required by `/setup` to create the first admin. The route disables itself once an admin exists. |
| `BLOB_READ_WRITE_TOKEN` | production | Vercel Blob token for product photos. Empty locally = `./uploads`. |
| `OTP_TRANSPORT` | no | `console` (default, prints the code in the server log) or `webhook`. |
| `OTP_WEBHOOK_URL` | with webhook | Receives `POST {phone, code, message}` so you can plug any SMS gateway. |
| `OTP_WEBHOOK_SECRET` | no | Sent as `Authorization: Bearer …` to the webhook. |
| `CHROME_PATH` | no | Local Chrome/Chromium binary for receipt PDFs in development. On Vercel `@sparticuz/chromium` is used. |

## Creating the first admin

The database ships empty and nothing is seeded on deploy. Create the first admin once, either way:

1. **Through the UI** — open `https://<your-domain>/setup`, enter the value of `SETUP_TOKEN`, a name, username and a password of at least 12 characters. The page refuses to work once an admin exists.
2. **From a terminal** — with `DATABASE_URL` set:
   ```bash
   pnpm admin:create -- --name "Owner" --username owner --password "a long password"
   ```

Then sign in at `/login`, open **Boutique** (settings) to set hours, table count and phone, build the menu under **Carte**, and add a worker account under **Équipe**. From there the board at `/board` takes real orders.

## Deploying on Vercel

- Connect the repository; the `main` branch deploys to production, pull requests get previews.
- Add Neon Postgres and a Blob store from the Vercel Marketplace (they inject `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `BLOB_READ_WRITE_TOKEN`), then set `AUTH_SECRET`, `SETUP_TOKEN`, `NEXT_PUBLIC_APP_URL`.
- `pnpm build` checks the message catalogues, generates the Prisma client, builds, and runs `prisma migrate deploy` in the `postbuild` step.
- Security headers and a nonce-based CSP are set in `next.config.ts` and `src/middleware.ts`.

## Design

Dark room, lit cup: the client menu is a warm black room where only the drink photography carries colour, one accent per category. The staff dashboards flip to oat paper, calm and readable across an eight-hour shift. Fraunces for display, Instrument Sans for interface, IBM Plex Sans Arabic and Noto Naskh Arabic for Arabic. No 3D, no gradients, no glow.

## Licence

MIT — see [LICENSE](LICENSE).
