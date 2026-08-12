import { getSupabaseAdmin } from '../../lib/supabase-admin';

// Metrics
export const notificationWorkerMetrics = {
  queueDepth: 0,
  processingLatencyMs: 0,
  processingThroughput: 0,
  retryCount: 0,
  failureCount: 0,
};

const MAX_RETRIES = 3;

/**
 * Worker to process pending NotificationQueued events from the outbox.
 * Completely stateless: persists retry_count, next_retry_at, and last_error in the database.
 */
export async function processNotificationOutbox() {
  const supabase = getSupabaseAdmin();
  const startTime = Date.now();
  let processedThisRun = 0;

  try {
    // Check queue depth for metrics
    const { count } = await supabase
      .from('outbox')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
      .eq('event_type', 'NotificationQueued');
      
    notificationWorkerMetrics.queueDepth = count || 0;

    // Fetch batch of events to process
    // Only fetch events that are ready to be retried (next_retry_at is null or in the past)
    const nowIso = new Date().toISOString();
    
    // Construct query for pending events that are eligible for processing
    const { data: events, error } = await supabase
      .from('outbox')
      .select('id, payload, retry_count')
      .eq('status', 'pending')
      .eq('event_type', 'NotificationQueued')
      .or(`next_retry_at.is.null,next_retry_at.lte.${nowIso}`)
      .order('created_at', { ascending: true })
      .limit(20);

    if (error || !events || events.length === 0) return;

    for (const event of events) {
      try {
        // Atomic lock attempt: update from pending to processing
        const { data: lockData, error: lockError } = await supabase
          .from('outbox')
          .update({ status: 'processing' })
          .eq('id', event.id)
          .eq('status', 'pending')
          .select()
          .maybeSingle();

        if (lockError || !lockData) {
          continue; // Already taken by another worker instance
        }

        const resendApiKey = process.env.RESEND_API_KEY;
        if (!resendApiKey) {
          throw new Error('RESEND_API_KEY is not configured');
        }

        const payload = event.payload as any;

        // Idempotent delivery using event.id as the idempotency key
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
            'Idempotency-Key': event.id,
          },
          body: JSON.stringify({
            from: 'Opus Publica <notifications@opuspublica.com>',
            to: [payload.to],
            subject: payload.subject,
            html: payload.html,
          }),
        });

        if (!response.ok) {
          const errorData = await response.text();
          throw new Error(`Resend API error: ${errorData}`);
        }

        // Mark completed (success)
        await supabase
          .from('outbox')
          .update({ 
            status: 'completed', 
            processed_at: new Date().toISOString(),
            last_error: null
          })
          .eq('id', event.id);

        processedThisRun++;
      } catch (err: any) {
        console.error(`[Notification Worker] Failed to process outbox event ${event.id}:`, err);
        notificationWorkerMetrics.failureCount++;

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
    notificationWorkerMetrics.processingLatencyMs = endTime - startTime;
    if (notificationWorkerMetrics.processingLatencyMs > 0) {
      notificationWorkerMetrics.processingThroughput = (processedThisRun / notificationWorkerMetrics.processingLatencyMs) * 1000;
    }
  }
}

let isRunning = false;

export async function startNotificationWorker() {
  if (isRunning) return;
  isRunning = true;
  console.info('[Notification Worker] Starting continuous execution...');

  const shutdown = () => {
    console.info('[Notification Worker] Initiating graceful shutdown...');
    isRunning = false;
  };
  
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  while (isRunning) {
    await processNotificationOutbox();
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  console.info('[Notification Worker] Shutdown complete.');
}
