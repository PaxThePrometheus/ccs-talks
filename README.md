# CCS Talks

Forums-style platform for the **Our Lady of Fatima University – College of Computer Studies (OLFU–CCS)** community, built with **Next.js** (App Router), **React**, **Tailwind CSS**, **Drizzle ORM**, and **Neon** PostgreSQL.

For a **verbose, file-by-file** map of routing, UI, `src/lib/ccs`, and every `route.js`, see **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

## Requirements

- **Node.js** (LTS recommended) and npm
- A **Neon** (or compatible) Postgres instance and connection string

## Setup

```bash
npm install
```

Create **`.env.local`** in the project root (never commit secrets):

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | **Required.** Postgres URL (Neon pooled or direct). |
| `CCS_AUTH_PEPPER` | Optional but recommended in production — extra secret mixed into password hashing (`src/lib/ccs/auth.js`). |
| `CCS_PUBLIC_URL` or `NEXT_PUBLIC_APP_URL` | Public site base URL (password reset links, etc.). |
| `RESEND_API_KEY` | If set, sends password-reset email via Resend; otherwise behaviour falls back per `src/lib/ccs/mailer.js`. |
| `CCS_EMAIL_FROM` | From address when using Resend (optional; default documented in mailer). |

Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The main app routes are validated by **`src/app/[[...slug]]/page.js`** + **`talksPaths.js`**.

Staff console: **`/admin`** (after bootstrap — see **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**).

## Scripts

| Script | Command |
|--------|---------|
| Development | `npm run dev` |
| Production build | `npm run build` |
| Production server | `npm start` |
| Lint | `npm run lint` |
| Push schema (Drizzle Kit) | `npm run db:push` |
| Drizzle Studio | `npm run db:studio` |

The app also applies **idempotent DDL** on cold start via **`ensureReady()`** in `src/lib/ccs/drizzle-client.js`, so Neon can spin up tables without always running migrations manually.

## Project layout (short)

| Path | Contents |
|------|----------|
| `src/app/` | App Router routes, layouts, **`api/`** route handlers |
| `src/app/[[...slug]]/` | Catch-all entry for public Talks UI |
| `src/app/admin/` | Admin pages (login/register/dashboard) |
| `src/components/ccs-talks/` | Client SPA shell, screens, API client helpers |
| `src/components/ccs-admin/` | Admin console components |
| `src/lib/ccs/` | Server-only persistence, auth, moderation, Drizzle schema |
| `src/proxy.js` | Same-origin enforcement for mutating `/api/*` (see ARCHITECTURE) |
| `static-ccs-talks/` | Lightweight static/HTML mirror — [static-ccs-talks/README.md](static-ccs-talks/README.md) |
| `docs/ARCHITECTURE.md` | Routing, env vars detail, API index, security notes |

## Contributing / framework notes

- Path alias **`@/`** maps to **`src/`** (`jsconfig.json`).
- **`AGENTS.md`** applies to automation: Next.js conventions in this repo may differ from generic docs — check **`node_modules/next/dist/docs/`** when unsure.
