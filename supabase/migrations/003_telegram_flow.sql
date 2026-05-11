-- Telegram chat_id per user (admin sets this after client sends /start to the bot)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS telegram_chat_id text;

-- Track submission origin channel
ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'web'
  CHECK (source IN ('web', 'telegram'));

-- Conversation state table (one active session per chat_id)
CREATE TABLE IF NOT EXISTS public.telegram_sessions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id        text NOT NULL,
  submission_id  uuid REFERENCES public.submissions(id) ON DELETE CASCADE,
  state          text NOT NULL CHECK (state IN (
                   'awaiting_client_confirm',
                   'awaiting_admin_action',
                   'done'
                 )),
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS telegram_sessions_chat_id_active
  ON public.telegram_sessions(chat_id)
  WHERE state != 'done';
