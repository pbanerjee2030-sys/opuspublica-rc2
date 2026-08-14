-- WP-GOV-01-SEED: Canonical Governance Provision Bootstrap
--
-- Authority: wp-gov-01-engineering-specification.md §1.2 (GOV-INV-01..16)
--            + §3.3.3 (Minimum Evidence Set: SUB-01, SUB-02, SUB-03)
--            + SUB-01 review threshold governance decision (reviewThreshold = 2, all journals)
--
-- This migration seeds the governance.Provision table with 19 authorized
-- provisions and the governance.ProvisionScope table with journal-scoped
-- reviewThreshold = 2 for all 8 RC2 journals.
--
-- All provision IDs, statements, severities, and scopes are derived from
-- authoritative source documents. No provisions are invented.
--
-- Idempotent: uses ON CONFLICT DO NOTHING for provisions and
-- ON CONFLICT DO UPDATE for ProvisionScope (to allow threshold updates).

-- ─────────────────────────────────────────────────────────────────────────────
-- 16 GLOBAL ARCHITECTURAL INVARIANTS (GOV-INV-01..16)
-- Source: wp-gov-01-engineering-specification.md §1.2
-- Scope: Global (isGlobal = true, apply to ALL journals)
-- Evaluation class: Architectural (not directly evaluable by 01D)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO governance."Provision" (id, class, statement, "sourceChapter", severity, owner, predicate, "verificationMethod", version, status, "group", "isGlobal", "traceability", "createdAt", "updatedAt")
VALUES
  ('GOV-INV-01', 'invariant', 'Publication executes; Governance verifies.', 'wp-gov-01-eng-spec §1.2', 'SEV-1', 'Office of the Chief Systems Architect', NULL, 'Architectural review', '1.0.0', 'active', 'Architectural', true, NULL, NOW(), NOW()),
  ('GOV-INV-02', 'invariant', 'Governance never mutates Publication state. No INSERT, UPDATE, or DELETE on any public.* table.', 'wp-gov-01-eng-spec §1.2', 'SEV-1', 'Office of the Chief Systems Architect', NULL, 'RLS + role grant verification', '1.0.0', 'active', 'Architectural', true, NULL, NOW(), NOW()),
  ('GOV-INV-03', 'invariant', 'Publication is the sole Article authority. No second Article entity exists in the Governance schema.', 'wp-gov-01-eng-spec §1.2', 'SEV-1', 'Office of the Chief Systems Architect', NULL, 'Schema inspection', '1.0.0', 'active', 'Architectural', true, NULL, NOW(), NOW()),
  ('GOV-INV-04', 'invariant', 'Publication is the sole Submission authority.', 'wp-gov-01-eng-spec §1.2', 'SEV-1', 'Office of the Chief Systems Architect', NULL, 'Schema inspection', '1.0.0', 'active', 'Architectural', true, NULL, NOW(), NOW()),
  ('GOV-INV-05', 'invariant', 'Publication is the sole Journal authority. No second Journal entity exists in the Governance schema.', 'wp-gov-01-eng-spec §1.2', 'SEV-1', 'Office of the Chief Systems Architect', NULL, 'Schema inspection', '1.0.0', 'active', 'Architectural', true, NULL, NOW(), NOW()),
  ('GOV-INV-06', 'invariant', 'Publication is the sole Book authority. No second Book entity exists in the Governance schema.', 'wp-gov-01-eng-spec §1.2', 'SEV-1', 'Office of the Chief Systems Architect', NULL, 'Schema inspection', '1.0.0', 'active', 'Architectural', true, NULL, NOW(), NOW()),
  ('GOV-INV-07', 'invariant', 'Governance evidence is derived exclusively from Publication outbox events.', 'wp-gov-01-eng-spec §1.2', 'SEV-1', 'Office of the Chief Systems Architect', NULL, 'Ingestion adapter verification', '1.0.0', 'active', 'Architectural', true, NULL, NOW(), NOW()),
  ('GOV-INV-08', 'invariant', 'Source evidence records are append-only and immutable once written.', 'wp-gov-01-eng-spec §1.2', 'SEV-1', 'Office of the Chief Systems Architect', NULL, 'Audit log hash chain', '1.0.0', 'active', 'Architectural', true, NULL, NOW(), NOW()),
  ('GOV-INV-09', 'invariant', 'Certification results are reproducible: identical evidence + identical rules + identical evaluator = identical certification hash.', 'wp-gov-01-eng-spec §1.2', 'SEV-1', 'Office of the Chief Systems Architect', NULL, 'Deterministic replay test', '1.0.0', 'active', 'Architectural', true, NULL, NOW(), NOW()),
  ('GOV-INV-10', 'invariant', 'Release authorization artifacts are object-bound, action-bound, evidence-bound, time-limited, and replay-resistant.', 'wp-gov-01-eng-spec §1.2', 'SEV-1', 'Office of the Chief Systems Architect', NULL, 'Gate audit verification', '1.0.0', 'active', 'Architectural', true, NULL, NOW(), NOW()),
  ('GOV-INV-11', 'invariant', 'Protected release actions (DOI minting, final publication, archival finalization) fail closed when Governance is unavailable.', 'wp-gov-01-eng-spec §1.2', 'SEV-1', 'Office of the Chief Systems Architect', NULL, 'Fail-closed test', '1.0.0', 'active', 'Architectural', true, NULL, NOW(), NOW()),
  ('GOV-INV-12', 'invariant', 'Ordinary editorial actions (submission, review, decision) fail open when Governance is unavailable.', 'wp-gov-01-eng-spec §1.2', 'SEV-2', 'Office of the Chief Systems Architect', NULL, 'Fail-open test', '1.0.0', 'active', 'Architectural', true, NULL, NOW(), NOW()),
  ('GOV-INV-13', 'invariant', 'Certified predecessor work packages (WP-01-02, WP-02-01, WP-02-02, WP-03-01, WP-16-01, WP-16-02, WP-17-01, WP-19-01, WP-20-01, WP-20-02) are not modified.', 'wp-gov-01-eng-spec §1.2', 'SEV-1', 'Office of the Chief Systems Architect', NULL, 'Git diff verification', '1.0.0', 'active', 'Architectural', true, NULL, NOW(), NOW()),
  ('GOV-INV-14', 'invariant', 'Missing evidence, evaluator failure, unavailable Governance, ambiguous evidence, or contradictory evidence MUST NEVER produce a PASS certification result.', 'wp-gov-01-eng-spec §1.2', 'SEV-1', 'Office of the Chief Systems Architect', NULL, 'Evaluator fail-closed test', '1.0.0', 'active', 'Architectural', true, NULL, NOW(), NOW()),
  ('GOV-INV-15', 'invariant', 'The existing Opus Publica website remains unchanged. Governance attaches around the Publication Plane; it does not rewrite it.', 'wp-gov-01-eng-spec §1.2', 'SEV-2', 'Office of the Chief Systems Architect', NULL, 'Code diff verification', '1.0.0', 'active', 'Architectural', true, NULL, NOW(), NOW()),
  ('GOV-INV-16', 'invariant', 'Governance never stores manuscript content, PDFs, reviewer identities beyond opaque UUIDs, author profiles, or DOI ownership records.', 'wp-gov-01-eng-spec §1.2', 'SEV-1', 'Office of the Chief Systems Architect', NULL, 'Schema inspection', '1.0.0', 'active', 'Architectural', true, NULL, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3 CERTIFICATION PROVISIONS (SUB-01, SUB-02, SUB-03)
-- Source: wp-gov-01-engineering-specification.md §3.3.3
-- Evaluation class: Evaluable by WP-GOV-01D
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO governance."Provision" (id, class, statement, "sourceChapter", severity, owner, predicate, "verificationMethod", version, status, "group", "isGlobal", "traceability", "createdAt", "updatedAt")
VALUES
  ('SUB-01', 'rule', 'A submission must have at least N ReviewSubmitted events, where N is defined by the journal-level reviewThreshold.', 'wp-gov-01-eng-spec §3.3.3', 'SEV-1', 'Governance Control Plane', 'review_count >= N', 'Graph evaluation: count REVIEW nodes with EVIDENCES edges to SUBMISSION', '1.0.0', 'active', 'Certification', false, NULL, NOW(), NOW()),
  ('SUB-02', 'rule', 'A submission must have at least one ArticleSubmitted event (SUBMISSION node exists in traceability graph).', 'wp-gov-01-eng-spec §3.3.3', 'SEV-1', 'Governance Control Plane', 'submission_exists', 'Graph evaluation: verify SUBMISSION node exists', '1.0.0', 'active', 'Certification', true, NULL, NOW(), NOW()),
  ('SUB-03', 'rule', 'A submission must have exactly one non-superseded DecisionRecorded with decision = Accept.', 'wp-gov-01-eng-spec §3.3.3', 'SEV-1', 'Governance Control Plane', 'decision_accepted', 'Graph evaluation: verify active DECISION node with Accept', '1.0.0', 'active', 'Certification', true, NULL, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- PROVISION SCOPE: reviewThreshold = 2 for all 8 RC2 journals
-- Authority: SUB-01 review threshold governance decision (verified on main)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO governance."ProvisionScope" ("provisionId", "journalId", parameters, "createdAt")
VALUES
  ('SUB-01', 'cybersec-journal', '{"reviewThreshold": 2}'::jsonb, NOW()),
  ('SUB-01', 'ecolaw-journal', '{"reviewThreshold": 2}'::jsonb, NOW()),
  ('SUB-01', 'expressions', '{"reviewThreshold": 2}'::jsonb, NOW()),
  ('SUB-01', 'global-perspectives', '{"reviewThreshold": 2}'::jsonb, NOW()),
  ('SUB-01', 'migration-matters', '{"reviewThreshold": 2}'::jsonb, NOW()),
  ('SUB-01', 'conflict-peace-studies', '{"reviewThreshold": 2}'::jsonb, NOW()),
  ('SUB-01', 'world-trade-finance-journal', '{"reviewThreshold": 2}'::jsonb, NOW()),
  ('SUB-01', 'voice-rights', '{"reviewThreshold": 2}'::jsonb, NOW())
ON CONFLICT ("provisionId", "journalId") DO UPDATE
  SET parameters = EXCLUDED.parameters,
      "createdAt" = EXCLUDED."createdAt";
