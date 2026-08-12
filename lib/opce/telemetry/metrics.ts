/**
 * Opus Publica Composition Engine (OPCE) — Production Telemetry & Metrics
 *
 * Provides structured logging, composition execution latency counters,
 * subsystem health diagnostics, and production observability helpers.
 */

import { AdapterRegistry } from '../adapters/adapter-registry';
import { QualityCoordinator } from '../quality/coordinator';
import { RenderingCoordinator } from '../renderers/rendering-coordinator';
import { resolveStandard } from '../standards/standard-engine';

export interface OPCEMetrics {
  totalCompositions: number;
  successfulCompositions: number;
  failedCompositions: number;
  avgDurationMs: number;
  totalDurationMs: number;
}

export interface OPCEHealthStatus {
  healthy: boolean;
  version: string;
  uptimeSeconds: number;
  registeredAdapters: string[];
  registeredRenderers: string[];
  activeAnalysers: number;
  standardEngineCached: boolean;
}

/**
 * In-memory telemetry recorder for OPCE engine observability.
 */
export class OPCETelemetry {
  private static metrics: OPCEMetrics = {
    totalCompositions: 0,
    successfulCompositions: 0,
    failedCompositions: 0,
    avgDurationMs: 0,
    totalDurationMs: 0,
  };

  private static startTime = Date.now();

  /**
   * Records execution metrics for a completed composition run.
   */
  public static recordComposition(durationMs: number, success: boolean): void {
    this.metrics.totalCompositions += 1;
    if (success) {
      this.metrics.successfulCompositions += 1;
    } else {
      this.metrics.failedCompositions += 1;
    }
    this.metrics.totalDurationMs += durationMs;
    this.metrics.avgDurationMs = Math.round(
      this.metrics.totalDurationMs / this.metrics.totalCompositions
    );
  }

  /**
   * Returns copy of current engine metrics.
   */
  public static getMetrics(): OPCEMetrics {
    return { ...this.metrics };
  }

  /**
   * Performs an instant subsystem health check.
   */
  public static healthCheck(): OPCEHealthStatus {
    const defaultStandard = resolveStandard(null);
    const adapters = AdapterRegistry.getRegisteredAdapters().map((a) => a.name);
    const renderers = RenderingCoordinator.getRegisteredRenderers().map((r) => r.format);
    const analysersCount = QualityCoordinator.getRegisteredAnalysers().length;

    const healthy =
      adapters.length > 0 &&
      renderers.length > 0 &&
      analysersCount >= 5 &&
      defaultStandard.page.size.width === 210;

    return {
      healthy,
      version: '1.0.0',
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      registeredAdapters: adapters,
      registeredRenderers: renderers,
      activeAnalysers: analysersCount,
      standardEngineCached: true,
    };
  }

  /**
   * Resets telemetry metrics (primarily for testing).
   */
  public static reset(): void {
    this.metrics = {
      totalCompositions: 0,
      successfulCompositions: 0,
      failedCompositions: 0,
      avgDurationMs: 0,
      totalDurationMs: 0,
    };
  }
}
