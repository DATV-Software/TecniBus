import { supabase } from '../core/supabase';

export type AsignacionRuta = {
  id: string;
  id_chofer: string;
  id_ruta: string;
  hora_inicio: string; // TIME format: "06:00:00"
  hora_fin: string; // TIME format: "07:00:00"
  descripcion: string | null;
  dias_semana: string[] | null; // ['lunes', 'martes', ...]
  activo: boolean | null;
  created_at: string | null;
};

export type CreateAsignacionDto = {
  id_chofer: string;
  id_ruta: string;
  hora_inicio: string;
  hora_fin: string;
  descripcion?: string;
  dias_semana?: string[];
};

export type RecorridoChofer = {
  id: string;
  id_ruta: string;
  nombre_ruta: string;
  tipo_ruta: 'ida' | 'vuelta';
  hora_inicio: string;
  hora_fin: string;
  descripcion: string;
  estado_ruta: string;
};

/**
 * Obtiene los recorridos asignados a un chofer para hoy
 * Usa la función de Supabase que filtra por día de la semana
 */
export async function getRecorridosHoy(idChofer: string): Promise<RecorridoChofer[]> {
  try {
    const { data, error } = await supabase.rpc('get_recorridos_chofer_hoy', {
      p_id_chofer: idChofer,
    });

    if (error) {
      throw error;
    }

    type RecorridoRpcRow = {
      id: string;
      id_ruta: string;
      nombre_ruta: string;
      tipo_ruta: string | null;
      hora_inicio: string;
      hora_fin: string;
      descripcion: string | null;
      estado_ruta: string | null;
    };
    return ((data || []) as RecorridoRpcRow[]).map((r) => ({
      id: r.id,
      id_ruta: r.id_ruta,
      nombre_ruta: r.nombre_ruta,
      tipo_ruta: (r.tipo_ruta as 'ida' | 'vuelta') || 'ida',
      hora_inicio: r.hora_inicio,
      hora_fin: r.hora_fin,
      descripcion: r.descripcion || '',
      estado_ruta: r.estado_ruta || 'activa',
    }));
  } catch (_error) {
    return [];
  }
}

/**
 * Obtiene todas las asignaciones de un chofer (incluyendo inactivas)
 */
export async function getAsignacionesChofer(idChofer: string): Promise<AsignacionRuta[]> {
  try {
    const { data, error } = await supabase
      .from('asignaciones_ruta')
      .select('*')
      .eq('id_chofer', idChofer)
      .order('hora_inicio', { ascending: true });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (_error) {
    return [];
  }
}

/**
 * Crea una nueva asignación de recorrido
 * Solo admins pueden hacer esto
 */
export async function createAsignacion(dto: CreateAsignacionDto): Promise<AsignacionRuta | null> {
  try {
    const { data, error } = await supabase
      .from('asignaciones_ruta')
      .insert({
        id_chofer: dto.id_chofer,
        id_ruta: dto.id_ruta,
        hora_inicio: dto.hora_inicio,
        hora_fin: dto.hora_fin,
        descripcion: dto.descripcion || null,
        dias_semana: dto.dias_semana || null,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data as AsignacionRuta;
  } catch (_error) {
    return null;
  }
}

/**
 * Actualiza una asignación existente
 */
export async function updateAsignacion(
  id: string,
  updates: Partial<CreateAsignacionDto>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('asignaciones_ruta')
      .update(updates)
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
 * Desactiva una asignación (no la elimina, solo cambia activo = false)
 */
export async function desactivarAsignacion(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('asignaciones_ruta')
      .update({ activo: false })
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
 * Elimina permanentemente una asignación
 */
export async function deleteAsignacion(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('asignaciones_ruta')
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
 * Verifica si es hora del recorrido (±30 min)
 */
export async function esHoraRecorrido(idAsignacion: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('es_hora_recorrido', {
      p_id_asignacion: idAsignacion,
    });

    if (error) {
      return false;
    }

    return data || false;
  } catch (_error) {
    return false;
  }
}

/**
 * Obtiene las asignaciones de una ruta específica
 */
export async function getAsignacionesRuta(idRuta: string): Promise<AsignacionRuta[]> {
  try {
    const { data, error } = await supabase
      .from('asignaciones_ruta')
      .select('*')
      .eq('id_ruta', idRuta)
      .eq('activo', true)
      .order('hora_inicio', { ascending: true });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (_error) {
    return [];
  }
}

export type ChoferAsignacion = {
  id: string;
  nombre: string;
  apellido: string;
  id_buseta: string | null;
  buseta_placa?: string;
};

export type BusetaAsignacion = {
  id: string;
  placa: string;
  ocupada: boolean;
  chofer_nombre?: string;
};

export type RutaAsignacion = {
  id: string;
  nombre: string;
  estado: string | null;
};

type ChoferAsignacionRow = {
  id: string;
  id_buseta: string | null;
  profiles: { nombre: string; apellido: string };
  busetas?: { placa: string } | null;
};

/**
 * Obtiene choferes, rutas activas y busetas con su estado de ocupación.
 * Combina las tres queries necesarias para la pantalla de asignaciones.
 */
/**
 * Obtiene el ID y nombre del chofer asignado a una ruta.
 * Combina las dos RPCs necesarias en una sola llamada paralela.
 */
export async function getChoferDeRuta(
  idRuta: string
): Promise<{ id: string; nombre: string } | null> {
  try {
    const [{ data: id }, { data: nombre }] = await Promise.all([
      supabase.rpc('get_chofer_de_ruta', { p_id_ruta: idRuta }),
      supabase.rpc('get_nombre_chofer_de_ruta', { p_id_ruta: idRuta }),
    ]);
    if (!id) return null;
    return { id, nombre: nombre || '' };
  } catch (_error) {
    return null;
  }
}

export async function getDatosAsignaciones(): Promise<{
  choferes: ChoferAsignacion[];
  rutas: RutaAsignacion[];
  busetas: BusetaAsignacion[];
}> {
  try {
    const [choferesResult, rutasResult, busetasResult] = await Promise.all([
      supabase
        .from('choferes')
        .select('id, id_buseta, profiles!inner(nombre, apellido), busetas(placa)'),
      supabase
        .from('rutas')
        .select('id, nombre, estado')
        .eq('estado', 'activa')
        .order('nombre'),
      supabase
        .from('busetas')
        .select('id, placa')
        .order('placa'),
    ]);

    if (choferesResult.error) throw choferesResult.error;
    if (rutasResult.error) throw rutasResult.error;
    if (busetasResult.error) throw busetasResult.error;

    const choferes: ChoferAsignacion[] = ((choferesResult.data || []) as unknown as ChoferAsignacionRow[]).map((c) => ({
      id: c.id,
      nombre: c.profiles.nombre,
      apellido: c.profiles.apellido,
      id_buseta: c.id_buseta,
      buseta_placa: c.busetas?.placa || undefined,
    }));

    const busetas: BusetaAsignacion[] = (busetasResult.data || []).map((b) => {
      const choferConBuseta = choferes.find((c) => c.id_buseta === b.id);
      return {
        id: b.id,
        placa: b.placa,
        ocupada: !!choferConBuseta,
        chofer_nombre: choferConBuseta
          ? `${choferConBuseta.nombre} ${choferConBuseta.apellido}`
          : undefined,
      };
    });

    return { choferes, rutas: rutasResult.data || [], busetas };
  } catch (_error) {
    return { choferes: [], rutas: [], busetas: [] };
  }
}
