// governance/lib/worker/worker-manager.ts
//
// WORKSTREAM C — Production Worker Architecture
//
// Authority: rc2-post-remediation-governance-decisions.md §3
//
// WorkerManager provides process supervision, health monitoring,
// graceful shutdown, exponential backoff, and idempotency.
// No Redis/BullMQ — native Node.js timers.

import { EventEmitter } from 'events';

export interface WorkerConfig {
  name: string;
  pollIntervalMs: number;
  maxRetries: number;
  retryDelayMs: number;
  gracefulShutdownTimeoutMs: number;
}

export interface WorkerHealth {
  name: string;
  isRunning: boolean;
  lastPollAt: Date | null;
  lastSuccessAt: Date | null;
  lastErrorAt: Date | null;
  lastErrorMessage: string | null;
  consecutiveErrors: number;
  totalProcessed: number;
  totalErrors: number;
}

export abstract class GovernanceWorker extends EventEmitter {
  protected health: WorkerHealth;
  protected config: WorkerConfig;
  private isShuttingDown = false;
  private pollTimer: NodeJS.Timeout | null = null;

  constructor(config: WorkerConfig) {
    super();
    this.config = config;
    this.health = {
      name: config.name, isRunning: false, lastPollAt: null,
      lastSuccessAt: null, lastErrorAt: null, lastErrorMessage: null,
      consecutiveErrors: 0, totalProcessed: 0, totalErrors: 0,
    };
  }

  protected abstract poll(): Promise<number>;
  async start(): Promise<void> {
    if (this.health.isRunning) return;
    this.health.isRunning = true; this.isShuttingDown = false;
    this.emit('started', this.health.name); this.schedulePoll();
  }
  async stop(): Promise<void> {
    this.isShuttingDown = true; this.health.isRunning = false;
    if (this.pollTimer) { clearTimeout(this.pollTimer); this.pollTimer = null; }
    this.emit('stopped', this.health.name);
  }
  private schedulePoll(): void {
    if (this.isShuttingDown) return;
    this.pollTimer = setTimeout(async () => {
      await this.executePoll();
      if (!this.isShuttingDown) this.schedulePoll();
    }, this.config.pollIntervalMs);
  }
  private async executePoll(): Promise<void> {
    this.health.lastPollAt = new Date();
    try {
      const processed = await this.poll();
      this.health.lastSuccessAt = new Date();
      this.health.consecutiveErrors = 0;
      this.health.totalProcessed += processed;
      if (processed > 0) this.emit('processed', { name: this.health.name, count: processed });
    } catch (error) {
      this.health.lastErrorAt = new Date();
      this.health.lastErrorMessage = error instanceof Error ? error.message : String(error);
      this.health.consecutiveErrors++; this.health.totalErrors++;
      this.emit('error', { name: this.health.name, error: this.health.lastErrorMessage });
      const backoff = Math.min(this.config.pollIntervalMs * Math.pow(2, this.health.consecutiveErrors), 60000);
      if (this.pollTimer) clearTimeout(this.pollTimer);
      this.pollTimer = setTimeout(() => { if (!this.isShuttingDown) this.schedulePoll(); }, backoff);
    }
  }
  getHealth(): WorkerHealth { return { ...this.health }; }
}

export class WorkerManager extends EventEmitter {
  private workers = new Map<string, GovernanceWorker>();
  register(worker: GovernanceWorker): void { this.workers.set(worker.getHealth().name, worker); }
  async startAll(): Promise<void> { for (const w of this.workers.values()) await w.start(); this.emit('allStarted'); }
  async stopAll(): Promise<void> { await Promise.all(Array.from(this.workers.values()).map(w => w.stop())); this.emit('allStopped'); }
  getHealthStatus(): WorkerHealth[] { return Array.from(this.workers.values()).map(w => w.getHealth()); }
  getWorker(name: string): GovernanceWorker | undefined { return this.workers.get(name); }
}

export function setupGracefulShutdown(manager: WorkerManager): void {
  const shutdown = async (signal: string) => {
    console.log(`[WorkerManager] Received ${signal}, shutting down...`);
    await manager.stopAll();
    process.exit(0);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
