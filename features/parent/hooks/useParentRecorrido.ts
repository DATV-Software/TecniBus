import { getChoferDeRuta } from "@/lib/services/fleet/asignaciones.service";
import {
  getEstadoRecorridoPorRuta,
  getPolylineAsignacion,
} from "@/lib/services/routing/recorridos.service";
import type { EstudianteDelPadre } from "@/lib/services/students/padres.service";
import { supabase } from "@/lib/services/core/supabase";
import {
  getUltimaUbicacion,
  suscribirseAUbicaciones,
  type UbicacionActual,
} from "@/lib/services/fleet/ubicaciones.service";
import { formatHoraEC } from "@/lib/utils/datetime";
import { useCallback, useEffect, useState } from "react";

export function useParentRecorrido(estudiante: EstudianteDelPadre | null, isAttending = true) {
  const [choferEnCamino, setChoferEnCamino] = useState(false);
  const [idAsignacion, setIdAsignacion] = useState<string | null>(null);
  const [horaInicioRecorrido, setHoraInicioRecorrido] = useState<string | null>(null);
  const [polylineCoordinates, setPolylineCoordinates] = useState<
    { latitude: number; longitude: number }[]
  >([]);
  const [estimatedMinutes, setEstimatedMinutes] = useState<number | null>(null);
  const [etaColegio, setEtaColegio] = useState<number | null>(null);
  const [horaLlegadaColegio, setHoraLlegadaColegio] = useState<string | null>(null);
  const [nombreChofer, setNombreChofer] = useState<string | null>(null);
  const [idChofer, setIdChofer] = useState<string | null>(null);
  const [ubicacionBus, setUbicacionBus] = useState<UbicacionActual | null>(null);
  const [tipoRuta, setTipoRuta] = useState<'ida' | 'vuelta'>('ida');

  const idRuta = estudiante?.parada?.ruta?.id ?? null;
  const paradaId = estudiante?.parada?.id ?? null;
  const tipoRutaFromEstudiante = estudiante?.parada?.ruta?.tipo ?? 'ida';

  const applyETAs = useCallback(
    (etaData: Record<string, number>) => {
      setEstimatedMinutes(paradaId != null && etaData[paradaId] != null ? etaData[paradaId] : null);
      setEtaColegio(etaData["colegio"] ?? null);
    },
    [paradaId],
  );

  const cargarEstadoRecorrido = useCallback(async () => {
    if (!idRuta) return;
    try {
      const estado = await getEstadoRecorridoPorRuta(idRuta);
      const activo = estado?.activo || false;

      setChoferEnCamino(activo);
      setIdAsignacion(estado?.id_asignacion || null);
      setHoraInicioRecorrido(activo ? (estado?.hora_inicio || null) : null);

      // Si el estudiante está ausente, no cargar polyline/ETAs (ahorro de recursos)
      if (activo && estado?.id_asignacion && isAttending) {
        const polyline = await getPolylineAsignacion(estado.id_asignacion);
        setPolylineCoordinates(polyline);
        if (estado.eta_paradas) applyETAs(estado.eta_paradas);
      } else {
        setPolylineCoordinates([]);
        setUbicacionBus(null);
        setEstimatedMinutes(null);
        setEtaColegio(null);
      }
    } catch (_error) {
      setChoferEnCamino(false);
      setPolylineCoordinates([]);
      setUbicacionBus(null);
    }
  }, [idRuta, applyETAs, isAttending]);

  const refreshETAs = useCallback(async () => {
    if (!idRuta || !choferEnCamino) return;
    const estado = await getEstadoRecorridoPorRuta(idRuta);
    if (estado?.eta_paradas) applyETAs(estado.eta_paradas);
  }, [choferEnCamino, idRuta, applyETAs]);

  // Resetear y recargar al cambiar de estudiante
  useEffect(() => {
    setChoferEnCamino(false);
    setIdAsignacion(null);
    setHoraInicioRecorrido(null);
    setPolylineCoordinates([]);
    setUbicacionBus(null);
    setEstimatedMinutes(null);
    setEtaColegio(null);
    setHoraLlegadaColegio(null);

    if (idRuta) cargarEstadoRecorrido();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estudiante?.id]);

  // Sincronizar tipoRuta desde el estudiante (disponible inmediatamente, sin query extra)
  useEffect(() => {
    setTipoRuta(tipoRutaFromEstudiante);
  }, [tipoRutaFromEstudiante]);

  // Cargar nombre e ID del chofer al cambiar de ruta
  useEffect(() => {
    if (!idRuta) {
      setNombreChofer(null);
      setIdChofer(null);
      return;
    }
    getChoferDeRuta(idRuta).then((chofer) => {
      setNombreChofer(chofer?.nombre || null);
      setIdChofer(chofer?.id || null);
    });
  }, [idRuta]);

  // Broadcast: recorrido iniciado / finalizado
  // No filtramos por idAsignacion porque al inicio es null y perderíamos el evento
  useEffect(() => {
    if (!idRuta) return;
    const channel = supabase
      .channel("recorrido-status")
      .on("broadcast", { event: "recorrido_iniciado" }, () => {
        // Siempre recargar estado completo — el filtro real es por id_ruta en el RPC
        cargarEstadoRecorrido();
      })
      .on("broadcast", { event: "recorrido_finalizado" }, () => {
        setChoferEnCamino(false);
        setHoraInicioRecorrido(null);
        setPolylineCoordinates([]);
        setUbicacionBus(null);
        setEstimatedMinutes(null);
        setEtaColegio(null);
        setHoraLlegadaColegio(formatHoraEC(new Date().toISOString()));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [idRuta, cargarEstadoRecorrido]);

  // Realtime: cambios en estados_recorrido
  useEffect(() => {
    if (!idRuta) return;
    const channel = supabase
      .channel("estados-recorrido-padre")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "estados_recorrido", filter: `id_ruta=eq.${idRuta}` },
        () => cargarEstadoRecorrido(),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [idRuta, cargarEstadoRecorrido]);

  // Polling ETAs cada 10s cuando está en camino (solo si asiste)
  useEffect(() => {
    if (!choferEnCamino || !idRuta || !isAttending) return;
    refreshETAs();
    const interval = setInterval(refreshETAs, 10000);
    return () => clearInterval(interval);
  }, [choferEnCamino, idRuta, isAttending, refreshETAs]);

  // Ubicación inicial del bus (solo si asiste)
  useEffect(() => {
    if (!idAsignacion || !choferEnCamino || !isAttending) { setUbicacionBus(null); return; }
    getUltimaUbicacion(idAsignacion).then(setUbicacionBus).catch(() => {});
  }, [idAsignacion, choferEnCamino, isAttending]);

  // Realtime ubicación del bus (solo si asiste)
  // The realtime subscription is the primary path. The one-time fetch
  // above (getUltimaUbicacion) seeds the initial position so the marker
  // appears immediately. Polling is intentionally removed: duplicating
  // a realtime subscription with a 5 s interval doubles network requests,
  // drains battery, and causes redundant setState calls on every tick.
  useEffect(() => {
    if (!idAsignacion || !choferEnCamino || !isAttending) return;
    return suscribirseAUbicaciones(idAsignacion, setUbicacionBus);
  }, [idAsignacion, choferEnCamino, isAttending]);

  return {
    choferEnCamino,
    idAsignacion,
    horaInicioRecorrido,
    polylineCoordinates,
    estimatedMinutes,
    etaColegio,
    horaLlegadaColegio,
    nombreChofer,
    idChofer,
    ubicacionBus,
    tipoRuta,
  };
}
