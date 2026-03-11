import { supabase } from './supabase';

// Estados simples de asistencia
export type EstadoAsistencia = 'presente' | 'ausente' | 'completado';

/**
 * Envía notificación push al padre sobre cambio de asistencia
 * @param idEstudiante ID del estudiante
 * @param tipo Tipo de notificación: 'subio', 'bajo', 'ausente'
 * @param nombreEstudiante Nombre completo del estudiante (opcional)
 */
async function notificarPadre(
  idEstudiante: string,
  tipo: 'subio' | 'bajo' | 'ausente',
  nombreEstudiante?: string
): Promise<void> {
  try {
    await supabase.functions.invoke('notificar-asistencia', {
      body: {
        id_estudiante: idEstudiante,
        tipo,
        nombre_estudiante: nombreEstudiante,
      },
    });
    console.log(`✅ Notificación enviada: ${tipo} - ${idEstudiante}`);
  } catch (error) {
    // No lanzamos error para no bloquear el flujo principal
    console.error('⚠️ Error enviando notificación al padre:', error);
  }
}

export type Asistencia = {
  id: string;
  id_estudiante: string;
  id_chofer: string;
  id_ruta: string | null;
  estado: EstadoAsistencia;
  fecha: string;
  notas: string | null;
  modificado_por: string | null;
  created_at: string;
  updated_at: string | null;
};

export type EstudianteConAsistencia = {
  id: string;
  nombre: string;
  apellido: string;
  parada: {
    id: string;
    nombre: string | null;
  } | null;
  estado: EstadoAsistencia;
};

/**
 * Padre marca/desmarca ausencia de su hijo
 */
export async function toggleAsistencia(
  idEstudiante: string,
  idRuta: string,
  marcarAusente: boolean
): Promise<boolean> {
  try {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) throw new Error('No autenticado');

    const hoy = new Date().toISOString().split('T')[0];

    // Verificar si ya existe registro hoy
    const { data: existente } = await supabase
      .from('asistencias')
      .select('id')
      .eq('id_estudiante', idEstudiante)
      .eq('fecha', hoy)
      .single();

    const nuevoEstado: EstadoAsistencia = marcarAusente ? 'ausente' : 'presente';

    if (existente) {
      // Actualizar existente
      const { error } = await supabase
        .from('asistencias')
        .update({
          estado: nuevoEstado,
          modificado_por: userId,
          notas: marcarAusente ? 'Marcado ausente por padre' : 'Marcado presente por padre',
        })
        .eq('id', existente.id);

      if (error) throw error;
    } else {
      // Obtener el chofer asignado a esta ruta usando RPC (bypassing RLS)
      const { data: idChofer, error: errorChofer } = await supabase
        .rpc('get_chofer_de_ruta', { p_id_ruta: idRuta });

      if (errorChofer || !idChofer) {
        console.error('❌ No hay chofer asignado a la ruta:', idRuta, errorChofer);
        throw new Error('No hay chofer asignado a esta ruta');
      }

      // Crear nuevo registro con el chofer correcto
      const { error } = await supabase
        .from('asistencias')
        .insert({
          id_estudiante: idEstudiante,
          id_chofer: idChofer,
          id_ruta: idRuta,
          estado: nuevoEstado,
          fecha: hoy,
          modificado_por: userId,
          notas: marcarAusente ? 'Marcado ausente por padre' : null,
        });

      if (error) throw error;
    }

    console.log(`✅ Asistencia actualizada: ${nuevoEstado} - ${idEstudiante}`);

    // Notificar al chofer de la ruta (no bloquear si falla)
    try {
      await supabase.functions.invoke('notificar-asistencia', {
        body: {
          id_estudiante: idEstudiante,
          id_ruta: idRuta,
          tipo: marcarAusente ? 'padre_ausente' : 'padre_presente',
          destinatario: 'chofer',
        },
      });
      console.log(`✅ Chofer notificado sobre cambio de asistencia`);
    } catch (error) {
      console.error('⚠️ Error notificando al chofer:', error);
    }

    return true;
  } catch (error) {
    console.error('❌ Error en toggleAsistencia:', error);
    return false;
  }
}

/**
 * Chofer marca estudiante como ausente (no se subió)
 */
export async function marcarAusente(
  idEstudiante: string,
  idRuta: string,
  idChofer: string
): Promise<boolean> {
  try {
    const hoy = new Date().toISOString().split('T')[0];

    // Verificar si existe
    const { data: existente } = await supabase
      .from('asistencias')
      .select('id')
      .eq('id_estudiante', idEstudiante)
      .eq('fecha', hoy)
      .single();

    if (existente) {
      // Actualizar a ausente
      const { error } = await supabase
        .from('asistencias')
        .update({
          estado: 'ausente',
          modificado_por: idChofer,
          notas: 'Marcado ausente por chofer - no se subió',
        })
        .eq('id', existente.id);

      if (error) throw error;
    } else {
      // Crear como ausente
      const { error } = await supabase
        .from('asistencias')
        .insert({
          id_estudiante: idEstudiante,
          id_chofer: idChofer,
          id_ruta: idRuta,
          estado: 'ausente',
          fecha: hoy,
          modificado_por: idChofer,
          notas: 'Marcado ausente por chofer - no se subió',
        });

      if (error) throw error;
    }

    console.log(`✅ Estudiante marcado ausente: ${idEstudiante}`);

    // Notificar al padre (no bloquear si falla)
    await notificarPadre(idEstudiante, 'ausente');

    return true;
  } catch (error) {
    console.error('❌ Error en marcarAusente:', error);
    return false;
  }
}

/**
 * Chofer marca estudiante como presente cuando sube a la buseta (check-in)
 */
export async function marcarSubida(
  idEstudiante: string,
  idRuta: string,
  idChofer: string,
  nombreEstudiante?: string
): Promise<boolean> {
  try {
    const hoy = new Date().toISOString().split('T')[0];

    // Verificar si existe
    const { data: existente } = await supabase
      .from('asistencias')
      .select('id, estado')
      .eq('id_estudiante', idEstudiante)
      .eq('fecha', hoy)
      .single();

    if (existente) {
      // Solo actualizar si estaba ausente o presente (no si ya estaba completado)
      if (existente.estado !== 'completado') {
        const { error } = await supabase
          .from('asistencias')
          .update({
            estado: 'presente',
            modificado_por: idChofer,
            notas: 'Estudiante subió a la buseta',
          })
          .eq('id', existente.id);

        if (error) throw error;
      }
    } else {
      // Crear nuevo registro
      const { error } = await supabase
        .from('asistencias')
        .insert({
          id_estudiante: idEstudiante,
          id_chofer: idChofer,
          id_ruta: idRuta,
          estado: 'presente',
          fecha: hoy,
          modificado_por: idChofer,
          notas: 'Estudiante subió a la buseta',
        });

      if (error) throw error;
    }

    console.log(`✅ Estudiante marcó subida: ${idEstudiante}`);

    // Notificar al padre
    await notificarPadre(idEstudiante, 'subio', nombreEstudiante);

    return true;
  } catch (error) {
    console.error('❌ Error en marcarSubida:', error);
    return false;
  }
}

/**
 * Chofer marca estudiante como completado cuando baja de la buseta (check-out)
 */
export async function marcarBajada(
  idEstudiante: string,
  idRuta: string,
  idChofer: string,
  nombreEstudiante?: string
): Promise<boolean> {
  try {
    const hoy = new Date().toISOString().split('T')[0];

    // Verificar si existe
    const { data: existente } = await supabase
      .from('asistencias')
      .select('id')
      .eq('id_estudiante', idEstudiante)
      .eq('fecha', hoy)
      .single();

    if (existente) {
      // Actualizar a completado
      const { error } = await supabase
        .from('asistencias')
        .update({
          estado: 'completado',
          modificado_por: idChofer,
          notas: 'Estudiante bajó de la buseta - llegó a destino',
        })
        .eq('id', existente.id);

      if (error) throw error;
    } else {
      // Si no existe, crear directamente como completado
      const { error } = await supabase
        .from('asistencias')
        .insert({
          id_estudiante: idEstudiante,
          id_chofer: idChofer,
          id_ruta: idRuta,
          estado: 'completado',
          fecha: hoy,
          modificado_por: idChofer,
          notas: 'Estudiante bajó de la buseta - llegó a destino',
        });

      if (error) throw error;
    }

    console.log(`✅ Estudiante marcó bajada: ${idEstudiante}`);

    // Notificar al padre
    await notificarPadre(idEstudiante, 'bajo', nombreEstudiante);

    return true;
  } catch (error) {
    console.error('❌ Error en marcarBajada:', error);
    return false;
  }
}

/**
 * Obtiene estudiantes de la ruta con su estado de asistencia
 * Por defecto todos están "presente" a menos que se marque lo contrario
 */
export async function getEstudiantesConAsistencia(
  idRuta: string,
  idChofer: string
): Promise<EstudianteConAsistencia[]> {
  try {
    console.log(`🔍 Buscando estudiantes para ruta: ${idRuta}`);

    // 1. Obtener paradas de la ruta
    const { data: paradasRuta, error: errorParadas } = await supabase
      .from('paradas')
      .select('id')
      .eq('id_ruta', idRuta);

    if (errorParadas) throw errorParadas;

    const paradasIds = (paradasRuta || []).map(p => p.id);
    if (paradasIds.length === 0) return [];

    // 2. Obtener estudiantes
    const { data: estudiantes, error: errorEstudiantes } = await supabase
      .from('estudiantes')
      .select(`
        id,
        nombre,
        apellido,
        id_parada,
        paradas(id, nombre)
      `)
      .in('id_parada', paradasIds)
      .order('apellido', { ascending: true });

    if (errorEstudiantes) throw errorEstudiantes;
    if (!estudiantes || estudiantes.length === 0) return [];

    // 3. Obtener asistencias del día
    const hoy = new Date().toISOString().split('T')[0];
    const estudiantesIds = estudiantes.map((e: any) => e.id);

    const { data: asistencias } = await supabase
      .from('asistencias')
      .select('id_estudiante, estado')
      .in('id_estudiante', estudiantesIds)
      .eq('fecha', hoy);

    // 4. Combinar datos (default: presente)
    const resultado: EstudianteConAsistencia[] = estudiantes.map((est: any) => {
      const asistencia = asistencias?.find((a: any) => a.id_estudiante === est.id);

      return {
        id: est.id,
        nombre: est.nombre,
        apellido: est.apellido,
        parada: est.paradas
          ? {
              id: est.paradas.id,
              nombre: est.paradas.nombre,
            }
          : null,
        estado: asistencia?.estado || 'presente', // Default: presente
      };
    });

    console.log(`✅ ${resultado.length} estudiantes cargados`);
    return resultado;
  } catch (error) {
    console.error('❌ Error en getEstudiantesConAsistencia:', error);
    return [];
  }
}

/**
 * Obtiene el estado de asistencia actual de un estudiante
 */
export async function getEstadoAsistencia(
  idEstudiante: string
): Promise<EstadoAsistencia> {
  try {
    const hoy = new Date().toISOString().split('T')[0];

    const { data } = await supabase
      .from('asistencias')
      .select('estado')
      .eq('id_estudiante', idEstudiante)
      .eq('fecha', hoy)
      .single();

    return data?.estado || 'presente';
  } catch (error) {
    return 'presente'; // Default
  }
}
