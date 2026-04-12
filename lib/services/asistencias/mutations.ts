import { supabase } from '@/lib/services/supabase';
import type { EstadoAsistencia, EstudianteConAsistencia } from './types';
import {
  fechaHoy,
  findAsistenciaHoy,
  findAsistenciaIdHoy,
  loadAsistenciasDeHoyMap,
} from './queries';
import { notificarPadre } from './notifications';

// ── Helpers internos ──────────────────────────────────────────────────────────

async function actualizarEstadoAsistencia(
  idAsistencia: string,
  estado: EstadoAsistencia,
  modificadoPor: string,
  notas: string | null
): Promise<void> {
  const { error } = await supabase
    .from('asistencias')
    .update({ estado, modificado_por: modificadoPor, notas })
    .eq('id', idAsistencia)
    .throwOnError();

  if (error) throw error;
}

async function crearAsistencia(params: {
  idEstudiante: string;
  idChofer: string;
  idRuta: string;
  estado: EstadoAsistencia;
  modificadoPor: string;
  notas: string | null;
}): Promise<void> {
  const { error } = await supabase
    .from('asistencias')
    .insert({
      id_estudiante: params.idEstudiante,
      id_chofer: params.idChofer,
      id_ruta: params.idRuta,
      estado: params.estado,
      fecha: fechaHoy(),
      modificado_por: params.modificadoPor,
      notas: params.notas,
    })
    .throwOnError();

  if (error) throw error;
}

// ── Mutaciones públicas ───────────────────────────────────────────────────────

/**
 * El padre marca o desmarca la ausencia de su hijo para el día de hoy.
 * Crea el registro si no existe; actualiza si ya existe.
 * Notifica al chofer de la ruta cuando finaliza.
 */
export async function toggleAsistencia(
  idEstudiante: string,
  idRuta: string,
  marcarAusenteFlag: boolean
): Promise<boolean> {
  try {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) throw new Error('No autenticado');

    const nuevoEstado: EstadoAsistencia = marcarAusenteFlag ? 'ausente' : 'presente';
    const notas = marcarAusenteFlag
      ? 'Marcado ausente por padre'
      : 'Marcado presente por padre';

    const existente = await findAsistenciaIdHoy(idEstudiante);

    if (existente) {
      await actualizarEstadoAsistencia(existente.id, nuevoEstado, userId, notas);
    } else {
      const { data: idChofer, error: errorChofer } = await supabase
        .rpc('get_chofer_de_ruta', { p_id_ruta: idRuta });

      if (errorChofer || !idChofer) {
        throw new Error('No hay chofer asignado a esta ruta');
      }

      await crearAsistencia({
        idEstudiante,
        idChofer: idChofer as string,
        idRuta,
        estado: nuevoEstado,
        modificadoPor: userId,
        notas: marcarAusenteFlag ? 'Marcado ausente por padre' : null,
      });
    }

    // Notificar al chofer — sin bloquear flujo principal
    try {
      await supabase.functions.invoke('notificar-asistencia', {
        body: {
          id_estudiante: idEstudiante,
          id_ruta: idRuta,
          tipo: marcarAusenteFlag ? 'padre_ausente' : 'padre_presente',
          destinatario: 'chofer',
        },
      });
    } catch (error) {
    }

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * El chofer marca a un estudiante como ausente (no se subió a la buseta).
 * Notifica al padre al finalizar.
 */
export async function marcarAusente(
  idEstudiante: string,
  idRuta: string,
  idChofer: string
): Promise<boolean> {
  try {
    const notas = 'Marcado ausente por chofer - no se subio';
    const existente = await findAsistenciaIdHoy(idEstudiante);

    if (existente) {
      await actualizarEstadoAsistencia(existente.id, 'ausente', idChofer, notas);
    } else {
      await crearAsistencia({
        idEstudiante,
        idChofer,
        idRuta,
        estado: 'ausente',
        modificadoPor: idChofer,
        notas,
      });
    }

    await notificarPadre(idEstudiante, 'ausente');

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * El chofer marca a un estudiante como presente cuando sube a la buseta (check-in).
 * No modifica el registro si ya está en estado 'completado'.
 * Notifica al padre al finalizar.
 */
export async function marcarSubida(
  idEstudiante: string,
  idRuta: string,
  idChofer: string,
  nombreEstudiante?: string,
  tipoRuta?: string
): Promise<boolean> {
  if (tipoRuta !== undefined && !['ida', 'vuelta'].includes(tipoRuta)) {
    throw new Error(`tipoRuta inválido: ${tipoRuta}`);
  }
  try {
    const notas = 'Estudiante subio a la buseta';
    const existente = await findAsistenciaHoy(idEstudiante);

    if (existente) {
      if (existente.estado !== 'completado') {
        await actualizarEstadoAsistencia(existente.id, 'presente', idChofer, notas);
      }
    } else {
      await crearAsistencia({
        idEstudiante,
        idChofer,
        idRuta,
        estado: 'presente',
        modificadoPor: idChofer,
        notas,
      });
    }

    await notificarPadre(idEstudiante, 'subio', nombreEstudiante);

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * El chofer marca a un estudiante como completado cuando baja de la buseta (check-out).
 * Si no existe registro previo, crea uno directamente como 'completado'.
 * Notifica al padre al finalizar.
 */
export async function marcarBajada(
  idEstudiante: string,
  idRuta: string,
  idChofer: string,
  nombreEstudiante?: string,
  tipoRuta?: string
): Promise<boolean> {
  if (tipoRuta !== undefined && !['ida', 'vuelta'].includes(tipoRuta)) {
    throw new Error(`tipoRuta inválido: ${tipoRuta}`);
  }
  try {
    const notas = 'Estudiante bajo de la buseta - llego a destino';
    const existente = await findAsistenciaIdHoy(idEstudiante);

    if (existente) {
      await actualizarEstadoAsistencia(existente.id, 'completado', idChofer, notas);
    } else {
      await crearAsistencia({
        idEstudiante,
        idChofer,
        idRuta,
        estado: 'completado',
        modificadoPor: idChofer,
        notas,
      });
    }

    await notificarPadre(idEstudiante, 'bajo', nombreEstudiante);

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Confirma asistencia antes de iniciar un recorrido de VUELTA.
 * Los estudiantes en `ausentesIds` se marcan ausentes; el resto queda en 'presente'.
 * Solo notifica a los padres de los estudiantes que el chofer ACABA de marcar ausentes
 * (excluye los que ya tenían falta justificada por el padre).
 */
export async function confirmarAsistenciaVuelta(
  idRuta: string,
  idChofer: string,
  ausentesIds: string[],
  todosLosEstudiantes: EstudianteConAsistencia[]
): Promise<boolean> {
  try {
    const ausentesSet = new Set(ausentesIds);
    const estudiantesIds = todosLosEstudiantes.map((e) => e.id);

    const existentesMap = await loadAsistenciasDeHoyMap(estudiantesIds);

    const toUpdate: Array<{
      id: string;
      estado: EstadoAsistencia;
      notas: string | null;
      modificado_por: string;
    }> = [];

    const toInsert: Array<{
      id_estudiante: string;
      id_chofer: string;
      id_ruta: string;
      estado: EstadoAsistencia;
      fecha: string;
      modificado_por: string;
      notas: string | null;
    }> = [];

    for (const est of todosLosEstudiantes) {
      const isAusente = ausentesSet.has(est.id);
      const estado: EstadoAsistencia = isAusente ? 'ausente' : 'presente';
      const notas = isAusente ? 'Marcado ausente por chofer - vuelta' : null;
      const existenteId = existentesMap.get(est.id);

      if (existenteId) {
        toUpdate.push({ id: existenteId, estado, notas, modificado_por: idChofer });
      } else {
        toInsert.push({
          id_estudiante: est.id,
          id_chofer: idChofer,
          id_ruta: idRuta,
          estado,
          fecha: fechaHoy(),
          modificado_por: idChofer,
          notas,
        });
      }
    }

    // Ejecutar insert y updates en paralelo.
    // throwOnError() devuelve un PromiseLike (thenable de PostgREST), no un Promise
    // completo. Usamos PromiseLike<unknown> para el array y Promise.all lo maneja.
    const ops: Array<PromiseLike<unknown>> = [];

    if (toInsert.length > 0) {
      ops.push(
        supabase
          .from('asistencias')
          .insert(toInsert)
          .throwOnError()
      );
    }

    for (const u of toUpdate) {
      ops.push(
        supabase
          .from('asistencias')
          .update({
            estado: u.estado,
            notas: u.notas,
            modificado_por: u.modificado_por,
          })
          .eq('id', u.id)
          .throwOnError()
      );
    }

    await Promise.all(ops);

    // Notificar solo a padres de estudiantes recién marcados ausentes
    const notifOps = todosLosEstudiantes
      .filter((e) => ausentesSet.has(e.id) && e.estado !== 'ausente')
      .map((e) =>
        notificarPadre(e.id, 'ausente', `${e.nombre} ${e.apellido}`).catch(() => {})
      );

    await Promise.all(notifOps);

    return true;
  } catch (error) {
    return false;
  }
}
