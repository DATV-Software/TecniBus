/**
 * Offline-aware wrappers for critical write operations.
 *
 * Architecture:
 * 1. Each function first attempts the real network call.
 * 2. If a network error occurs → the action is queued in NetworkQueue.
 * 3. The UI receives `{ success: true, queued: true }` so optimistic updates
 *    can proceed without blocking.
 * 4. NetworkQueue's executors (registered here) replay the action when
 *    connectivity is restored.
 * 5. Non-network errors (validation, auth) propagate immediately.
 *
 * This file is also responsible for REGISTERING all executors.
 * Call `registerAllExecutors()` once at app startup (in _layout.tsx).
 */

import {
  marcarAusente,
  marcarSubida,
  marcarBajada,
  toggleAsistencia,
  confirmarAsistenciaVuelta,
  type EstudianteConAsistencia,
} from '@/lib/services/asistencias.service';
import {
  iniciarRecorrido as _iniciarRecorrido,
  finalizarRecorrido as _finalizarRecorrido,
} from '@/lib/services/recorridos.service';
import { guardarUbicacion } from '@/lib/services/ubicaciones.service';
import { classifyError, isRetryable } from './errorClassifier';
import { networkDetector } from './networkDetector';
import { networkQueue } from './NetworkQueue';
import {
  AsistenciaAusentePayload,
  AsistenciaBajadaPayload,
  AsistenciaSubidaPayload,
  AsistenciaTogglePayload,
  AsistenciaVueltaPayload,
  GpsFlushPayload,
  OfflineResult,
  RecorridoFinalizarPayload,
  RecorridoIniciarPayload,
} from './types';

// ─── Executor Registration ────────────────────────────────────────────────────

/**
 * Register all action executors in the NetworkQueue.
 * Must be called ONCE at app startup before any offline actions can be synced.
 */
export function registerAllExecutors(): void {
  // Attendance — chofer
  networkQueue.register<AsistenciaAusentePayload>(
    'ASISTENCIA_AUSENTE',
    (p) => _throwIfFalse(marcarAusente(p.idEstudiante, p.idRuta, p.idChofer)),
  );

  networkQueue.register<AsistenciaSubidaPayload>(
    'ASISTENCIA_SUBIDA',
    (p) =>
      _throwIfFalse(
        marcarSubida(p.idEstudiante, p.idRuta, p.idChofer, p.nombreEstudiante),
      ),
  );

  networkQueue.register<AsistenciaBajadaPayload>(
    'ASISTENCIA_BAJADA',
    (p) =>
      _throwIfFalse(
        marcarBajada(p.idEstudiante, p.idRuta, p.idChofer, p.nombreEstudiante),
      ),
  );

  // Attendance — padre
  networkQueue.register<AsistenciaTogglePayload>(
    'ASISTENCIA_TOGGLE',
    (p) =>
      _throwIfFalse(
        toggleAsistencia(p.idEstudiante, p.idRuta, p.marcarAusente),
      ),
  );

  // Attendance — vuelta
  networkQueue.register<AsistenciaVueltaPayload>('ASISTENCIA_VUELTA', (p) =>
    _throwIfFalse(
      confirmarAsistenciaVuelta(
        p.idRuta,
        p.idChofer,
        p.ausentesIds,
        p.todosLosEstudiantes as EstudianteConAsistencia[],
      ),
    ),
  );

  // Route state
  networkQueue.register<RecorridoIniciarPayload>('RECORRIDO_INICIAR', (p) =>
    _throwIfFalse(_iniciarRecorrido(p.idAsignacion)),
  );

  networkQueue.register<RecorridoFinalizarPayload>(
    'RECORRIDO_FINALIZAR',
    (p) => _throwIfFalse(_finalizarRecorrido(p.idAsignacion)),
  );

  // GPS batch flush
  networkQueue.register<GpsFlushPayload>('GPS_FLUSH', async (p) => {
    for (const point of p.points) {
      await guardarUbicacion(
        point.idAsignacion,
        point.idChofer,
        point.latitud,
        point.longitud,
        point.velocidad,
        point.precisionGps,
        point.heading,
      );
      // Small delay between GPS writes to avoid flooding Supabase
      await _sleep(150);
    }
  });

  console.log('[OfflineActions] All executors registered');
}

// ─── Offline-Aware Wrappers ───────────────────────────────────────────────────

/**
 * Chofer: mark a student as absent (did not board the bus).
 */
export async function offlineMarcarAusente(
  idEstudiante: string,
  idRuta: string,
  idChofer: string,
): Promise<OfflineResult> {
  return _withOfflineFallback(
    () => _throwIfFalse(marcarAusente(idEstudiante, idRuta, idChofer)),
    'ASISTENCIA_AUSENTE',
    { idEstudiante, idRuta, idChofer } satisfies AsistenciaAusentePayload,
    idEstudiante, // deduplication key
  );
}

/**
 * Chofer: mark a student as boarded (present).
 */
export async function offlineMarcarSubida(
  idEstudiante: string,
  idRuta: string,
  idChofer: string,
  nombreEstudiante?: string,
): Promise<OfflineResult> {
  return _withOfflineFallback(
    () =>
      _throwIfFalse(
        marcarSubida(idEstudiante, idRuta, idChofer, nombreEstudiante),
      ),
    'ASISTENCIA_SUBIDA',
    {
      idEstudiante,
      idRuta,
      idChofer,
      nombreEstudiante,
    } satisfies AsistenciaSubidaPayload,
    idEstudiante,
  );
}

/**
 * Chofer: mark a student as dropped off (completed).
 */
export async function offlineMarcarBajada(
  idEstudiante: string,
  idRuta: string,
  idChofer: string,
  nombreEstudiante?: string,
): Promise<OfflineResult> {
  return _withOfflineFallback(
    () =>
      _throwIfFalse(
        marcarBajada(idEstudiante, idRuta, idChofer, nombreEstudiante),
      ),
    'ASISTENCIA_BAJADA',
    {
      idEstudiante,
      idRuta,
      idChofer,
      nombreEstudiante,
    } satisfies AsistenciaBajadaPayload,
    idEstudiante,
  );
}

/**
 * Padre: toggle absence for their child.
 */
export async function offlineToggleAsistencia(
  idEstudiante: string,
  idRuta: string,
  ausente: boolean,
): Promise<OfflineResult> {
  return _withOfflineFallback(
    () => _throwIfFalse(toggleAsistencia(idEstudiante, idRuta, ausente)),
    'ASISTENCIA_TOGGLE',
    { idEstudiante, idRuta, marcarAusente: ausente } satisfies AsistenciaTogglePayload,
    idEstudiante,
  );
}

/**
 * Chofer: confirm attendance for the return trip (vuelta).
 */
export async function offlineConfirmarAsistenciaVuelta(
  idRuta: string,
  idChofer: string,
  ausentesIds: string[],
  todosLosEstudiantes: EstudianteConAsistencia[],
): Promise<OfflineResult> {
  return _withOfflineFallback(
    () =>
      _throwIfFalse(
        confirmarAsistenciaVuelta(
          idRuta,
          idChofer,
          ausentesIds,
          todosLosEstudiantes,
        ),
      ),
    'ASISTENCIA_VUELTA',
    {
      idRuta,
      idChofer,
      ausentesIds,
      todosLosEstudiantes,
    } satisfies AsistenciaVueltaPayload,
    `vuelta_${idRuta}`,
  );
}

/**
 * Chofer: start the route.
 */
export async function offlineIniciarRecorrido(
  idAsignacion: string,
): Promise<OfflineResult> {
  return _withOfflineFallback(
    () => _throwIfFalse(_iniciarRecorrido(idAsignacion)),
    'RECORRIDO_INICIAR',
    { idAsignacion } satisfies RecorridoIniciarPayload,
    idAsignacion,
  );
}

/**
 * Chofer: end the route.
 */
export async function offlineFinalizarRecorrido(
  idAsignacion: string,
): Promise<OfflineResult> {
  return _withOfflineFallback(
    () => _throwIfFalse(_finalizarRecorrido(idAsignacion)),
    'RECORRIDO_FINALIZAR',
    { idAsignacion } satisfies RecorridoFinalizarPayload,
    idAsignacion,
  );
}

/**
 * Flush a buffer of GPS points.
 * Used by useGPSTracking when reconnecting with buffered points.
 */
export async function offlineFlushGps(
  payload: GpsFlushPayload,
): Promise<OfflineResult> {
  return _withOfflineFallback(
    async () => {
      for (const point of payload.points) {
        await guardarUbicacion(
          point.idAsignacion,
          point.idChofer,
          point.latitud,
          point.longitud,
          point.velocidad,
          point.precisionGps,
          point.heading,
        );
        await _sleep(150);
      }
    },
    'GPS_FLUSH',
    payload,
  );
}

// ─── Internal Helpers ─────────────────────────────────────────────────────────

/**
 * Core offline-fallback wrapper.
 *
 * 1. Tries `action()`.
 * 2. On success → returns `{ success: true, queued: false }`.
 * 3. On network error → queues action and returns `{ success: true, queued: true }`.
 * 4. On non-retryable error → returns `{ success: false, queued: false, error }`.
 */
async function _withOfflineFallback<T>(
  action: () => Promise<void>,
  type: Parameters<typeof networkQueue.enqueue>[0],
  payload: T,
  deduplicateKey?: string,
): Promise<OfflineResult> {
  // Fast-path: if we already know we're offline, skip the request entirely
  if (!networkDetector.isOnline) {
    await networkQueue.enqueue(type, payload, deduplicateKey);
    return { success: true, queued: true };
  }

  try {
    await action();
    return { success: true, queued: false };
  } catch (error) {
    const kind = classifyError(error);

    if (isRetryable(kind)) {
      // Network / server error → queue for later
      networkDetector.reportNetworkError();
      await networkQueue.enqueue(type, payload, deduplicateKey);
      console.log(`[OfflineActions] Queued ${type} due to ${kind} error`);
      return { success: true, queued: true };
    }

    // Validation / auth error → fail immediately, do not queue
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, queued: false, error: msg };
  }
}

/**
 * Wraps a `Promise<boolean>` service call:
 * - resolves on `true`
 * - throws on `false` (so `_withOfflineFallback` can catch it cleanly)
 *
 * Services like `marcarSubida` return `false` instead of throwing on Supabase
 * errors, so we need to convert that pattern.
 */
async function _throwIfFalse(promise: Promise<boolean>): Promise<void> {
  const ok = await promise;
  if (!ok) {
    throw new Error('Service returned false — network or server error');
  }
}

function _sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
