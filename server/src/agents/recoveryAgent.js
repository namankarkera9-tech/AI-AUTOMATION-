/**
 * Recovery Agent
 * Pure agent: Classifies execution failures into specific taxonomy
 * (MISSING_FIELDS, API_FAILURE, AUTH_EXPIRED, RATE_LIMIT, TRANSIENT)
 * and determines recovery strategy: 'retry_with_backoff' vs 'escalate'.
 */
class RecoveryAgent {
  classifyAndResolve({ error, node, retryCount = 0, maxRetries = 3 }) {
    const message = (error?.message || String(error)).toLowerCase();
    const code = error?.code || '';

    let classification = 'TRANSIENT';
    let strategy = 'retry_with_backoff';
    let reason = '';

    if (code === 'AUTH_EXPIRED' || message.includes('auth expired') || message.includes('invalid_grant')) {
      classification = 'AUTH_EXPIRED';
      strategy = 'escalate'; // Auth requires operator re-authentication
      reason = 'Third-party OAuth credential has expired and cannot be auto-recovered.';
    } else if (code === 'INTEGRATION_NOT_CONNECTED' || message.includes('not connected')) {
      classification = 'API_FAILURE';
      strategy = 'escalate';
      reason = 'Integration provider is not connected in the platform settings.';
    } else if (message.includes('missing_fields') || code === 'MISSING_FIELDS') {
      classification = 'MISSING_FIELDS';
      strategy = retryCount >= 1 ? 'escalate' : 'retry_with_backoff';
      reason = 'Mandatory output payload fields were absent.';
    } else if (message.includes('rate limit') || message.includes('429') || code === 'RATE_LIMIT') {
      classification = 'RATE_LIMIT';
      strategy = retryCount >= maxRetries ? 'escalate' : 'retry_with_backoff';
      reason = 'Provider rate limit exceeded. Applying exponential backoff.';
    } else if (message.includes('timeout') || message.includes('econnreset') || message.includes('network')) {
      classification = 'TRANSIENT';
      strategy = retryCount >= maxRetries ? 'escalate' : 'retry_with_backoff';
      reason = 'Transient network disruption detected.';
    } else {
      classification = 'API_FAILURE';
      strategy = retryCount >= maxRetries ? 'escalate' : 'retry_with_backoff';
      reason = error?.message || 'General API error encountered.';
    }

    // Exponential backoff calculation: 1000ms * 2^retryCount
    const backoffMs = Math.min(1000 * Math.pow(2, retryCount), 10000);

    return {
      classification,
      strategy,
      retryCount,
      backoffMs,
      nodeId: node?.id,
      reason,
      errorDetails: error?.message || String(error),
      decidedAt: new Date().toISOString(),
    };
  }
}

module.exports = new RecoveryAgent();
