import { getSupabaseAdmin } from '../../lib/supabase-admin';

// MOD-005: Observability metrics
export const auditWorkerMetrics = {
  queueDepth: 0,
  processingLatencyMs: 0,
  processingThroughput: 0,
  retryCount: 0,
  failureCount: 0,
  hashVerificationFailures: 0
};

// RC-002: Transient Retry Strategy State
const MAX_RETRIES = 3;
const retryState = new Map<string, { count: number, nextAttemptAt: number }>();

/**
 * Worker to process pending AuditRecorded events from the outbox
 * using database-native advisory locks for cryptographic safety (MOD-001)
 */
export async function processAuditOutbox() {
  const supabase = getSupabaseAdmin();
  const startTime = Date.now();
  let processedThisRun = 0;

  try {
    // Check queue depth for metrics
    const { count } = await supabase
      .from('outbox')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
      .eq('event_type', 'AuditRecorded');
      
    auditWorkerMetrics.queueDepth = count || 0;

    // Fetch batch of events to process
    const { data: events, error } = await supabase
      .from('outbox')
      .select('id')
      .eq('status', 'pending')
      .eq('event_type', 'AuditRecorded')
      .order('created_at', { ascending: true })
      .limit(50);

    if (error || !events || events.length === 0) return;

    for (const event of events) {
      const now = Date.now();
      const retryInfo = retryState.get(event.id);
      
      // RC-002: Defer execution if backoff period hasn't elapsed
      if (retryInfo && retryInfo.nextAttemptAt > now) {
        continue;
      }

      try {
        // Execute the RPC which handles locking, hashing, ensuring partition, inserting, and marking complete
        // This guarantees a single canonical chain (MOD-001) and handles dynamic partitions (MOD-002)
        const { data: success, error: rpcError } = await supabase.rpc('process_single_audit_event', {
          p_outbox_id: event.id
        });

        if (rpcError) throw rpcError;
        
        if (success) {
          processedThisRun++;
          retryState.delete(event.id); // Clear retry state on success
        } else {
          // Event was likely processed by another concurrent worker instance
          auditWorkerMetrics.retryCount++;
        }
      } catch (err: any) {
        console.error(`[Audit Worker] Failed to process outbox event ${event.id}:`, err);
        auditWorkerMetrics.failureCount++;
        
        // Log hash failures distinctly if related to cryptographic mismatch
        if (err.message?.includes('hash') || err.message?.includes('crypto')) {
            auditWorkerMetrics.hashVerificationFailures++;
        }

        // RC-002: Increment retry counter and exponential backoff
        const attempts = (retryInfo?.count || 0) + 1;
        
        if (attempts >= MAX_RETRIES) {
          // After N retries, mark 'failed'
          await supabase
            .from('outbox')
            .update({ status: 'failed', processed_at: new Date().toISOString() })
            .eq('id', event.id);
          retryState.delete(event.id);
        } else {
          // Exponential backoff: 2^attempts seconds (e.g., 2s, 4s, 8s)
          const backoffMs = Math.pow(2, attempts) * 1000;
          retryState.set(event.id, { 
            count: attempts, 
            nextAttemptAt: now + backoffMs 
          });
        }
      }
    }
  } finally {
    // Update latency and throughput metrics
    const endTime = Date.now();
    auditWorkerMetrics.processingLatencyMs = endTime - startTime;
    if (auditWorkerMetrics.processingLatencyMs > 0) {
      auditWorkerMetrics.processingThroughput = (processedThisRun / auditWorkerMetrics.processingLatencyMs) * 1000;
    }
  }
}

// RC-003: Worker Execution Strategy
let isRunning = false;

export async function startWorker() {
  if (isRunning) return;
  isRunning = true;
  console.info('[Audit Worker] Starting continuous execution...');

  // Graceful shutdown mechanism
  const shutdown = () => {
    console.info('[Audit Worker] Initiating graceful shutdown...');
    isRunning = false;
  };
  
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Polling loop
  while (isRunning) {
    await processAuditOutbox();
    
    // Avoid tight loop when idle, poll every 5 seconds
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  console.info('[Audit Worker] Shutdown complete.');
}
