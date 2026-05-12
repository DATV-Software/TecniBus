import { Colors } from "@/lib/constants/colors";
import { SubScreenHeader } from "@/features/admin";
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
  TextInput,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useToast } from "@/lib/hooks/useToast";
import MapView, { Marker, MapPressEvent, MarkerDragStartEndEvent, Region } from "react-native-maps";
import Toast from "@/components/Toast";

export default function ConfiguracionScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const insets = useSafeAreaInsets();

  const { toast, showToast, hideToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ubicacion, setUbicacion] = useState<UbicacionColegio>({
    latitud: -2.9,
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

    mapRef.current?.animateToRegion(
      { latitude: data.latitud, longitude: data.longitud, latitudeDelta: 0.01, longitudeDelta: 0.01 },
      500
    );
  };

  const handleMapPress = (e: MapPressEvent) => {
    haptic.light();
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setUbicacion((prev) => ({ ...prev, latitud: latitude, longitud: longitude }));
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
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.tecnibus[700]} translucent={false} />

      <SubScreenHeader
        title="CONFIGURACIÓN"
        subtitle="Ubicación del colegio"
        onBack={() => router.back()}
      />

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={Colors.tecnibus[600]} />
          <Text style={{ color: "#6B7280", marginTop: 12, fontSize: 13 }}>
            Cargando configuración...
          </Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {/* Input nombre */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 14,
              paddingVertical: 10,
              gap: 8,
              borderBottomWidth: 1,
              borderBottomColor: "#F3F4F6",
              backgroundColor: "#fff",
            }}
          >
            <MapPin size={14} color="#9CA3AF" strokeWidth={2} />
            <TextInput
              style={{ flex: 1, fontSize: 13, color: "#1F2937", paddingVertical: 0 }}
              placeholder="Nombre del colegio"
              placeholderTextColor="#9CA3AF"
              value={ubicacion.nombre}
              onChangeText={(text) => setUbicacion((prev) => ({ ...prev, nombre: text }))}
              autoCapitalize="words"
              autoCorrect={false}
            />
          </View>

          {/* Mapa — flex: 1 llena todo el espacio disponible */}
          <View style={{ flex: 1, marginHorizontal: 12, marginTop: 10, borderRadius: 16, overflow: "hidden" }}>
            <MapView
              ref={mapRef}
              style={{ flex: 1 }}
              initialRegion={initialRegion}
              onPress={handleMapPress}
              mapType="standard"
            >
              <Marker
                coordinate={{ latitude: ubicacion.latitud, longitude: ubicacion.longitud }}
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

            {/* Buscador flotante */}
            <View
              style={{
                position: "absolute",
                top: 10,
                left: 10,
                right: 10,
                zIndex: 100,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.12,
                shadowRadius: 5,
                elevation: 5,
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
                backgroundColor: "rgba(0,0,0,0.5)",
                borderRadius: 7,
                paddingVertical: 5,
                paddingHorizontal: 10,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
              }}
            >
              <MapPin size={11} color="#ffffff" strokeWidth={2} />
              <Text style={{ color: "#ffffff", fontSize: 10, fontWeight: "500" }}>
                Toca el mapa o arrastra el pin para ajustar
              </Text>
            </View>
          </View>

          {/* Botón guardar */}
          <View
            style={{
              paddingHorizontal: 12,
              paddingTop: 12,
              paddingBottom: 12 + insets.bottom,
              backgroundColor: Colors.tecnibus[50],
            }}
          >
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              style={{
                backgroundColor: Colors.tecnibus[600],
                borderRadius: 14,
                paddingVertical: 14,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                shadowColor: Colors.tecnibus[600],
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 4,
                elevation: 4,
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Save size={18} color="#ffffff" strokeWidth={2.5} />
                  <Text style={{ fontSize: 15, fontWeight: "700", color: "#ffffff" }}>
                    Guardar Configuración
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
    </View>
  );
}
