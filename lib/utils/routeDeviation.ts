type Coord = { latitude: number; longitude: number };

const DEG_TO_RAD = Math.PI / 180;

/**
 * Distancia en metros de un punto a un segmento de línea (A→B).
 * Usa proyección plana (suficientemente precisa para distancias <1 km).
 */
function distanciaPuntoASegmento(p: Coord, a: Coord, b: Coord): number {
  const metersPerLat = 111320;
  const metersPerLon = 111320 * Math.cos(p.latitude * DEG_TO_RAD);

  const px = (p.longitude - a.longitude) * metersPerLon;
  const py = (p.latitude - a.latitude) * metersPerLat;
  const dx = (b.longitude - a.longitude) * metersPerLon;
  const dy = (b.latitude - a.latitude) * metersPerLat;

  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.sqrt(px * px + py * py);

  const t = Math.max(0, Math.min(1, (px * dx + py * dy) / lenSq));
  const rx = px - t * dx;
  const ry = py - t * dy;
  return Math.sqrt(rx * rx + ry * ry);
}

/**
 * Retorna el índice del punto de la polyline más cercano a `punto`.
 * Útil para ordenar paradas según su posición relativa en la ruta.
 */
export function indicePuntoEnPolyline(punto: Coord, polyline: Coord[]): number {
  let minDist = Infinity;
  let closestIdx = 0;
  for (let i = 0; i < polyline.length; i++) {
    const dlat = polyline[i].latitude - punto.latitude;
    const dlon = polyline[i].longitude - punto.longitude;
    const d = dlat * dlat + dlon * dlon;
    if (d < minDist) { minDist = d; closestIdx = i; }
  }
  return closestIdx;
}

/**
 * Calcula la distancia mínima en metros desde un punto a una polyline.
 * Retorna Infinity si la polyline está vacía.
 */
export function distanciaAPolyline(punto: Coord, polyline: Coord[]): number {
  if (polyline.length === 0) return Infinity;
  if (polyline.length === 1) {
    const metersPerLat = 111320;
    const metersPerLon = 111320 * Math.cos(punto.latitude * DEG_TO_RAD);
    const dx = (polyline[0].longitude - punto.longitude) * metersPerLon;
    const dy = (polyline[0].latitude - punto.latitude) * metersPerLat;
    return Math.sqrt(dx * dx + dy * dy);
  }

  let minDist = Infinity;
  for (let i = 0; i < polyline.length - 1; i++) {
    const d = distanciaPuntoASegmento(punto, polyline[i], polyline[i + 1]);
    if (d < minDist) minDist = d;
  }
  return minDist;
}
