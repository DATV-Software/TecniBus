import { Colors } from "@/lib/constants/colors";
import { haptic } from "@/lib/utils/haptics";
import {
  Clock,
  Edit3,
  MapPin,
  Plus,
  Trash2,
} from "lucide-react-native";
import { useCallback, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, MapPressEvent, Region } from "react-native-maps";
import {
  Parada,
  createParada,
  updateParada,
  deleteParada,
} from "@/lib/services/rutas.service";
import { ParadaFormSheet } from "./ParadaFormSheet";
import { useAlert } from "@/components/ui/AlertBox/useAlert";

interface RouteMapEditorProps {
  rutaId: string;
  paradas: Parada[];
  onParadaCreated: () => void;
  onParadaUpdated: () => void;
  onParadaDeleted: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const MAP_HEIGHT = 320;

// Default to Cuenca, Ecuador
const DEFAULT_REGION: Region = {
  latitude: -2.9,
  longitude: -79.0,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

function getMarkerColor(index: number, total: number): string {
  if (index === 0) return "#16A34A";
  if (index === total - 1) return "#DC2626";
  return Colors.tecnibus[600];
}

export function RouteMapEditor({
  rutaId,
  paradas,
  onParadaCreated,
  onParadaUpdated,
  onParadaDeleted,
}: RouteMapEditorProps) {
  const mapRef = useRef<MapView>(null);
  const [addMode, setAddMode] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingParada, setEditingParada] = useState<Parada | null>(null);
  const [newCoords, setNewCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

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
      setNewCoords({ latitude, longitude });
      setEditingParada(null);
      setShowForm(true);
      setAddMode(false);
    },
    [addMode]
  );

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
    hora_aprox: string | null;
    orden?: number;
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
    showAlert({ title: "Eliminar Parada", message: `¿Eliminar "${parada.nombre || "esta parada"}"?`, type: "warning", buttons: [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            const success = await deleteParada(parada.id);
            if (success) onParadaDeleted();
          },
        },
      ] });
  };

  return (
    <View>
      {/* Map */}
      <View
        style={{
          height: MAP_HEIGHT,
          borderRadius: 16,
          overflow: "hidden",
          marginHorizontal: 20,
          marginTop: 16,
          borderWidth: addMode ? 2 : 0,
          borderColor: addMode ? Colors.tecnibus[600] : "transparent",
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
              coordinate={{
                latitude: parada.latitud,
                longitude: parada.longitud,
              }}
              onPress={() => handleMarkerPress(parada)}
              title={parada.nombre || `Parada ${index + 1}`}
              description={parada.direccion || undefined}
              pinColor={getMarkerColor(index, paradas.length)}
            />
          ))}
        </MapView>

        {/* Add mode overlay */}
        {addMode && (
          <View
            style={{
              position: "absolute",
              top: 10,
              left: 10,
              right: 10,
              backgroundColor: Colors.tecnibus[600],
              borderRadius: 10,
              padding: 10,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MapPin size={16} color="#ffffff" strokeWidth={2} />
            <Text
              style={{
                color: "#ffffff",
                fontWeight: "600",
                fontSize: 13,
                marginLeft: 6,
              }}
            >
              Toca el mapa para ubicar la parada
            </Text>
          </View>
        )}
      </View>

      {/* FAB Add button */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "flex-end",
          paddingHorizontal: 20,
          marginTop: -20,
          marginBottom: 8,
          zIndex: 10,
        }}
      >
        <TouchableOpacity
          onPress={() => {
            haptic.medium();
            setAddMode(!addMode);
          }}
          style={{
            backgroundColor: addMode ? "#DC2626" : Colors.tecnibus[600],
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
          {addMode ? (
            <Text style={{ color: "#fff", fontSize: 20, fontWeight: "700" }}>
              x
            </Text>
          ) : (
            <Plus size={22} color="#ffffff" strokeWidth={2.5} />
          )}
        </TouchableOpacity>
      </View>

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
            <MapPin
              size={32}
              color={Colors.tecnibus[400]}
              strokeWidth={1.5}
            />
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
                  {item.hora_aprox && (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginTop: 2,
                      }}
                    >
                      <Clock size={11} color="#9CA3AF" strokeWidth={2} />
                      <Text
                        style={{
                          fontSize: 11,
                          color: "#9CA3AF",
                          marginLeft: 4,
                        }}
                      >
                        {item.hora_aprox}
                      </Text>
                    </View>
                  )}
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
        nextOrden={paradas.length + 1}
        onSave={handleSave}
        onDelete={editingParada ? handleDelete : undefined}
      />
    </View>
  );
}
