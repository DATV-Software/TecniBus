import { supabase } from "./supabase";

export interface DirectionsResult {
  polyline: string;
  distance: number;
  duration: number;
  decodedCoordinates: { latitude: number; longitude: number }[];
  waypointOrder?: number[];
  legs?: Array<{ distance: number; duration: number }>;
}

type Coord = { lat: number; lng: number };

interface EdgeFunctionResponse {
  polyline: string;
  duration: number;
  distance: number;
  legs: Array<{ distance: number; duration: number }>;
  waypointOrder?: number[];
}

/**
 * Decodifica un polyline encoded de Google Maps.
 */
export function decodePolyline(encoded: string): { latitude: number; longitude: number }[] {
  const poly: { latitude: number; longitude: number }[] = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += (result & 1) !== 0 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += (result & 1) !== 0 ? ~(result >> 1) : result >> 1;

    poly.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }

  return poly;
}

/**
 * Llama a la Edge Function get-directions como proxy seguro hacia Google.
 * La API key de Directions nunca sale del backend.
 */
async function callGetDirections(
  origin: Coord,
  destination: Coord,
  intermediates: Coord[] = [],
  optimize = false,
): Promise<DirectionsResult | null> {
  const waypointsStr =
    intermediates.length > 0
      ? intermediates.map((w) => `${w.lat},${w.lng}`).join("|")
      : undefined;

  const payload = {
    body: {
      origin: `${origin.lat},${origin.lng}`,
      destination: `${destination.lat},${destination.lng}`,
      ...(waypointsStr !== undefined && { waypoints: waypointsStr }),
      optimize,
    },
  };

  let { data, error } = await supabase.functions.invoke<EdgeFunctionResponse>(
    "get-directions",
    payload,
  );

  // Si falla por 401 (token expirado), refrescar sesión y reintentar
  if (error && error.message?.includes("non-2xx")) {
    const { error: refreshError } = await supabase.auth.refreshSession();
    if (!refreshError) {
      const retry = await supabase.functions.invoke<EdgeFunctionResponse>(
        "get-directions",
        payload,
      );
      data = retry.data;
      error = retry.error;
    }
  }

  if (error || !data) {
    console.error("Error en get-directions:", error?.message ?? "Sin respuesta");
    return null;
  }

  return {
    polyline: data.polyline,
    distance: data.distance,
    duration: data.duration,
    decodedCoordinates: decodePolyline(data.polyline),
    legs: data.legs,
    waypointOrder: data.waypointOrder,
  };
}

/**
 * Ruta directa entre dos puntos.
 */
export async function getDirections(
  origin: Coord,
  destination: Coord,
): Promise<DirectionsResult | null> {
  return callGetDirections(origin, destination);
}

/**
 * Ruta con múltiples paradas en orden (mínimo 2 coordenadas).
 */
export async function getRouteForWaypoints(
  waypoints: Coord[],
  optimize = false,
): Promise<DirectionsResult | null> {
  if (waypoints.length < 2) return null;

  const origin = waypoints[0];
  const destination = waypoints[waypoints.length - 1];
  const intermediates = waypoints.slice(1, -1);

  return callGetDirections(origin, destination, intermediates, optimize);
}

/**
 * Ruta optimizada para el chofer: ubicación actual → paradas → destino final.
 * Usa optimize:true para que Google calcule el mejor orden de las paradas.
 */
export async function getOptimizedRouteForDriver(
  driverLocation: Coord,
  stops: Coord[],
  finalDestination: Coord,
): Promise<DirectionsResult | null> {
  if (stops.length === 0) {
    return callGetDirections(driverLocation, finalDestination);
  }

  return callGetDirections(driverLocation, finalDestination, stops, true);
}
