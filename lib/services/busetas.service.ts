import { supabase } from './supabase';

export type Buseta = {
  id: string;
  placa: string;
  capacidad: number;
};

export type CreateBusetaDto = {
  placa: string;
  capacidad: number;
};

export type UpdateBusetaDto = Partial<CreateBusetaDto>;

/**
 * Obtiene todas las busetas ordenadas por placa
 */
export async function getBusetas(): Promise<Buseta[]> {
  try {
    const { data, error } = await supabase
      .from('busetas')
      .select('id, placa, capacidad')
      .order('placa', { ascending: true });

    if (error) {
      console.error('❌ Error obteniendo busetas:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('❌ Error en getBusetas:', error);
    return [];
  }
}

/**
 * Busca busetas por placa
 */
export async function searchBusetas(query: string): Promise<Buseta[]> {
  try {
    const { data, error } = await supabase
      .from('busetas')
      .select('id, placa, capacidad')
      .ilike('placa', `%${query}%`)
      .order('placa', { ascending: true });

    if (error) {
      console.error('❌ Error buscando busetas:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('❌ Error en searchBusetas:', error);
    return [];
  }
}

/**
 * Crea una nueva buseta
 */
export async function createBuseta(dto: CreateBusetaDto): Promise<Buseta | null> {
  try {
    const { data, error } = await supabase
      .from('busetas')
      .insert({
        placa: dto.placa.trim().toUpperCase(),
        capacidad: dto.capacidad,
      })
      .select('id, placa, capacidad')
      .single();

    if (error) {
      console.error('❌ Error creando buseta:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('❌ Error en createBuseta:', error);
    return null;
  }
}

/**
 * Actualiza una buseta existente
 */
export async function updateBuseta(
  id: string,
  dto: UpdateBusetaDto
): Promise<boolean> {
  try {
    const updateData: any = {};

    if (dto.placa !== undefined) updateData.placa = dto.placa.trim().toUpperCase();
    if (dto.capacidad !== undefined) updateData.capacidad = dto.capacidad;

    const { error } = await supabase
      .from('busetas')
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.error('❌ Error actualizando buseta:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('❌ Error en updateBuseta:', error);
    return false;
  }
}

/**
 * Elimina una buseta
 * Verifica que no haya choferes asignados antes de eliminar
 */
export async function deleteBuseta(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Verificar si hay choferes asignados
    const { data: choferes, error: choferesError } = await supabase
      .from('choferes')
      .select('id')
      .eq('id_buseta', id)
      .limit(1);

    if (choferesError) {
      console.error('❌ Error verificando choferes:', choferesError);
      throw choferesError;
    }

    if (choferes && choferes.length > 0) {
      return {
        success: false,
        error: 'No se puede eliminar la buseta porque tiene choferes asignados',
      };
    }

    // Si no hay choferes, proceder con la eliminación
    const { error } = await supabase
      .from('busetas')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Error eliminando buseta:', error);
      throw error;
    }

    return { success: true };
  } catch (error) {
    console.error('❌ Error en deleteBuseta:', error);
    return { success: false, error: 'Error al eliminar la buseta' };
  }
}
