# Opus Publica Composition Engine (OPCE)

## Architectural Overview

The **Opus Publica Composition Engine (OPCE)** is an internal native subsystem of the Opus Publica scholarly publishing platform. It transforms manuscript inputs (HTML, TipTap rich text, raw markdown) into deterministic, publication-ready HTML5 documents and archival `PublicationPackage` structures.

OPCE is designed to maintain publication integrity, determinism, and maintainability for the next decade.

---

## Architecture & Subsystem Pipeline

$$\text{Adapter Ingestion} \longrightarrow \text{Standard Resolution} \longrightarrow \text{Quality Analysis} \longrightarrow \text{Rendering} \longrightarrow \text{Publication Package}$$

1. **Model Domain (`lib/opce/model/`)**: Canonical JSON AST (`OpusDocument`) representing manuscript headings, paragraphs, lists, tables, figures, equations, blockquotes, codeblocks, citations, and footnotes.
2. **Standard Engine (`lib/opce/standards/`)**: Resolves platform house default styles (`opus-publica-default.json`) and publisher policies (`opus-publica-default-policy.json`) with deep-merged per-journal style overrides and SHA-256 style checksum calculation.
3. **Adapter Registry (`lib/opce/adapters/`)**: Manuscript format ingestion abstraction mapping MIME types (e.g. `text/html`, `application/xhtml+xml`) into canonical `OpusDocument` AST nodes with DOMPurify sanitization.
4. **Quality Engine (`lib/opce/quality/`)**: Layered 3-phase quality diagnostic architecture (Phase 1: Metadata, References, Accessibility; Phase 2: Publisher Policy Compliance; Phase 3: Layout) computing deterministic quality scores ($0 \text{--} 100$).
5. **Rendering Engine (`lib/opce/renderers/`)**: Format-based renderer registry producing standalone, XSS-safe HTML5 publication output strings (`HTMLRenderer`).
6. **Package Builder (`lib/opce/package/`)**: Constructs immutable, frozen `PublicationPackage` archival objects with SHA-256 rendered output checksums and execution environment metadata.
7. **Composition Pipeline (`lib/opce/pipeline/`)**: Orchestrates end-to-end stage execution, tracking `CompositionSession` states and fault isolation.
8. **Telemetry & Observability (`lib/opce/telemetry/`)**: In-memory telemetry recorder and instant system health check diagnostic runner (`OPCETelemetry.healthCheck()`).

---

## Module DAG Dependency Rules

To prevent circular dependencies and preserve long-term maintainability, imports within `lib/opce` strictly adhere to the following downward DAG levels:

- **Level 0**: `lib/opce/model/types.ts` (0 internal imports)
- **Level 1**: `lib/opce/standards/`, `lib/opce/adapters/`
- **Level 2**: `lib/opce/quality/` (imports Level 0 & 1)
- **Level 3**: `lib/opce/renderers/` (imports Level 0 & 1)
- **Level 4**: `lib/opce/package/`, `lib/opce/pipeline/` (imports Level 0, 1, 2 & 3)
- **Level 5**: `lib/opce/telemetry/`
- **Root Facade**: `lib/opce/index.ts` (public API export facade)

---

## Public API Surface Area

```typescript
import { compose, analyse } from '@/lib/opce';

// Execute full composition pipeline
const result = await compose(articleId, {
  mode: 'draft', // 'draft' | 'publication'
  initiatedBy: 'editor-id',
});

// Run quality diagnostics only
const report = await analyse(articleId);
```

---

## Telemetry & Health Checks

```typescript
import { OPCETelemetry } from '@/lib/opce/telemetry/metrics';

// Check system health
const health = OPCETelemetry.healthCheck();
// Returns: { healthy: true, version: '1.0.0', registeredAdapters: [...], registeredRenderers: [...] }

// Inspect composition performance metrics
const metrics = OPCETelemetry.getMetrics();
// Returns: { totalCompositions: N, avgDurationMs: X, successfulCompositions: Y }
```

---

## Production Release Checklist

- [x] Milestone 0 (Contract Freeze): All TypeScript interfaces JSDoc documented & frozen.
- [x] Milestone 1 (Foundation Data): House style, default publisher policy, and 5 golden fixtures verified.
- [x] Milestone 2 (Adapter & Standard Resolution): HTMLAdapter & StandardEngine implemented with caching and checksums.
- [x] Milestone 3 (Quality Analysis): 5 analysers across 3 execution phases operating with fault isolation.
- [x] Milestone 4 (Rendering): HTMLRenderer producing 100% deterministic HTML output.
- [x] Milestone 5 (Package & Pipeline): CompositionPipeline orchestrator & immutable PublicationPackage builder verified.
- [x] Milestone 6 (Dashboard Integration): CompositionWorkspace, QualityReportCard, PreviewFrame, PackageViewer, SessionHistory, and `/api/opce/compose` integrated into editorial workspace.
- [x] Milestone 7 (Production Hardening): Golden document regression suite, performance benchmarks, telemetry engine, and documentation complete.
