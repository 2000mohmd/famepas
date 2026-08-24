# Full platform E2E audit (Admin, Venue, Creator)

Goal: drive the live app as three real users, exercise every page, button and cross-role handoff, and produce a defect list — then fix what breaks.

## How it runs

Three parallel agents, one per dashboard, all using headless browser sessions against the running preview with seeded `@famepass.e2e` test accounts (venue, influencer, admin). Each agent screenshots every page, records console/network errors, and logs any control that does nothing.

## Agent 1 — Venue

- Sign up a fresh venue through the full wizard (brand, address, hours, compliance), confirm pending screen and admin notification.
- Create a campaign end to end: cover image upload, deliverables (reel duration / photo count), availability, booking limits, approval type; save, preview, duplicate, edit, publish.
- Verify the campaign appears as a live offer for creators (campaigns → offers sync).
- Review incoming applications: applicant name, avatar, followers, niches visible; approve one, reject one.
- Check-in flow with the creator's booking code.
- Content page: view submitted deliverable, metrics, approve / reject with feedback, star-rate quality, dispute.
- Locations, briefs, reports, settings tabs — every button and form.

## Agent 2 — Creator

- Sign up via the influencer flow (Instagram handle verification, location), confirm pending-review screen.
- Home: categories with covers, offers per category, all cards clickable.
- Explore: geolocation, map pins, filters (category, city, sort), saved offers.
- Single offer page: full detail, venue logo, deliverable requirements, Apply.
- Post-apply: status panel, booking code for check-in, invitations page.
- Submit content: post URL, metrics scrape, see venue feedback and rating.
- Bookings, earnings/wallet (balance vs pending withdrawal), rewards/leaderboard, reviews, profile, settings.

## Agent 3 — Admin

- Dashboard KPIs vs Analytics vs Offers vs Redemptions — confirm the same numbers across screens.
- Approve the new venue and creator created by agents 1 and 2; confirm approval emails fire and accounts unlock.
- Venues, Influencers (role filter correctness), Offers, Events, Redemptions, Moderation, Users, Categories, Locations, Billing, Cultural events, Chatbot, Settings (maintenance mode, registration toggles) — every CRUD action.
- Deep analytics tabs with date ranges.

## Deliverable

A findings list grouped by severity with the exact repro, then a fix pass for every reproducible defect (dead buttons, broken queries, missing role wiring, RLS blocks), re-verified in the browser afterwards.

## Technical notes

- Test data is created with real flows where possible; the `seed-e2e-users` function is used only to bootstrap logins (it is gated to the `@famepass.e2e` domain).
- Test rows are left in place so you can inspect them; say the word and I'll clean them up at the end.
