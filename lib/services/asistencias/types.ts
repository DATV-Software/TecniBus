import type { Database } from '@/lib/types/database.types';

// ── Enum derivado del schema de Supabase ─────────────────────────────────────
export type EstadoAsistencia =
  Database['public']['Enums']['estado_asistencia'];

// ── Row / Insert / Update tipados desde Supabase ─────────────────────────────
export type AsistenciaRow =
  Database['public']['Tables']['asistencias']['Row'];

export type AsistenciaInsert =
  Database['public']['Tables']['asistencias']['Insert'];

export type AsistenciaUpdate =
  Database['public']['Tables']['asistencias']['Update'];

// ── Proyecciones internas usadas en queries ───────────────────────────────────

/** Campos mínimos de un registro de asistencia para combinaciones */
export type AsistenciaProjection = Pick<
  AsistenciaRow,
  'id_estudiante' | 'estado' | 'notas'
>;

/** Fila de asistencia existente al buscar por id */
export type AsistenciaExistenteProjection = Pick<AsistenciaRow, 'id' | 'estado'>;

/** Fila de asistencia existente mínima (solo id) */
export type AsistenciaIdProjection = Pick<AsistenciaRow, 'id'>;

/** Fila de estudiante tal como la devuelve el join con paradas */
export type EstudianteConParadaRow = {
  id: string;
  nombre: string;
  apellido: string;
  id_padre: string | null;
  id_parada: string | null;
  paradas: { id: string; nombre: string | null } | null;
};

// ── Tipo público principal ────────────────────────────────────────────────────

/** Modelo de dominio completo de una asistencia */
export type Asistencia = {
  id: string;
  id_estudiante: string;
  id_chofer: string;
  id_ruta: string | null;
  estado: EstadoAsistencia;
  fecha: string;
  notas: string | null;
  modificado_por: string | null;
  created_at: string | null;
  updated_at: string | null;
};

/** Estudiante enriquecido con su estado de asistencia del día */
export type EstudianteConAsistencia = {
  id: string;
  nombre: string;
  apellido: string;
  id_padre: string | null;
  parada: {
    id: string;
    nombre: string | null;
  } | null;
  estado: EstadoAsistencia;
  notas?: string | null;
};

/** Registro de asistencia del día para la vista del padre */
export type AsistenciaDelDia = {
  estado: EstadoAsistencia;
  notas: string | null;
  updated_at: string | null;
};

/** Tipo de notificación de asistencia dirigida al padre */
export type TipoNotificacionPadre = 'subio' | 'bajo' | 'ausente';
