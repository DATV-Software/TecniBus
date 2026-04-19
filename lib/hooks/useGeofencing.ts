import { useEffect, useMemo, useRef, useState } from 'react';
import {
  marcarEntradaGeocerca,
  marcarEstudianteCompletado,
  marcarSalidaGeocerca,
  type EstudianteGeocerca,
} from '@/lib/services/routing/geocercas.service';
import { calcularDistancia } from '@/lib/utils/distance';
import type { EstudianteConAsistencia } from '@/lib/services/students/asistencias.service';
import type { Parada } from '@/lib/services/routing/rutas.service';

type GeofencingOptions = {
  idAsignacion: string | null;
  idChofer: string;
  recorridoActivo: boolean;
  ubicacionActual: { latitude: number; longitude: number } | null;
  radioMetros?: number;
  estudiantes: EstudianteConAsistencia[];
  paradas: Parada[];
  tipoRuta?: 'ida' | 'vuelta';
};

type GeofencingResult = {
  estudianteActual: EstudianteGeocerca | null;
  dentroDeZona: boolean;
  distanciaMetros: number | null;
  loading: boolean;
  marcarCompletadoManual: () => Promise<void>;
};

/**
 * Hook para monitorear geocercas durante el recorrido.
 *
 * Mejoras implementadas:
 * - Idea 4 (secuencia): Solo evalúa el estudiante cuya parada viene
 *   PRIMERO en el orden de la ruta. Evita activar geocercas de paradas
 *   cercanas que aún no corresponden.
 * - Idea 5 (debounce): Requiere DEBOUNCE_REQUIRED lecturas GPS consecutivas
 *   dentro del radio antes de confirmar entrada. Elimina falsos positivos
 *   por ruido GPS.
 */

const DEBOUNCE_REQUIRED = 3; // lecturas consecutivas para confirmar entrada

export function useGeofencing({
  idAsignacion,
  idChofer,
  recorridoActivo,
  ubicacionActual,
  radioMetros = 100,
  estudiantes,
  paradas,
  tipoRuta = 'ida',
}: GeofencingOptions): GeofencingResult {
  const [estudianteActual, setEstudianteActual] = useState<EstudianteGeocerca | null>(null);
  const [dentroDeZona, setDentroDeZona] = useState(false);
  const [distanciaMetros, setDistanciaMetros] = useState<number | null>(null);

  // ID del estudiante cuya entrada ya fue registrada en DB
  const estudianteEnZonaRef = useRef<string | null>(null);

  // Set de estudiantes ya procesados en este recorrido (no vuelven a entrar)
  const estudiantesProcesadosRef = useRef<Set<string>>(new Set());

  // Debounce: conteo de lecturas consecutivas dentro del radio
  const debounceCountRef = useRef(0);
  const debounceTargetRef = useRef<string | null>(null);

  // Reset al detener recorrido
  useEffect(() => {
    if (!recorridoActivo) {
      setEstudianteActual(null);
      setDentroDeZona(false);
      setDistanciaMetros(null);
      estudianteEnZonaRef.current = null;
      estudiantesProcesadosRef.current = new Set();
      debounceCountRef.current = 0;
      debounceTargetRef.current = null;
    }
  }, [recorridoActivo]);

  // Stable key derived from student id+estado pairs.
  // Computing this outside the effect avoids recreating it on every GPS tick
  // just to decide whether the effect body should re-run.
  const estudiantesKey = useMemo(
    () => estudiantes.map((e) => `${e.id}:${e.estado}`).join(','),
    [estudiantes],
  );

  useEffect(() => {
    if (!recorridoActivo || !idAsignacion || !ubicacionActual) return;

    const { latitude: latBus, longitude: lonBus } = ubicacionActual;

    // ── Idea 4: Selección por orden de ruta ─────────────────────────────────
    // Construir candidatos pendientes con su índice en el array de paradas
    // (el array ya viene ordenado por la ruta desde la DB)
    type Candidato = {
      estudiante: EstudianteConAsistencia;
      parada: Parada;
      distancia: number;
      ordenRuta: number; // posición en el array paradas[]
    };

    const candidatos: Candidato[] = [];

    for (const est of estudiantes) {
      if (est.estado === 'ausente' || est.estado === 'completado') continue;
      if (estudiantesProcesadosRef.current.has(est.id)) continue;
      if (!est.parada?.id) continue;

      const paradaIdx = paradas.findIndex((p) => p.id === est.parada!.id);
      if (paradaIdx === -1) continue;

      const parada = paradas[paradaIdx];
      const distancia = calcularDistancia(latBus, lonBus, parada.latitud, parada.longitud);
      candidatos.push({ estudiante: est, parada, distancia, ordenRuta: paradaIdx });
    }

    if (candidatos.length === 0) {
      if (estudianteEnZonaRef.current) {
        estudianteEnZonaRef.current = null;
        setDentroDeZona(false);
        setEstudianteActual(null);
      }
      debounceCountRef.current = 0;
      debounceTargetRef.current = null;
      setDistanciaMetros(null);
      return;
    }

    // Ordenar por posición en la ruta (no por distancia) → siguiente parada esperada
    candidatos.sort((a, b) => a.ordenRuta - b.ordenRuta);
    const { estudiante, parada, distancia } = candidatos[0];
    const idEst = estudiante.id;

    setDistanciaMetros(distancia);

    const estaEnZona = distancia <= radioMetros;
    const yaEnZona = estudianteEnZonaRef.current === idEst;

    if (estaEnZona) {
      // ── Idea 5: Debounce ────────────────────────────────────────────────────
      if (debounceTargetRef.current !== idEst) {
        // Cambió el objetivo → resetear contador
        debounceCountRef.current = 1;
        debounceTargetRef.current = idEst;
      } else {
        debounceCountRef.current += 1;
      }

      // Construir el objeto solo si el debounce ya confirmó la entrada
      if (debounceCountRef.current >= DEBOUNCE_REQUIRED) {
        const geoEst: EstudianteGeocerca = {
          id_estudiante: idEst,
          nombre: estudiante.nombre,
          apellido: estudiante.apellido,
          nombreCompleto: `${estudiante.nombre} ${estudiante.apellido}`,
          id_parada: parada.id,
          parada_nombre: parada.nombre || parada.direccion,
          parada_latitud: parada.latitud,
          parada_longitud: parada.longitud,
          orden_parada: candidatos[0].ordenRuta,
          estado: 'en_zona',
        };

        setEstudianteActual(geoEst);
        setDentroDeZona(true);

        // Registrar entrada en DB solo la primera vez
        if (!yaEnZona) {
          estudianteEnZonaRef.current = idEst;
          marcarEntradaGeocerca(idAsignacion, idEst, idChofer).catch(() => {});
        }
      }
    } else {
      // Fuera del radio → resetear debounce
      if (debounceTargetRef.current === idEst) {
        debounceCountRef.current = 0;
        debounceTargetRef.current = null;
      }

      if (yaEnZona) {
        // Salida confirmada
        estudianteEnZonaRef.current = null;
        estudiantesProcesadosRef.current.add(idEst);
        setDentroDeZona(false);
        setEstudianteActual(null);
        marcarSalidaGeocerca(idAsignacion, idEst, idChofer).catch(() => {});
        if (tipoRuta === 'vuelta') {
          marcarEstudianteCompletado(idAsignacion, idEst, idChofer, 'completado').catch(() => {});
        }
      } else if (estudianteEnZonaRef.current && estudianteEnZonaRef.current !== idEst) {
        const prevId = estudianteEnZonaRef.current;
        estudianteEnZonaRef.current = null;
        setDentroDeZona(false);
        setEstudianteActual(null);
        marcarSalidaGeocerca(idAsignacion, prevId, idChofer).catch(() => {});
      } else {
        setDentroDeZona(false);
        setEstudianteActual(null);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    ubicacionActual,
    estudiantesKey,
    recorridoActivo,
    idAsignacion,
    idChofer,
    radioMetros,
    tipoRuta,
    paradas,
  ]);

  const marcarCompletadoManual = async () => {
    if (estudianteEnZonaRef.current) {
      estudiantesProcesadosRef.current.add(estudianteEnZonaRef.current);
    }
    estudianteEnZonaRef.current = null;
    debounceCountRef.current = 0;
    debounceTargetRef.current = null;
    setEstudianteActual(null);
    setDentroDeZona(false);
  };

  return {
    estudianteActual,
    dentroDeZona,
    distanciaMetros,
    loading: false,
    marcarCompletadoManual,
  };
}
