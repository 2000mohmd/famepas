# End-to-End Fixes Plan

## Critical (data-loss & broken admin controls)

### 1. VenueLocations — stop mutating the `venues` table
- New migration: create `public.venue_locations` (venue_id FK → venues, name, address, city, country, zip_code, latitude, longitude, is_primary, timestamps) with GRANTs + RLS (owner via `is_venue_owner`, admin via `is_admin`).
- Rewrite `src/pages/venue/VenueLocations.tsx` to read/insert/delete from `venue_locations` scoped to the user's primary venue.
- Backfill: for each existing venue, seed one `venue_locations` row from its current address.

### 2. AdminEvents CRUD
- Already shipped in prior turn (create / toggle active / delete). Verify and leave as-is.

### 3. AdminRedemptions approve/reject
- Already shipped in prior turn. Verify and leave as-is.

## UX warnings

### 4. Reward points never awarded
- DB trigger `award_points_on_booking_complete`: when `bookings.status` transitions to `completed`, `INSERT … ON CONFLICT (user_id) DO UPDATE` on `reward_points` (+50 pts).
- DB trigger `award_points_on_content_approved`: when `deliverables.status` becomes `approved`, +100 pts.

### 5. Influencers can write reviews
- Add "Write a review" dialog to `InfluencerReviews.tsx`: lists completed bookings without an existing review, lets influencer rate the venue (1–5 + text), inserts into `reviews` with `reviewer_id = auth.uid()`, `reviewed_id = venue.owner_id`, `venue_id`, `booking_id`.

### 6. Content rejection notification
- Edge trigger / DB trigger on `deliverables` status → `rejected`: insert a row into `messages` from the venue to the influencer with the rejection reason ("Your content for <offer> was rejected: <feedback>").

### 7. Venue Settings → Billing tab
- Populate with: current subscription tier (read `subscription_tiers` + venue's tier), monthly price, commission %, "Manage subscription" placeholder button, and recent platform earnings/commission summary from `earnings` for the venue's offers.

### 8. Admin Billing approve withdrawal
- Already present in `AdminBilling.tsx` (Approve/Reject buttons on pending rows). No change.

### 9. VenueReports charts
- Add Recharts visualisations: bookings-over-time line chart, redemptions-by-offer bar chart, top-influencers bar chart. Reuse existing query data.

## Technical notes
- Migrations: one for `venue_locations` (+ backfill), one for reward-point triggers + content-rejection trigger.
- New file: none for triggers (SQL only). Edits: `VenueLocations.tsx`, `InfluencerReviews.tsx`, `VenueSettings.tsx`, `VenueReports.tsx`.
- All inserts/updates respect existing RLS; trigger functions are `SECURITY DEFINER` with `set search_path = public`.
- Skip items #2, #3, #8 (already done) — will verify only.

Proceed?
