-- WP-GOV-01E Correction: Gate Audit Log + Durable Nonce Consumption
--
-- Authority: Installment 3 Correction Directive §1 (gate_audit) + §2 (durable nonce)
--
-- Creates:
--   governance.gate_audit — durable, queryable audit record for every authorization
--   governance.nonce_store — durable single-use nonce consumption with atomic operations
--
-- Does NOT modify any certified 01A/01B/01C/01C-EXT/01D schema.

-- ─────────────────────────────────────────────────────────────────────────────
-- gate_audit: Persistent audit log for every gate authorization request/decision
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS governance.gate_audit (
    audit_id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    authorization_id        UUID NOT NULL,
    submission_id           UUID NOT NULL,
    article_id              UUID NOT NULL,
    requested_action        TEXT NOT NULL,           -- 'MINT_DOI' | 'PUBLISH' | 'ARCHIVE'
    result                  TEXT NOT NULL,            -- 'ALLOW' | 'DENY' | 'BLOCKED'
    reason                  TEXT NOT NULL,
    certification_id        TEXT,                     -- from CertificationResult
    evidence_snapshot_hash  TEXT,
    traceability_graph_hash TEXT,
    constitution_version   TEXT NOT NULL,
    nonce                   TEXT NOT NULL,
    issued_at               TIMESTAMPTZ NOT NULL,
    expires_at              TIMESTAMPTZ NOT NULL,
    authorization_version   TEXT NOT NULL,
    requester_identity      TEXT,                     -- opaque identifier of the caller
    consumed                BOOLEAN NOT NULL DEFAULT false,
    consumed_at             TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gate_audit_authorization_id ON governance.gate_audit (authorization_id);
CREATE INDEX IF NOT EXISTS idx_gate_audit_submission_id ON governance.gate_audit (submission_id);
CREATE INDEX IF NOT EXISTS idx_gate_audit_nonce ON governance.gate_audit (nonce);

-- ─────────────────────────────────────────────────────────────────────────────
-- nonce_store: Durable single-use nonce consumption
--
-- UNIQUE constraint on nonce ensures atomic first-writer-wins:
--   INSERT succeeds → first consumer wins
--   INSERT fails (conflict) → replay rejected
--
-- The authorization_id + submission_id + article_id + action binding
-- prevents cross-authorization nonce reuse.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS governance.nonce_store (
    nonce              TEXT PRIMARY KEY,              -- unique per authorization
    authorization_id   UUID NOT NULL,
    submission_id      UUID NOT NULL,
    article_id         UUID NOT NULL,
    requested_action   TEXT NOT NULL,
    consumed_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
