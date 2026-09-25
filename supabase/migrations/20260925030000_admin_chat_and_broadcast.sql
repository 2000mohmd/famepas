-- Admin <-> influencer chat: `messages` already existed (built for venue/
-- booking chat) but its UPDATE policy only let the specific sender or
-- receiver on a row mark it read. SELECT already grants admins full
-- visibility via is_admin(); with more than one admin account sharing a
-- "team inbox" per creator, UPDATE needs the same so any admin can mark a
-- thread read, not just whichever admin happened to be the receiver_id.
DROP POLICY IF EXISTS "Users can update own messages" ON public.messages;
CREATE POLICY "Users can update own messages" ON public.messages
  FOR UPDATE USING (sender_id = auth.uid() OR receiver_id = auth.uid() OR is_admin());
