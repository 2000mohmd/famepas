# FamePass

FamePass connects creators/influencers with venues (restaurants, lounges, hotels, gyms, spas)
for collaboration campaigns: venues publish offers, creators apply, check in with a booking
code, deliver content, and the platform tracks post metrics and earnings.

The repo contains three product surfaces plus a static marketing site:

| Surface | Routes | Notes |
| --- | --- | --- |
| Marketing site | `/`, `/about`, `/pricing`, `/casestudy/*`, `/legal/*` | Static export served from `public/site`, wrapped by `src/pages/MarketingPage.tsx` |
| Admin panel | `/admin/*` | Approvals, moderation, analytics, billing, categories/locations |
| Venue panel | `/venue/*` | Campaigns, bookings, briefs, content review, reports |
| Creator app | `/influencer/*` | Home feed, explore + map, offer detail, bookings, wallet, profile |

## Tech stack

- React 18 + TypeScript + Vite 5
- Tailwind CSS 3 + shadcn/ui + Radix primitives
- TanStack Query for server state, React Router 7 for routing
- Supabase (Postgres + RLS, Auth, Storage, Deno edge functions)
- Vitest + Testing Library for unit tests, ESLint 9 (flat config) for linting

## Prerequisites

- Node.js 20+ and npm 10+ (`npm ci` uses `package-lock.json`, resolved against the public npm registry)
- A Supabase project (hosted, or local via the Supabase CLI)
- Optional for local edge-function work: [Supabase CLI](https://supabase.com/docs/guides/cli) and Deno 1.x

## Setup

```sh
git clone <YOUR_GIT_URL>
cd famepass
npm ci
cp .env.example .env   # then fill in the three VITE_ values
npm run dev            # http://localhost:8080
```

### Environment variables

Only three variables are read by the frontend, all of them public and safe to ship in the
browser bundle (data access is protected by Row Level Security, not by hiding these):

| Variable | Where to find it |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project → Project Settings → API → Project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Same page → the publishable / `anon` key |
| `VITE_SUPABASE_PROJECT_ID` | The project ref (the subdomain of the project URL) |

Server-side secrets (`SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `RAPIDAPI_KEY`,
`GOOGLE_MAPS_API_KEY`, `LOVABLE_API_KEY`, `ADMIN_EMAIL`) are **never** placed in `.env`.
They are configured as edge-function secrets in the backend project. The Google Maps browser
key is fetched at runtime through the `google-maps-key` edge function, so it is not bundled.

> This project is developed on Lovable Cloud, which provisions the backend and writes `.env`
> automatically. If you are building on your own Supabase project, follow the steps below.

## Setting up a backend from scratch

1. Create a Supabase project and copy the three values above into `.env`.
2. Link the CLI and push the schema:
   ```sh
   supabase link --project-ref <your-project-ref>
   supabase db push          # applies everything in supabase/migrations
   ```
3. Deploy the edge functions (per-function `verify_jwt` settings live in `supabase/config.toml`):
   ```sh
   supabase functions deploy --project-ref <your-project-ref>
   ```
4. Set function secrets:
   ```sh
   supabase secrets set RESEND_API_KEY=... RAPIDAPI_KEY=... GOOGLE_MAPS_API_KEY=... ADMIN_EMAIL=...
   ```
5. Configure Auth: enable Email + Google providers, set the Site URL and redirect URLs to your
   app origin (`http://localhost:8080` for local development).
6. Seed test accounts. The `seed-e2e-users` function creates approved users, but only for the
   `@famepass.e2e` email domain:
   ```sh
   curl -X POST "$VITE_SUPABASE_URL/functions/v1/seed-e2e-users" \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@famepass.e2e","password":"Passw0rd!","role":"admin"}'
   ```
   Repeat with `"role":"venue"` (add `"venue_name"`) and `"role":"influencer"`.

### Running edge functions locally

```sh
supabase start                  # local Postgres + Auth + Storage
supabase functions serve        # all functions on http://localhost:54321/functions/v1/<name>
supabase functions serve chatbot --no-verify-jwt   # a single function
```

Point `.env` at the local stack (`VITE_SUPABASE_URL=http://localhost:54321`) to develop
against it. Functions read their secrets from `supabase/.env` when served locally.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server on port 8080, bound to all interfaces |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | ESLint over the whole repo (errors fail CI; `any` usage is a tracked warning) |
| `npm run test` | Vitest suite (single run) |
| `npm run test:watch` | Vitest in watch mode |

## Tests

- `src/test/protectedRoute.test.tsx` — role-based routing and loading/redirect behaviour
- `src/test/authApproval.test.tsx` — sign-in gating: email confirmation, pending/rejected
  accounts, admin bypass, role precedence
- `src/test/edgeFunctions.test.ts` — smoke checks over every function in `supabase/functions`
  (entrypoint, request handler, CORS preflight, JSON responses, no hardcoded credentials)

CI (`.github/workflows/ci.yml`) runs lint → tests → typecheck → build on every push and pull
request, plus `deno check` over each edge function.

## Project structure

```
src/
  pages/            route components (admin/, venue/, influencer/, marketing, auth)
  components/       shared UI + shadcn primitives in components/ui
  contexts/         AuthContext (session, role, approval gating), GoogleMapsContext
  lib/              validation, notifications, service countries, MCP tools
  integrations/     auto-generated Supabase client and types — do not edit by hand
supabase/
  functions/        Deno edge functions (email, signup, metrics, MCP, ...)
  migrations/       SQL schema, RLS policies, triggers
public/site/        static marketing site export
```

## Conventions

- Colors, gradients and shadows come from the design tokens in `src/index.css` and
  `tailwind.config.ts`. Do not hardcode color utilities in components.
- Roles live in the `user_roles` table and are checked through the `has_role` security-definer
  function — never on the profile row.
- Every public table has RLS enabled plus explicit `GRANT`s; new tables must follow the same
  pattern in their migration.
- Files under `src/integrations/supabase/` and `supabase/functions/mcp/index.ts` are generated
  and excluded from linting.
