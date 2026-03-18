// ─── Action Types ─────────────────────────────────────────────────────────────

/** All operations that can be persisted in the offline queue */
export type ActionType =
  | 'ASISTENCIA_AUSENTE'      // Chofer marca estudiante ausente (no se subió)
  | 'ASISTENCIA_SUBIDA'       // Chofer marca estudiante como subido (presente)
  | 'ASISTENCIA_BAJADA'       // Chofer marca estudiante como bajado (completado)
  | 'ASISTENCIA_TOGGLE'       // Padre toggle ausencia de su hijo
  | 'ASISTENCIA_VUELTA'       // Confirmar asistencias en recorrido de vuelta
  | 'RECORRIDO_INICIAR'       // Iniciar recorrido activo
  | 'RECORRIDO_FINALIZAR'     // Finalizar recorrido activo
  | 'GPS_FLUSH';              // Enviar lote de ubicaciones GPS buffereadas

// ─── Queue ────────────────────────────────────────────────────────────────────

export type QueueStatus = 'pending' | 'syncing' | 'failed';

export interface QueuedAction<T = unknown> {
  /** Unique ID for this queued action */
  id: string;
  type: ActionType;
  payload: T;
  /** Unix ms when action was first queued */
  timestamp: number;
  /** Number of retries already attempted */
  retryCount: number;
  /** Maximum retries before marking as failed */
  maxRetries: number;
  status: QueueStatus;
  /** Error message from last attempt */
  lastError?: string;
  /** Unix ms when next retry is allowed (exponential backoff) */
  nextRetryAt?: number;
}

// ─── Payloads ─────────────────────────────────────────────────────────────────

export interface AsistenciaAusentePayload {
  idEstudiante: string;
  idRuta: string;
  idChofer: string;
}

export interface AsistenciaSubidaPayload {
  idEstudiante: string;
  idRuta: string;
  idChofer: string;
  nombreEstudiante?: string;
}

export interface AsistenciaBajadaPayload {
  idEstudiante: string;
  idRuta: string;
  idChofer: string;
  nombreEstudiante?: string;
}

export interface AsistenciaTogglePayload {
  idEstudiante: string;
  idRuta: string;
  marcarAusente: boolean;
}

export interface AsistenciaVueltaPayload {
  idRuta: string;
  idChofer: string;
  ausentesIds: string[];
  /** Serializable subset of EstudianteConAsistencia */
  todosLosEstudiantes: Array<{
    id: string;
    nombre: string;
    apellido: string;
    id_padre: string | null;
    parada: { id: string; nombre: string | null } | null;
    estado: string;
    notas?: string | null;
  }>;
}

export interface RecorridoIniciarPayload {
  idAsignacion: string;
}

export interface RecorridoFinalizarPayload {
  idAsignacion: string;
}

export interface GpsFlushPayload {
  points: Array<{
    idAsignacion: string;
    idChofer: string;
    latitud: number;
    longitud: number;
    velocidad?: number;
    precisionGps?: number;
    heading?: number;
    capturedAt: number; // Unix ms
  }>;
}

// ─── Error Classification ─────────────────────────────────────────────────────

export type ErrorKind = 'network' | 'server' | 'validation' | 'auth';

// ─── Network ──────────────────────────────────────────────────────────────────

export type NetworkState = 'online' | 'offline';

/** Returned from every offline-aware action */
export interface OfflineResult {
  success: boolean;
  /** true if the action was accepted but queued for later sync */
  queued: boolean;
  error?: string;
}
