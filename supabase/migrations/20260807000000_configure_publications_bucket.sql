-- Create or update publications storage bucket to allow DOCX uploads
INSERT INTO storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
VALUES (
    'publications', 
    'publications', 
    false, 
    ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword']::text[], 
    15728640
)
ON CONFLICT (id) DO UPDATE SET
    allowed_mime_types = EXCLUDED.allowed_mime_types,
    file_size_limit = EXCLUDED.file_size_limit,
    public = EXCLUDED.public;
