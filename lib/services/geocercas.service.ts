import { supabase } from './supabase';
import { getDirections, getRouteForWaypoints } from './directions.service';

export type EstadoGeocerca = 'pendiente' | 'en_zona' | 'completado' | 'omitido';

export type EstudianteGeocerca = {
  id_estudiante: string;
  nombre: string;
  apellido: string;
  nombreCompleto: string;
  id_parada: string;
  parada_nombre: string | null;
  parada_latitud: number;
  parada_longitud: number;
  orden_parada: number;
  estado: EstadoGeocerca;
};

/**
 * Inicializar estados de geocercas al iniciar recorrido
 */
export async function inicializarEstadosGeocercas(
  idAsignacion: string,
  idChofer: string
): Promise<boolean> {
  try {

    const { error } = await supabase.rpc('inicializar_estados_geocercas', {
      p_id_asignacion: idAsignacion,
      p_id_chofer: idChofer,
    });

    if (error) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Marcar entrada a geocerca
 */
export async function marcarEntradaGeocerca(
  idAsignacion: string,
  idEstudiante: string,
  idChofer: string
): Promise<{
  success: boolean;
  estudiante?: {
    id_estudiante: string;
    nombre: string;
    apellido: string;
    parada: string;
  };
}> {
  try {

    const { data, error } = await supabase.rpc('entrada_geocerca', {
      p_id_asignacion: idAsignacion,
      p_id_estudiante: idEstudiante,
      p_id_chofer: idChofer,
    });

    if (error) {
      return { success: false };
    }

    return { success: true, estudiante: data };
  } catch (error) {
    return { success: false };
  }
}

/**
 * Marcar salida de geocerca (auto-presente si no marcó ausente)
 */
export async function marcarSalidaGeocerca(
  idAsignacion: string,
  idEstudiante: string,
  idChofer: string
): Promise<boolean> {
  try {

    const { error } = await supabase.rpc('salida_geocerca', {
      p_id_asignacion: idAsignacion,
      p_id_estudiante: idEstudiante,
      p_id_chofer: idChofer,
    });

    if (error) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Marcar estudiante como completado (cuando el chofer marca ausente manualmente)
 */
export async function marcarEstudianteCompletado(
  idAsignacion: string,
  idEstudiante: string,
  idChofer: string,
  estadoAsistencia: 'presente' | 'ausente' | 'completado'
): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('marcar_estudiante_completado', {
      p_id_asignacion: idAsignacion,
      p_id_estudiante: idEstudiante,
      p_id_chofer: idChofer,
      p_estado_asistencia: estadoAsistencia,
    });

    if (error) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Obtener el siguiente estudiante pendiente o en zona
 */
export async function getSiguienteEstudianteGeocerca(
  idAsignacion: string
): Promise<EstudianteGeocerca | null> {
  try {
    const { data, error } = await supabase.rpc('get_siguiente_estudiante_geocerca', {
      p_id_asignacion: idAsignacion,
    });

    if (error) {
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    const estudiante = data[0];
    return {
      ...estudiante,
      nombreCompleto: `${estudiante.nombre} ${estudiante.apellido}`,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Calcular distancia entre dos coordenadas (en metros)
 * Fórmula de Haversine
 */
export function calcularDistancia(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Radio de la Tierra en metros
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distancia en metros
}

/**
 * Calcular ETA (tiempo estimado de llegada) en minutos
 * Usa distancia Haversine con factor vial para compensar calles
 */
export function calcularETA(
  latBus: number,
  lonBus: number,
  latDestino: number,
  lonDestino: number,
  velocidadKmH?: number | null,
): number {
  const distanciaMetros = calcularDistancia(latBus, lonBus, latDestino, lonDestino);
  if (distanciaMetros < 10) return 1; // Ya prácticamente en el destino

  const FACTOR_VIAL = 1.4; // Compensar que Haversine es línea recta
  const VELOCIDAD_DEFAULT_KMH = 25; // Velocidad urbana típica Ecuador

  const velocidad = velocidadKmH && velocidadKmH > 0 ? velocidadKmH : VELOCIDAD_DEFAULT_KMH;
  const distanciaKm = (distanciaMetros * FACTOR_VIAL) / 1000;
  const minutos = (distanciaKm / velocidad) * 60;

  return Math.max(1, Math.round(minutos));
}

// Caché para ETAs calculados con Google Directions API
type ETACacheEntry = { eta: number; timestamp: number; lat: number; lon: number };
const etaCache = new Map<string, ETACacheEntry>();
const CACHE_TTL_MS = 60_000;        // 1 minuto
const CACHE_DIST_THRESHOLD_M = 50;  // recalcular si bus movió >50m

/**
 * Calcular ETA usando Google Directions API con caché por posición
 * Fallback a Haversine × 1.4 si la API no responde
 */
export async function calcularETAConDirecciones(
  latBus: number,
  lonBus: number,
  latDestino: number,
  lonDestino: number,
  cacheKey: string,
): Promise<number> {
  // Verificar caché: misma clave, bus no se movió >50m, no expiró
  const cached = etaCache.get(cacheKey);
  if (cached) {
    const distDesdeCache = calcularDistancia(latBus, lonBus, cached.lat, cached.lon);
    const tiempoTranscurrido = Date.now() - cached.timestamp;
    if (distDesdeCache < CACHE_DIST_THRESHOLD_M && tiempoTranscurrido < CACHE_TTL_MS) {
      return cached.eta;
    }
  }

  // Llamar Google Directions API
  try {
    const result = await getDirections(
      { lat: latBus, lng: lonBus },
      { lat: latDestino, lng: lonDestino },
    );

    const etaMinutos = result?.duration
      ? Math.max(1, Math.round(result.duration / 60))
      : calcularETA(latBus, lonBus, latDestino, lonDestino);

    etaCache.set(cacheKey, { eta: etaMinutos, timestamp: Date.now(), lat: latBus, lon: lonBus });
    return etaMinutos;
  } catch {
    const fallback = calcularETA(latBus, lonBus, latDestino, lonDestino);
    return fallback;
  }
}

// Caché para ETAs de ruta completa
type ETARutaCacheEntry = {
  result: { porParada: Record<string, number>; destinoFinal: number | null };
  timestamp: number;
  lat: number;
  lon: number;
};
const etaRutaCache = new Map<string, ETARutaCacheEntry>();

/**
 * Calcular ETAs acumulados y consistentes para una secuencia de paradas + destino final.
 * Usa UNA sola llamada a Google Directions con waypoints para que todos los ETAs
 * sean coherentes entre sí (ETA colegio = ETA parada + tiempo parada→colegio).
 * Fallback acumulativo con Haversine si la API falla.
 */
export async function calcularETAsRuta(
  latBus: number,
  lonBus: number,
  paradas: Array<{ id: string; latitud: number | string; longitud: number | string }>,
  destino: { latitud: number; longitud: number } | null,
  cacheKey: string,
): Promise<{ porParada: Record<string, number>; destinoFinal: number | null }> {
  // Verificar caché
  const cached = etaRutaCache.get(cacheKey);
  if (cached) {
    const dist = calcularDistancia(latBus, lonBus, cached.lat, cached.lon);
    if (dist < CACHE_DIST_THRESHOLD_M && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.result;
    }
  }

  const paradasNorm = paradas.map(p => ({
    id: p.id,
    lat: Number(p.latitud),
    lng: Number(p.longitud),
  }));

  const waypoints = [
    { lat: latBus, lng: lonBus },
    ...paradasNorm,
    ...(destino ? [{ lat: destino.latitud, lng: destino.longitud }] : []),
  ];

  if (waypoints.length < 2) {
    return { porParada: {}, destinoFinal: null };
  }

  try {
    const result = await getRouteForWaypoints(waypoints);
    const legs = result?.legs;

    if (legs && legs.length >= paradas.length) {
      // ETAs acumulados: leg[0] = bus→parada[0], leg[1] = parada[0]→parada[1], etc.
      const porParada: Record<string, number> = {};
      let acumuladoSeg = 0;
      for (let i = 0; i < paradas.length; i++) {
        acumuladoSeg += legs[i].duration;
        porParada[paradas[i].id] = Math.max(1, Math.round(acumuladoSeg / 60));
      }
      // Si hay destino, agrega el último leg
      const destinoFinal = destino
        ? Math.max(1, Math.round((acumuladoSeg + (legs[paradas.length]?.duration ?? 0)) / 60))
        : null;

      const res = { porParada, destinoFinal };
      etaRutaCache.set(cacheKey, { result: res, timestamp: Date.now(), lat: latBus, lon: lonBus });
      return res;
    }
  } catch (err) {
  }

  // Fallback: Haversine acumulativo (consistente entre sí)
  const porParada: Record<string, number> = {};
  let latPrev = latBus;
  let lonPrev = lonBus;
  let acumuladoMin = 0;
  for (const p of paradasNorm) {
    acumuladoMin += calcularETA(latPrev, lonPrev, p.lat, p.lng);
    porParada[p.id] = acumuladoMin;
    latPrev = p.lat;
    lonPrev = p.lng;
  }
  const destinoFinal = destino
    ? acumuladoMin + calcularETA(latPrev, lonPrev, destino.latitud, destino.longitud)
    : null;

  const fallbackRes = { porParada, destinoFinal };
  etaRutaCache.set(cacheKey, { result: fallbackRes, timestamp: Date.now(), lat: latBus, lon: lonBus });
  return fallbackRes;
}

/**
 * Verificar si está dentro del radio de geocerca
 */
export function estaDentroDeGeocerca(
  latitudBus: number,
  longitudBus: number,
  latitudParada: number,
  longitudParada: number,
  radioMetros: number = 100
): boolean {
  const distancia = calcularDistancia(
    latitudBus,
    longitudBus,
    latitudParada,
    longitudParada
  );

  return distancia <= radioMetros;
}
