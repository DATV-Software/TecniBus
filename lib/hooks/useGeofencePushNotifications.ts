import { sendPushToStudentParent } from "@/lib/services/notifications.service";
import { useEffect, useRef } from "react";

type EstudianteGeocerca = {
  id_estudiante: string;
  nombreCompleto: string;
  parada_nombre: string | null;
} | null;

type RecorridoMinimo = { id: string } | null;

type EstudianteEstado = { id: string; estado: string };

/**
 * Envía push notifications al padre del estudiante al entrar y salir de la geocerca.
 * Usa notificación dirigida (solo al padre del estudiante, no a todos los padres de la ruta).
 * IDA  — entrada: "la buseta se acerca"; salida: "fue recogido"
 * VUELTA — entrada: "está cerca de llegar"; salida: "fue entregado"
 */
export function useGeofencePushNotifications(
  dentroDeZona: boolean,
  estudianteGeocerca: EstudianteGeocerca,
  recorridoActual: RecorridoMinimo,
  estudiantes?: EstudianteEstado[],
  tipoRuta: 'ida' | 'vuelta' = 'ida',
) {
  const lastPushStudentRef = useRef<string | null>(null);
  const prevDentroDeZonaRef = useRef(false);
  const prevEstudianteRef = useRef<EstudianteGeocerca>(null);

  // Entrada: notificar al padre del estudiante
  useEffect(() => {
    if (!dentroDeZona || !estudianteGeocerca || !recorridoActual) return;
    if (lastPushStudentRef.current === estudianteGeocerca.id_estudiante) return;
    lastPushStudentRef.current = estudianteGeocerca.id_estudiante;

    const titulo = tipoRuta === 'vuelta' ? '🏠 Tu hijo está llegando' : '🚌 La buseta esta cerca';
    const cuerpo = tipoRuta === 'vuelta'
      ? `La buseta está cerca de la parada de ${estudianteGeocerca.nombreCompleto}. Prepárate para recibirlo.`
      : `La buseta se acerca a la parada de ${estudianteGeocerca.nombreCompleto}. Prepárense para abordaje.`;

    sendPushToStudentParent(
      estudianteGeocerca.id_estudiante,
      titulo,
      cuerpo,
    ).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dentroDeZona, estudianteGeocerca?.id_estudiante, recorridoActual?.id, tipoRuta]);

  // Salida: notificar que el estudiante fue recogido/entregado (solo si no fue marcado ausente)
  useEffect(() => {
    const estabaDentro = prevDentroDeZonaRef.current;
    const prevEst = prevEstudianteRef.current;
    if (estabaDentro && !dentroDeZona && prevEst && recorridoActual) {
      const estudianteActual = estudiantes?.find(
        (e) => e.id === prevEst.id_estudiante,
      );
      if (estudianteActual?.estado !== "ausente") {
        const titulo = tipoRuta === 'vuelta' ? '✅ Entregado correctamente' : '✅ Recogido correctamente';
        const cuerpo = tipoRuta === 'vuelta'
          ? `${prevEst.nombreCompleto} fue entregado en su parada correctamente.`
          : `${prevEst.nombreCompleto} fue recogido por la buseta y ya va camino al colegio.`;

        sendPushToStudentParent(
          prevEst.id_estudiante,
          titulo,
          cuerpo,
        ).catch(() => {});
      }
    }
    prevDentroDeZonaRef.current = dentroDeZona;
    prevEstudianteRef.current = estudianteGeocerca;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dentroDeZona, estudianteGeocerca?.id_estudiante, recorridoActual?.id, tipoRuta]);
}
