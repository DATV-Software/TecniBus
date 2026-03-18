import { useAlert } from "@/components/ui/AlertBox/useAlert";
import {
  getRecorridosHoy,
  type RecorridoChofer,
} from "@/lib/services/asignaciones.service";
import {
  getEstadoRecorrido,
  getPolylineAsignacion,
} from "@/lib/services/recorridos.service";
import { getParadasByRuta, type Parada } from "@/lib/services/rutas.service";
import { supabase } from "@/lib/services/supabase";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

export type EstadoRecorridoRun = 'pendiente' | 'activo' | 'completado';

export function useDriverRecorrido(profileId: string | undefined) {
  const { showAlert } = useAlert();

  const [recorridos, setRecorridos] = useState<RecorridoChofer[]>([]);
  const [recorridoActual, setRecorridoActual] = useState<RecorridoChofer | null>(null);
  const [loadingRecorridos, setLoadingRecorridos] = useState(true);
  const [estadosRecorridos, setEstadosRecorridos] = useState<Record<string, EstadoRecorridoRun>>({});
  const [paradas, setParadas] = useState<Parada[]>([]);
  const [polylineCoordinates, setPolylineCoordinates] = useState<
    { latitude: number; longitude: number }[]
  >([]);
  const [routeActive, setRouteActive] = useState(false);
  const [horaInicioRecorrido, setHoraInicioRecorrido] = useState<string | null>(null);
  const [rutaCompletada, setRutaCompletada] = useState(false);
  const [horaLlegadaColegio, setHoraLlegadaColegio] = useState<string | null>(null);

  // Refs para acceder a valores actuales en callbacks sin recrearlos
  const recorridoActualRef = useRef(recorridoActual);
  const routeActiveRef = useRef(routeActive);
  useEffect(() => { recorridoActualRef.current = recorridoActual; }, [recorridoActual]);
  useEffect(() => { routeActiveRef.current = routeActive; }, [routeActive]);

  const cargarRecorridos = useCallback(async () => {
    if (!profileId) return;
    try {
      setLoadingRecorridos(true);
      const data = await getRecorridosHoy(profileId);
      setRecorridos(data);

      // Batch-load run status for all today's routes
      if (data.length > 0) {
        const estadosArr = await Promise.all(data.map((r) => getEstadoRecorrido(r.id)));
        const map: Record<string, EstadoRecorridoRun> = {};
        let activeRecorrido: RecorridoChofer | null = null;
        let firstPending: RecorridoChofer | null = null;

        data.forEach((r, i) => {
          const e = estadosArr[i];
          if (e?.activo) {
            map[r.id] = 'activo';
            if (!activeRecorrido) activeRecorrido = r;
          } else if (e?.hora_fin) {
            map[r.id] = 'completado';
          } else {
            map[r.id] = 'pendiente';
            if (!firstPending) firstPending = r;
          }
        });
        setEstadosRecorridos(map);

        // Auto-seleccionar: activo > pendiente > primero
        if (!recorridoActualRef.current) {
          setRecorridoActual(activeRecorrido || firstPending || data[0]);
        }
      }
    } catch {
      showAlert({ title: "Error", message: "No se pudieron cargar los recorridos", type: "error" });
    } finally {
      setLoadingRecorridos(false);
    }
  }, [profileId]);

  const cargarParadas = useCallback(async () => {
    if (!recorridoActual) return;
    try {
      const data = await getParadasByRuta(recorridoActual.id_ruta);
      setParadas(data);
    } catch (error) {
      console.error("Error cargando paradas:", error);
    }
  }, [recorridoActual]);

  const cargarEstadoRecorrido = useCallback(async () => {
    if (!recorridoActual) return;
    try {
      const estado = await getEstadoRecorrido(recorridoActual.id);
      const activo = estado?.activo || false;
      setRouteActive(activo);
      setHoraInicioRecorrido(activo ? (estado?.hora_inicio || null) : null);

      // Si hay ruta activa, recargar polyline desde DB para resistir navegación y minimize
      if (activo) {
        const polyline = await getPolylineAsignacion(recorridoActual.id);
        if (polyline.length > 0) {
          setPolylineCoordinates(polyline);
        }
      }
    } catch (error) {
      console.error("Error cargando estado del recorrido:", error);
    }
  }, [recorridoActual]);

  useEffect(() => { cargarRecorridos(); }, [cargarRecorridos]);

  useEffect(() => {
    if (recorridoActual) {
      cargarEstadoRecorrido();
      cargarParadas();
    }
  }, [recorridoActual, cargarEstadoRecorrido, cargarParadas]);

  // Realtime: actualizar estado cuando el admin/padre cambia el recorrido
  useEffect(() => {
    if (!recorridoActual) return;
    const channel = supabase
      .channel("estados-recorrido-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "estados_recorrido",
          filter: `id_asignacion=eq.${recorridoActual.id}`,
        },
        () => cargarEstadoRecorrido(),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [recorridoActual, cargarEstadoRecorrido]);

  // AppState: recargar polyline cuando la app vuelve al primer plano
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        const rec = recorridoActualRef.current;
        if (!rec || !routeActiveRef.current) return;
        getPolylineAsignacion(rec.id)
          .then((polyline) => {
            if (polyline.length > 0) setPolylineCoordinates(polyline);
          })
          .catch(console.error);
      }
    });
    return () => subscription.remove();
  }, []);

  return {
    recorridos,
    recorridoActual,
    setRecorridoActual,
    loadingRecorridos,
    estadosRecorridos,
    setEstadosRecorridos,
    paradas,
    setParadas,
    polylineCoordinates,
    setPolylineCoordinates,
    routeActive,
    setRouteActive,
    horaInicioRecorrido,
    rutaCompletada,
    setRutaCompletada,
    horaLlegadaColegio,
    setHoraLlegadaColegio,
    cargarRecorridos,
  };
}
