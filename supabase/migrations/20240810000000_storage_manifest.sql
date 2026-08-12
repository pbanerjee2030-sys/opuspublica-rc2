CREATE TABLE IF NOT EXISTS storage_manifest (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket text NOT NULL,
  logical_path text NOT NULL,
  physical_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bucket, logical_path)
);

CREATE INDEX IF NOT EXISTS idx_storage_manifest_physical_hash ON storage_manifest (bucket, physical_hash);

ALTER TABLE storage_manifest ENABLE ROW LEVEL SECURITY;
