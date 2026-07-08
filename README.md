# reels-analytics

A private analytics app for a content creator who publishes vertical videos on
**TikTok** and **Instagram (Reels)**. It centralizes the metrics of both platforms in
a single database, stores **historical snapshots** to measure growth over time, and
analyzes per-video performance (views, likes, comments, shares, hashtags, publish
day/time, etc.).

The core idea: official APIs return the **current state** of a metric, not its history.
The value of this app is in **ingesting periodic snapshots and persisting them** — growth
is computed by comparing snapshots.

> Facebook is **out of scope for now** (explicitly dropped). The design allows adding it
> later without rewriting the core.

## Status

Core initialized. **TikTok integration is functional** (read-only): OAuth Login Kit with
PKCE + state, an interim httpOnly-cookie session, Display API client, mappers to the
domain model, and a dashboard that renders the profile header, derived analytics
(best day/hour, engagement rate, top hashtags, averages) and an enriched video table.
Each video has a detail view (`/video/tiktok/[id]`, `/video/instagram/[id]`) with its
current metrics and growth curve.

- **Instagram**: functional read module (Graph API with Instagram Login) — profile, Reels,
  per-Reel insights (views/shares/saved), charts and an internal detail view. Auth is an
  interim long-lived token (`INSTAGRAM_ACCESS_TOKEN`), auto-extended before use.
- **Supabase**: connected. Daily Vercel cron ingests immutable snapshots
  (`ra_account_snapshots`, `ra_video_snapshots`); tokens persist in `ra_connections` with
  auto-refresh. Instagram ingestion rotates old Reels to stay under API rate limits.
- **Growth**: `/growth` reads the persisted history (followers over time, content-type
  and monthly performance, posting cadence) and each video detail shows its own growth
  curve built from snapshots.
- **Auth**: single-user Supabase login guards all routes.
- **Roadmap**: see `ROADMAP.md` for the phased analytics plan.

> Deployed to Vercel (auto-deploy from GitHub). Development happens against the deploy
> because TikTok does not accept `localhost` as a redirect URI.

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | **Next.js 16** (App Router, Server Components) |
| Language | **TypeScript** (strict) |
| Styling | **Tailwind CSS 4** |
| UI | **shadcn/ui** on **Base UI** (`@base-ui/react`), Lucide icons |
| Backend / DB | **Supabase** (Postgres, Auth, RLS) — planned |
| Package manager | **bun** (use `bun`, never npm/pnpm/yarn) |

## Getting started

```bash
bun install                 # install dependencies
bun dev                     # dev server (http://localhost:3000)
bun run build               # production build
bun run lint                # lint
bunx shadcn@latest add <c>  # add a shadcn component
```

The core boots without any environment variables. Copy `.env.example` to `.env.local` and
fill values as each integration is connected:

- **TikTok Display API**: `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, `TIKTOK_REDIRECT_URI`
  (must match the redirect URI registered in the TikTok portal exactly).
- **Instagram Graph API**: `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET`,
  `INSTAGRAM_USER_ID`, `INSTAGRAM_ACCESS_TOKEN` (interim long-lived token).
- **Supabase**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
  `SUPABASE_SECRET_KEY`.
- **Cron**: `CRON_SECRET` protects `/api/cron/ingest`.

> `insights.ts` aggregates by day/hour using `CREATOR_TIMEZONE` (default
> `America/Mexico_City`) because the server runs in UTC.

## Architecture

**Modular / ports & adapters.** Each platform is an isolated module that implements a
common `PlatformProvider` contract, so the analytics and UI layers never depend on the
details of each API.

```
Platform (TikTok / Instagram)
        │  adapter implements PlatformProvider
        ▼
  Normalization (mappers → single domain model)
        ▼
  Persistence (Supabase: timestamped snapshots, daily cron)
        ▼
  Read / analytics layer (aggregates, compares over time)
        ▼
  UI (dashboard, App Router)
```

Adapters always return the **normalized domain model**, never the raw API shape (that
conversion lives in `mappers`). Dependency rules: `modules/*` may import from `core/` but
never from a sibling `modules/*`; `app/` orchestrates modules but holds no business logic;
cross-platform logic lives in `modules/analytics`.

```
src/
  app/          # App Router: thin routes, no business logic (+ api/, video/)
  modules/
    tiktok/     # Display API client, mappers, provider, OAuth, session, read layer
    instagram/  # provider stub (not wired yet)
    analytics/  # cross-platform aggregation and derived insights
    registry.ts # platform provider registry
  core/
    domain/     # normalized models + PlatformProvider contract
    config/     # validated env vars
    lib/        # utilities (hashtag parsing, dates, formatting)
  components/
    ui/         # shadcn components
```

## Visual identity — "Arcane"

Dark-first, neon-purple gaming theme tied to the creator's brand. Tokens live in
`src/app/globals.css` (background `#0f0f23`, primary `#7c3aed`, brand accent `#f43f5e`).
Typography: `Russo One` (display/brand) and `Chakra Petch` (UI/numbers). Always use
semantic tokens (`bg-primary`, `text-muted-foreground`, `border`…), never raw hex.

## Conventions

- TypeScript `strict`; avoid `any` without justification.
- Validate env vars in `core/config` (fail fast at boot).
- Server Components by default; `"use client"` only when interactivity is needed.
- No secrets on the client — every platform API call happens on the server.
- Commits in English, imperative, module-scoped when applicable (`tiktok:`, `instagram:`).

See [CLAUDE.md](CLAUDE.md) for the full contributor guide and the planned data model.
