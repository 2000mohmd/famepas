## Auto-approve new venue/business signups

Currently, when a business signs up via the `signup-user` edge function, the venue row is inserted without an `approval_status`, which defaults to `pending`. Admins must manually approve in the database before the venue is active.

### Change

In `supabase/functions/signup-user/index.ts`, in the venue insert block, explicitly set:
- `approval_status: "approved"`
- `is_active: true`

This mirrors the existing influencer auto-approval pattern already used in the same function.

### Scope

- Only the venue insert in `signup-user/index.ts` changes.
- No frontend, no DB schema, no admin dashboard changes.
- Existing pending venues in the DB remain as-is (admin can approve them manually one time, or I can run a one-off update if you want).

Want me to also flip the one existing `pending` venue to `approved` as part of this?