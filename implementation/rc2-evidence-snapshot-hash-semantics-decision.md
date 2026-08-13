# RC2 Evidence Snapshot Hash Semantics Decision

## 1. Authoritative Hash Definition
**Definition:** `evidenceSnapshotHash` represents **canonical evidence payloads only** (Candidate A).

**Evidence:** 
The `wp-gov-01c-ext-independent-adversarial-certification-review.md` definitively states that the hash securely "omits timestamps/random UUIDs (createdAt, updatedAt, id, lastEventId) to strictly isolate the payload snapshot." 

**Implications:**
By hashing strictly the `p.state` payloads, the digest achieves perfect payload isolation. This guarantees cross-database determinism (reproducibility) regardless of the random UUIDs generated for the `EvidenceProjection` records by the infrastructure. The provenance of these payloads is handled topologically by the `TraceabilityGraph`, not cryptographically within this specific snapshot digest.

## 2. Identifier Semantics
- **`id` & `lastEventId`:** These are infrastructure-bound database primary keys and event cursors. They are provenance metadata and must be **excluded** from the evidence digest to prevent coupling the hash to a specific database instance.
- **Event Type, `submissionId`, `journalId`:** These are semantic attributes of the payload (often embedded in `p.state` or conceptually part of the evidence structure) and are part of the evidence content digest.
- **Sorting Role:** `id` is strictly utilized as a deterministic sorting tie-breaker (via `a.id.localeCompare(b.id)`) to ensure the array of payloads is processed in an idempotent order, but the ID itself must not enter the SHA-256 stream.

## 3. Contradiction Reconciliation
**Classification: B. Implementation defect**

**Explanation:**
The architectural intent, certified by the adversarial review, was to omit infrastructure identifiers (`id`) to strictly isolate the payload. However, the author of `graph.ts` committed an implementation defect by explicitly including the ID in the digest stream (`return canonicalString(p.id) + canonicalJson(p.state);`), as corroborated by their comment (`sorted evidence_event_ids + evidence_payloads`). 

The independent reviewer defined the correct architectural constraint but missed the code-level defect. Furthermore, the frozen test suite (`01c-ext.test.ts`) failed to expose this defect because the `identical snapshot across fresh DBs` test merely computed the hash twice on the *same* database records within a single transaction, rather than generating fresh records with varying UUIDs but identical payloads.

## 4. canonicalString Requirement
Because infrastructure IDs are **NOT** part of the certified digest, `canonicalString` is conceptually **unnecessary and should not be recreated**. 
Attempting to implement `canonicalString` as a function that returns an empty string `""` would be an obfuscated hack to bypass the defect in `graph.ts`. The correct architectural resolution is to remove `canonicalString` entirely.

## 5. Exact Certification Impact
The discovery of this defect means the previously certified WP-GOV-01C-EXT code does not mathematically guarantee the payload isolation it claimed. 
**Impact:** A **partial re-certification** of WP-GOV-01C-EXT is required. 
The re-certification must authorize:
1. Patching `governance/lib/synthesis/graph.ts` to remove the `canonicalString(p.id)` inclusion.
2. Updating `tests/governance/01c-ext.test.ts` to include a strict assertion where identical payloads with *different* `id`s correctly yield the identical `evidenceSnapshotHash`.

## 6. Precise Implementation Authorization
No implementation of `crypto.ts` or `canonicalString` is authorized at this time. The recovery package is superseded by the necessity to patch `graph.ts` to align the code with the certified architectural intent. Engineering awaits explicit governance authorization to perform the WP-GOV-01C-EXT partial re-certification.
