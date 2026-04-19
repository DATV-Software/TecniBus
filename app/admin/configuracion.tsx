import { Colors } from "@/lib/constants/colors";
import { SubScreenHeader, FormField } from "@/features/admin";
import {
  getUbicacionColegio,
  updateUbicacionColegio,
  type UbicacionColegio,
} from "@/lib/services/admin/configuracion.service";
import { haptic } from "@/lib/utils/haptics";
import { useRouter } from "expo-router";
import { MapPin, Save } from "lucide-react-native";
import { AddressSearchInput } from "@/components/ui";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRefresh } from "@/lib/hooks/useRefresh";
import { useToast } from "@/lib/hooks/useToast";
import MapView, { Marker, MapPressEvent, MarkerDragStartEndEvent, Region } from "react-native-maps";
import Toast from "@/components/Toast";

const MAP_HEIGHT = 400;

export default function ConfiguracionScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);

  const { toast, showToast, hideToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ubicacion, setUbicacion] = useState<UbicacionColegio>({
    latitud: -2.9, // Cuenca, Ecuador
    longitud: -79.0,
    nombre: "Colegio TecniBus",
  });

  useEffect(() => {
    loadUbicacion();
  }, []);

  const loadUbicacion = async () => {
    setLoading(true);
    const data = await getUbicacionColegio();
    setUbicacion(data);
    setLoading(false);

    // Centrar mapa en la ubicación
    if (mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: data.latitud,
          longitude: data.longitud,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        500
      );
    }
  };

  const { refreshing, onRefresh } = useRefresh(loadUbicacion);

  const handleMapPress = (e: MapPressEvent) => {
    haptic.light();
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setUbicacion({
      ...ubicacion,
      latitud: latitude,
      longitud: longitude,
    });
  };

  const handleSave = async () => {
    if (!ubicacion.nombre.trim()) {
      showToast("Ingresa el nombre del colegio", "warning");
      return;
    }

    haptic.medium();
    setSaving(true);

    const success = await updateUbicacionColegio(ubicacion);

    setSaving(false);

    if (success) {
      showToast("Configuración guardada correctamente", "success");
      setTimeout(() => router.back(), 1500);
    } else {
      showToast("Error al guardar la configuración", "error");
    }
  };

  const initialRegion: Region = {
    latitude: ubicacion.latitud,
    longitude: ubicacion.longitud,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.tecnibus[50] }}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={Colors.tecnibus[700]}
        translucent={false}
      />

      <SubScreenHeader
        title="CONFIGURACIÓN"
        subtitle="Ubicación del colegio"
        onBack={() => router.back()}
      />

      <ScrollView
        style={{ flex: 1, paddingHorizontal: 20, paddingTop: 20 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.tecnibus[600]]}
            tintColor={Colors.tecnibus[600]}
          />
        }
      >
        {loading ? (
          <View
            style={{ alignItems: "center", justifyContent: "center", paddingTop: 60 }}
          >
            <ActivityIndicator size="large" color={Colors.tecnibus[600]} />
            <Text style={{ color: "#6B7280", marginTop: 16 }}>
              Cargando configuración...
            </Text>
          </View>
        ) : (
          <>
            {/* Formulario */}
            <View
              style={{
                backgroundColor: "#fff",
                borderRadius: 16,
                padding: 20,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.06,
                shadowRadius: 3,
                elevation: 2,
                marginBottom: 16,
              }}
            >
              <FormField
                label="Nombre del colegio"
                icon={MapPin}
                required
                placeholder="Ej: Colegio TecniBus"
                value={ubicacion.nombre}
                onChangeText={(text) =>
                  setUbicacion({ ...ubicacion, nombre: text })
                }
                autoCapitalize="words"
              />

            </View>

            {/* Mapa con buscador flotante */}
            <View
              style={{
                borderRadius: 16,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.06,
                shadowRadius: 3,
                elevation: 2,
                marginBottom: 16,
                height: MAP_HEIGHT,
              }}
            >
              {/* Mapa */}
              <MapView
                ref={mapRef}
                style={{ flex: 1, borderRadius: 16 }}
                initialRegion={initialRegion}
                onPress={handleMapPress}
                mapType="standard"
              >
                <Marker
                  coordinate={{
                    latitude: ubicacion.latitud,
                    longitude: ubicacion.longitud,
                  }}
                  title={ubicacion.nombre}
                  description="Arrastra para ajustar"
                  pinColor={Colors.tecnibus[600]}
                  draggable
                  onDragEnd={(e: MarkerDragStartEndEvent) => {
                    const { latitude, longitude } = e.nativeEvent.coordinate;
                    setUbicacion((prev) => ({ ...prev, latitud: latitude, longitud: longitude }));
                  }}
                />
              </MapView>

              {/* Buscador flotante sobre el mapa */}
              <View
                style={{
                  position: "absolute",
                  top: 12,
                  left: 12,
                  right: 12,
                  zIndex: 100,
                  backgroundColor: "#ffffff",
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.12,
                  shadowRadius: 8,
                  elevation: 8,
                }}
              >
                <AddressSearchInput
                  placeholder="Buscar dirección del colegio..."
                  onSelect={(_address, lat, lng) => {
                    setUbicacion((prev) => ({ ...prev, latitud: lat, longitud: lng }));
                    mapRef.current?.animateToRegion(
                      { latitude: lat, longitude: lng, latitudeDelta: 0.008, longitudeDelta: 0.008 },
                      500
                    );
                  }}
                />
              </View>

              {/* Hint inferior */}
              <View
                style={{
                  position: "absolute",
                  bottom: 10,
                  left: 10,
                  right: 10,
                  backgroundColor: "rgba(0,0,0,0.55)",
                  borderRadius: 8,
                  paddingVertical: 6,
                  paddingHorizontal: 10,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MapPin size={13} color="#ffffff" strokeWidth={2} />
                <Text style={{ color: "#ffffff", fontSize: 11, marginLeft: 5, fontWeight: "500" }}>
                  O toca el mapa para ajustar la posición
                </Text>
              </View>
            </View>

            {/* Info */}
            <View
              style={{
                backgroundColor: Colors.tecnibus[50],
                borderRadius: 12,
                padding: 12,
                borderWidth: 1,
                borderColor: Colors.tecnibus[200],
                marginBottom: 16,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  color: Colors.tecnibus[800],
                  textAlign: "center",
                }}
              >
                Esta ubicación se usará como destino final para las rutas de IDA.
              </Text>
            </View>

            {/* Botón guardar */}
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              style={{
                backgroundColor: Colors.tecnibus[600],
                borderRadius: 16,
                paddingVertical: 16,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                shadowColor: Colors.tecnibus[600],
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 4,
                elevation: 4,
                marginBottom: 40,
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Save size={20} color="#ffffff" strokeWidth={2.5} />
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "700",
                      color: "#ffffff",
                      marginLeft: 8,
                    }}
                  >
                    Guardar Configuración
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
    </View>
  );
}
