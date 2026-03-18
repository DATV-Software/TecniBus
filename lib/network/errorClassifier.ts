import { ErrorKind } from './types';

/**
 * Classifies an error into one of four categories to determine retry behavior.
 *
 * - 'network'    → retryable. Request never reached the server (no internet, DNS, timeout).
 * - 'server'     → retryable. Server returned 5xx or rate-limit (429).
 * - 'validation' → NOT retryable. Business logic / constraint violation (4xx except 429).
 * - 'auth'       → NOT retryable. Token expired / unauthorized (401, 403).
 */
export function classifyError(error: unknown): ErrorKind {
  if (!error) return 'server';

  // ── Check JavaScript Error message for network-level failures ──────────────
  if (error instanceof Error) {
    if (error.name === 'AbortError') return 'network';

    const msg = error.message.toLowerCase();
    if (
      msg.includes('network request failed') ||
      msg.includes('failed to fetch') ||
      msg.includes('fetch error') ||
      msg.includes('networkerror') ||
      msg.includes('network error') ||
      msg.includes('timeout') ||
      msg.includes('econnreset') ||
      msg.includes('enotfound') ||
      msg.includes('connection refused') ||
      msg.includes('socket hang up')
    ) {
      return 'network';
    }
  }

  // ── Check Supabase / Postgres error objects ─────────────────────────────────
  if (error && typeof error === 'object') {
    const err = error as Record<string, unknown>;
    const status = typeof err.status === 'number' ? err.status : 0;
    const code = typeof err.code === 'string' ? err.code : '';

    // Auth errors — non-retryable
    if (status === 401 || status === 403) return 'auth';

    // Postgres constraint / not-found — non-retryable
    const validationCodes = ['23505', '23503', '23514', '22P02', 'PGRST116', '42501'];
    if (validationCodes.includes(code)) return 'validation';

    // Client errors (4xx except 429) — non-retryable
    if (status >= 400 && status < 500 && status !== 429) return 'validation';

    // Rate limit + server errors — retryable
    if (status === 429 || status >= 500) return 'server';

    // HTTP 0 / unreachable — network error
    if (status === 0) return 'network';
  }

  return 'server';
}

export function isRetryable(kind: ErrorKind): boolean {
  return kind === 'network' || kind === 'server';
}
