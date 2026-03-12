import { useEffect, useRef, useState } from 'react';
import {
  calcularDistancia,
  marcarEntradaGeocerca,
  marcarSalidaGeocerca,
  type EstudianteGeocerca,
} from '@/lib/services/geocercas.service';
import type { EstudianteConAsistencia } from '@/lib/services/asistencias.service';
import type { Parada } from '@/lib/services/rutas.service';

type GeofencingOptions = {
  idAsignacion: string | null;
  idChofer: string;
  recorridoActivo: boolean;
  ubicacionActual: { latitude: number; longitude: number } | null;
  radioMetros?: number;
  estudiantes: EstudianteConAsistencia[];
  paradas: Parada[];
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
 * Enfoque location-driven: en cada actualización de ubicación busca el
 * estudiante pendiente más cercano. Si está dentro del radio, activa
 * el panel de geocerca sin depender de DB para la selección.
 *
 * Efectos secundarios en DB (entrada/salida) se siguen registrando
 * mediante los RPCs existentes.
 */
export function useGeofencing({
  idAsignacion,
  idChofer,
  recorridoActivo,
  ubicacionActual,
  radioMetros = 100,
  estudiantes,
  paradas,
}: GeofencingOptions): GeofencingResult {
  const [estudianteActual, setEstudianteActual] = useState<EstudianteGeocerca | null>(null);
  const [dentroDeZona, setDentroDeZona] = useState(false);
  const [distanciaMetros, setDistanciaMetros] = useState<number | null>(null);

  // ID del estudiante cuya entrada ya fue registrada (evita duplicar el evento)
  const estudianteEnZonaRef = useRef<string | null>(null);

  // Set de estudiantes ya procesados en este recorrido (evita re-entrada al mismo geocerca)
  const estudiantesProcesadosRef = useRef<Set<string>>(new Set());

  // Reset al detener recorrido
  useEffect(() => {
    if (!recorridoActivo) {
      setEstudianteActual(null);
      setDentroDeZona(false);
      setDistanciaMetros(null);
      estudianteEnZonaRef.current = null;
      estudiantesProcesadosRef.current = new Set();
    }
  }, [recorridoActivo]);

  // Evaluación en cada cambio de ubicación o lista de estudiantes
  useEffect(() => {
    if (!recorridoActivo || !idAsignacion || !ubicacionActual) return;

    const { latitude: latBus, longitude: lonBus } = ubicacionActual;

    // Construir lista de estudiantes pendientes con coordenadas de su parada
    const pendientes: Array<{
      estudiante: EstudianteConAsistencia;
      parada: Parada;
      distancia: number;
    }> = [];

    for (const est of estudiantes) {
      if (est.estado === 'ausente' || est.estado === 'completado') continue;
      // Excluir estudiantes ya procesados en este recorrido (evita re-entrada al mismo geocerca)
      if (estudiantesProcesadosRef.current.has(est.id)) continue;
      if (!est.parada?.id) continue;

      const parada = paradas.find((p) => p.id === est.parada!.id);
      if (!parada) continue;

      const distancia = calcularDistancia(latBus, lonBus, parada.latitud, parada.longitud);
      pendientes.push({ estudiante: est, parada, distancia });
    }

    // Sin estudiantes pendientes → limpiar estado
    if (pendientes.length === 0) {
      if (estudianteEnZonaRef.current) {
        estudianteEnZonaRef.current = null;
        setDentroDeZona(false);
        setEstudianteActual(null);
      }
      setDistanciaMetros(null);
      return;
    }

    // El más cercano determina el estado
    pendientes.sort((a, b) => a.distancia - b.distancia);
    const { estudiante, parada, distancia } = pendientes[0];
    const idEst = estudiante.id;

    setDistanciaMetros(distancia);

    const estaEnZona = distancia <= radioMetros;
    const yaEnZona = estudianteEnZonaRef.current === idEst;

    if (estaEnZona) {
      // Construir objeto compatible con EstudianteGeocerca
      const geoEst: EstudianteGeocerca = {
        id_estudiante: idEst,
        nombre: estudiante.nombre,
        apellido: estudiante.apellido,
        nombreCompleto: `${estudiante.nombre} ${estudiante.apellido}`,
        id_parada: parada.id,
        parada_nombre: parada.nombre || parada.direccion,
        parada_latitud: parada.latitud,
        parada_longitud: parada.longitud,
        orden_parada: 0,
        estado: 'en_zona',
      };

      setEstudianteActual(geoEst);
      setDentroDeZona(true);

      // Primera vez que entramos a esta parada → registrar en DB
      if (!yaEnZona) {
        estudianteEnZonaRef.current = idEst;
        marcarEntradaGeocerca(idAsignacion, idEst, idChofer).catch((err) =>
          console.warn('Error marcando entrada geocerca:', err),
        );
      }
    } else {
      // Fuera del radio
      if (yaEnZona) {
        // Salida: el bus se alejó del estudiante que estaba en zona
        estudianteEnZonaRef.current = null;
        estudiantesProcesadosRef.current.add(idEst); // No volver a entrar en este recorrido
        setDentroDeZona(false);
        setEstudianteActual(null);
        marcarSalidaGeocerca(idAsignacion, idEst, idChofer).catch((err) =>
          console.warn('Error marcando salida geocerca:', err),
        );
      } else if (estudianteEnZonaRef.current && estudianteEnZonaRef.current !== idEst) {
        // Estábamos en zona de otro estudiante (ya no está en pendientes → fue marcado)
        const prevId = estudianteEnZonaRef.current;
        estudianteEnZonaRef.current = null;
        setDentroDeZona(false);
        setEstudianteActual(null);
        marcarSalidaGeocerca(idAsignacion, prevId, idChofer).catch((err) =>
          console.warn('Error marcando salida geocerca (cambio):', err),
        );
      } else {
        // Simple: no estamos en zona de nadie
        setDentroDeZona(false);
        setEstudianteActual(null);
      }
    }
  }, [
    ubicacionActual,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    estudiantes.map((e) => `${e.id}:${e.estado}`).join(','),
    recorridoActivo,
    idAsignacion,
    idChofer,
    radioMetros,
  ]);

  /**
   * Llamar cuando el chofer marca ausente manualmente.
   * Limpia el estado local para permitir avanzar al siguiente.
   */
  const marcarCompletadoManual = async () => {
    if (estudianteEnZonaRef.current) {
      estudiantesProcesadosRef.current.add(estudianteEnZonaRef.current);
    }
    estudianteEnZonaRef.current = null;
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
