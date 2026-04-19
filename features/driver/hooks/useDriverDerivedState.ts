/**
 * Extracts all derived/computed state from the driver screen.
 * Reduces cognitive load in the main component.
 */
import { useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { calcularDistancia } from '@/lib/utils/distance';
import { indicePuntoEnPolyline } from '@/lib/utils/routeDeviation';
import type { UbicacionLocal } from '@/features/driver/hooks/useGPSTracking';
import type { EstudianteConAsistencia } from '@/lib/services/students/asistencias.service';
import type { EstudianteGeocerca } from '@/lib/services/routing/geocercas.service';
import type { Parada } from '@/lib/services/routing/rutas.service';

type Options = {
  estudiantes: EstudianteConAsistencia[];
  paradas: Parada[];
  polylineCoordinates: { latitude: number; longitude: number }[];
  ubicacionChofer: UbicacionLocal | null;
  routeActive: boolean;
  dentroDeZona: boolean;
  estudianteGeocerca: EstudianteGeocerca | null;
  tipoRuta: 'ida' | 'vuelta';
};

export function useDriverDerivedState({
  estudiantes,
  paradas,
  polylineCoordinates,
  ubicacionChofer,
  routeActive,
  dentroDeZona,
  estudianteGeocerca,
  tipoRuta,
}: Options) {
  const insets = useSafeAreaInsets();

  // ── Attendance counts ────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const completed = estudiantes.filter((e) => e.estado === 'completado').length;
    const absent = estudiantes.filter((e) => e.estado === 'ausente').length;
    const total = estudiantes.length;
    return { completed, absent, total, remaining: total - completed - absent };
  }, [estudiantes]);

  // ── Stops where every student is absent/completed ────────────────────────────
  const paradasAusentesIds = useMemo(() => {
    const activos = new Map<string, number>();
    const totales = new Map<string, number>();
    for (const e of estudiantes) {
      if (!e.parada?.id) continue;
      totales.set(e.parada.id, (totales.get(e.parada.id) || 0) + 1);
      if (e.estado !== 'ausente' && e.estado !== 'completado') {
        activos.set(e.parada.id, (activos.get(e.parada.id) || 0) + 1);
      }
    }
    const ausentes = new Set<string>();
    for (const [paradaId, total] of totales) {
      if ((activos.get(paradaId) || 0) === 0 && total > 0) ausentes.add(paradaId);
    }
    for (const p of paradas) {
      if (!totales.has(p.id)) ausentes.add(p.id);
    }
    return ausentes;
  }, [estudiantes, paradas]);

  const paradasVisibles = useMemo(
    () => (paradasAusentesIds.size === 0 ? paradas : paradas.filter((p) => !paradasAusentesIds.has(p.id))),
    [paradas, paradasAusentesIds],
  );

  // ── Next student in route order ───────────────────────────────────────────────
  const nextStudent = useMemo(() => {
    const pending = estudiantes.filter(
      (e) => e.estado !== 'ausente' && e.estado !== 'completado',
    );
    if (pending.length === 0) return null;

    if (polylineCoordinates.length >= 2 && ubicacionChofer) {
      const busIdx = indicePuntoEnPolyline(ubicacionChofer, polylineCoordinates);
      const withIdx = pending.map((e) => {
        const parada = paradas.find((p) => p.id === e.parada?.id);
        if (!parada) return { e, idx: Infinity };
        const stopIdx = indicePuntoEnPolyline(
          { latitude: parada.latitud, longitude: parada.longitud },
          polylineCoordinates,
        );
        return {
          e,
          idx: stopIdx >= busIdx ? stopIdx : polylineCoordinates.length + stopIdx,
        };
      });
      withIdx.sort((a, b) => a.idx - b.idx);
      return withIdx[0]?.e ?? null;
    }

    return (
      pending.sort((a, b) => {
        const idxA = paradasVisibles.findIndex((p) => p.id === a.parada?.id);
        const idxB = paradasVisibles.findIndex((p) => p.id === b.parada?.id);
        return (idxA === -1 ? Infinity : idxA) - (idxB === -1 ? Infinity : idxB);
      })[0] ?? null
    );
  }, [estudiantes, polylineCoordinates, ubicacionChofer, paradas, paradasVisibles]);

  // ── High-level route flags ───────────────────────────────────────────────────
  const todosAtendidos = routeActive && !nextStudent && !estudianteGeocerca;
  const enCaminoAlColegio = todosAtendidos && tipoRuta === 'ida';
  const todosEntregadosVuelta = todosAtendidos && tipoRuta === 'vuelta';

  // ── Nearest upcoming stop ────────────────────────────────────────────────────
  const paradaMasCercana = useMemo(() => {
    if (!ubicacionChofer || paradasVisibles.length === 0 || !routeActive) return null;
    const pendientes = paradasVisibles.filter((p) =>
      estudiantes.some(
        (e) =>
          e.parada?.id === p.id &&
          e.estado !== 'ausente' &&
          e.estado !== 'completado',
      ),
    );
    if (pendientes.length === 0) return null;
    let menor = Infinity;
    let cercana: Parada | null = null;
    for (const p of pendientes) {
      const dist = calcularDistancia(
        ubicacionChofer.latitude,
        ubicacionChofer.longitude,
        p.latitud,
        p.longitud,
      );
      if (dist < menor) {
        menor = dist;
        cercana = p;
      }
    }
    return cercana ? { parada: cercana, distanciaMetros: menor } : null;
  }, [ubicacionChofer, paradasVisibles, estudiantes, routeActive]);

  // ── Bottom card active states ─────────────────────────────────────────────────
  const estaEnGeocerca = !!(routeActive && dentroDeZona && estudianteGeocerca);
  const hayEstudianteActivo = routeActive && estaEnGeocerca;
  const hayCaminoASiguiente = routeActive && !estaEnGeocerca && !!nextStudent;

  // ── Active student display data ───────────────────────────────────────────────
  const estudianteActivoNombre = estaEnGeocerca
    ? estudianteGeocerca?.nombreCompleto
    : nextStudent
    ? `${nextStudent.nombre} ${nextStudent.apellido}`
    : undefined;

  const estudianteActivoDireccion = estaEnGeocerca
    ? estudianteGeocerca?.parada_nombre
    : nextStudent?.parada
    ? paradas.find((p) => p.id === nextStudent.parada?.id)?.direccion ||
      nextStudent.parada.nombre
    : undefined;

  const estudianteActivoId = estaEnGeocerca
    ? estudianteGeocerca?.id_estudiante
    : nextStudent?.id;

  const idPadreActivo = estudianteActivoId
    ? (estudiantes.find((e) => e.id === estudianteActivoId)?.id_padre ?? null)
    : null;

  // Nav bar ≈ 87px, leave gap
  const BOTTOM_CARD_BOTTOM = Math.max(insets.bottom + 88, 98);

  return {
    stats,
    paradasAusentesIds,
    paradasVisibles,
    nextStudent,
    todosAtendidos,
    enCaminoAlColegio,
    todosEntregadosVuelta,
    paradaMasCercana,
    estaEnGeocerca,
    hayEstudianteActivo,
    hayCaminoASiguiente,
    estudianteActivoNombre,
    estudianteActivoDireccion,
    estudianteActivoId,
    idPadreActivo,
    BOTTOM_CARD_BOTTOM,
  };
}
