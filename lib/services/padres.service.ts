import { supabase } from './supabase';

type EstudianteRpcRow = {
  id: string;
  nombre: string;
  apellido: string;
  id_parada: string | null;
  parada_nombre: string | null;
  parada_latitud: number | string | null;
  parada_longitud: number | string | null;
  parada_direccion: string | null;
  ruta_id: string | null;
  ruta_nombre: string | null;
  ruta_tipo: string | null;
};

export type EstudianteDelPadre = {
  id: string;
  nombre: string;
  apellido: string;
  nombreCompleto: string;
  id_parada: string | null;
  parada?: {
    id: string;
    nombre: string | null;
    latitud: number;
    longitud: number;
    direccion?: string | null;
    orden?: number;
    ruta?: {
      id: string;
      nombre: string;
      tipo?: 'ida' | 'vuelta';
    };
  };
};

/**
 * Obtiene los estudiantes del padre autenticado
 * Solo retorna estudiantes donde id_padre = auth.uid()
 */
export async function getMyEstudiantes(): Promise<EstudianteDelPadre[]> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.error('❌ No hay usuario autenticado');
      return [];
    }

    // Usar función RPC para evitar recursión en RLS
    const { data, error } = await supabase.rpc('get_mis_estudiantes_con_ruta');

    if (error) {
      console.error('❌ Error obteniendo mis estudiantes:', error);
      return [];
    }

    // Mapear a formato esperado
    return (data || []).map((est: EstudianteRpcRow) => ({
      id: est.id,
      nombre: est.nombre,
      apellido: est.apellido,
      nombreCompleto: `${est.nombre} ${est.apellido}`,
      id_parada: est.id_parada,
      parada: est.id_parada
        ? {
            id: est.id_parada,
            nombre: est.parada_nombre,
            latitud: typeof est.parada_latitud === 'string'
              ? parseFloat(est.parada_latitud)
              : est.parada_latitud,
            longitud: typeof est.parada_longitud === 'string'
              ? parseFloat(est.parada_longitud)
              : est.parada_longitud,
            direccion: est.parada_direccion,
            ruta: est.ruta_id
              ? {
                  id: est.ruta_id,
                  nombre: est.ruta_nombre ?? '',
                  tipo: (est.ruta_tipo === 'vuelta' ? 'vuelta' : 'ida') as 'ida' | 'vuelta',
                }
              : undefined,
          }
        : undefined,
    }));
  } catch (error) {
    console.error('❌ Error en getMyEstudiantes:', error);
    return [];
  }
}
