# Sales CRM — Phase 1 (internal leads module)

Constraints confirmed: leads live in their own `leads` table (never `venues`); `sales_rep` / `sales_manager` are added to the existing `user_roles` + SECURITY DEFINER pattern; admin is a strict superset of sales_manager; category comes from the `categories` table (same source as business sign-up) and area from `service_locations`. Nothing from later phases. The main Admin Dashboard "Total Venues" card stays untouched.

## 1. Schema

```text
leads
  id               uuid pk default gen_random_uuid()
  venue_name       text not null
  category_id      uuid null  -> categories.id      (same list as business sign-up)
  location_id      uuid null  -> service_locations.id (area + town, as in Admin > Locations)
  address          text null
  map_url          text null
  contact_name     text null
  contact_role     text null
  phone            text not null        (stored E.164, same normalizer as profiles)
  phone_normalized text generated (digits only) — indexed, duplicate check
  instagram_handle text null
  instagram_normalized text generated (lowercase, no @) — indexed
  source           text not null  check in (walk_in, referral, instagram, maps_import, inbound_signup, event)
  stage            text not null default 'new'
                   check in (new, contacted, meeting_booked, meeting_done, signed_up, approved, live, lost)
  owner_id         uuid not null   (the rep; auth user id, no FK to auth.users)
  next_action      text null
  follow_up_at     timestamptz null
  lost_reason      text null  check in (price, no_interest, bad_timing, closed, other)
  lost_note        text null
  venue_id         uuid null -> venues.id on delete set null   (set on conversion)
  invite_token     text unique null   (for the prefilled sign-up link)
  invite_sent_at   timestamptz null
  created_by       uuid not null default auth.uid()
  created_at / updated_at / stage_changed_at timestamptz

lead_activities
  id, lead_id -> leads.id on delete cascade,
  author_id uuid not null default auth.uid(),
  kind text check in (call, whatsapp, visit, meeting, note, stage_change, system),
  outcome text null, body text null,
  occurred_at timestamptz not null default now(), created_at

sales_targets (tiny, so the 12/week target is editable, not hardcoded)
  key text pk, value int   -- seed: weekly_signings = 12
```

Validation trigger on `leads` (not CHECK, since it depends on stage):
- open stages (new → approved) require `next_action` and `follow_up_at`
- `lost` requires `lost_reason`
- stage change writes a `stage_change` row to `lead_activities` and updates `stage_changed_at`
- reps cannot change `owner_id` (only manager/admin can reassign)

Duplicate check: SECURITY DEFINER RPC `find_lead_duplicates(_phone, _instagram, _exclude_lead_id)` returning matches from `leads` AND `venues` (venue phone / contact_phone / whatsapp_phone, plus owner profile `instagram_handle`). Runs on save; shows a warning dialog. Venue matches are hard-blocked ("this venue already signed up"); lead matches are a warning the rep can override (manager sees who owns it). Reps only get the match's name/stage/owner name, not the other rep's full lead.

## 2. Roles and permissions

- Migration: `ALTER TYPE app_role ADD VALUE 'sales_rep'; ADD VALUE 'sales_manager';` (own migration, enum values must commit before use).
- New SECURITY DEFINER helpers, built on the existing `has_role` / `is_admin`:
  - `is_sales_manager()` = `has_role(auth.uid(),'sales_manager') OR is_admin()`
  - `is_sales_staff()` = `is_sales_manager() OR has_role(auth.uid(),'sales_rep')`
- RLS on `leads` / `lead_activities`:
  - select/update: `owner_id = auth.uid() OR is_sales_manager()`
  - insert: `is_sales_staff()`, reps forced to `owner_id = auth.uid()`
  - delete: `is_sales_manager()` only
  - activities follow the parent lead's visibility; authors edit only their own notes
- GRANTs to `authenticated` + `service_role`; no anon access except the token lookup below.
- Admins (Adnan, Moe) get everything through `is_admin()`, no second role needed.
- Creating staff: extend Admin > Admin Users with an "Add sales staff" option, which calls the existing `create-user` function with role `sales_rep` / `sales_manager` (function updated to accept these roles, gated by `manage_users`).
- App side: `AuthContext` role resolution gets the two new roles (priority admin > sales_manager > sales_rep > venue > influencer); sign-in approval check treats sales roles like admin (no profile approval wait); `ProtectedRoute` accepts the new roles.

## 3. Where it lives in the UI

Extend the existing admin layout (`DashboardLayout type="admin"`) with a new **Sales** nav group, under `/admin/sales/*`, open to admin + sales_manager + sales_rep:

- `/admin/sales` — Sales dashboard tab: funnel counts by stage, signings this week vs target (12), rep leaderboard (contacts / meetings / signings this week, from activities + stage changes), overdue follow-ups per rep. Reps see only their own numbers; managers/admins see all.
- `/admin/sales/my-day` — logged-in rep's follow-ups due today + overdue (default landing page for reps).
- `/admin/sales/leads` — list view (filters: stage, owner, category, area, source, overdue, search) and board view toggle with drag-and-drop between stages (stage moves into Lost / open stages open the required-fields dialog).
- `/admin/sales/leads/:id` — lead detail: fields, owner reassign (manager/admin), activity timeline with quick-add (call/WhatsApp/visit/meeting/note + outcome + date), Convert button.

Sales reps see ONLY the Sales group in the sidebar; all other admin pages remain admin-only (existing routes unchanged). The existing Admin Dashboard is not modified.

## 4. Convert to venue

- "Convert" generates `invite_token` and a link `/signup/business?lead=<token>` the rep can copy or send by WhatsApp/email (email via the existing notification email function).
- Public edge function `lead-invite` (no login) returns only prefill fields for a valid token: venue name, category, city, contact name, phone, email if present.
- Business sign-up reads `?lead=` and prefills its fields; the token is passed to `signup-user`, which, after creating the venue, sets `leads.venue_id`, moves stage to `signed_up`, clears the token, and logs a system activity. Owner and history stay intact.
- When an admin approves that venue → stage `approved`; when it has its first active offer → `live` (small trigger on venues/offers, only advancing leads linked by `venue_id`).

## 5. Time estimate (Phase 1 only)

- Schema, roles, RLS, triggers, duplicate RPC: ~0.5 day
- Auth/role wiring, staff creation, sidebar/routing: ~0.5 day
- Leads list + board (drag-and-drop) + lead form with validation/duplicates: ~1 day
- Lead detail + activity timeline + My day: ~0.5 day
- Convert flow (token, public prefill function, sign-up + signup-user linking, stage triggers): ~0.5–1 day
- Sales dashboard + testing as admin / manager / rep: ~0.5 day

Total: about 3.5–4 working days of effort, delivered over roughly 4–6 build rounds here, plus a test pass with one real rep account.

## Technical notes

- Two migrations: (1) enum values; (2) tables, helpers, policies, triggers, grants.
- Drag-and-drop via `@dnd-kit/core` (small, accessible).
- Week boundaries use Monday start, Asia/Beirut time.
- Assumption to correct if wrong: sales staff log in on the same site and same login page as everyone else, and do not need 2FA (the admin 2FA gate stays admin-only).
