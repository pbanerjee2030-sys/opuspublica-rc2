# RC2 Privacy and Data Governance Checklist

This checklist defines the privacy and data governance requirements for the production go-live of Opus Publica RC2.

> [!CAUTION]
> **LEGAL REVIEW REQUIRED**: This document outlines technical mechanisms and operational policies. It does NOT constitute legal advice. Items marked as requiring legal review must be formally approved by legal counsel prior to processing real user data.

## 1. Data Subjects & Roles

### Author Data
- [ ] Ensure author names, affiliations, and ORCID iDs are processed lawfully under the platform's terms of service.
- [ ] Confirm public display of author metadata on published articles aligns with user consent and open access publication norms.

### Reviewer Data
- [ ] Maintain the confidentiality of peer reviewers in accordance with the journal's peer-review policy (e.g., single-blind, double-blind).
- [ ] Ensure reviewer identities are protected from unauthorized disclosure in database access and API responses.

### Editor Data
- [ ] Display editorial board information transparently, as required by DOAJ criteria.
- [ ] Ensure editorial actions (approvals, rejections) are logged securely for accountability.

## 2. External Integrations

### ORCID Data
- [ ] Validate that the OAuth integration strictly adheres to the ORCID API terms of service.
- [ ] **[LEGAL REVIEW REQUIRED]** Confirm that storing the ORCID OAuth access/refresh tokens and syncing ORCID profile data complies with data minimization principles.

## 3. Audit and Ethics Records

### Audit Records
- [ ] Ensure system audit logs (e.g., publication history, status changes) are immutable and securely stored.
- [ ] Confirm logs do not inadvertently capture sensitive plaintext passwords or excessive PII.

### Ethics Records
- [ ] Ensure cases involving retractions, expressions of concern, or authorship disputes are handled with strict confidentiality before resolution.
- [ ] **[LEGAL REVIEW REQUIRED]** Establish the data retention policy for ethics investigation records, ensuring compliance with academic norms (e.g., COPE guidelines) and privacy laws.

## 4. Lifecycle Management

### Retention
- [ ] **[LEGAL REVIEW REQUIRED]** Define explicit retention periods for submitted manuscripts (rejected vs. accepted), user accounts, and system logs.
- [ ] Confirm the technical capability to enforce these retention periods (e.g., scheduled cleanup jobs).

### Access
- [ ] Verify that Role-Based Access Control (RLS and application logic) strictly limits access to unpublished manuscripts and PII to authorized roles only.

### Deletion (Right to be Forgotten)
- [ ] **[LEGAL REVIEW REQUIRED]** Define the policy for handling user deletion requests, specifically distinguishing between deleting a user account vs. preserving the immutable scholarly record (i.e., a published author cannot delete their name from a historically published paper).

### Cross-Border Processing
- [ ] **[LEGAL REVIEW REQUIRED]** Identify the physical location of the Supabase database and external preservation storage (e.g., CLOCKSS/Portico). Confirm compliance with cross-border data transfer regulations (e.g., GDPR, CCPA) applicable to the platform's jurisdiction.
