import { supabase } from './supabase';
import { sendPushToParents } from './notifications.service';

export type EstadoRecorrido = {
  activo: boolean;
  hora_inicio: string | null;
  hora_fin: string | null;
};

export type EstadoRecorridoConAsignacion = EstadoRecorrido & {
  id_asignacion: string | null;
  eta_paradas: Record<string, number> | null;
};

async function sendBroadcast(event: string, payload: Record<string, unknown>): Promise<void> {
  const channel = supabase.channel('recorrido-status');
  await channel.httpSend(event, payload);
}

export async function guardarPolylineRuta(
  idAsignacion: string,
  polylineCoordinates: { latitude: number; longitude: number }[]
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('asignaciones_ruta')
      .update({ polyline_coordinates: polylineCoordinates })
      .eq('id', idAsignacion);

    if (error) throw error;
    return true;
  } catch (_error) {
    return false;
  }
}

export async function getPolylineAsignacion(
  idAsignacion: string
): Promise<{ latitude: number; longitude: number }[]> {
  try {
    const { data } = await supabase.rpc('get_polyline_asignacion', {
      p_id_asignacion: idAsignacion,
    });
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function publishETAsToRecorrido(
  idAsignacion: string,
  etas: Record<string, number | null>
): Promise<void> {
  const { error } = await supabase
    .from('estados_recorrido')
    .update({ eta_paradas: etas })
    .eq('id_asignacion', idAsignacion);
  if (error) return;
}

export async function iniciarRecorrido(idAsignacion: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('iniciar_recorrido', {
      p_id_asignacion: idAsignacion,
    });

    if (error) throw error;

    await sendBroadcast('recorrido_iniciado', { id_asignacion: idAsignacion, activo: true });

    sendPushToParents(
      idAsignacion,
      'Buseta en camino',
      'La buseta ha iniciado el recorrido. Puedes seguirla en tiempo real.',
      { id_asignacion: idAsignacion, tipo: 'recorrido_iniciado' }
    ).catch(() => {});

    return data || true;
  } catch (_error) {
    return false;
  }
}

export async function finalizarRecorrido(idAsignacion: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('finalizar_recorrido', {
      p_id_asignacion: idAsignacion,
    });

    if (error) throw error;

    await sendBroadcast('recorrido_finalizado', { id_asignacion: idAsignacion, activo: false });

    return data || true;
  } catch (_error) {
    return false;
  }
}

export async function getEstadoRecorrido(
  idAsignacion: string
): Promise<EstadoRecorrido | null> {
  try {
    const { data, error } = await supabase.rpc('get_estado_recorrido', {
      p_id_asignacion: idAsignacion,
    });

    if (error) throw error;

    const estado = Array.isArray(data) && data.length > 0 ? data[0] : null;

    return estado
      ? { activo: estado.activo || false, hora_inicio: estado.hora_inicio, hora_fin: estado.hora_fin }
      : { activo: false, hora_inicio: null, hora_fin: null };
  } catch (_error) {
    return null;
  }
}

export async function getEstadoRecorridoPorRuta(
  idRuta: string
): Promise<EstadoRecorridoConAsignacion | null> {
  try {
    const { data, error } = await supabase.rpc('get_estado_recorrido_por_ruta', {
      p_id_ruta: idRuta,
    });

    if (error) throw error;

    const estado = Array.isArray(data) && data.length > 0 ? data[0] : null;

    return estado
      ? {
          activo: estado.activo || false,
          hora_inicio: estado.hora_inicio,
          hora_fin: estado.hora_fin,
          id_asignacion: estado.id_asignacion,
          eta_paradas: estado.eta_paradas ?? null,
        }
      : { activo: false, hora_inicio: null, hora_fin: null, id_asignacion: null, eta_paradas: null };
  } catch (_error) {
    return null;
  }
}
