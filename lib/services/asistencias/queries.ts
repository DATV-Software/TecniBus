import { supabase } from '@/lib/services/supabase';
import type {
  AsistenciaProjection,
  AsistenciaIdProjection,
  AsistenciaExistenteProjection,
  AsistenciaDelDia,
  EstadoAsistencia,
  EstudianteConAsistencia,
  EstudianteConParadaRow,
} from './types';

// ── Helpers internos ──────────────────────────────────────────────────────────

/** Devuelve la fecha de hoy en formato YYYY-MM-DD. */
function fechaHoy(): string {
  return new Date().toISOString().split('T')[0];
}

// ── Queries públicas ──────────────────────────────────────────────────────────

/**
 * Obtiene el estado de asistencia actual de un estudiante para el día de hoy.
 * Devuelve 'presente' como valor por defecto si no hay registro.
 */
export async function getEstadoAsistencia(
  idEstudiante: string
): Promise<EstadoAsistencia> {
  const { data } = await supabase
    .from('asistencias')
    .select('estado')
    .eq('id_estudiante', idEstudiante)
    .eq('fecha', fechaHoy())
    .single();

  return data?.estado ?? 'presente';
}

/**
 * Obtiene el registro completo de asistencia del día para un estudiante.
 * Usado por la pantalla del padre para conocer estado, notas y hora de cambio.
 * Devuelve null si no existe registro hoy.
 */
export async function getEstadoAsistenciaDelDia(
  idEstudiante: string
): Promise<AsistenciaDelDia | null> {
  const { data } = await supabase
    .from('asistencias')
    .select('estado, notas, updated_at')
    .eq('id_estudiante', idEstudiante)
    .eq('fecha', fechaHoy())
    .single();

  return data ?? null;
}

/**
 * Obtiene los estudiantes de una ruta junto con su estado de asistencia del día.
 * El estado por defecto es 'presente' cuando no existe registro explícito.
 */
export async function getEstudiantesConAsistencia(
  idRuta: string,
  _idChofer: string
): Promise<EstudianteConAsistencia[]> {
  try {
    // 1. Obtener paradas de la ruta
    const { data: paradasRuta, error: errorParadas } = await supabase
      .from('paradas')
      .select('id')
      .eq('id_ruta', idRuta);

    if (errorParadas) throw errorParadas;

    const paradasIds = (paradasRuta ?? []).map((p) => p.id);
    if (paradasIds.length === 0) return [];

    // 2. Obtener estudiantes con su parada
    const { data: estudiantesRaw, error: errorEstudiantes } = await supabase
      .from('estudiantes')
      .select('id, nombre, apellido, id_padre, id_parada, paradas(id, nombre)')
      .in('id_parada', paradasIds)
      .order('apellido', { ascending: true });

    if (errorEstudiantes) throw errorEstudiantes;
    if (!estudiantesRaw || estudiantesRaw.length === 0) return [];

    // Supabase devuelve el join con la forma correcta pero el tipo inferido
    // no captura la relación; hacemos la aserción estructural mínima necesaria.
    const estudiantes = estudiantesRaw as unknown as EstudianteConParadaRow[];

    // 3. Obtener asistencias del día en una sola query
    const estudiantesIds = estudiantes.map((e) => e.id);
    const { data: asistenciasRaw } = await supabase
      .from('asistencias')
      .select('id_estudiante, estado, notas')
      .in('id_estudiante', estudiantesIds)
      .eq('fecha', fechaHoy());

    const asistencias = (asistenciasRaw ?? []) as AsistenciaProjection[];

    // 4. Combinar: estado por defecto 'presente'
    return estudiantes.map<EstudianteConAsistencia>((est) => {
      const asistencia = asistencias.find((a) => a.id_estudiante === est.id);
      return {
        id: est.id,
        nombre: est.nombre,
        apellido: est.apellido,
        id_padre: est.id_padre ?? null,
        parada: est.paradas
          ? { id: est.paradas.id, nombre: est.paradas.nombre }
          : null,
        estado: asistencia?.estado ?? 'presente',
        notas: asistencia?.notas ?? null,
      };
    });
  } catch (_error) {
    return [];
  }
}

// ── Helpers internos de lectura (usados por mutations) ────────────────────────

/**
 * Busca el registro de asistencia de hoy para un estudiante.
 * Devuelve el id y estado si existe, o null si no hay registro.
 */
export async function findAsistenciaHoy(
  idEstudiante: string
): Promise<AsistenciaExistenteProjection | null> {
  const { data } = await supabase
    .from('asistencias')
    .select('id, estado')
    .eq('id_estudiante', idEstudiante)
    .eq('fecha', fechaHoy())
    .single();

  return data ?? null;
}

/**
 * Busca el id del registro de asistencia de hoy para un estudiante.
 * Devuelve solo el id si existe, o null si no hay registro.
 */
export async function findAsistenciaIdHoy(
  idEstudiante: string
): Promise<AsistenciaIdProjection | null> {
  const { data } = await supabase
    .from('asistencias')
    .select('id')
    .eq('id_estudiante', idEstudiante)
    .eq('fecha', fechaHoy())
    .single();

  return data ?? null;
}

/**
 * Carga los registros de asistencia existentes para una lista de estudiantes en el día de hoy.
 * Devuelve un Map<idEstudiante, idAsistencia> para acceso O(1).
 */
export async function loadAsistenciasDeHoyMap(
  estudiantesIds: string[]
): Promise<Map<string, string>> {
  const { data } = await supabase
    .from('asistencias')
    .select('id, id_estudiante')
    .in('id_estudiante', estudiantesIds)
    .eq('fecha', fechaHoy());

  return new Map((data ?? []).map((r) => [r.id_estudiante, r.id]));
}

export { fechaHoy };
