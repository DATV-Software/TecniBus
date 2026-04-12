import { supabase } from './supabase';

export type Parada = {
  id: string;
  id_ruta: string | null;
  nombre: string | null;
  direccion: string | null;
  latitud: number;
  longitud: number;
};

export type Ruta = {
  id: string;
  nombre: string;
  hora_inicio: string | null;
  hora_fin: string | null;
  estado: string | null;
  tipo?: 'ida' | 'vuelta';
  paradas?: Parada[];
};

export type CreateRutaDto = {
  nombre: string;
  hora_inicio: string | null;
  hora_fin: string | null;
  estado?: string | null;
  tipo: 'ida' | 'vuelta';
};

export type UpdateRutaDto = Partial<CreateRutaDto>;

export type CreateParadaDto = {
  id_ruta: string;
  nombre: string;
  direccion: string;
  latitud: number;
  longitud: number;
};

export type UpdateParadaDto = Partial<Omit<CreateParadaDto, 'id_ruta'>>;

/**
 * Obtiene todas las rutas con sus paradas
 */
export async function getRutas(): Promise<Ruta[]> {
  try {
    const { data, error } = await supabase
      .from('rutas')
      .select(`
        id,
        nombre,
        hora_inicio,
        hora_fin,
        estado,
        tipo,
        paradas(
          id,
          id_ruta,
          nombre,
          direccion,
          latitud,
          longitud
        )
      `)
      .order('nombre', { ascending: true });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (_error) {
    return [];
  }
}

/**
 * Obtiene una ruta específica con sus paradas ordenadas
 */
export async function getRutaById(id: string): Promise<Ruta | null> {
  try {
    const { data, error } = await supabase
      .from('rutas')
      .select(`
        id,
        nombre,
        hora_inicio,
        hora_fin,
        estado,
        tipo
      `)
      .eq('id', id)
      .single();

    if (error) {
      throw error;
    }

    // Obtener paradas ordenadas
    const paradas = await getParadasByRuta(id);

    return {
      ...data,
      paradas,
    };
  } catch (_error) {
    return null;
  }
}

/**
 * Crea una nueva ruta
 */
export async function createRuta(dto: CreateRutaDto): Promise<Ruta | null> {
  try {
    const { data, error } = await supabase
      .from('rutas')
      .insert({
        nombre: dto.nombre.trim(),
        hora_inicio: dto.hora_inicio,
        hora_fin: dto.hora_fin,
        estado: dto.estado || 'activa',
      })
      .select('id, nombre, hora_inicio, hora_fin, estado')
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (_error) {
    return null;
  }
}

/**
 * Actualiza una ruta existente
 */
export async function updateRuta(
  id: string,
  dto: UpdateRutaDto
): Promise<boolean> {
  try {
    const updateData: any = {};

    if (dto.nombre !== undefined) updateData.nombre = dto.nombre.trim();
    if (dto.hora_inicio !== undefined) updateData.hora_inicio = dto.hora_inicio;
    if (dto.hora_fin !== undefined) updateData.hora_fin = dto.hora_fin;
    if (dto.estado !== undefined) updateData.estado = dto.estado;

    const { error } = await supabase
      .from('rutas')
      .update(updateData)
      .eq('id', id);

    if (error) {
      throw error;
    }

    return true;
  } catch (_error) {
    return false;
  }
}

/**
 * Elimina una ruta
 * Verifica que no haya estudiantes asignados antes de eliminar
 */
export async function deleteRuta(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Verificar si hay estudiantes asignados a paradas de esta ruta
    const { data: paradas, error: paradasError } = await supabase
      .from('paradas')
      .select('id')
      .eq('id_ruta', id);

    if (paradasError) {
      throw paradasError;
    }

    if (paradas && paradas.length > 0) {
      const paradaIds = paradas.map(p => p.id);

      const { data: estudiantes, error: estudiantesError } = await supabase
        .from('estudiantes')
        .select('id')
        .in('id_parada', paradaIds)
        .limit(1);

      if (estudiantesError) {
        throw estudiantesError;
      }

      if (estudiantes && estudiantes.length > 0) {
        return {
          success: false,
          error: 'No se puede eliminar la ruta porque tiene estudiantes asignados',
        };
      }
    }

    // Si no hay estudiantes, proceder con la eliminación (cascada borrará paradas)
    const { error } = await supabase
      .from('rutas')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    return { success: true };
  } catch (_error) {
    return { success: false, error: 'Error al eliminar la ruta' };
  }
}

/**
 * Obtiene las paradas de una ruta específica
 */
export async function getParadasByRuta(id_ruta: string): Promise<Parada[]> {
  try {
    const { data, error } = await supabase
      .from('paradas')
      .select('id, id_ruta, nombre, direccion, latitud, longitud')
      .eq('id_ruta', id_ruta)
      .order('nombre', { ascending: true });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (_error) {
    return [];
  }
}

/**
 * Crea una nueva parada
 */
export async function createParada(dto: CreateParadaDto): Promise<Parada | null> {
  try {
    const { data, error } = await supabase
      .from('paradas')
      .insert({
        id_ruta: dto.id_ruta,
        nombre: dto.nombre.trim(),
        direccion: dto.direccion.trim(),
        latitud: dto.latitud,
        longitud: dto.longitud,
      })
      .select('id, id_ruta, nombre, direccion, latitud, longitud')
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (_error) {
    return null;
  }
}

/**
 * Actualiza una parada existente
 */
export async function updateParada(
  id: string,
  dto: UpdateParadaDto
): Promise<boolean> {
  try {
    const updateData: any = {};

    if (dto.nombre !== undefined) updateData.nombre = dto.nombre.trim();
    if (dto.direccion !== undefined) updateData.direccion = dto.direccion.trim();
    if (dto.latitud !== undefined) updateData.latitud = dto.latitud;
    if (dto.longitud !== undefined) updateData.longitud = dto.longitud;

    const { error } = await supabase
      .from('paradas')
      .update(updateData)
      .eq('id', id);

    if (error) {
      throw error;
    }

    return true;
  } catch (_error) {
    return false;
  }
}

/**
 * Elimina una parada
 */
export async function deleteParada(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('paradas')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    return true;
  } catch (_error) {
    return false;
  }
}

/**
 * Obtiene busetas disponibles para asignación
 */
export async function getBusetasDisponibles(): Promise<{
  id: string;
  placa: string;
  capacidad: number;
}[]> {
  try {
    const { data, error } = await supabase
      .from('busetas')
      .select('id, placa, capacidad')
      .order('placa', { ascending: true });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (_error) {
    return [];
  }
}

/**
 * Calcula la ruta optimizada para el chofer
 * @param ubicacionChofer - Ubicación actual del chofer
 * @param paradas - Paradas de la ruta (sin orden)
 * @param tipoRuta - Tipo de ruta ("ida" o "vuelta")
 * @param ubicacionColegio - Ubicación del colegio
 * @returns Paradas reordenadas según optimización de Google
 */
export async function calcularRutaOptimizada(
  ubicacionChofer: { lat: number; lng: number },
  paradas: Parada[],
  tipoRuta: 'ida' | 'vuelta',
  ubicacionColegio: { lat: number; lng: number },
): Promise<{
  paradasOptimizadas: Parada[];
  distanciaTotal: number;
  duracionTotal: number;
  polylineCoordinates: { latitude: number; longitude: number }[];
} | null> {
  try {
    const { getOptimizedRouteForDriver } = await import('./directions.service');

    if (paradas.length === 0) {
      return null;
    }

    // Convertir paradas a coordenadas
    const stops = paradas.map(p => ({ lat: p.latitud, lng: p.longitud }));

    // Lógica diferente según tipo de ruta:
    let origen: { lat: number; lng: number };
    let destino: { lat: number; lng: number };
    let waypointsIntermedios: { lat: number; lng: number }[];

    // Para VUELTA: índice de la parada más lejana del colegio (será el destino final)
    let idxDestinoVuelta = -1;
    let paradasIntermedias: Parada[] = paradas;

    if (tipoRuta === 'ida') {
      // RUTA IDA: Chofer → Paradas (optimizadas) → Colegio
      origen = ubicacionChofer;
      waypointsIntermedios = stops;
      destino = ubicacionColegio;
    } else {
      // RUTA VUELTA: Colegio → Paradas (optimizadas) → Última parada (sin regresar al colegio)
      origen = ubicacionColegio;

      if (paradas.length === 1) {
        // Solo una parada: ir directo a ella
        idxDestinoVuelta = 0;
        waypointsIntermedios = [];
        paradasIntermedias = [];
        destino = stops[0];
      } else {
        // Encontrar la parada más lejana del colegio para usarla como destino final
        let maxDist = -1;
        for (let i = 0; i < stops.length; i++) {
          const dx = stops[i].lat - ubicacionColegio.lat;
          const dy = stops[i].lng - ubicacionColegio.lng;
          const d2 = dx * dx + dy * dy;
          if (d2 > maxDist) { maxDist = d2; idxDestinoVuelta = i; }
        }
        destino = stops[idxDestinoVuelta];
        waypointsIntermedios = stops.filter((_, i) => i !== idxDestinoVuelta);
        paradasIntermedias = paradas.filter((_, i) => i !== idxDestinoVuelta);
      }
    }

    // Llamar a Google Directions API con optimize:true
    const result = await getOptimizedRouteForDriver(
      origen,
      waypointsIntermedios,
      destino,
    );

    if (!result) {
      return {
        paradasOptimizadas: paradas,
        distanciaTotal: 0,
        duracionTotal: 0,
        polylineCoordinates: [],
      };
    }

    // Reordenar paradas según waypoint_order de Google.
    // waypointOrder puede ser undefined cuando no hay waypoints intermedios (ruta directa).
    let paradasOptimizadas: Parada[];
    if (tipoRuta === 'ida') {
      paradasOptimizadas = result.waypointOrder
        ? result.waypointOrder.map(index => paradas[index])
        : paradas;
    } else {
      if (result.waypointOrder && result.waypointOrder.length > 0) {
        // Reconstruir: intermedias optimizadas + parada más lejana al final
        const intermediasOrdenadas = result.waypointOrder.map(i => paradasIntermedias[i]);
        paradasOptimizadas = [...intermediasOrdenadas, paradas[idxDestinoVuelta]];
      } else {
        // Sin waypoints intermedios (solo 1 parada total) → orden original
        paradasOptimizadas = paradas;
      }
    }

    return {
      paradasOptimizadas,
      distanciaTotal: result.distance,
      duracionTotal: result.duration,
      polylineCoordinates: result.decodedCoordinates,
    };
  } catch (_error) {
    // Retornar paradas en orden original en caso de error
    return {
      paradasOptimizadas: paradas,
      distanciaTotal: 0,
      duracionTotal: 0,
      polylineCoordinates: [],
    };
  }
}
