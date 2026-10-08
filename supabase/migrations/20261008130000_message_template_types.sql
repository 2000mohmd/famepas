-- Adnan, "Venue Portal" item 26: message templates expand beyond rejections
-- to acceptance/confirmation, visit reminder, and thank-you/content request.
ALTER TABLE public.venue_message_templates ADD COLUMN IF NOT EXISTS type text;
