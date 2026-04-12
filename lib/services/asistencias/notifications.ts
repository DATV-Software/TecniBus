import { supabase } from '@/lib/services/supabase';
import type { TipoNotificacionPadre } from './types';

/**
 * Envía notificación push al padre sobre cambio de asistencia de su hijo.
 * Los errores se capturan silenciosamente para no bloquear el flujo principal.
 *
 * @param idEstudiante ID del estudiante afectado
 * @param tipo Tipo de evento: 'subio' | 'bajo' | 'ausente'
 * @param nombreEstudiante Nombre completo del estudiante (opcional, para el mensaje)
 */
export async function notificarPadre(
  idEstudiante: string,
  tipo: TipoNotificacionPadre,
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
  } catch (error) {
  }
}
