import { calcularETAsRuta } from "@/lib/services/geocercas.service";
import { publishETAsToRecorrido } from "@/lib/services/recorridos.service";
import type { Parada } from "@/lib/services/rutas.service";
import type { EstudianteConAsistencia } from "@/lib/services/asistencias.service";
import type { UbicacionLocal } from "@/lib/hooks/useGPSTracking";
import { useEffect, useMemo, useState } from "react";

type Params = {
  ubicacionChofer: UbicacionLocal | null;
  routeActive: boolean;
  paradasVisibles: Parada[];
  estudiantes: EstudianteConAsistencia[];
  ubicacionColegio: { latitud: number; longitud: number } | null;
  idAsignacion: string | undefined;
};

/**
 * Calcula ETAs para cada parada pendiente y las publica en la DB
 * para que los padres puedan verlas en tiempo real.
 */
export function useDriverETAs({
  ubicacionChofer,
  routeActive,
  paradasVisibles,
  estudiantes,
  ubicacionColegio,
  idAsignacion,
}: Params) {
  const [etasPorParada, setEtasPorParada] = useState<Record<string, number>>({});
  const [etaFinRuta, setEtaFinRuta] = useState<number | null>(null);

  // Memoized keys — avoids rebuilding strings on every GPS tick render
  const paradasPendientesKey = useMemo(
    () =>
      paradasVisibles
        .filter((p) =>
          estudiantes.some(
            (e) => e.parada?.id === p.id && e.estado !== "ausente" && e.estado !== "completado",
          ),
        )
        .map((p) => p.id)
        .join(","),
    [paradasVisibles, estudiantes],
  );

  const estudiantesEstadoKey = useMemo(
    () => estudiantes.map((e) => e.estado).join(","),
    [estudiantes],
  );

  useEffect(() => {
    if (!ubicacionChofer || !routeActive) {
      setEtasPorParada({});
      setEtaFinRuta(null);
      return;
    }

    const paradasPendientes = paradasVisibles.filter((p) =>
      estudiantes.some(
        (e) => e.parada?.id === p.id && e.estado !== "ausente" && e.estado !== "completado",
      ),
    );

    if (paradasPendientes.length === 0 && !ubicacionColegio) {
      setEtasPorParada({});
      setEtaFinRuta(null);
      return;
    }

    const cacheKey = `chofer-${paradasPendientesKey}`;
    calcularETAsRuta(
      ubicacionChofer.latitude,
      ubicacionChofer.longitude,
      paradasPendientes,
      ubicacionColegio ? { latitud: ubicacionColegio.latitud, longitud: ubicacionColegio.longitud } : null,
      cacheKey,
    ).then(({ porParada, destinoFinal }) => {
      setEtasPorParada(porParada);
      setEtaFinRuta(destinoFinal);
      if (idAsignacion) {
        publishETAsToRecorrido(idAsignacion, { ...porParada, colegio: destinoFinal }).catch(() => {});
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    ubicacionChofer?.latitude,
    ubicacionChofer?.longitude,
    routeActive,
    paradasPendientesKey,
    estudiantesEstadoKey,
    ubicacionColegio?.latitud,
    ubicacionColegio?.longitud,
    idAsignacion,
  ]);

  return { etasPorParada, etaFinRuta };
}
