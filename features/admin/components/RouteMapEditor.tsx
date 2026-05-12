import { AddressSearchInput } from "@/components/ui";
import { useAlert } from "@/components/ui/AlertBox/useAlert";
import { Colors } from "@/lib/constants/colors";
import {
  Parada,
  createParada,
  deleteParada,
  updateParada,
} from "@/lib/services/routing/rutas.service";
import { haptic } from "@/lib/utils/haptics";
import { Edit3, MapPin, Plus, Trash2, X } from "lucide-react-native";
import { useCallback, useRef, useState } from "react";
import {
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { MapPressEvent, Marker, MarkerDragStartEndEvent, Region } from "react-native-maps";
import { ParadaFormSheet } from "./ParadaFormSheet";

interface RouteMapEditorProps {
  rutaId: string;
  paradas: Parada[];
  onParadaCreated: () => void;
  onParadaUpdated: () => void;
  onParadaDeleted: () => void;
}

const MAP_HEIGHT = 320;

// Default to Cuenca, Ecuador
const DEFAULT_REGION: Region = {
  latitude: -2.9,
  longitude: -79.0,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

function getMarkerColor(_index: number, _total: number): string {
  return Colors.tecnibus[600];
}

export function RouteMapEditor({
  rutaId,
  paradas,
  onParadaCreated,
  onParadaUpdated,
  onParadaDeleted,
}: RouteMapEditorProps) {
  const { showAlert } = useAlert();
  const mapRef = useRef<MapView>(null);
  const [addMode, setAddMode] = useState(false);
  const [showAddressSearch, setShowAddressSearch] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingParada, setEditingParada] = useState<Parada | null>(null);
  const [newCoords, setNewCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  // Coordenadas pendientes de confirmar (después de buscar dirección o tocar mapa)
  const [pendingCoords, setPendingCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  const initialRegion: Region =
    paradas.length > 0
      ? {
          latitude: paradas[0].latitud,
          longitude: paradas[0].longitud,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }
      : DEFAULT_REGION;

  const handleMapPress = useCallback(
    (e: MapPressEvent) => {
      if (!addMode) return;
      haptic.light();
      const { latitude, longitude } = e.nativeEvent.coordinate;
      setPendingCoords({ latitude, longitude });
      setEditingParada(null);
      setShowAddressSearch(false);
    },
    [addMode],
  );

  const confirmPendingCoords = () => {
    if (!pendingCoords) return;
    haptic.medium();
    setNewCoords(pendingCoords);
    setPendingCoords(null);
    setAddMode(false);
    setShowForm(true);
  };

  const handleMarkerPress = useCallback((parada: Parada) => {
    haptic.light();
    setEditingParada(parada);
    setNewCoords(null);
    setShowForm(true);
  }, []);

  const handleSave = async (data: {
    nombre: string;
    direccion: string;
    latitud: number;
    longitud: number;
  }): Promise<boolean> => {
    if (editingParada) {
      const success = await updateParada(editingParada.id, data);
      if (success) onParadaUpdated();
      return success;
    } else {
      const result = await createParada({
        id_ruta: rutaId,
        ...data,
      });
      if (result) onParadaCreated();
      return !!result;
    }
  };

  const handleDelete = async (): Promise<boolean> => {
    if (!editingParada) return false;
    const success = await deleteParada(editingParada.id);
    if (success) onParadaDeleted();
    return success;
  };

  const confirmDeleteParada = (parada: Parada) => {
    haptic.medium();
    showAlert({
      title: "Eliminar Parada",
      message: `¿Eliminar "${parada.nombre || "esta parada"}"?`,
      type: "warning",
      buttons: [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            const success = await deleteParada(parada.id);
            if (success) onParadaDeleted();
          },
        },
      ],
    });
  };

  return (
    <View>
      {/* Map container — position:relative para el buscador flotante */}
      <View style={{ marginHorizontal: 20, marginTop: 16 }}>
        <View
          style={{
            height: MAP_HEIGHT,
            borderRadius: 16,
            overflow: "hidden",
            borderWidth: addMode ? 2 : 0,
            borderColor: addMode ? Colors.tecnibus[500] : "transparent",
          }}
        >
          <MapView
            ref={mapRef}
            style={{ flex: 1 }}
            initialRegion={initialRegion}
            onPress={handleMapPress}
            mapType="standard"
          >
            {paradas.map((parada, index) => (
              <Marker
                key={parada.id}
                coordinate={{ latitude: parada.latitud, longitude: parada.longitud }}
                onPress={() => handleMarkerPress(parada)}
                title={parada.nombre || `Parada ${index + 1}`}
                description={parada.direccion || undefined}
                pinColor={getMarkerColor(index, paradas.length)}
              />
            ))}

            {/* Marcador pendiente draggable — aparece al buscar o tocar mapa */}
            {pendingCoords && (
              <Marker
                coordinate={pendingCoords}
                title="Nueva parada"
                description="Arrastra para ajustar"
                pinColor="#F59E0B"
                draggable
                onDragEnd={(e: MarkerDragStartEndEvent) => {
                  const { latitude, longitude } = e.nativeEvent.coordinate;
                  setPendingCoords({ latitude, longitude });
                }}
              />
            )}
          </MapView>

          {/* Hint toca el mapa — dentro del overflow:hidden, solo visual */}
          {addMode && !showAddressSearch && !pendingCoords && (
            <View
              style={{
                position: "absolute",
                bottom: 10,
                left: 10,
                right: 10,
                backgroundColor: "rgba(0,0,0,0.6)",
                borderRadius: 10,
                padding: 8,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MapPin size={14} color="#ffffff" strokeWidth={2} />
              <Text style={{ color: "#ffffff", fontSize: 12, marginLeft: 5 }}>
                Toca el mapa para ubicar la parada
              </Text>
            </View>
          )}
        </View>

        {/* Overlay confirmar — FUERA del overflow:hidden para que los taps funcionen */}
        {pendingCoords && (
          <View
            style={{
              position: "absolute",
              bottom: 10,
              left: 0,
              right: 0,
              paddingHorizontal: 10,
              zIndex: 20,
            }}
          >
            <View
              style={{
                backgroundColor: "#ffffff",
                borderRadius: 12,
                padding: 10,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.18,
                shadowRadius: 8,
                elevation: 8,
              }}
            >
              <MapPin size={14} color="#F59E0B" strokeWidth={2.5} />
              <Text style={{ flex: 1, fontSize: 12, color: "#374151", fontWeight: "500" }}>
                Arrastra el marcador para ajustar
              </Text>
              <TouchableOpacity
                onPress={confirmPendingCoords}
                style={{
                  backgroundColor: Colors.tecnibus[600],
                  borderRadius: 8,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                }}
              >
                <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>Agregar aquí</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Buscador flotante — aparece al presionar "+" */}
        {showAddressSearch && (
          <View
            style={{
              position: "absolute",
              top: 8,
              left: 8,
              right: 8,
              zIndex: 100,
              backgroundColor: "#ffffff",
              borderRadius: 12,
              paddingHorizontal: 8,
              paddingTop: 6,
              paddingBottom: 6,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.12,
              shadowRadius: 8,
              elevation: 8,
            }}
          >
            <AddressSearchInput
              placeholder="Ej: Av. Américas, frente al parque..."
onSelect={(_address, lat, lng) => {
                setShowAddressSearch(false);
                setEditingParada(null);
                setPendingCoords({ latitude: lat, longitude: lng });
                mapRef.current?.animateToRegion(
                  { latitude: lat, longitude: lng, latitudeDelta: 0.004, longitudeDelta: 0.004 },
                  400,
                );
              }}
            />
          </View>
        )}

        {/* FAB Add button */}
        <View
          style={{
            position: "absolute",
            bottom: -18,
            right: 0,
            zIndex: 10,
          }}
        >
          <TouchableOpacity
            onPress={() => {
              haptic.medium();
              if (showAddressSearch || addMode || pendingCoords) {
                setShowAddressSearch(false);
                setAddMode(false);
                setPendingCoords(null);
              } else {
                setShowAddressSearch(true);
                setAddMode(true);
              }
            }}
            style={{
              backgroundColor:
                showAddressSearch || addMode || pendingCoords ? "#DC2626" : Colors.tecnibus[600],
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: "center",
              justifyContent: "center",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 6,
            }}
          >
            {showAddressSearch || addMode || pendingCoords ? (
              <X size={20} color="#ffffff" strokeWidth={2.5} />
            ) : (
              <Plus size={22} color="#ffffff" strokeWidth={2.5} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ height: 28 }} />

      {/* Paradas list */}
      <View style={{ paddingHorizontal: 20 }}>
        <Text
          style={{
            fontSize: 14,
            fontWeight: "700",
            color: "#374151",
            marginBottom: 8,
          }}
        >
          Paradas ({paradas.length})
        </Text>

        {paradas.length === 0 ? (
          <View
            style={{
              backgroundColor: Colors.tecnibus[50],
              borderRadius: 12,
              padding: 20,
              alignItems: "center",
              borderWidth: 1,
              borderColor: Colors.tecnibus[200],
            }}
          >
            <MapPin size={32} color={Colors.tecnibus[400]} strokeWidth={1.5} />
            <Text
              style={{
                color: "#6B7280",
                fontSize: 13,
                marginTop: 8,
                textAlign: "center",
              }}
            >
              Sin paradas. Toca [+] y luego el mapa para agregar.
            </Text>
          </View>
        ) : (
          <FlatList
            data={paradas}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                activeOpacity={0.7}
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 8,
                  flexDirection: "row",
                  alignItems: "center",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.04,
                  shadowRadius: 2,
                  elevation: 1,
                }}
              >
                <View
                  style={{
                    backgroundColor: getMarkerColor(index, paradas.length),
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <MapPin size={16} color="#ffffff" strokeWidth={2.5} />
                </View>

                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: "#1F2937",
                    }}
                    numberOfLines={1}
                  >
                    {item.nombre || "Sin nombre"}
                  </Text>
                  {item.direccion ? (
                    <Text
                      style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}
                      numberOfLines={1}
                    >
                      {item.direccion}
                    </Text>
                  ) : null}
                </View>

                <TouchableOpacity
                  onPress={() => handleMarkerPress(item)}
                  style={{ padding: 6 }}
                >
                  <Edit3
                    size={16}
                    color={Colors.tecnibus[600]}
                    strokeWidth={2}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => confirmDeleteParada(item)}
                  style={{ padding: 6, marginLeft: 2 }}
                >
                  <Trash2 size={16} color="#DC2626" strokeWidth={2} />
                </TouchableOpacity>
              </TouchableOpacity>
            )}
            contentContainerStyle={{ paddingBottom: 8 }}
            showsVerticalScrollIndicator={false}
            scrollEnabled={false}
          />
        )}
      </View>

      {/* ParadaFormSheet */}
      <ParadaFormSheet
        visible={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingParada(null);
          setNewCoords(null);
        }}
        initialData={
          editingParada ||
          (newCoords
            ? {
                latitud: newCoords.latitude,
                longitud: newCoords.longitude,
              }
            : undefined)
        }
        rutaId={rutaId}
        onSave={handleSave}
        onDelete={editingParada ? handleDelete : undefined}
      />
    </View>
  );
}
