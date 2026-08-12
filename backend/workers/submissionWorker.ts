import { getSupabaseAdmin } from '../../lib/supabase-admin';

// Metrics
export const submissionWorkerMetrics = {
  queueDepth: 0,
  processingLatencyMs: 0,
  processingThroughput: 0,
  retryCount: 0,
  failureCount: 0,
};

const MAX_RETRIES = 3;

/**
 * Worker to process pending ArticleSubmitted events from the outbox.
 * Completely stateless: persists retry_count, next_retry_at, and last_error in the database.
 */
export async function processSubmissionOutbox() {
  const supabase = getSupabaseAdmin();
  const startTime = Date.now();
  let processedThisRun = 0;

  try {
    // Check queue depth for metrics
    const { count } = await supabase
      .from('outbox')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
      .eq('event_type', 'ArticleSubmitted');
      
    submissionWorkerMetrics.queueDepth = count || 0;

    // Fetch batch of events to process
    // Only fetch events that are ready to be retried (next_retry_at is null or in the past)
    const nowIso = new Date().toISOString();
    
    // Construct query for pending events that are eligible for processing
    const { data: events, error } = await supabase
      .from('outbox')
      .select('id, payload, retry_count')
      .eq('status', 'pending')
      .eq('event_type', 'ArticleSubmitted')
      .or(`next_retry_at.is.null,next_retry_at.lte.${nowIso}`)
      .order('created_at', { ascending: true })
      .limit(20);

    if (error || !events || events.length === 0) return;

    for (const event of events) {
      try {
        // Atomic RPC call for submission processing
        const { data: rpcData, error: rpcError } = await supabase.rpc('process_article_submission', {
          p_outbox_id: event.id
        });

        if (rpcError) {
          throw rpcError;
        }

        if (!rpcData) {
          // RPC returned false, meaning event was likely processed by another worker
          continue;
        }

        processedThisRun++;
      } catch (err: any) {
        console.error(`[Submission Worker] Failed to process outbox event ${event.id}:`, err);
        submissionWorkerMetrics.failureCount++;

        // Increment persistent retry counter and exponential backoff
        const attempts = (event.retry_count || 0) + 1;
        const errorMessage = err.message || 'Unknown error';
        
        if (attempts >= MAX_RETRIES) {
          // After N retries, mark 'failed' (dead-letter handling via status 'failed')
          await supabase
            .from('outbox')
            .update({ 
              status: 'failed', 
              processed_at: new Date().toISOString(),
              retry_count: attempts,
              last_error: errorMessage
            })
            .eq('id', event.id);
        } else {
          // Exponential backoff: 2^attempts seconds (e.g., 2s, 4s, 8s)
          const backoffMs = Math.pow(2, attempts) * 1000;
          const nextRetryAt = new Date(Date.now() + backoffMs).toISOString();

          // Revert to pending for retry and save persistent metadata
          await supabase
            .from('outbox')
            .update({ 
              status: 'pending',
              retry_count: attempts,
              next_retry_at: nextRetryAt,
              last_error: errorMessage
            })
            .eq('id', event.id);
        }
      }
    }
  } finally {
    // Update latency and throughput metrics
    const endTime = Date.now();
    submissionWorkerMetrics.processingLatencyMs = endTime - startTime;
    if (submissionWorkerMetrics.processingLatencyMs > 0) {
      submissionWorkerMetrics.processingThroughput = (processedThisRun / submissionWorkerMetrics.processingLatencyMs) * 1000;
    }
  }
}

let isRunning = false;

export async function startSubmissionWorker() {
  if (isRunning) return;
  isRunning = true;
  console.info('[Submission Worker] Starting continuous execution...');

  const shutdown = () => {
    console.info('[Submission Worker] Initiating graceful shutdown...');
    isRunning = false;
  };
  
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  while (isRunning) {
    await processSubmissionOutbox();
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  console.info('[Submission Worker] Shutdown complete.');
}
