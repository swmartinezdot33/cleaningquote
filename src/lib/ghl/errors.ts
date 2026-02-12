/**
 * Normalized GHL API client errors.
 * Used by the centralized request client for consistent error handling and logging.
 */

export type GHLClientErrorType =
  | 'auth'
  | 'rate_limit'
  | 'server'
  | 'network'
  | 'timeout'
  | 'client'
  | 'unknown';

export interface GHLClientError {
  ok: false;
  type: GHLClientErrorType;
  status?: number;
  message: string;
  details?: unknown;
  retryable: boolean;
  requestId?: string;
}

/** Retryable HTTP statuses and error types */
const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

/**
 * Build normalized error from HTTP response status and optional body.
 */
export function fromResponse(
  status: number,
  body?: unknown,
  requestId?: string
): GHLClientError {
  let type: GHLClientErrorType = 'unknown';
  let message = `GHL API Error (${status})`;
  let details: unknown = body;

  if (status === 401 || status === 403) {
    type = 'auth';
    message =
      typeof body === 'object' && body !== null && 'message' in (body as object)
        ? String((body as { message: unknown }).message)
        : status === 401
          ? 'Unauthorized'
          : 'Forbidden';
  } else if (status === 429) {
    type = 'rate_limit';
    message = 'Rate limited. Please try again.';
  } else if (status >= 500 || status === 502 || status === 503 || status === 504) {
    type = 'server';
    message =
      typeof body === 'object' && body !== null && 'message' in (body as object)
        ? String((body as { message: unknown }).message)
        : 'Server error';
  } else if (status >= 400 && status < 500) {
    type = 'client';
    if (typeof body === 'object' && body !== null && 'message' in (body as object)) {
      message = String((body as { message: unknown }).message);
    }
  }

  const retryable = RETRYABLE_STATUSES.has(status);

  return {
    ok: false,
    type,
    status,
    message,
    details,
    retryable,
    requestId,
  };
}

/**
 * Build normalized error from a thrown Error or network failure.
 */
export function fromError(err: unknown, requestId?: string): GHLClientError {
  if (err && typeof err === 'object' && 'ok' in err && (err as GHLClientError).ok === false) {
    return { ...(err as GHLClientError), requestId };
  }

  const message = err instanceof Error ? err.message : String(err);
  const isTimeout =
    err instanceof Error &&
    (err.name === 'AbortError' || message.toLowerCase().includes('timeout') || message.toLowerCase().includes('aborted'));
  const isNetwork =
    err instanceof Error &&
    (message.toLowerCase().includes('network') ||
      message.toLowerCase().includes('fetch') ||
      message.toLowerCase().includes('econnrefused'));

  let type: GHLClientErrorType = 'unknown';
  let retryable = false;

  if (isTimeout) {
    type = 'timeout';
    retryable = true;
  } else if (isNetwork) {
    type = 'network';
    retryable = true;
  }

  return {
    ok: false,
    type,
    message,
    details: err,
    retryable,
    requestId,
  };
}

export function isRetryable(err: GHLClientError): boolean {
  return err.retryable === true;
}
