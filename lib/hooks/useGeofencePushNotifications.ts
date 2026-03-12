import { sendPushToParents } from "@/lib/services/notifications.service";
import { useEffect, useRef } from "react";

type EstudianteGeocerca = {
  id_estudiante: string;
  nombreCompleto: string;
  parada_nombre: string | null;
} | null;

type RecorridoMinimo = { id: string } | null;

/**
 * Envía push notifications a los padres al entrar y salir de la geocerca de una parada.
 * Consolida la lógica de entrada/salida que antes vivía como dos efectos con refs en el screen.
 */
export function useGeofencePushNotifications(
  dentroDeZona: boolean,
  estudianteGeocerca: EstudianteGeocerca,
  recorridoActual: RecorridoMinimo,
) {
  const lastPushStudentRef = useRef<string | null>(null);
  const prevDentroDeZonaRef = useRef(false);
  const prevEstudianteRef = useRef<EstudianteGeocerca>(null);

  // Entrada: notificar al padre que la buseta se acerca
  useEffect(() => {
    if (!dentroDeZona || !estudianteGeocerca || !recorridoActual) return;
    if (lastPushStudentRef.current === estudianteGeocerca.id_estudiante) return;
    lastPushStudentRef.current = estudianteGeocerca.id_estudiante;

    sendPushToParents(
      recorridoActual.id,
      "🚌 La buseta esta cerca",
      `La buseta se acerca a la parada de ${estudianteGeocerca.nombreCompleto}. Prepárense para abordaje.`,
      { tipo: "geocerca_entrada", id_estudiante: estudianteGeocerca.id_estudiante },
    ).catch(() => {});
  }, [dentroDeZona, estudianteGeocerca?.id_estudiante, recorridoActual?.id]);

  // Salida: notificar que el estudiante fue recogido
  useEffect(() => {
    const estabaDentro = prevDentroDeZonaRef.current;
    const prevEst = prevEstudianteRef.current;
    if (estabaDentro && !dentroDeZona && prevEst && recorridoActual) {
      sendPushToParents(
        recorridoActual.id,
        "✅ Recogido correctamente",
        `${prevEst.nombreCompleto} fue recogido por la buseta y ya va camino al colegio.`,
        { tipo: "geocerca_salida", id_estudiante: prevEst.id_estudiante },
      ).catch(() => {});
    }
    prevDentroDeZonaRef.current = dentroDeZona;
    prevEstudianteRef.current = estudianteGeocerca;
  }, [dentroDeZona, estudianteGeocerca?.id_estudiante, recorridoActual?.id]);
}
