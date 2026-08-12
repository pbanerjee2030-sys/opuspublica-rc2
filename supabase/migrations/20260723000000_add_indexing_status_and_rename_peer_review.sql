DO $$
BEGIN
  IF EXISTS(
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'journals' AND table_schema = 'public' AND column_name = 'peer_review_policy'
  ) AND NOT EXISTS(
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'journals' AND table_schema = 'public' AND column_name = 'peer_review_process'
  ) THEN
    ALTER TABLE public.journals RENAME COLUMN peer_review_policy TO peer_review_process;
  ELSIF EXISTS(
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'journals' AND table_schema = 'public' AND column_name = 'peer_review_policy'
  ) AND EXISTS(
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'journals' AND table_schema = 'public' AND column_name = 'peer_review_process'
  ) THEN
    ALTER TABLE public.journals DROP COLUMN peer_review_policy;
  END IF;
END $$;

-- Add indexing_status column
ALTER TABLE public.journals ADD COLUMN IF NOT EXISTS indexing_status text;

-- Add country column to editorial_board_members
ALTER TABLE public.editorial_board_members ADD COLUMN IF NOT EXISTS country text;

-- Create book-covers storage bucket for book cover image uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('book-covers', 'book-covers', true)
ON CONFLICT (id) DO NOTHING;
