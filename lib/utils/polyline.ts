type Coordinate = { latitude: number; longitude: number };

/**
 * Calcula el segmento de polyline restante desde la posición actual.
 * Encuentra el punto más cercano en la ruta y retorna todo desde ese punto.
 */
export function calcularPolylineRestante(
  coordinates: Coordinate[],
  posicion: Coordinate,
): Coordinate[] {
  if (!coordinates.length) return coordinates;

  let minDist = Infinity;
  let closestIdx = 0;

  for (let i = 0; i < coordinates.length; i++) {
    const d =
      (posicion.latitude - coordinates[i].latitude) ** 2 +
      (posicion.longitude - coordinates[i].longitude) ** 2;
    if (d < minDist) {
      minDist = d;
      closestIdx = i;
    }
  }

  return coordinates.slice(closestIdx);
}
