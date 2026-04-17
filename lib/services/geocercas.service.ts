import { supabase } from './supabase';

// Re-export distance/ETA utils for backward compatibility
export {
  calcularDistancia,
  calcularETA,
  calcularETAConDirecciones,
  calcularETAsRuta,
  estaDentroDeGeocerca,
} from '../utils/distance';

export type EstadoGeocerca = 'pendiente' | 'en_zona' | 'completado' | 'omitido';

export type EstudianteGeocerca = {
  id_estudiante: string;
  nombre: string;
  apellido: string;
  nombreCompleto: string;
  id_parada: string;
  parada_nombre: string | null;
  parada_latitud: number;
  parada_longitud: number;
  orden_parada: number;
  estado: EstadoGeocerca;
};

/**
 * Inicializar estados de geocercas al iniciar recorrido
 */
export async function inicializarEstadosGeocercas(
  idAsignacion: string,
  idChofer: string
): Promise<boolean> {
  try {

    const { error } = await supabase.rpc('inicializar_estados_geocercas', {
      p_id_asignacion: idAsignacion,
      p_id_chofer: idChofer,
    });

    if (error) {
      return false;
    }

    return true;
  } catch (_error) {
    return false;
  }
}

/**
 * Marcar entrada a geocerca
 */
export async function marcarEntradaGeocerca(
  idAsignacion: string,
  idEstudiante: string,
  idChofer: string
): Promise<{
  success: boolean;
  estudiante?: {
    id_estudiante: string;
    nombre: string;
    apellido: string;
    parada: string;
  };
}> {
  try {

    const { data, error } = await supabase.rpc('entrada_geocerca', {
      p_id_asignacion: idAsignacion,
      p_id_estudiante: idEstudiante,
      p_id_chofer: idChofer,
    });

    if (error) {
      return { success: false };
    }

    return { success: true, estudiante: data };
  } catch (_error) {
    return { success: false };
  }
}

/**
 * Marcar salida de geocerca (auto-presente si no marcó ausente)
 */
export async function marcarSalidaGeocerca(
  idAsignacion: string,
  idEstudiante: string,
  idChofer: string
): Promise<boolean> {
  try {

    const { error } = await supabase.rpc('salida_geocerca', {
      p_id_asignacion: idAsignacion,
      p_id_estudiante: idEstudiante,
      p_id_chofer: idChofer,
    });

    if (error) {
      return false;
    }

    return true;
  } catch (_error) {
    return false;
  }
}

/**
 * Marcar estudiante como completado (cuando el chofer marca ausente manualmente)
 */
export async function marcarEstudianteCompletado(
  idAsignacion: string,
  idEstudiante: string,
  idChofer: string,
  estadoAsistencia: 'presente' | 'ausente' | 'completado'
): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('marcar_estudiante_completado', {
      p_id_asignacion: idAsignacion,
      p_id_estudiante: idEstudiante,
      p_id_chofer: idChofer,
      p_estado_asistencia: estadoAsistencia,
    });

    if (error) {
      return false;
    }

    return true;
  } catch (_error) {
    return false;
  }
}

/**
 * Obtener el siguiente estudiante pendiente o en zona
 */
export async function getSiguienteEstudianteGeocerca(
  idAsignacion: string
): Promise<EstudianteGeocerca | null> {
  try {
    const { data, error } = await supabase.rpc('get_siguiente_estudiante_geocerca', {
      p_id_asignacion: idAsignacion,
    });

    if (error) {
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    const estudiante = data[0];
    return {
      ...estudiante,
      nombreCompleto: `${estudiante.nombre} ${estudiante.apellido}`,
    };
  } catch (_error) {
    return null;
  }
}

