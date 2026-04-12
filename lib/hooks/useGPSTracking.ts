import { useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { guardarUbicacion } from '@/lib/services/ubicaciones.service';
import { networkDetector } from '@/lib/network/networkDetector';
import { classifyError, isRetryable } from '@/lib/network/errorClassifier';
import type { GpsFlushPayload } from '@/lib/network/types';

const GPS_BUFFER_STORAGE_KEY = '@tecnibus:gps_buffer_v1';

type UseGPSTrackingProps = {
  idAsignacion: string | null;
  idChofer: string;
  recorridoActivo: boolean;
  distanciaMinimaMetros?: number; // mantenido por compatibilidad, no usado internamente
};

export type UbicacionLocal = {
  latitude: number;
  longitude: number;
  speed: number | null;
  heading: number | null;  // heading raw del GPS
  bearing: number;          // bearing suavizado calculado desde posiciones (nunca null)
};

type MovementState = 'activo' | 'lento' | 'detenido';

// Umbral de escritura a DB por estado (metros)
const DB_THRESHOLD: Record<MovementState, number | null> = {
  activo: 15,
  lento: 25,
  detenido: null, // no escribir
};

// GPS offline buffer: max points to accumulate while offline
const GPS_BUFFER_MAX = 50;

function distanciaMetros(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calcularBearingDePosiciones(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function suavizarAngulo(current: number, target: number, factor: number): number {
  const diff = ((target - current + 540) % 360) - 180;
  return (current + diff * factor + 360) % 360;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Hook GPS con pipeline de filtrado avanzado — estilo Uber V3.
 *
 * Offline resilience additions:
 * - When offline, GPS points are buffered in memory (up to GPS_BUFFER_MAX)
 * - When network is restored, buffered points are flushed to the DB
 * - DB write failures that are network-errors trigger networkDetector.reportNetworkError()
 */
export function useGPSTracking({
  idAsignacion,
  idChofer,
  recorridoActivo,
}: UseGPSTrackingProps) {
  const [permisoConcedido, setPermisoConcedido] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ubicacionActual, setUbicacionActual] = useState<UbicacionLocal | null>(null);

  const ultimaGuardadaRef = useRef<{ lat: number; lng: number } | null>(null);
  const suscripcionRef = useRef<Location.LocationSubscription | null>(null);

  // Pipeline V3 refs
  const prevPositionRef = useRef<{ lat: number; lng: number; timestamp: number } | null>(null);
  const lastBearingRef = useRef<number>(0);
  const consecutiveStopsRef = useRef<number>(0);
  const movementStateRef = useRef<MovementState>('detenido');

  // Refs for values read inside the watchPosition callback — keeps the callback
  // stable across route changes without restarting the GPS subscription.
  const idAsignacionRef = useRef(idAsignacion);
  const idChoferRef = useRef(idChofer);
  const recorridoActivoRef = useRef(recorridoActivo);
  useEffect(() => { idAsignacionRef.current = idAsignacion; }, [idAsignacion]);
  useEffect(() => { idChoferRef.current = idChofer; }, [idChofer]);
  useEffect(() => { recorridoActivoRef.current = recorridoActivo; }, [recorridoActivo]);

  // Offline GPS buffer
  const gpsBufferRef = useRef<GpsFlushPayload['points']>([]);
  const isFlushing = useRef(false);

  // ── Flush GPS buffer ──────────────────────────────────────────────────────

  const flushGpsBuffer = async () => {
    if (isFlushing.current) return;
    if (gpsBufferRef.current.length === 0) return;
    if (!networkDetector.isOnline) return;

    isFlushing.current = true;
    const points = [...gpsBufferRef.current];
    gpsBufferRef.current = [];
    void AsyncStorage.removeItem(GPS_BUFFER_STORAGE_KEY);


    for (const point of points) {
      try {
        await guardarUbicacion(
          point.idAsignacion,
          point.idChofer,
          point.latitud,
          point.longitud,
          point.velocidad,
          point.precisionGps,
          point.heading,
        );
        // Update "last saved" reference to the most recently flushed point
        ultimaGuardadaRef.current = { lat: point.latitud, lng: point.longitud };
        await sleep(150); // avoid flooding
      } catch (_err) {
        // Put remaining points back in the buffer if we lose connection again
        const failedIdx = points.indexOf(point);
        gpsBufferRef.current = points.slice(failedIdx);
        void AsyncStorage.setItem(GPS_BUFFER_STORAGE_KEY, JSON.stringify(gpsBufferRef.current));
        break;
      }
    }

    isFlushing.current = false;
  };

  // ── Subscribe to reconnection for automatic flush ─────────────────────────

  useEffect(() => {
    const unsub = networkDetector.subscribe((online) => {
      if (online && gpsBufferRef.current.length > 0) {
        void flushGpsBuffer();
      }
    });
    return unsub;
    // flushGpsBuffer uses only refs so it's stable
  }, []);  

  // ── GPS Permission ────────────────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError('Permiso de ubicación denegado');
          return;
        }
        setPermisoConcedido(true);

        // Restore GPS buffer persisted from a previous session
        try {
          const raw = await AsyncStorage.getItem(GPS_BUFFER_STORAGE_KEY);
          if (raw) {
            const restored = JSON.parse(raw) as GpsFlushPayload['points'];
            if (restored.length > 0) {
              gpsBufferRef.current = restored;
              if (networkDetector.isOnline) void flushGpsBuffer();
            }
          }
        } catch {
          // Non-fatal: start with empty buffer
        }

        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const { latitude, longitude, speed, heading } = pos.coords;
        setUbicacionActual({
          latitude,
          longitude,
          speed: speed != null ? speed * 3.6 : null,
          heading: heading ?? null,
          bearing: 0,
        });
      } catch {
        setError('Error al solicitar permisos de ubicación');
      }
    })();
  }, []);  

  // ── Watch Position ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!permisoConcedido) return;

    let cancelled = false;

    const iniciarWatch = async () => {
      if (suscripcionRef.current) {
        suscripcionRef.current.remove();
        suscripcionRef.current = null;
      }

      const sub = await Location.watchPositionAsync(
        {
          accuracy: recorridoActivo
            ? Location.Accuracy.BestForNavigation
            : Location.Accuracy.Balanced,
          timeInterval: recorridoActivo ? 3000 : 10000,
          distanceInterval: recorridoActivo ? 5 : 20,
        },
        (location) => {
          if (cancelled) return;

          const { latitude, longitude, speed, heading, accuracy } = location.coords;
          const timestamp = location.timestamp;

          // PASO A: Filtro de precisión — descartar GPS poco confiable
          if (accuracy != null && accuracy > 50) return;

          const prev = prevPositionRef.current;

          // PASO B: Validación física — anti-teleportación
          if (prev) {
            const deltaTime = timestamp - prev.timestamp;
            const dist = distanciaMetros(prev.lat, prev.lng, latitude, longitude);
            if (deltaTime > 0) {
              const velocidadImplicada = (dist / (deltaTime / 1000)) * 3.6;
              if (velocidadImplicada > 150) return;
            }
          }

          // PASO C: Criterio híbrido de movimiento
          const speedKmh = speed != null ? speed * 3.6 : 0;
          const distance = prev
            ? distanciaMetros(prev.lat, prev.lng, latitude, longitude)
            : 0;
          const enMovimiento = distance > 2 || speedKmh > 3;

          // PASO D: Estado de movimiento
          if (!enMovimiento) {
            consecutiveStopsRef.current += 1;
          } else {
            consecutiveStopsRef.current = 0;
          }

          let newState: MovementState;
          if (consecutiveStopsRef.current >= 3) {
            newState = 'detenido';
          } else if (distance <= 8) {
            newState = 'lento';
          } else {
            newState = 'activo';
          }
          movementStateRef.current = newState;

          // PASO E: Cálculo de bearing
          const prevBearing = lastBearingRef.current;
          if (enMovimiento && prev) {
            const rawBearing = calcularBearingDePosiciones(
              prev.lat, prev.lng,
              latitude, longitude,
            );
            lastBearingRef.current = suavizarAngulo(lastBearingRef.current, rawBearing, 0.3);
          }

          // PASO F: Throttle de setState
          const bearingDiff = Math.abs(((lastBearingRef.current - prevBearing + 540) % 360) - 180);
          if (prev && distance < 2 && bearingDiff < 3) {
            prevPositionRef.current = { lat: latitude, lng: longitude, timestamp };
            return;
          }

          // PASO G: Actualizar posición previa
          prevPositionRef.current = { lat: latitude, lng: longitude, timestamp };

          setUbicacionActual({
            latitude,
            longitude,
            speed: speed != null ? speed * 3.6 : null,
            heading: heading ?? null,
            bearing: lastBearingRef.current,
          });

          // ── DB write with offline buffering ──────────────────────────────
          // Read from refs so the callback always uses the current route ID
          // even if the driver switched routes without restarting GPS.
          const currentAsignacion = idAsignacionRef.current;
          const currentChofer = idChoferRef.current;
          if (!recorridoActivoRef.current || !currentAsignacion) return;

          const umbralDB = DB_THRESHOLD[movementStateRef.current];
          if (umbralDB === null) return; // detenido → no escribir

          const ultima = ultimaGuardadaRef.current;
          if (ultima) {
            const distDB = distanciaMetros(ultima.lat, ultima.lng, latitude, longitude);
            if (distDB < umbralDB) return;
          }

          if (!networkDetector.isOnline) {
            // Offline → buffer this point
            const buffer = gpsBufferRef.current;
            if (buffer.length >= GPS_BUFFER_MAX) {
              // Drop oldest point to make room (circular buffer)
              buffer.shift();
            }
            buffer.push({
              idAsignacion: currentAsignacion,
              idChofer: currentChofer,
              latitud: latitude,
              longitud: longitude,
              velocidad: speed ? speed * 3.6 : undefined,
              precisionGps: accuracy || undefined,
              heading: heading ?? undefined,
              capturedAt: timestamp,
            });
            void AsyncStorage.setItem(GPS_BUFFER_STORAGE_KEY, JSON.stringify(buffer));
            // Still update ultimaGuardadaRef so we don't flood the buffer
            ultimaGuardadaRef.current = { lat: latitude, lng: longitude };
            return;
          }

          // Online → write immediately
          guardarUbicacion(
            currentAsignacion,
            currentChofer,
            latitude,
            longitude,
            speed ? speed * 3.6 : undefined,
            accuracy || undefined,
            heading ?? undefined,
          ).then(() => {
            ultimaGuardadaRef.current = { lat: latitude, lng: longitude };
          }).catch((err: unknown) => {
            const kind = classifyError(err);
            if (isRetryable(kind)) {
              // Tell the detector we lost connectivity
              networkDetector.reportNetworkError();
              // Buffer this point for later
              const buffer = gpsBufferRef.current;
              if (buffer.length < GPS_BUFFER_MAX) {
                buffer.push({
                  idAsignacion: currentAsignacion,
                  idChofer: currentChofer,
                  latitud: latitude,
                  longitud: longitude,
                  velocidad: speed ? speed * 3.6 : undefined,
                  precisionGps: accuracy || undefined,
                  heading: heading ?? undefined,
                  capturedAt: timestamp,
                });
                void AsyncStorage.setItem(GPS_BUFFER_STORAGE_KEY, JSON.stringify(buffer));
              }
            }
          });
        },
      );

      if (!cancelled) {
        suscripcionRef.current = sub;
      } else {
        sub.remove();
      }
    };

    iniciarWatch();

    return () => {
      cancelled = true;
      if (suscripcionRef.current) {
        suscripcionRef.current.remove();
        suscripcionRef.current = null;
      }
    };
  }, [permisoConcedido, recorridoActivo, idAsignacion, idChofer]);

  // ── Reset on route end ────────────────────────────────────────────────────

  useEffect(() => {
    if (!recorridoActivo) {
      ultimaGuardadaRef.current = null;
      prevPositionRef.current = null;
      consecutiveStopsRef.current = 0;
      movementStateRef.current = 'detenido';
      gpsBufferRef.current = [];
      void AsyncStorage.removeItem(GPS_BUFFER_STORAGE_KEY);
    }
  }, [recorridoActivo]);

  return {
    permisoConcedido,
    error,
    tracking: recorridoActivo && permisoConcedido,
    ubicacionActual,
    /** Number of GPS points buffered while offline */
    gpsBufferedCount: gpsBufferRef.current.length,
  };
}
