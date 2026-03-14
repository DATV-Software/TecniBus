import { getChoferDeRuta } from "@/lib/services/asignaciones.service";
import {
  getEstadoRecorridoPorRuta,
  getPolylineAsignacion,
} from "@/lib/services/recorridos.service";
import type { EstudianteDelPadre } from "@/lib/services/padres.service";
import { supabase } from "@/lib/services/supabase";
import {
  getUltimaUbicacion,
  suscribirseAUbicaciones,
  type UbicacionActual,
} from "@/lib/services/ubicaciones.service";
import { formatHoraEC } from "@/lib/utils/datetime";
import { useCallback, useEffect, useState } from "react";

type BroadcastMsg<T> = { payload: T };
type RecorridoPayload = { id_asignacion: string };

export function useParentRecorrido(estudiante: EstudianteDelPadre | null) {
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

  const idRuta = estudiante?.parada?.ruta?.id ?? null;
  const paradaId = estudiante?.parada?.id ?? null;

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

      if (activo && estado?.id_asignacion) {
        const polyline = await getPolylineAsignacion(estado.id_asignacion);
        setPolylineCoordinates(polyline);
        if (estado.eta_paradas) applyETAs(estado.eta_paradas);
      } else {
        setPolylineCoordinates([]);
        setUbicacionBus(null);
        setEstimatedMinutes(null);
        setEtaColegio(null);
      }
    } catch (error) {
      console.error("Error cargando estado del recorrido:", error);
      setChoferEnCamino(false);
      setPolylineCoordinates([]);
      setUbicacionBus(null);
    }
  }, [idRuta, applyETAs]);

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
  }, [estudiante?.id]);

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
  useEffect(() => {
    if (!idRuta) return;
    const channel = supabase
      .channel("recorrido-status")
      .on("broadcast", { event: "recorrido_iniciado" }, (msg: BroadcastMsg<RecorridoPayload>) => {
        if (msg.payload.id_asignacion === idAsignacion) {
          setChoferEnCamino(true);
          cargarEstadoRecorrido();
        }
      })
      .on("broadcast", { event: "recorrido_finalizado" }, (msg: BroadcastMsg<RecorridoPayload>) => {
        if (msg.payload.id_asignacion === idAsignacion) {
          setChoferEnCamino(false);
          setHoraInicioRecorrido(null);
          setPolylineCoordinates([]);
          setUbicacionBus(null);
          setHoraLlegadaColegio(formatHoraEC(new Date().toISOString()));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [idRuta, idAsignacion, cargarEstadoRecorrido]);

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

  // Polling ETAs cada 10s cuando está en camino
  useEffect(() => {
    if (!choferEnCamino || !idRuta) return;
    refreshETAs();
    const interval = setInterval(refreshETAs, 10000);
    return () => clearInterval(interval);
  }, [choferEnCamino, idRuta, refreshETAs]);

  // Ubicación inicial del bus
  useEffect(() => {
    if (!idAsignacion || !choferEnCamino) { setUbicacionBus(null); return; }
    getUltimaUbicacion(idAsignacion).then(setUbicacionBus).catch(() => {});
  }, [idAsignacion, choferEnCamino]);

  // Realtime ubicación del bus
  useEffect(() => {
    if (!idAsignacion || !choferEnCamino) return;
    return suscribirseAUbicaciones(idAsignacion, setUbicacionBus);
  }, [idAsignacion, choferEnCamino]);

  // Polling ubicación cada 5s (respaldo al Realtime)
  useEffect(() => {
    if (!idAsignacion || !choferEnCamino) return;
    const interval = setInterval(async () => {
      const ubicacion = await getUltimaUbicacion(idAsignacion);
      if (ubicacion) setUbicacionBus(ubicacion);
    }, 5000);
    return () => clearInterval(interval);
  }, [idAsignacion, choferEnCamino]);

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
  };
}
