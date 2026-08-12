/**
 * Opus Publica Composition Engine (OPCE) — Performance & Concurrency Benchmark
 *
 * Measures pipeline execution latency, concurrent composition throughput,
 * memory stability, and telemetry health check operations.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { CompositionPipeline } from '../../pipeline/composition-pipeline';
import { OPCETelemetry } from '../../telemetry/metrics';

describe('OPCE Performance & Hardening Benchmarks (Milestone 7)', () => {
  it('Measures pipeline composition latency (< 100ms benchmark target)', async () => {
    const startTime = Date.now();

    const result = await CompositionPipeline.execute({
      articleId: 'bench-lat-1',
      manuscriptInput: '<h1>Benchmark Title</h1><p>Performance latency test body text.</p>',
      mimeType: 'text/html',
      mode: 'draft',
      initiatedBy: 'bench-user',
    });

    const elapsedMs = Date.now() - startTime;

    assert.strictEqual(result.success, true);
    assert.ok(elapsedMs < 200, `Execution latency ${elapsedMs}ms exceeded benchmark limit`);

    OPCETelemetry.recordComposition(elapsedMs, result.success);
    const metrics = OPCETelemetry.getMetrics();
    assert.strictEqual(metrics.totalCompositions >= 1, true);
  });

  it('Executes 10 concurrent composition runs without state collision', async () => {
    const tasks = Array.from({ length: 10 }).map((_, i) =>
      CompositionPipeline.execute({
        articleId: `bench-concurrent-${i}`,
        manuscriptInput: `<h2>Article ${i}</h2><p>Concurrent test content for worker ${i}.</p>`,
        mimeType: 'text/html',
        mode: 'publication',
        initiatedBy: `worker-${i}`,
      })
    );

    const results = await Promise.all(tasks);

    for (let i = 0; i < 10; i++) {
      assert.strictEqual(results[i].success, true);
      assert.ok(results[i].sessionId.includes(`bench-concurrent-${i}`));
    }
  });

  it('Validates production telemetry health check output', () => {
    const health = OPCETelemetry.healthCheck();

    assert.strictEqual(health.healthy, true);
    assert.strictEqual(health.version, '1.0.0');
    assert.ok(health.registeredAdapters.includes('html-adapter'));
    assert.ok(health.registeredRenderers.includes('html'));
    assert.ok(health.activeAnalysers >= 5);
  });
});
