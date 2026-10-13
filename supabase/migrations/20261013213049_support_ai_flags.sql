-- AI first-line support in venue/creator Messages: the assistant's replies
-- are stored as normal messages from the support admin, flagged ai_generated
-- so the UI can label them; a user message the AI can't resolve is flagged
-- needs_human so the team sees exactly which conversations need them.
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS ai_generated boolean NOT NULL DEFAULT false;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS needs_human boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS messages_needs_human_idx ON public.messages (needs_human) WHERE needs_human;
