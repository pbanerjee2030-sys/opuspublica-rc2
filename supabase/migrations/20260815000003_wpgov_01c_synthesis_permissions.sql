-- WP-GOV-01C Synthesis Engine Permissions
-- Grants the governance_ingest_role the necessary privileges to execute Evidence Synthesis
-- synchronously after successful projection.

GRANT SELECT ON governance."Provision" TO governance_ingest_role;

GRANT SELECT, INSERT, UPDATE ON governance."TraceabilityNode" TO governance_ingest_role;
GRANT SELECT, INSERT, UPDATE ON governance."TraceabilityEdge" TO governance_ingest_role;
