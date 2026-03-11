import { Colors } from "@/lib/constants/colors";
import { haptic } from "@/lib/utils/haptics";
import { useKeyboardHeight } from "@/lib/hooks/useKeyboardHeight";
import { reverseGeocode } from "@/lib/services/places.service";
import { MapPin, Save, Trash2, Type, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Parada } from "@/lib/services/rutas.service";
import { FormField } from "./FormField";

interface ParadaFormSheetProps {
  visible: boolean;
  onClose: () => void;
  initialData?: Partial<Parada>;
  rutaId: string;
  onSave: (data: {
    nombre: string;
    direccion: string;
    latitud: number;
    longitud: number;
  }) => Promise<boolean>;
  onDelete?: () => Promise<boolean>;
}

export function ParadaFormSheet({
  visible,
  onClose,
  initialData,
  rutaId,
  onSave,
  onDelete,
}: ParadaFormSheetProps) {
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const isEdit = !!initialData?.id;

  const [nombre, setNombre] = useState("");
  const [direccion, setDireccion] = useState("");
  const [latitud, setLatitud] = useState("");
  const [longitud, setLongitud] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [fetchingDireccion, setFetchingDireccion] = useState(false);

  useEffect(() => {
    if (initialData) {
      setNombre(initialData.nombre || "");
      setDireccion(initialData.direccion || "");
      setLatitud(initialData.latitud?.toString() || "");
      setLongitud(initialData.longitud?.toString() || "");

      // Auto-fetch dirección para paradas nuevas con coordenadas
      if (!isEdit && initialData.latitud && initialData.longitud && !initialData.direccion) {
        setFetchingDireccion(true);
        reverseGeocode(initialData.latitud, initialData.longitud).then((address) => {
          if (address) setDireccion(address);
          setFetchingDireccion(false);
        });
      }
    } else {
      setNombre("");
      setDireccion("");
      setLatitud("");
      setLongitud("");
    }
  }, [initialData, visible]);

  const handleSave = async () => {
    if (!nombre.trim()) return;

    const lat = parseFloat(latitud);
    const lng = parseFloat(longitud);
    if (isNaN(lat) || isNaN(lng)) return;

    haptic.medium();
    setSaving(true);

    const success = await onSave({
      nombre: nombre.trim(),
      direccion: direccion.trim(),
      latitud: lat,
      longitud: lng,
    });

    setSaving(false);
    if (success) onClose();
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    haptic.heavy();
    setDeleting(true);
    const success = await onDelete();
    setDeleting(false);
    if (success) onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "flex-end",
        }}
      >
          <View
            style={{
              backgroundColor: "#ffffff",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingBottom: keyboardHeight > 0
                ? keyboardHeight
                : Math.max(insets.bottom, 20),
              maxHeight: "90%",
            }}
          >
            {/* Handle */}
            <View style={{ alignItems: "center", paddingTop: 12 }}>
              <View
                style={{
                  width: 40,
                  height: 4,
                  backgroundColor: "#D1D5DB",
                  borderRadius: 2,
                }}
              />
            </View>

            {/* Header */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 20,
                paddingTop: 16,
                paddingBottom: 12,
              }}
            >
              <View
                style={{
                  backgroundColor: Colors.tecnibus[100],
                  padding: 10,
                  borderRadius: 14,
                }}
              >
                <MapPin
                  size={22}
                  color={Colors.tecnibus[600]}
                  strokeWidth={2}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text
                  style={{ fontSize: 18, fontWeight: "700", color: "#1F2937" }}
                >
                  {isEdit ? "Editar Parada" : "Nueva Parada"}
                </Text>
                <Text style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>
                  {isEdit
                    ? "Actualiza la información"
                    : "Toca el mapa para ubicar"}
                </Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={{
                  backgroundColor: "#F3F4F6",
                  padding: 8,
                  borderRadius: 10,
                }}
              >
                <X size={20} color="#6B7280" strokeWidth={2} />
              </TouchableOpacity>
            </View>

            {/* Form */}
            <ScrollView
              style={{ paddingHorizontal: 20 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <FormField
                label="Nombre"
                icon={Type}
                required
                placeholder="Ej: Parada Central"
                value={nombre}
                onChangeText={setNombre}
                autoCapitalize="words"
              />
              <FormField
                label="Dirección"
                icon={MapPin}
                placeholder={fetchingDireccion ? "Obteniendo dirección..." : "Ej: Av. Balboa, frente al parque"}
                value={direccion}
                onChangeText={setDireccion}
                autoCapitalize="sentences"
                editable={!fetchingDireccion}
              />

              {/* Actions */}
              <View
                style={{
                  flexDirection: "row",
                  gap: 10,
                  marginBottom: 16,
                }}
              >
                {isEdit && onDelete && (
                  <TouchableOpacity
                    onPress={handleDelete}
                    disabled={deleting}
                    style={{
                      backgroundColor: "#FEF2F2",
                      borderRadius: 14,
                      paddingVertical: 16,
                      flex: 1,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {deleting ? (
                      <ActivityIndicator color="#DC2626" />
                    ) : (
                      <>
                        <Trash2
                          size={18}
                          color="#DC2626"
                          strokeWidth={2.5}
                        />
                        <Text
                          style={{
                            color: "#DC2626",
                            fontWeight: "700",
                            marginLeft: 6,
                          }}
                        >
                          Eliminar
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={handleSave}
                  disabled={saving}
                  style={{
                    backgroundColor: saving
                      ? Colors.tecnibus[400]
                      : Colors.tecnibus[600],
                    borderRadius: 14,
                    paddingVertical: 16,
                    flex: isEdit && onDelete ? 1 : undefined,
                    width: isEdit && onDelete ? undefined : "100%",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  activeOpacity={0.8}
                >
                  {saving ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <>
                      <Save
                        size={18}
                        color="#ffffff"
                        strokeWidth={2.5}
                      />
                      <Text
                        style={{
                          color: "#ffffff",
                          fontWeight: "700",
                          marginLeft: 6,
                        }}
                      >
                        {isEdit ? "Actualizar" : "Guardar"}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
      </View>
    </Modal>
  );
}
