-- WP-GOV-01C-EXT: Add parameters to ProvisionScope
ALTER TABLE governance."ProvisionScope" ADD COLUMN "parameters" jsonb;
