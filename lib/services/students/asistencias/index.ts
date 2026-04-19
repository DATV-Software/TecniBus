/**
 * Barrel de asistencias — re-exporta toda la interfaz pública del módulo.
 * Todos los consumers deben importar desde '@/lib/services/asistencias.service'
 * o desde '@/lib/services/asistencias' indistintamente.
 */

// Tipos
export type {
  EstadoAsistencia,
  Asistencia,
  AsistenciaRow,
  AsistenciaInsert,
  AsistenciaUpdate,
  AsistenciaDelDia,
  EstudianteConAsistencia,
  TipoNotificacionPadre,
} from './types';

// Queries de lectura
export {
  getEstadoAsistencia,
  getEstadoAsistenciaDelDia,
  getEstudiantesConAsistencia,
} from './queries';

// Mutaciones de escritura
export {
  toggleAsistencia,
  marcarAusente,
  marcarSubida,
  marcarBajada,
  confirmarAsistenciaVuelta,
} from './mutations';
