// Core singletons
export { networkDetector } from './networkDetector';
export { networkQueue } from './NetworkQueue';

// Offline-aware action wrappers (use these instead of raw service calls)
export {
  registerAllExecutors,
  offlineMarcarAusente,
  offlineMarcarSubida,
  offlineMarcarBajada,
  offlineToggleAsistencia,
  offlineConfirmarAsistenciaVuelta,
  offlineIniciarRecorrido,
  offlineFinalizarRecorrido,
  offlineFlushGps,
} from './offlineActions';

// Utilities
export { classifyError, isRetryable } from './errorClassifier';
export { getNextRetryDelay, getMaxRetries } from './retryStrategy';

// Types
export type {
  ActionType,
  QueuedAction,
  QueueStatus,
  ErrorKind,
  NetworkState,
  OfflineResult,
  AsistenciaAusentePayload,
  AsistenciaSubidaPayload,
  AsistenciaBajadaPayload,
  AsistenciaTogglePayload,
  AsistenciaVueltaPayload,
  RecorridoIniciarPayload,
  RecorridoFinalizarPayload,
  GpsFlushPayload,
} from './types';
