-- Add persistent retry state to the canonical outbox
ALTER TABLE public.outbox
ADD COLUMN IF NOT EXISTS retry_count integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS next_retry_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS last_error text;

-- Index for efficient polling of pending/delayed events
CREATE INDEX IF NOT EXISTS idx_outbox_next_retry_at ON public.outbox(next_retry_at);
