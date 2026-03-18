import { ActionType } from './types';

const BASE_DELAY_MS = 1_000;
const MAX_DELAY_MS = 60_000;

/**
 * Calculates the next retry delay using exponential backoff with random jitter.
 *
 * Formula: min(base * 2^attempt + rand(0..1000), maxDelay)
 *
 * Delays by attempt:
 *   0 →  ~1s   1 →  ~2s   2 →  ~4s
 *   3 →  ~8s   4 → ~16s   5 → ~32s   6+ → 60s
 */
export function getNextRetryDelay(retryCount: number): number {
  const exponential = BASE_DELAY_MS * Math.pow(2, retryCount);
  const jitter = Math.random() * 1_000;
  return Math.min(exponential + jitter, MAX_DELAY_MS);
}

/**
 * Returns the maximum number of retry attempts for a given action type.
 * Higher = more retries = higher priority to not lose the data.
 */
export function getMaxRetries(type: ActionType): number {
  switch (type) {
    // Attendance data MUST NOT be lost — high retry count
    case 'ASISTENCIA_AUSENTE':
    case 'ASISTENCIA_SUBIDA':
    case 'ASISTENCIA_BAJADA':
    case 'ASISTENCIA_TOGGLE':
    case 'ASISTENCIA_VUELTA':
      return 10;

    // Route state is critical but less granular
    case 'RECORRIDO_INICIAR':
    case 'RECORRIDO_FINALIZAR':
      return 8;

    // GPS is best-effort — fewer retries, stale data is less useful
    case 'GPS_FLUSH':
      return 3;

    default:
      return 5;
  }
}
