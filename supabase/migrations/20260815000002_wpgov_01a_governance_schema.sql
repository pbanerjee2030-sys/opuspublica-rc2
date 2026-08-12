-- WP-GOV-01A Governance Schema Foundation

-- 1. Create Schema and Ownership
-- In a Supabase environment, the postgres role is the primary owner and superuser for the managed DB.
CREATE SCHEMA IF NOT EXISTS governance;
ALTER SCHEMA governance OWNER TO postgres;

-- 2. Create Roles (Hardened)
-- These are service identity roles. They MUST be NOLOGIN to prevent interactive or external connection access.
-- No passwords or login credentials are required. They are assumed by trusted server-side services (e.g. Workers, API).
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'governance_app_role') THEN
        CREATE ROLE governance_app_role NOLOGIN;
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'governance_ingest_role') THEN
        CREATE ROLE governance_ingest_role NOLOGIN;
    END IF;
END
$$;

-- 3. Revoke Public Access to ensure absolute isolation
REVOKE ALL ON SCHEMA governance FROM PUBLIC;

-- Grant usage to our dedicated roles
GRANT USAGE ON SCHEMA governance TO governance_app_role;
GRANT USAGE ON SCHEMA governance TO governance_ingest_role;

-- 4. Default Privileges
-- Future tables created by postgres in governance schema should be accessible by our application role.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA governance
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO governance_app_role;
    


-- 5. Core Tables - Complete DDL implementation for Prisma models
-- All primary keys are strings using either random UUIDs, CUIDs, or stable identifiers.
-- No PostgreSQL SEQUENCEs (SERIAL, BIGSERIAL) are utilized, avoiding sequence privilege complexities.

-- ─────────────────────────────────────────────────────────────────────────────
-- CONSTITUTIONAL PROVISIONS (the MRC — Machine-Readable Constitution)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE governance."Provision" (
    "id" TEXT NOT NULL,
    "class" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "sourceChapter" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'SEV-2',
    "owner" TEXT NOT NULL,
    "predicate" TEXT,
    "verificationMethod" TEXT,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "status" TEXT NOT NULL DEFAULT 'active',
    "group" TEXT,
    "traceability" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Provision_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Provision_class_idx" ON governance."Provision"("class");
CREATE INDEX "Provision_severity_idx" ON governance."Provision"("severity");
CREATE INDEX "Provision_status_idx" ON governance."Provision"("status");

-- ─────────────────────────────────────────────────────────────────────────────
-- SLOs / SLIs / SLAs
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE governance."Slo" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sliFormula" TEXT NOT NULL,
    "target" DOUBLE PRECISION NOT NULL,
    "window" TEXT NOT NULL,
    "currentValue" DOUBLE PRECISION NOT NULL DEFAULT 0.999,
    "healthState" TEXT NOT NULL DEFAULT 'healthy',
    "budgetTotal" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "budgetConsumed" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "budgetRemaining" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "burnRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "owner" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Slo_pkey" PRIMARY KEY ("id")
);

CREATE TABLE governance."Sla" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "counterparty" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "window" TEXT NOT NULL,
    "gating" BOOLEAN NOT NULL DEFAULT false,
    "lastBreachedAt" TIMESTAMP(3),

    CONSTRAINT "Sla_pkey" PRIMARY KEY ("id")
);

-- ─────────────────────────────────────────────────────────────────────────────
-- CERTIFICATION (CCE — Continuous Certification Engine)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE governance."CertificationCriterion" (
    "id" TEXT NOT NULL,
    "provisionId" TEXT NOT NULL,
    "passCriterion" TEXT NOT NULL,
    "failCriterion" TEXT NOT NULL,
    "verificationMethod" TEXT NOT NULL,
    "gating" TEXT NOT NULL DEFAULT 'GATE',
    "status" TEXT NOT NULL DEFAULT 'active',
    "lastResult" TEXT NOT NULL DEFAULT 'PASS',
    "lastEvaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CertificationCriterion_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CertificationCriterion_provisionId_idx" ON governance."CertificationCriterion"("provisionId");
CREATE INDEX "CertificationCriterion_gating_idx" ON governance."CertificationCriterion"("gating");

CREATE TABLE governance."CertificationResult" (
    "id" UUID NOT NULL,
    "submissionId" UUID NOT NULL,
    "constitutionVersion" TEXT NOT NULL,
    "provisionVersions" JSONB NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "evaluatorVersion" TEXT NOT NULL,
    "evidenceSnapshot" JSONB NOT NULL,
    "traceabilityGraphHash" TEXT NOT NULL,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "result" TEXT NOT NULL,
    "findings" JSONB NOT NULL,
    "certificationHash" TEXT NOT NULL,

    CONSTRAINT "CertificationResult_pkey" PRIMARY KEY ("id")
);

-- ─────────────────────────────────────────────────────────────────────────────
-- RELEASES & GATE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE governance."Release" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "gitSha" TEXT NOT NULL,
    "gateState" TEXT NOT NULL DEFAULT 'pending',
    "deploymentState" TEXT NOT NULL DEFAULT 'not_authorized',
    "criteriaTotal" INTEGER NOT NULL DEFAULT 612,
    "criteriaPassed" INTEGER NOT NULL DEFAULT 611,
    "criteriaFailed" INTEGER NOT NULL DEFAULT 0,
    "criteriaNa" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deployedAt" TIMESTAMP(3),

    CONSTRAINT "Release_pkey" PRIMARY KEY ("id")
);

CREATE TABLE governance."Signoff" (
    "id" TEXT NOT NULL,
    "releaseId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "justification" TEXT NOT NULL,
    "signedBy" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Signoff_pkey" PRIMARY KEY ("id")
);
ALTER TABLE governance."Signoff" ADD CONSTRAINT "Signoff_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES governance."Release"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- TRACEABILITY GRAPH (ATG)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE governance."TraceabilityNode" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "metadata" TEXT,

    CONSTRAINT "TraceabilityNode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE governance."TraceabilityEdge" (
    "id" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,

    CONSTRAINT "TraceabilityEdge_pkey" PRIMARY KEY ("id")
);

CREATE TABLE governance."IntegrityRuleResult" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "passed" BOOLEAN NOT NULL DEFAULT true,
    "violations" INTEGER NOT NULL DEFAULT 0,
    "lastChecked" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntegrityRuleResult_pkey" PRIMARY KEY ("id")
);

-- ─────────────────────────────────────────────────────────────────────────────
-- SELF-AUDIT (SAP)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE governance."AuditFinding" (
    "id" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "description" TEXT NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "ticket" TEXT,

    CONSTRAINT "AuditFinding_pkey" PRIMARY KEY ("id")
);

-- ─────────────────────────────────────────────────────────────────────────────
-- AMENDMENTS (Evolution Governance)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE governance."Amendment" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "provisionId" TEXT,
    "amendmentType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'proposed',
    "sponsor" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "isInvariant" BOOLEAN NOT NULL DEFAULT false,
    "isEmergency" BOOLEAN NOT NULL DEFAULT false,
    "votesFor" INTEGER NOT NULL DEFAULT 0,
    "votesAgainst" INTEGER NOT NULL DEFAULT 0,
    "totalVoters" INTEGER NOT NULL DEFAULT 10,
    "quorumRequired" DOUBLE PRECISION NOT NULL DEFAULT 0.667,
    "passThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "discussionPeriodDays" INTEGER NOT NULL DEFAULT 14,
    "proposedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "certifiedAt" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3),

    CONSTRAINT "Amendment_pkey" PRIMARY KEY ("id")
);

-- ─────────────────────────────────────────────────────────────────────────────
-- OPERATIONAL GOVERNANCE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE governance."OperationalRole" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "authority" TEXT NOT NULL,
    "boundaries" TEXT NOT NULL,
    "onCall" TEXT NOT NULL,
    "icon" TEXT,

    CONSTRAINT "OperationalRole_pkey" PRIMARY KEY ("id")
);

CREATE TABLE governance."Runbook" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "steps" TEXT NOT NULL,
    "escalation" TEXT NOT NULL,
    "lastReviewed" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Runbook_pkey" PRIMARY KEY ("id")
);

CREATE TABLE governance."GovernanceDoc" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "docType" TEXT NOT NULL,
    "volume" TEXT NOT NULL,
    "pages" INTEGER NOT NULL,
    "issuedOn" TIMESTAMP(3) NOT NULL,
    "authority" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,

    CONSTRAINT "GovernanceDoc_pkey" PRIMARY KEY ("id")
);

CREATE TABLE governance."RoadmapPhase" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "exitCriteria" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "order" INTEGER NOT NULL,

    CONSTRAINT "RoadmapPhase_pkey" PRIMARY KEY ("id")
);

-- ─────────────────────────────────────────────────────────────────────────────
-- EXTERNAL / GENERAL
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE governance."ContactMessage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE governance."Office" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "hours" TEXT NOT NULL,
    "email" TEXT NOT NULL,

    CONSTRAINT "Office_pkey" PRIMARY KEY ("id")
);

-- ─────────────────────────────────────────────────────────────────────────────
-- RC2 ARCHITECTURE COMPONENTS & REGO
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE governance."Component" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "pillar" TEXT NOT NULL,
    "responsibilities" TEXT NOT NULL,
    "inputs" TEXT NOT NULL,
    "outputs" TEXT NOT NULL,
    "dependencies" TEXT NOT NULL,
    "interfaces" TEXT NOT NULL,
    "deployment" TEXT NOT NULL,
    "failureModes" TEXT NOT NULL,
    "runtimeVerification" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "Component_pkey" PRIMARY KEY ("id")
);

CREATE TABLE governance."RegoPattern" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "assertion" TEXT NOT NULL,
    "regoTemplate" TEXT NOT NULL,
    "whenToUse" TEXT NOT NULL,
    "workedExamples" TEXT NOT NULL,

    CONSTRAINT "RegoPattern_pkey" PRIMARY KEY ("id")
);

CREATE TABLE governance."DataFlow" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "steps" TEXT NOT NULL,
    "cadence" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "DataFlow_pkey" PRIMARY KEY ("id")
);

CREATE TABLE governance."Adr" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'accepted',
    "alternatives" TEXT NOT NULL,
    "tradeOffs" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "Adr_pkey" PRIMARY KEY ("id")
);

CREATE TABLE governance."Threshold" (
    "id" TEXT NOT NULL,
    "budgetClass" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "p50" TEXT,
    "p95" TEXT,
    "p99" TEXT,
    "hardLimit" TEXT NOT NULL,
    "softWarning" TEXT,
    "gating" TEXT NOT NULL DEFAULT 'GATE',
    "owner" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "Threshold_pkey" PRIMARY KEY ("id")
);

-- ─────────────────────────────────────────────────────────────────────────────
-- EVENT RECEIPT & INGESTION (WP-GOV-01B Foundation)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE governance."IngestionCursor" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "lastEventId" UUID,
    "lastProcessedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IngestionCursor_pkey" PRIMARY KEY ("id")
);

CREATE TABLE governance."EventReceipt" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "eventType" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "nextRetryAt" TIMESTAMP(3),
    "reconciliationMetadata" JSONB,

    CONSTRAINT "EventReceipt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EventReceipt_eventId_key" ON governance."EventReceipt"("eventId");

CREATE TABLE governance."EvidenceProjection" (
    "id" UUID NOT NULL,
    "entityType" TEXT NOT NULL,
    "state" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "lastEventId" UUID NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvidenceProjection_pkey" PRIMARY KEY ("id")
);

-- 6. Grant Specific Privileges to Ingest Role (Principle of Least Privilege)
-- The governance_ingest_role is strictly for ingesting Publication events into the Governance evidence boundary.
-- It requires INSERT/UPDATE capabilities for ingestion cursors and event receipts.
-- It does NOT need DELETE privileges (EventReceipt is an append/update log, Cursors are updated).
-- It does NOT need broad application table access.

GRANT SELECT, INSERT ON governance."EventReceipt" TO governance_ingest_role;
GRANT UPDATE ("status", "retryCount", "error", "nextRetryAt", "reconciliationMetadata") ON governance."EventReceipt" TO governance_ingest_role;
GRANT SELECT, INSERT, UPDATE ON governance."IngestionCursor" TO governance_ingest_role;
GRANT SELECT, INSERT, UPDATE ON governance."EvidenceProjection" TO governance_ingest_role;

-- 7. Ensure NO Publication Access is Granted
-- governance_app_role and governance_ingest_role operate entirely within the `governance` schema.
-- Any interactions with the Publication boundary occur strictly through the `public.governance_evidence_resolver` RPC.
