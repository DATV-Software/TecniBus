import { getEstadoAsistenciaDelDia, type EstadoAsistencia } from "@/lib/services/asistencias.service";
import { supabase } from "@/lib/services/supabase";
import { formatHoraEC } from "@/lib/utils/datetime";
import { useCallback, useEffect, useState } from "react";

export type AsistenciaEstudiante = {
  isAttending: boolean;
  estudianteRecogido: boolean;
  marcadoPorChofer: boolean;
  horaRecogida: string | null;
};

export function useParentAsistencia(estudianteId: string | undefined) {
  const [isAttending, setIsAttending] = useState(true);
  const [estudianteRecogido, setEstudianteRecogido] = useState(false);
  const [marcadoPorChofer, setMarcadoPorChofer] = useState(false);
  const [horaRecogida, setHoraRecogida] = useState<string | null>(null);

  const cargarEstadoAsistencia = useCallback(async () => {
    if (!estudianteId) return;

    const data = await getEstadoAsistenciaDelDia(estudianteId);
    const estado: EstadoAsistencia = data?.estado || 'presente';
    const fueRecogido = estado === "completado";
    const estaAusente = estado === "ausente";

    setEstudianteRecogido(fueRecogido);
    setIsAttending(!estaAusente && !fueRecogido);
    setMarcadoPorChofer(estaAusente && (data?.notas?.includes("chofer") || false));
    setHoraRecogida(fueRecogido && data?.updated_at ? formatHoraEC(data.updated_at) : null);
  }, [estudianteId]);

  // Recargar cuando cambia el estudiante
  useEffect(() => {
    setIsAttending(true);
    setEstudianteRecogido(false);
    setMarcadoPorChofer(false);
    setHoraRecogida(null);
    if (estudianteId) cargarEstadoAsistencia();
  }, [estudianteId]);

  // Realtime: padre o chofer marca asistencia
  useEffect(() => {
    if (!estudianteId) return;
    const channel = supabase
      .channel("asistencias-padre-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "asistencias", filter: `id_estudiante=eq.${estudianteId}` },
        () => cargarEstadoAsistencia(),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [estudianteId, cargarEstadoAsistencia]);

  return {
    isAttending,
    setIsAttending,
    estudianteRecogido,
    marcadoPorChofer,
    horaRecogida,
    cargarEstadoAsistencia,
  };
}
