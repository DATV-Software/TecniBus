import { Colors } from "@/lib/constants/colors";
import { calcularDistancia } from "@/lib/utils/distance";
import type { Parada } from "@/lib/services/routing/rutas.service";
import type { UbicacionActual } from "@/lib/services/fleet/ubicaciones.service";
import * as Location from "expo-location";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  View
} from "react-native";
import MapView, {
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
  type Region,
} from "react-native-maps";

// Resolver la imagen de la buseta para React Native Maps
const busImage = require("@/assets/images/bus-upview.png");

// Memoizado para evitar recreación en cada render del mapa padre
const BusMarker = memo(() => (
  <Image
    source={busImage}
    style={{ width: 35, height: 35 }}
    resizeMode="contain"
  />
));
BusMarker.displayName = 'BusMarker';

const DEFAULT_REGION: Region = {
  latitude: -2.9, // Cuenca, Ecuador
  longitude: -79.0,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

type RouteMapProps = {
  paradas: Parada[];
  ubicacionBus: UbicacionActual | null;
  recorridoActivo: boolean;
  polylineCoordinates?: { latitude: number; longitude: number }[];
  ubicacionColegio?: {
    latitud: number;
    longitud: number;
    nombre: string;
  } | null;
  mostrarUbicacionChofer?: boolean;
  ubicacionChofer?: {
    latitude: number;
    longitude: number;
    speed?: number | null;
    heading?: number | null;
    bearing?: number;        // bearing suavizado del hook useGPSTracking
  } | null;
  showsUserLocation?: boolean;
};

function RouteMapComponent({
  paradas,
  ubicacionBus,
  recorridoActivo,
  polylineCoordinates,
  ubicacionColegio,
  mostrarUbicacionChofer = false,
  ubicacionChofer = null,
  showsUserLocation = true,
}: RouteMapProps) {
  const mapRef = useRef<MapView>(null);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<Region | null>(null);

  // Detección de interacción del usuario — pausa el auto-follow
  const isUserInteractingRef = useRef(false);
  const userInteractingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Última posición animada — para evitar micro-animaciones sin cambio real
  const lastAnimatedPositionRef = useRef<{
    lat: number;
    lng: number;
    bearing: number;
  } | null>(null);

  // Limpiar timer de interacción al desmontar
  useEffect(() => {
    return () => {
      if (userInteractingTimerRef.current) {
        clearTimeout(userInteractingTimerRef.current);
      }
    };
  }, []);

  // Obtener ubicación del dispositivo solo si showsUserLocation es true (para chofer)
  useEffect(() => {
    if (!showsUserLocation) return;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const region: Region = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        };
        setUserLocation(region);
        if (paradas.length === 0 && mapRef.current) {
          mapRef.current.animateToRegion(region, 500);
        }
      } catch {
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showsUserLocation]);

  // Calcular region basada en paradas
  const getRegionFromParadas = (): Region | null => {
    if (paradas.length === 0) return null;
    const latitudes = paradas.map((p) => p.latitud);
    const longitudes = paradas.map((p) => p.longitud);
    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);
    const minLng = Math.min(...longitudes);
    const maxLng = Math.max(...longitudes);
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: (maxLat - minLat) * 1.2 || 0.01,
      longitudeDelta: (maxLng - minLng) * 1.2 || 0.01,
    };
  };

  const getInitialRegion = (): Region => {
    return getRegionFromParadas() || (showsUserLocation ? userLocation : null) || DEFAULT_REGION;
  };

  // Stable handler — avoids re-creating inline arrow on every render
  const handlePanDrag = useCallback(() => {
    isUserInteractingRef.current = true;
    if (userInteractingTimerRef.current) {
      clearTimeout(userInteractingTimerRef.current);
    }
    userInteractingTimerRef.current = setTimeout(() => {
      isUserInteractingRef.current = false;
    }, 8000);
  }, []);

  // Auto-seguir al chofer en vista chofer — con bearing estable y pitch 3D
  useEffect(() => {
    if (!mostrarUbicacionChofer || !ubicacionChofer || !mapRef.current || !recorridoActivo) return;
    if (isUserInteractingRef.current) return;

    const bearing = ubicacionChofer.bearing ?? 0;

    // Validar cambio mínimo antes de animar — evita micro-animaciones
    const prev = lastAnimatedPositionRef.current;
    if (prev) {
      const distDelta = calcularDistancia(
        prev.lat, prev.lng,
        ubicacionChofer.latitude, ubicacionChofer.longitude,
      );
      const bearingDelta = Math.abs(((bearing - prev.bearing + 540) % 360) - 180);
      if (distDelta < 5 && bearingDelta < 5) return;
    }

    lastAnimatedPositionRef.current = {
      lat: ubicacionChofer.latitude,
      lng: ubicacionChofer.longitude,
      bearing,
    };

    const enMovimiento = (ubicacionChofer.speed ?? 0) > 3;

    mapRef.current.animateCamera(
      {
        center: { latitude: ubicacionChofer.latitude, longitude: ubicacionChofer.longitude },
        zoom: 16,
        heading: enMovimiento ? bearing : undefined,
        // undefined → mapa mantiene orientación actual sin snappear al norte
        pitch: 30,
      },
      { duration: 1500 },
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ubicacionChofer?.latitude, ubicacionChofer?.longitude, ubicacionChofer?.bearing, mostrarUbicacionChofer, recorridoActivo]);

  // Resetear pitch y zoom al finalizar recorrido
  useEffect(() => {
    if (!recorridoActivo && mostrarUbicacionChofer && mapRef.current) {
      lastAnimatedPositionRef.current = null;
      mapRef.current.animateCamera({ pitch: 0, zoom: 15 }, { duration: 800 });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recorridoActivo]);

  // Auto-centrar en el bus cuando se mueve (vista padre)
  useEffect(() => {
    if (!ubicacionBus || !mapRef.current || !recorridoActivo || mostrarUbicacionChofer) return;
    if (isUserInteractingRef.current) return;

    const prev = lastAnimatedPositionRef.current;
    if (prev) {
      const distDelta = calcularDistancia(
        prev.lat, prev.lng,
        ubicacionBus.latitud, ubicacionBus.longitud,
      );
      if (distDelta < 8) return;
    }

    lastAnimatedPositionRef.current = {
      lat: ubicacionBus.latitud,
      lng: ubicacionBus.longitud,
      bearing: 0,
    };

    mapRef.current.animateCamera(
      {
        center: {
          latitude: ubicacionBus.latitud,
          longitude: ubicacionBus.longitud,
        },
        zoom: 15,
      },
      { duration: 1000 },
    );
  }, [ubicacionBus, recorridoActivo, mostrarUbicacionChofer]);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={getInitialRegion()}
        onMapReady={() => setLoading(false)}
        showsUserLocation={showsUserLocation}
        showsMyLocationButton={true}
        showsCompass={true}
        showsScale={true}
        onPanDrag={handlePanDrag}
      >
        {/* Polyline verde: ruta restante (se va consumiendo conforme avanza el bus) */}
        {polylineCoordinates && polylineCoordinates.length > 0 && (
          <Polyline
            coordinates={polylineCoordinates}
            strokeColor="#10B981"
            strokeWidth={5}
            lineCap="round"
            lineJoin="round"
          />
        )}

        {/* Marker del colegio - ROJO */}
        {ubicacionColegio && (
          <Marker
            coordinate={{
              latitude: ubicacionColegio.latitud,
              longitude: ubicacionColegio.longitud,
            }}
            title={ubicacionColegio.nombre || "Colegio"}
            description="Punto de inicio/destino"
            pinColor="#dc2626"
          />
        )}

        {/* Markers de paradas - TODOS CELESTES */}
        {paradas.map((parada, index) => (
          <Marker
            key={parada.id}
            coordinate={{
              latitude: parada.latitud,
              longitude: parada.longitud,
            }}
            title={parada.nombre || `Parada ${index + 1}`}
            description={parada.direccion || undefined}
            pinColor={Colors.tecnibus[600]}
          />
        ))}

        {/* Marker del bus en tiempo real (cuando recorrido activo) */}
        {(() => {
          if (recorridoActivo && ubicacionBus) {
            return (
              <Marker
                coordinate={{
                  latitude: ubicacionBus.latitud,
                  longitude: ubicacionBus.longitud,
                }}
                title="Buseta en ruta"
                description={
                  ubicacionBus.velocidad
                    ? `${Math.round(ubicacionBus.velocidad)} km/h`
                    : "En camino"
                }
                anchor={{ x: 0.5, y: 0.5 }}
                flat={true}
                rotation={(ubicacionBus.velocidad ?? 0) > 5 ? (ubicacionBus.heading ?? 0) : 0}
              >
                <BusMarker />
              </Marker>
            );
          }

          if (mostrarUbicacionChofer && ubicacionChofer) {
            return (
              <Marker
                coordinate={ubicacionChofer}
                title="Mi ubicación"
                description="Ubicación actual del chofer"
                anchor={{ x: 0.5, y: 0.5 }}
                flat={true}
                rotation={ubicacionChofer.bearing ?? 0}
                // bearing viene congelado del hook cuando el bus está parado → sin snap a norte
              >
                <BusMarker />
              </Marker>
            );
          }

          return null;
        })()}
      </MapView>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.tecnibus[600]} />
          <Text style={styles.loadingText}>Cargando mapa...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: "hidden" },
  map: { flex: 1 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: { marginTop: 8, color: "#6b7280", fontSize: 14 },
});

/**
 * Memoized: only re-renders when paradas array reference, ubicacionBus,
 * recorridoActivo, polylineCoordinates, or chofer position/bearing change.
 * This prevents the MapView from being torn-down and rebuilt on every
 * GPS tick in the parent/driver screens.
 */
export default memo(RouteMapComponent);
