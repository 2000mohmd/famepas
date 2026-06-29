# FamePass Influencer Mobile API

Base URL:
```
https://dvauueqtqrveqcckfrjx.supabase.co/functions/v1/influencer-api
```

All requests (except `/auth/*`) need:
```
Authorization: Bearer <access_token>
apikey: <SUPABASE_ANON_KEY>
Content-Type: application/json
```

The function is public (no JWT verification on the edge); auth is enforced inside the handler from the `Authorization` header.

---

## 1. Auth flow (signup / login)

### POST /auth/signup
```json
{ "email": "...", "password": "...", "full_name": "...", "instagram_handle": "...", "phone": "..." }
```
Returns the created user. The client must then call `/auth/login` to obtain tokens.

### POST /auth/login
```json
{ "email": "...", "password": "..." }
```
Returns: `{ access_token, refresh_token, expires_at, user }`. Reject non-influencer accounts with 403.

### POST /auth/refresh
```json
{ "refresh_token": "..." }
```

### Verify a social handle during signup (no auth)
```
POST https://dvauueqtqrveqcckfrjx.supabase.co/functions/v1/fetch-profile-stats
Body: { "instagram_handle": "@joe" }  OR  { "tiktok_handle": "@joe" }
```
Returns `{ verified: { instagram?: {followers,...}, tiktok?: {...} }, followers_total }`. Use to pre-fill & lock the followers count before account creation.

---

## 2. Home screen
`GET /home` → one payload for the mobile home screen:
```json
{
  "profile": { "full_name", "avatar_url", "badge", "influencer_score" },
  "rewards": { "points", "tier" },
  "categories": [ { "id", "name", "icon", "color" } ],
  "featured_offers": [ ... ],
  "venues": [ ... ],
  "offers_by_category": { "<category_id>": [ ...offers ] }
}
```

`GET /categories` → list of active categories.

`GET /dashboard` → summary counts (invitations, bookings, earnings, points).

---

## 3. Explore screen
`GET /offers` with optional query params:
- `category`, `city`, `offer_type`, `min_followers`, `search`
- `lat`, `lng`, `radius_km` for nearby filtering (results include `distance_km`)

`GET /venues` (filters: `category`, `city`)
`GET /venues/:id` → venue with active offers, events, public reviews.
`GET /events`

---

## 4. Single-offer screen
`GET /offers/:id`
```json
{
  "offer": { ..., "venues": {...}, "categories": {...} },
  "my_redemption": { "id", "status", "qr_code", "qr_expires_at" } | null,
  "is_saved": true,
  "venue_reviews": [...]
}
```

Apply / accept offer:
`POST /offers/:id/accept` → returns `{ redemption, booking, qr_code }`. Show the QR code at the venue.

Save / unsave:
- `POST /saved-offers/:id`
- `DELETE /saved-offers/:id`
- `GET /saved-offers` → wishlist

---

## 5. Invitations
- `GET /invitations?status=pending|accepted|declined`
- `POST /invitations/:id/respond` body `{ "action": "accepted" | "declined" }`

---

## 6. Bookings flow
- `GET /bookings?status=upcoming|checked_in|completed`
- `POST /bookings/:id/checkin` (when at venue)
- `GET /deliverables?booking_id=...`
- `POST /deliverables` body `{ booking_id, platform, content_type, post_url, caption }`
- After posting, fetch real metrics:
  `POST /functions/v1/fetch-post-metrics` body `{ deliverable_id, post_url }`

Booking states:
`upcoming → checked_in → completed` (redemption auto-completes booking). Earnings are auto-created when a booking is completed.

---

## 7. Wallet
- `GET /wallet` →
  ```json
  { "balance", "total_earned", "total_withdrawn", "pending_withdrawals",
    "transactions": [...], "withdrawal_requests": [...] }
  ```
- `POST /wallet/withdraw` body `{ amount, payment_method, payment_details }`

---

## 8. Profile
- `GET /profile`
- `PUT /profile` (any profile column except `user_id`)
- `GET /settings` / `PUT /settings`
- `GET /media-kit` / `PUT /media-kit`

---

## 9. Reviews, rewards, leaderboard
- `GET /reviews?type=received|given`
- `POST /reviews` body `{ venue_id, booking_id, rating, comment }`
- `GET /rewards`
- `GET /leaderboard?limit=10`

---

## 10. Messages
- `GET /conversations` → list of partners
- `GET /messages?partner_id=<uuid>`
- `POST /messages` body `{ receiver_id, venue_id?, booking_id?, content, message_type? }`

---

## Status codes
- `200` ok, `400` validation, `401` unauthorized, `403` wrong role, `404` not found, `500` server error.

All endpoints return JSON. Errors:
```json
{ "error": "message" }
```
