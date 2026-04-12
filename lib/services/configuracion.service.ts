import { supabase } from './supabase';

export type UbicacionColegio = {
  latitud: number;
  longitud: number;
  nombre: string;
};

/**
 * Obtiene la ubicación del colegio configurada
 */
export async function getUbicacionColegio(): Promise<UbicacionColegio> {
  try {
    const { data, error } = await supabase
      .from('configuracion')
      .select('valor')
      .eq('clave', 'ubicacion_colegio')
      .single();

    if (error || !data) {
      return {
        latitud: -2.9, // Cuenca, Ecuador
        longitud: -79.0,
        nombre: 'Colegio TecniBus',
      };
    }

    return data.valor as UbicacionColegio;
  } catch (_error) {
    return {
      latitud: -2.9,
      longitud: -79.0,
      nombre: 'Colegio TecniBus',
    };
  }
}

/**
 * Actualiza la ubicación del colegio (UPSERT)
 * Solo admins pueden hacer esto
 */
export async function updateUbicacionColegio(
  ubicacion: UbicacionColegio
): Promise<boolean> {
  try {
    // Usar upsert para crear o actualizar
    const { error } = await supabase
      .from('configuracion')
      .upsert({
        clave: 'ubicacion_colegio',
        valor: ubicacion,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'clave', // Si existe la clave, actualizar
      });

    if (error) {
      return false;
    }

    return true;
  } catch (_error) {
    return false;
  }
}
