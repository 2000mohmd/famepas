# Meta App Review — Reviewer Instructions (Instagram Business Login)

Paste the text below into the **Reviewer Instructions** field for each permission being
requested (`instagram_business_basic`, `instagram_business_manage_insights`, and any of
`instagram_business_manage_messages` / `instagram_business_manage_comments` /
`instagram_business_content_publish` also submitted). Update the placeholders in **bold**
before submitting.

---

## App: FamePass
## Feature: Connect Instagram (creator dashboard)

FamePass is a marketplace that connects social media creators with venues (restaurants,
hotels, gyms, spas) for collaboration campaigns. Creators use Instagram Business Login to
link their Instagram account so venues can see genuine follower counts and post
performance when reviewing applications, and so FamePass can track the metrics of
sponsored posts creators publish as part of a campaign.

### Test credentials

- URL: **https://famepass.app**
- Email: **`reviewer@famepass.e2e`**
- Password: **`<set a password when seeding this account — see note below>`**

This account is a pre-approved **Creator** role account, seeded via our
`seed-e2e-users` edge function so it skips manual admin approval. It requires no payment
or additional signup step.

**Before submitting for review**, seed it once:
```sh
curl -X POST "https://<project-ref>.supabase.co/functions/v1/seed-e2e-users" \
  -H "Content-Type: application/json" \
  -d '{"email":"reviewer@famepass.e2e","password":"<REVIEWER_PASSWORD>","role":"influencer"}'
```

The reviewer will also need an **Instagram professional (Business or Creator) account** to
connect — Instagram Business Login only works with those account types. If Meta's review
team uses their own test Instagram account, no action is needed on our side; if they ask
for one, provide a Business/Creator Instagram test account's login here: **`<add if requested>`**.

### Step-by-step: how to trigger the Instagram login

1. Go to **https://famepass.app** and click **Log in** (top right).
2. Sign in with the test credentials above. You'll land on the Creator home screen.
3. Open the left-hand navigation and click **Settings**.
4. In the **Connected Accounts** card at the top of the page, click **Connect Instagram**.
5. You'll be redirected to Instagram's own login/consent screen
   (`instagram.com/oauth/authorize`), showing the FamePass app name and the requested
   permissions. Log in with an Instagram Business or Creator account and tap **Allow**.
6. Instagram redirects back to `https://famepass.app/instagram/callback`, which shows a
   brief "Connecting your Instagram…" loading state.
7. On success you'll see **"Instagram connected ✓"** with the connected @handle, then be
   returned automatically to Settings, where the Instagram row now shows **Connected**
   with a **Disconnect** option.

### What each permission is used for

- **`instagram_business_basic`** — read the creator's Instagram user ID, username, and
  account type immediately after connecting, so we can display "@handle · Connected" in
  their dashboard and confirm the account is a Business/Creator account before enabling
  campaign features that depend on it.
- **`instagram_business_manage_insights`** — read post- and account-level insights
  (reach, impressions, engagement) for content the creator publishes as part of a paid
  FamePass campaign, so venues can see verified performance instead of self-reported
  numbers, and so creators can see their own stats in the Earnings tab.
- *(if requesting `instagram_business_manage_comments` / `_manage_messages` /
  `_content_publish`, describe the specific in-app feature that uses each one here —
  do not request permissions the flow above doesn't actually exercise.)*

### Error handling reviewers may notice

- If the creator declines on Instagram's consent screen, they're returned to
  `/instagram/callback` with a "Connection cancelled" message and a link back to Settings
  — no error is shown, this is expected.
- If the code exchange fails (expired code, revoked app, etc.), the callback page shows
  "Couldn't connect Instagram" with a link back to Settings to retry.

### Where this lives in the codebase (for our own reference, not for Meta)

- `src/pages/InstagramCallback.tsx` — the `/instagram/callback` route.
- `src/pages/influencer/InfluencerSettings.tsx` — the "Connect Instagram" button (`InstagramConnectRow`).
- `supabase/functions/instagram-oauth/index.ts` — server-side code exchange, long-lived
  token upgrade, and token storage.
- `supabase/migrations/20260912000000_instagram_creator_oauth.sql` — schema change
  allowing `social_integrations` rows to belong to a creator, not just a venue.

---

**Screencast note:** record steps 1–7 above end-to-end, including Instagram's own consent
screen and the final "Instagram connected ✓" state. Meta requires the screencast to show
the permission being used immediately after granting it (step 7 covers this, since the
connected state itself is the direct result of `instagram_business_basic`; if a video
also shows insights being displayed elsewhere in the product — e.g. the creator's
Earnings/Analytics tab — link or note that here once it's ready).
