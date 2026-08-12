-- Migration: 20260815000004_wpgov_01c_provision_scope.sql
-- Adds Provision.isGlobal and ProvisionScope for many-to-many journal applicability

ALTER TABLE governance."Provision"
ADD COLUMN "isGlobal" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE governance."ProvisionScope" (
  "provisionId" TEXT NOT NULL,
  "journalId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProvisionScope_pkey" PRIMARY KEY ("provisionId", "journalId")
);

ALTER TABLE governance."ProvisionScope"
ADD CONSTRAINT "ProvisionScope_provisionId_fkey" 
FOREIGN KEY ("provisionId") REFERENCES governance."Provision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
