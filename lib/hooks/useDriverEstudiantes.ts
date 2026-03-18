import { useAlert } from "@/components/ui/AlertBox/useAlert";
import type { RecorridoChofer } from "@/lib/services/asignaciones.service";
import {
  getEstudiantesConAsistencia,
  type EstudianteConAsistencia,
} from "@/lib/services/asistencias.service";
import { supabase } from "@/lib/services/supabase";
import { useCallback, useEffect, useState } from "react";

export function useDriverEstudiantes(
  recorridoActual: RecorridoChofer | null,
  profileId: string | undefined,
  routeActive: boolean,
) {
  const { showAlert } = useAlert();
  const [estudiantes, setEstudiantes] = useState<EstudianteConAsistencia[]>([]);
  const [loading, setLoading] = useState(true);

  const cargarEstudiantes = useCallback(async () => {
    if (!profileId || !recorridoActual) return;
    try {
      setLoading(true);
      const data = await getEstudiantesConAsistencia(recorridoActual.id_ruta, profileId);
      setEstudiantes(data);
    } catch {
      showAlert({ title: "Error", message: "No se pudieron cargar los estudiantes", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [profileId, recorridoActual]);

  useEffect(() => {
    if (recorridoActual) cargarEstudiantes();
  }, [recorridoActual, cargarEstudiantes]);

  // Realtime: sincronizar cuando el padre marca ausencia
  useEffect(() => {
    if (!recorridoActual) return;
    const channel = supabase
      .channel(`asistencias-driver-${recorridoActual.id_ruta}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "asistencias",
          filter: `id_ruta=eq.${recorridoActual.id_ruta}`,
        },
        () => cargarEstudiantes(),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [recorridoActual, cargarEstudiantes]);

  // Polling cada 15s durante el recorrido activo
  useEffect(() => {
    if (!routeActive || !recorridoActual) return;
    const interval = setInterval(() => cargarEstudiantes(), 15000);
    return () => clearInterval(interval);
  }, [routeActive, recorridoActual, cargarEstudiantes]);

  return { estudiantes, setEstudiantes, loading, cargarEstudiantes };
}
