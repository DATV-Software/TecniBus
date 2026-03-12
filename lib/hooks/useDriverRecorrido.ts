import { useAlert } from "@/components/ui/AlertBox/useAlert";
import {
  getRecorridosHoy,
  type RecorridoChofer,
} from "@/lib/services/asignaciones.service";
import { getEstadoRecorrido } from "@/lib/services/recorridos.service";
import { getParadasByRuta, type Parada } from "@/lib/services/rutas.service";
import { supabase } from "@/lib/services/supabase";
import { useCallback, useEffect, useState } from "react";

export function useDriverRecorrido(profileId: string | undefined) {
  const { showAlert } = useAlert();

  const [recorridos, setRecorridos] = useState<RecorridoChofer[]>([]);
  const [recorridoActual, setRecorridoActual] = useState<RecorridoChofer | null>(null);
  const [loadingRecorridos, setLoadingRecorridos] = useState(true);
  const [paradas, setParadas] = useState<Parada[]>([]);
  const [polylineCoordinates, setPolylineCoordinates] = useState<
    { latitude: number; longitude: number }[]
  >([]);
  const [routeActive, setRouteActive] = useState(false);
  const [horaInicioRecorrido, setHoraInicioRecorrido] = useState<string | null>(null);
  const [rutaCompletada, setRutaCompletada] = useState(false);
  const [horaLlegadaColegio, setHoraLlegadaColegio] = useState<string | null>(null);

  const cargarRecorridos = useCallback(async () => {
    if (!profileId) return;
    try {
      setLoadingRecorridos(true);
      const data = await getRecorridosHoy(profileId);
      setRecorridos(data);
      if (data.length > 0 && !recorridoActual) setRecorridoActual(data[0]);
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
      setRouteActive(estado?.activo || false);
      setHoraInicioRecorrido(estado?.hora_inicio || null);
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

  return {
    recorridos,
    recorridoActual,
    setRecorridoActual,
    loadingRecorridos,
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
