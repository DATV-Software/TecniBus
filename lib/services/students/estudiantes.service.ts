import { supabase } from '../core/supabase';

export type Estudiante = {
  id: string;
  nombre: string;
  apellido: string;
  id_padre: string | null;
  id_parada: string | null;
  created_at: string;
  // Relaciones
  padre?: {
    id: string;
    nombre: string;
    apellido: string;
  };
  parada?: {
    id: string;
    nombre: string | null;
    ruta?: {
      id: string;
      nombre: string;
    };
  };
};

type EstudianteRow = {
  id: string;
  nombre: string;
  apellido: string;
  id_padre: string | null;
  id_parada: string | null;
  created_at: string;
  padres?: {
    profiles?: {
      id: string;
      nombre: string;
      apellido: string;
    } | null;
  } | null;
  paradas?: {
    id: string;
    nombre: string | null;
    rutas?: {
      id: string;
      nombre: string;
    } | null;
  } | null;
};

type ParadaRow = {
  id: string;
  nombre: string | null;
  direccion: string | null;
  rutas?: { id: string; nombre: string } | null;
};

export type CreateEstudianteDto = {
  nombre: string;
  apellido: string;
  id_padre: string | null;
  id_parada: string | null;
};

export type UpdateEstudianteDto = Partial<CreateEstudianteDto>;

/**
 * Obtiene todos los estudiantes con sus relaciones
 * Incluye información del padre y ruta asignados
 */
export async function getEstudiantes(): Promise<Estudiante[]> {
  try {
    const { data, error } = await supabase
      .from('estudiantes')
      .select(`
        id,
        nombre,
        apellido,
        id_padre,
        id_parada,
        created_at,
        padres(
          profiles(
            id,
            nombre,
            apellido
          )
        ),
        paradas(
          id,
          nombre,
          rutas(
            id,
            nombre
          )
        )
      `)
      .order('apellido', { ascending: true })
      .order('nombre', { ascending: true });

    if (error) {
      throw error;
    }

    // Mapear datos para tipos correctos
    const estudiantes = ((data || []) as unknown as EstudianteRow[]).map((est) => ({
      id: est.id,
      nombre: est.nombre,
      apellido: est.apellido,
      id_padre: est.id_padre,
      id_parada: est.id_parada,
      created_at: est.created_at,
      padre: est.padres?.profiles ? {
        id: est.padres.profiles.id,
        nombre: est.padres.profiles.nombre,
        apellido: est.padres.profiles.apellido,
      } : undefined,
      parada: est.paradas ? {
        id: est.paradas.id,
        nombre: est.paradas.nombre,
        ruta: est.paradas.rutas ? {
          id: est.paradas.rutas.id,
          nombre: est.paradas.rutas.nombre,
        } : undefined,
      } : undefined,
    }));

    return estudiantes;
  } catch (_error) {
    return [];
  }
}

/**
 * Busca estudiantes por nombre o apellido
 */
export async function searchEstudiantes(query: string): Promise<Estudiante[]> {
  try {
    const { data, error } = await supabase
      .from('estudiantes')
      .select(`
        id,
        nombre,
        apellido,
        id_padre,
        id_parada,
        created_at,
        padres(
          profiles(
            id,
            nombre,
            apellido
          )
        ),
        paradas(
          id,
          nombre,
          rutas(
            id,
            nombre
          )
        )
      `)
      .or(`nombre.ilike.%${query}%,apellido.ilike.%${query}%`)
      .order('apellido', { ascending: true });

    if (error) {
      throw error;
    }

    return ((data || []) as unknown as EstudianteRow[]).map((est) => ({
      id: est.id,
      nombre: est.nombre,
      apellido: est.apellido,
      id_padre: est.id_padre,
      id_parada: est.id_parada,
      created_at: est.created_at,
      padre: est.padres?.profiles ? {
        id: est.padres.profiles.id,
        nombre: est.padres.profiles.nombre,
        apellido: est.padres.profiles.apellido,
      } : undefined,
      parada: est.paradas ? {
        id: est.paradas.id,
        nombre: est.paradas.nombre,
        ruta: est.paradas.rutas ? {
          id: est.paradas.rutas.id,
          nombre: est.paradas.rutas.nombre,
        } : undefined,
      } : undefined,
    }));
  } catch (_error) {
    return [];
  }
}

/**
 * Crea un nuevo estudiante
 */
export async function createEstudiante(dto: CreateEstudianteDto): Promise<Estudiante | null> {
  try {
    const { data, error } = await supabase
      .from('estudiantes')
      .insert({
        nombre: dto.nombre.trim(),
        apellido: dto.apellido.trim(),
        id_padre: dto.id_padre,
        id_parada: dto.id_parada,
      })
      .select(`
        id,
        nombre,
        apellido,
        id_padre,
        id_parada,
        created_at,
        padres(
          profiles(
            id,
            nombre,
            apellido
          )
        ),
        paradas(
          id,
          nombre,
          rutas(
            id,
            nombre
          )
        )
      `)
      .single();

    if (error) {
      throw error;
    }

    return data as unknown as Estudiante;
  } catch (_error) {
    return null;
  }
}

/**
 * Actualiza un estudiante existente
 */
export async function updateEstudiante(
  id: string,
  dto: UpdateEstudianteDto
): Promise<boolean> {
  try {
    const updateData: any = {};

    if (dto.nombre !== undefined) updateData.nombre = dto.nombre.trim();
    if (dto.apellido !== undefined) updateData.apellido = dto.apellido.trim();
    if (dto.id_padre !== undefined) updateData.id_padre = dto.id_padre;
    if (dto.id_parada !== undefined) updateData.id_parada = dto.id_parada;

    const { error } = await supabase
      .from('estudiantes')
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
 * Elimina un estudiante
 */
export async function deleteEstudiante(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('estudiantes')
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
 * Obtiene la lista de padres para el autocomplete
 * Retorna solo padres activos con nombre y apellido
 */
export async function getPadresParaAsignar(): Promise<{
  id: string;
  nombre: string;
  apellido: string;
  nombreCompleto: string;
}[]> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, nombre, apellido')
      .eq('rol', 'padre')
      .order('apellido', { ascending: true })
      .order('nombre', { ascending: true });

    if (error) {
      throw error;
    }

    return (data || []).map((padre) => ({
      id: padre.id,
      nombre: padre.nombre,
      apellido: padre.apellido,
      nombreCompleto: `${padre.nombre} ${padre.apellido}`,
    }));
  } catch (_error) {
    return [];
  }
}

/**
 * Obtiene la lista de rutas disponibles
 */
export async function getRutasDisponibles(): Promise<{
  id: string;
  nombre: string;
}[]> {
  try {
    const { data, error } = await supabase
      .from('rutas')
      .select('id, nombre')
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
 * Obtiene la lista de paradas disponibles con información de su ruta
 */
export async function getParadasDisponibles(): Promise<{
  id: string;
  nombre: string | null;
  direccion: string | null;
  ruta: {
    id: string;
    nombre: string;
  } | null;
}[]> {
  try {
    const { data, error } = await supabase
      .from('paradas')
      .select(`
        id,
        nombre,
        direccion,
        rutas(
          id,
          nombre
        )
      `)
      .order('nombre', { ascending: true });

    if (error) {
      throw error;
    }

    return ((data || []) as unknown as ParadaRow[]).map((parada) => ({
      id: parada.id,
      nombre: parada.nombre,
      direccion: parada.direccion,
      ruta: parada.rutas ? {
        id: parada.rutas.id,
        nombre: parada.rutas.nombre,
      } : null,
    }));
  } catch (_error) {
    return [];
  }
}
