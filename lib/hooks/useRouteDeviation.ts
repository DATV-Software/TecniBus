import { sendPushToParents } from "@/lib/services/notifications.service";
import { distanciaAPolyline } from "@/lib/utils/routeDeviation";
import { useEffect, useRef, useState } from "react";

type Coord = { latitude: number; longitude: number };

type Options = {
  ubicacionActual: Coord | null;
  polylineCoordinates: Coord[];
  routeActive: boolean;
  idAsignacion: string | null;
  /** Metros fuera de ruta para declarar desvío. Default: 80 */
  umbralMetros?: number;
  /** Cooldown en ms entre notificaciones. Default: 2 min */
  cooldownMs?: number;
};

type Result = {
  desviado: boolean;
  distanciaDesvio: number | null;
};

/**
 * Detecta si el chofer se ha desviado de la ruta planificada.
 * - Calcula la distancia mínima del GPS actual a la polyline.
 * - Si supera umbralMetros, activa `desviado` y notifica a los padres.
 * - Cooldown de 2 min entre notificaciones para no saturar.
 * - Solo activo cuando hay ruta activa, polyline de al menos 2 puntos
 *   y la ubicación actual está disponible.
 */
export function useRouteDeviation({
  ubicacionActual,
  polylineCoordinates,
  routeActive,
  idAsignacion,
  umbralMetros = 80,
  cooldownMs = 2 * 60 * 1000,
}: Options): Result {
  const [desviado, setDesviado] = useState(false);
  const [distanciaDesvio, setDistanciaDesvio] = useState<number | null>(null);
  const ultimaNotificacionRef = useRef<number>(0);

  useEffect(() => {
    if (!routeActive || !ubicacionActual || polylineCoordinates.length < 2) {
      setDesviado(false);
      setDistanciaDesvio(null);
      return;
    }

    const distancia = distanciaAPolyline(ubicacionActual, polylineCoordinates);
    setDistanciaDesvio(distancia);

    const estaDesviado = distancia > umbralMetros;
    setDesviado(estaDesviado);

    if (estaDesviado && idAsignacion) {
      const ahora = Date.now();
      if (ahora - ultimaNotificacionRef.current > cooldownMs) {
        ultimaNotificacionRef.current = ahora;
        sendPushToParents(
          idAsignacion,
          "⚠️ Posible desvío de ruta",
          `La buseta se alejó ${Math.round(distancia)} m de la ruta planificada.`,
          { tipo: "desvio_ruta", distancia_metros: Math.round(distancia) },
        ).catch(() => {});
      }
    }
  }, [
    ubicacionActual?.latitude,
    ubicacionActual?.longitude,
    routeActive,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    polylineCoordinates.length,
    idAsignacion,
    umbralMetros,
    cooldownMs,
  ]);

  return { desviado, distanciaDesvio };
}
