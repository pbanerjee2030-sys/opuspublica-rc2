# RC2 SUB-01 Review Threshold Governance Decision

## 1. Decision ID
**GOV-DECISION-RC2-001**

## 2. Date
2026-08-14

## 3. Scope
All Opus Publica RC2 journals currently under governance scope.

## 4. Provision
`SUB-01` (Mandatory Peer Review)

## 5. Parameter
`ProvisionScope.parameters.reviewThreshold`

## 6. Authorized Value
`reviewThreshold = 2`

## 7. Rationale
The Installment 3 authority reconciliation identified that while the constitutional mechanism for dynamic thresholding is defined, a formalized parameter value was not established. To proceed with the end-to-end RC2 operational integration, an affirmative governance determination is required. A value of 2 ensures a minimum standard of independent peer review verification without imposing unreasonable processing delays for the Release Gate validation.

## 8. Relationship to WP-GOV-01C-EXT
The authorized `reviewThreshold` value must be propagated through the existing certified WP-GOV-01C-EXT mechanism. It binds to the `ProvisionScope.parameters` schema defined and hashed during the Evidence Synthesis process.

## 9. Relationship to WP-GOV-01D
The WP-GOV-01D certification evaluator must consume this authorized `reviewThreshold` value from the synthesized provision graph parameters. It dictates the minimum number of independent `ReviewSubmitted` evidence records required to satisfy `SUB-01` under the existing frozen evaluation semantics.

## 10. Relationship to WP-GOV-01E

This parameter directly affects whether WP-GOV-01D can produce a `CERTIFIED`
result for `SUB-01` or a non-certifying result under the frozen evaluation
semantics. WP-GOV-01E then applies its independent fail-closed authorization
rules to determine whether an `ALLOW`, `DENY`, or `BLOCKED` authorization
artifact may be issued for the requested publication action.

## 11. Runtime Implications

- Submissions with fewer than 2 valid `ReviewSubmitted` events will not
  satisfy `SUB-01` and will produce the applicable non-certifying WP-GOV-01D
  result according to the frozen evaluation semantics.
- A missing or malformed `reviewThreshold` MUST NOT fall back to 2. It must
  remain subject to the certified WP-GOV-01D handling for invalid evaluation
  input, including `NOT_EVALUABLE` where applicable.
- The authorized value `2` applies only when a valid journal-scoped
  `reviewThreshold` has been explicitly provisioned.
- WP-GOV-01E interprets non-certifying or otherwise ineligible certification
  results according to its fail-closed authorization contract and MUST NOT
  convert them into a misleading `CERTIFIED` state.

## 12. Security Implications
This decision securely hardens the authorization mechanism by enforcing a strict standard for evidentiary proof prior to irreversible release actions (e.g., Crossref DOI deposit). It provides an explicit baseline that enforces the authorized minimum review requirement.

## 13. Future Journal-Specific Override Mechanism
The `reviewThreshold = 2` parameter serves as the active, explicit standard for all current RC2 journals. Any future requirement to specify differing journal-specific values (e.g., `reviewThreshold = 3` for a specific journal) requires a separately approved governance decision to modify the parameters.

## 14. Explicit File and State Boundaries
**This decision does NOT modify WP-GOV-01A, WP-GOV-01B, WP-GOV-01C, or WP-GOV-01C-EXT.** It solely provides the missing configuration authority required for system seed and evaluator execution, establishing parameters expected by the already-certified implementations.

## 15. Governance Authority and Approval Status
**Authority:** RC2 ENGINEERING OPERATING CONTROL
**Status:** APPROVED FOR RC2 INTEGRATION
