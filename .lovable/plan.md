## Goal

Add the mobile-app **Organization → Brand → Establishment** hierarchy to the backend while keeping every existing feature (offers, events, bookings, invitations, redemptions, messages, reviews, attendance, admin moderation, venue dashboards, public site, maps) fully working.

## Strategy: extend, don't replace

The current schema has a single `venues` table that everything references (`offers.venue_id`, `events.venue_id`, `bookings.venue_id`, `invitations.venue_id`, `messages.venue_id`, `reviews.venue_id`). Renaming or dropping it would break ~20 files.

Instead, treat **`venues` as the "establishment"** and add `organizations` + `brands` above it, plus the missing fields. Everything that already references `venue_id` keeps working unchanged.

```text
organizations (owner_id)
   └── brands (organization_id)
          └── venues  ← acts as "establishment"
                 ├── offers, events, bookings, invitations,
                 ├── messages, reviews, redemptions, attendees
                 └── venue_photos (new gallery)
```

## Schema changes (one migration)

**New tables**
- `organizations` — `owner_id`, `name`, `legal_name`, `tax_id`, `country`
- `brands` — `organization_id`, `name`, `logo_url`, `description`
- `venue_photos` — `venue_id`, `url`, `position` (multi-image gallery)

**Extend `venues` (additive only, all nullable)**
- `brand_id` (nullable FK to brands — null = legacy/standalone venue)
- `venue_type` (`physical` | `online`)
- `address_line1`, `address_line2`, `zip_code`, `timezone`
- `contact_person_name`, `contact_phone`, `whatsapp_phone`
- `website_url` already exists as `website` — reuse
- `signup_completed` (bool, default true for legacy rows)

**Storage**
- New public bucket `venue-photos` with owner-write / public-read RLS

**Backfill**
- For every existing venue without a brand, create a default Organization + Brand owned by `venues.owner_id` and set `venues.brand_id`. Mark `signup_completed = true` so the INCOMPLETE badge only shows for new mobile signups.

**RLS**
- `organizations` / `brands`: owner can CRUD own rows; admins full access; public can read brands of approved venues.
- `venue_photos`: public read; venue owner + admin write/delete.

## Code changes (backwards compatible)

1. **`signup-user` edge function** — accept optional `organization_name`, `brand_name`, plus full establishment fields. If the mobile flow sends them, create org → brand → venue chain. Web flow continues to work unchanged (auto-creates default org/brand).
2. **`create-user` edge function** — same additive params.
3. **VenueSettings page** — add an "Organization & Brand" section (read/edit) and a multi-photo gallery uploader writing to `venue_photos`. Existing fields untouched.
4. **Admin Venues page** — show org/brand columns; filter by org.
5. **Public venue cards / detail** — fall back to existing logo/cover; if `venue_photos` exist, show gallery.
6. **Types** — auto-regenerated after migration; no manual edits.

Everything else (offers, events, bookings, invitations, messages, reviews, redemptions, attendees, maps, billing, earnings, leaderboard) keeps using `venue_id` and needs **zero changes**.

## Migration safety

- All new columns nullable with safe defaults.
- Backfill runs in same migration so no row is left orphaned.
- No renames, no drops, no FK changes on existing columns.

## Out of scope (ask before adding)

- Splitting one venue into multiple physical locations under one brand (would need refactoring offers/events to point at brand instead of venue).
- Per-brand billing (currently per-user).
