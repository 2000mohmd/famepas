-- Follow-up data/schema fixes from Adnan's 2026-09-24 admin panel audit.

-- §6: "Manage Admin Users should be mine alone." The existing policy let ANY
-- admin insert/update/delete admin_user_permissions (including granting
-- themselves manage_users), which defeats the whole point of the permission.
-- has_admin_permission() already existed but was never actually wired into
-- this policy. Bootstrap clause: while nobody holds manage_users yet, any
-- admin can still grant it (so this migration can't lock everyone out) — once
-- one admin holds it, only holders of it can change this table further.
DROP POLICY IF EXISTS "Admins manage admin permissions" ON public.admin_user_permissions;
CREATE POLICY "Admins manage admin permissions"
ON public.admin_user_permissions
FOR ALL
TO authenticated
USING (
  public.has_admin_permission(auth.uid(), 'manage_users')
  OR NOT EXISTS (SELECT 1 FROM public.admin_user_permissions WHERE permission = 'manage_users')
)
WITH CHECK (
  public.has_admin_permission(auth.uid(), 'manage_users')
  OR NOT EXISTS (SELECT 1 FROM public.admin_user_permissions WHERE permission = 'manage_users')
);

-- §5 Moderation: the "[QA TEST]" review is marked Visible and shows publicly. Hide it.
UPDATE public.reviews SET is_hidden = true WHERE review_text ILIKE '%[QA TEST]%';

-- §5 Categories: add the missing Lebanese categories he listed. Cover image
-- stays null — admins upload one from Manage Categories like any other row.
INSERT INTO public.categories (name, is_active)
SELECT name, true FROM (VALUES
  ('Cafés'), ('Bars & Nightlife'), ('Fashion & Retail'),
  ('Aesthetic Clinics'), ('Pastry & Desserts'), ('Beach Resorts')
) AS v(name)
WHERE NOT EXISTS (SELECT 1 FROM public.categories c WHERE lower(c.name) = lower(v.name));

-- §5 Locations: two-level list (area -> town). `city` stays the flat value every
-- existing query/filter already reads; `area` is purely additive for grouping.
ALTER TABLE public.service_locations ADD COLUMN IF NOT EXISTS area text;

INSERT INTO public.service_locations (city, area, country, is_active)
SELECT city, area, 'Lebanon', true FROM (VALUES
  ('Achrafieh', 'Beirut'), ('Hamra', 'Beirut'), ('Mar Mikhael', 'Beirut'), ('Badaro', 'Beirut'),
  ('Dbayeh', 'Metn'), ('Zalka', 'Metn'),
  ('Jounieh', 'Kesrouan'),
  ('Baabda', 'Baabda'),
  ('Jbeil', 'Jbeil'),
  ('North Lebanon', 'North Lebanon'),
  ('South Lebanon', 'South Lebanon')
) AS v(city, area)
WHERE NOT EXISTS (SELECT 1 FROM public.service_locations sl WHERE lower(sl.city) = lower(v.city));

-- Turn off Amman and Dubai until we actually launch there.
UPDATE public.service_locations SET is_active = false WHERE city IN ('Amman', 'Dubai');

-- §5 Chatbot: it only ever answers "Click Get Started" — add real Q&As so it's
-- actually useful instead of doing more harm than turning it off would.
INSERT INTO public.chatbot_knowledge (entry_type, question, answer, category, is_active)
SELECT 'qa', q, a, cat, true FROM (VALUES
  ('How does FamePass work?', 'FamePass connects venues (restaurants, cafés, salons, etc.) with content creators. Venues post an offer — a free meal, stay, or service — and creators apply. If approved, the creator visits, posts agreed content, and the venue gets exposure instead of paying cash.', 'onboarding'),
  ('Do I need followers to join as a creator?', 'Yes — venues review your profile and follower count before approving your application. There''s no fixed minimum, but venues typically look for an engaged, real audience relevant to their business.', 'onboarding'),
  ('Is FamePass free for creators?', 'Yes, joining as a creator is free. You apply to offers and receive the venue''s product or service in exchange for posting content — no subscription required.', 'billing'),
  ('How much does it cost venues to join?', 'Venues join through a subscription plan. Check the current plans on the signup page or your Billing tab for pricing and what''s included.', 'billing'),
  ('What do I need to post after visiting a venue?', 'Each offer states its content requirements up front — typically a set number of posts or stories tagging the venue. Check the offer details before applying so you know what''s expected.', 'content'),
  ('What happens if I don''t post after claiming an offer?', 'A no-show or missed deliverable is tracked on your profile and can affect whether venues approve your future applications. Always deliver what the offer asked for, or contact the venue if something changes.', 'content'),
  ('How do I submit my content after a visit?', 'Go to your Bookings, find the completed visit, and submit your post link or upload the content. The venue (or admin) reviews and approves it.', 'content'),
  ('How long do I have to post after visiting?', 'Deadlines are set per offer — check the offer details when you apply. If you need more time, message the venue directly.', 'content'),
  ('How does a venue get approved on FamePass?', 'A venue signs up with its business details, and our team reviews the application. Once approved, the venue can create offers that creators can apply to.', 'venues'),
  ('Why was my creator application rejected?', 'Applications are reviewed manually — common reasons include an incomplete profile, unverified social handles, or follower count not matching what the venue is looking for. You''ll get an email with the reason if you''re not approved.', 'onboarding'),
  ('Can I apply to more than one offer at a time?', 'Yes, you can apply to multiple open offers as long as you can realistically deliver on all of them.', 'content'),
  ('What cities is FamePass available in?', 'Check the city selector on signup for the current list of active cities — we''re adding new locations as we grow.', 'general'),
  ('How do I claim an offer?', 'Browse open offers, tap one that fits your niche, and hit Apply. The venue reviews your profile and confirms your booking.', 'content'),
  ('Can a venue cancel a booking?', 'Yes, either side can cancel before the visit happens. Repeated cancellations may affect your standing on the platform.', 'venues'),
  ('What is a no-show?', 'A no-show is when a confirmed booking isn''t honored — the creator doesn''t visit, or the venue doesn''t deliver the offer. It''s tracked and visible to admins reviewing future applications.', 'content'),
  ('How do I edit my profile or social handles?', 'Go to Settings from your dashboard to update your bio, niches, and connected social accounts.', 'onboarding'),
  ('Is my Instagram/TikTok handle verified automatically?', 'We check follower counts against the handle you provide. If it can''t be verified right away, your application can still be reviewed manually.', 'onboarding'),
  ('Who do I contact for support?', 'Reply to any FamePass email or use the contact option in Settings, and our team will get back to you.', 'general')
) AS v(q, a, cat)
WHERE NOT EXISTS (SELECT 1 FROM public.chatbot_knowledge k WHERE k.question = v.q);
