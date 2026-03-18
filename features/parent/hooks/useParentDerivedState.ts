/**
 * Encapsulates all derived / computed state for the parent screen.
 * - ubicacionColegio: loaded once on mount
 * - paradasRuta: the single stop shown on the map (privacy — only child's stop)
 * - polylineRestante: trimmed polyline from current bus position forward
 * - timelineEvents: ordered route events with live statuses
 */
import { useEffect, useMemo, useState } from 'react';
import { getUbicacionColegio } from '@/lib/services/configuracion.service';
import { calcularPolylineRestante } from '@/lib/utils/polyline';
import { formatHoraEC } from '@/lib/utils/datetime';
import type { EstudianteDelPadre } from '@/lib/services/padres.service';
import type { Parada } from '@/lib/services/rutas.service';
import type { UbicacionActual } from '@/lib/services/ubicaciones.service';

export type TimelineEvent = {
  id: string;
  title: string;
  subtitle: string;
  time?: string;
  status: 'completed' | 'active' | 'upcoming';
  icon: 'board' | 'departure' | 'stop';
};

type Options = {
  tipoRuta: 'ida' | 'vuelta';
  choferEnCamino: boolean;
  horaInicioRecorrido: string | null;
  estudianteSeleccionado: EstudianteDelPadre | null;
  estimatedMinutes: number | null;
  etaColegio: number | null;
  estudianteRecogido: boolean;
  horaRecogida: string | null;
  horaLlegadaColegio: string | null;
  polylineCoordinates: { latitude: number; longitude: number }[];
  ubicacionBus: UbicacionActual | null;
};

type UbicacionColegio = { latitud: number; longitud: number; nombre: string };

export function useParentDerivedState({
  tipoRuta,
  choferEnCamino,
  horaInicioRecorrido,
  estudianteSeleccionado,
  estimatedMinutes,
  etaColegio,
  estudianteRecogido,
  horaRecogida,
  horaLlegadaColegio,
  polylineCoordinates,
  ubicacionBus,
}: Options) {
  const [ubicacionColegio, setUbicacionColegio] = useState<UbicacionColegio | null>(null);

  useEffect(() => {
    getUbicacionColegio()
      .then(setUbicacionColegio)
      .catch((e) => console.error('[Parent] Error cargando colegio:', e));
  }, []);

  // ── Single stop shown on map (only child's stop — privacy) ─────────────────
  const paradasRuta = useMemo<Parada[]>(() => {
    const parada = estudianteSeleccionado?.parada;
    if (!parada) return [];

    const latitud =
      typeof parada.latitud === 'string' ? parseFloat(parada.latitud) : parada.latitud;
    const longitud =
      typeof parada.longitud === 'string' ? parseFloat(parada.longitud) : parada.longitud;

    if (isNaN(latitud) || isNaN(longitud)) return [];

    return [
      {
        id: parada.id,
        nombre: parada.nombre || 'Mi parada',
        latitud,
        longitud,
        direccion: parada.direccion ?? null,
        id_ruta: parada.ruta?.id || '',
      },
    ];
  }, [estudianteSeleccionado?.parada]);

  // ── Remaining polyline from current bus position forward ───────────────────
  const polylineRestante = useMemo(() => {
    if (!polylineCoordinates.length || !ubicacionBus) return polylineCoordinates;
    return calcularPolylineRestante(polylineCoordinates, {
      latitude: ubicacionBus.latitud,
      longitude: ubicacionBus.longitud,
    });
  }, [polylineCoordinates, ubicacionBus?.latitud, ubicacionBus?.longitud]);

  // ── Timeline events ─────────────────────────────────────────────────────────
  const timelineEvents = useMemo<TimelineEvent[]>(() => {
    const events: TimelineEvent[] = [];
    const huboRecorrido = choferEnCamino || estudianteRecogido;
    const parada = estudianteSeleccionado?.parada;
    const nombreColegio = ubicacionColegio?.nombre || 'Colegio';

    if (tipoRuta === 'vuelta') {
      // VUELTA: Colegio (start) → student stop (destination)
      events.push({
        id: 'inicio',
        title: `Salida desde ${nombreColegio}`,
        subtitle: huboRecorrido
          ? `Salió a las ${horaInicioRecorrido ? formatHoraEC(horaInicioRecorrido) : '--:--'}`
          : 'Esperando inicio del recorrido',
        time:
          horaInicioRecorrido && huboRecorrido
            ? formatHoraEC(horaInicioRecorrido)
            : undefined,
        status: huboRecorrido ? 'completed' : 'upcoming',
        icon: 'board',
      });

      events.push(
        estudianteRecogido
          ? {
              id: 'parada-casa',
              title: parada?.nombre || 'Tu parada',
              subtitle: horaRecogida
                ? `Entregado a las ${horaRecogida}`
                : 'Estudiante entregado en su parada',
              status: 'completed',
              icon: 'stop',
            }
          : {
              id: 'parada-casa',
              title: parada?.nombre || 'Tu parada',
              subtitle: parada?.direccion || 'Destino del estudiante',
              time:
                choferEnCamino && estimatedMinutes !== null
                  ? `~${estimatedMinutes} min`
                  : undefined,
              status: choferEnCamino ? 'active' : 'upcoming',
              icon: 'stop',
            },
      );
    } else {
      // IDA: route start → student stop → school
      events.push({
        id: 'inicio',
        title: 'Inicio de recorrido',
        subtitle: huboRecorrido
          ? `Salió a las ${horaInicioRecorrido ? formatHoraEC(horaInicioRecorrido) : '--:--'}`
          : 'Esperando inicio del recorrido',
        time: horaInicioRecorrido ? formatHoraEC(horaInicioRecorrido) : undefined,
        status: huboRecorrido ? 'completed' : 'upcoming',
        icon: 'departure',
      });

      events.push(
        estudianteRecogido
          ? {
              id: 'parada-casa',
              title: parada?.nombre || 'Tu parada',
              subtitle: horaRecogida
                ? `Estudiante recogido a las ${horaRecogida}`
                : 'Estudiante recogido',
              status: 'completed',
              icon: 'stop',
            }
          : {
              id: 'parada-casa',
              title: parada?.nombre || 'Tu parada',
              subtitle: parada?.direccion || 'Parada asignada del estudiante',
              time:
                choferEnCamino && estimatedMinutes !== null
                  ? `~${estimatedMinutes} min`
                  : undefined,
              status: choferEnCamino ? 'active' : 'upcoming',
              icon: 'stop',
            },
      );

      const colegioCompletado = estudianteRecogido && !choferEnCamino;
      events.push({
        id: 'colegio',
        title: nombreColegio,
        subtitle: colegioCompletado
          ? horaLlegadaColegio
            ? `Llegaron a las ${horaLlegadaColegio}`
            : 'Llegaron al colegio'
          : 'Destino final del recorrido',
        time:
          !colegioCompletado && choferEnCamino && etaColegio !== null
            ? `~${etaColegio} min`
            : undefined,
        status: colegioCompletado
          ? 'completed'
          : estudianteRecogido
          ? 'active'
          : 'upcoming',
        icon: 'board',
      });
    }

    return events;
  }, [
    tipoRuta,
    choferEnCamino,
    horaInicioRecorrido,
    estudianteSeleccionado?.parada,
    ubicacionColegio,
    estimatedMinutes,
    etaColegio,
    estudianteRecogido,
    horaRecogida,
    horaLlegadaColegio,
  ]);

  return {
    ubicacionColegio,
    paradasRuta,
    polylineRestante,
    timelineEvents,
  };
}
