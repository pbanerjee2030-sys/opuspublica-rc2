# WP-GOV-01C Provision Applicability Decision Record

## 1. Architecture Question
How is provision applicability (scope) structured in the Governance schema, how are global vs. scoped provisions represented unambiguously, and how should the Synthesis Engine (WP-GOV-01C) query this relationship for a given submission?

## 2. Source Evidence
- **WP-GOV-01 Engineering Specification (Line 464)**: "When a `SUBMISSION` node is created... `REQUIRES` edges are generated to all provisions applicable to the target journal."
- **WP-GOV-01 Engineering Specification (Line 191)**: "At least N `ReviewSubmitted` events (N defined by journal-level constitutional provisions)..."
- **WP-GOV-01 Engineering Specification (Line 50)**: Defines core global architectural invariants (e.g., `GOV-INV-01`), proving the existence of global rules.
- **`governance/prisma/schema.prisma`**: The `Provision` model lacks any `journalId` or relational mapping.

## 3. Cardinality Decision
**Decision:** Option D — Combination of global + scoped provisions (many-to-many for scoped).
**Rationale:** The Opus Publica platform requires both system-wide universal invariants (Global) and journal-specific rules (Scoped). A single provision might apply to multiple specific journals (many-to-many) without being universal. This is the smallest model that satisfies the specification without imposing 1:1 constraints that would force provision duplication.

## 4. Canonical Scope Entity
**Decision:** `journal` (identified by `journal_id`).
**Rationale:** The specification explicitly uses the term "journal-level constitutional provisions". The `ArticleSubmitted` evidence payload natively includes `journalId`. No new entity is required.

## 5. Recommended Schema Model
**Decision:** Option B (Junction Table) combined with an explicit global flag.
- Add `isGlobal Boolean @default(false)` to `governance.Provision`.
- Create `governance.ProvisionScope` junction model:
  ```prisma
  model ProvisionScope {
    provisionId String
    journalId   String
    createdAt   DateTime @default(now())

    @@id([provisionId, journalId])
    @@schema("governance")
  }
  ```
**Evaluation:**
- **Cardinality**: Supports many-to-many seamlessly.
- **Provenance / Versioning**: Scope changes are distinct and trackable.
- **Deterministic Synthesis**: Straightforward relational join guarantees consistency.
- **Query Simplicity**: `WHERE isGlobal = true OR provisionId IN (SELECT provisionId FROM ProvisionScope WHERE journalId = ?)`
- **Future Extensibility**: High (can add `venueId` or `bookId` to the junction later).
- **Security / Integrity**: Strictly isolates scope rules inside the `governance` schema without coupling to `public.journals`.

## 6. Global-Provision Semantics
**Decision:** Global applicability is represented unambiguously by the `isGlobal` boolean flag on the `Provision` model being `true`.
**Rationale:** This explicitly avoids NULL semantics (e.g., where a `NULL` journal ID implies "applies to all"). If `isGlobal` is true, any records in `ProvisionScope` for that provision are ignored.

## 7. Versioning
- **Scope changes:** Changing a provision's scope (adding/removing a journal, or toggling `isGlobal`) constitutes a material change to the constitutional rules for that journal. This **MUST** bump the `Provision.version`.
- **Historical synthesis:** Graph generation depends on the active provisions at the time of synthesis. The topological hash acts as an immutable snapshot. Changing provision scopes does not mutate historical certification states.

## 8. Synthesis Query Contract
**Given:** `submissionId` and authoritative `journalId` context (extracted from the `EvidenceProjection` state).
**Return:** The set of applicable provisions matching:
- `status == 'active'` AND
- (`isGlobal == true` OR `ProvisionScope.journalId == context.journalId`)
**Ordering:** Deterministically sorted by `Provision.id ASC`.

**Behavior Edge Cases:**
- *No provisions apply:* Valid state. Returns empty set. `REQUIRES` edges are omitted.
- *Multiple scopes apply:* Resolved implicitly by the N:M schema design.
- *Global and journal-specific overlap:* `isGlobal == true` supersedes any junction records.
- *Provision becomes inactive:* It will fail the `status == 'active'` filter. Next synthesis run drops the `REQUIRES` edge.
- *Scope changes after synthesis:* Next synthesis run re-evaluates the query, adding/dropping edges, which mutates the graph hash deterministically.
- *Journal has changed:* Not possible. The `journalId` is immutably bound in the `ArticleSubmitted` evidence payload at ingestion.

## 9. Interim Implementation Rule
Until the above schema model is authorized, implemented, and certified:
1. Do NOT generate `REQUIRES` edges.
2. Do NOT generate `PROVISION` nodes solely for those edges.
3. Do NOT treat all active provisions as globally applicable.

## 10. Effect on WP-GOV-01C
**Decision:** A. 01C can proceed with REQUIRES disabled pending the scope model.
**Rationale:** The Synthesis Engine can still fulfill its primary duty: linking `SUBMISSION`, `REVIEW`, and `DECISION` nodes via `EVIDENCES`, `DECIDES`, and `SUPERSEDES` edges. Defect 1 (Deterministic Edges) and Defect 3 (Incomplete Topology) can be implemented. Generating `REQUIRES` edges is deferred to a follow-up patch once the schema is ready.

## 11. Migration Implications
- Requires a new Supabase migration (`202608..._wpgov_provision_scope.sql`).
- Existing active provisions must be explicitly assigned `isGlobal = true` or mapped to their respective journals during the migration to avoid breaking existing rules.

## 12. Exact Authorization Required Before Implementation
RC2 Engineering Governance must authorize the schema modifications (the `isGlobal` flag and the `ProvisionScope` table) before the `REQUIRES` logic in `synthesis-engine.ts` can be finalized.
