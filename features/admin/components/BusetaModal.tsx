import { Colors } from "@/lib/constants/colors";
import { haptic } from "@/lib/utils/haptics";
import { useKeyboardHeight } from "@/lib/hooks/useKeyboardHeight";
import { Bus, Hash, Save, Users, X } from "lucide-react-native";
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
import {
  Buseta,
  createBuseta,
  updateBuseta,
} from "@/lib/services/fleet/busetas.service";
import { FormField } from "./FormField";

interface BusetaModalProps {
  visible: boolean;
  onClose: () => void;
  buseta?: Buseta | null;
  onSuccess: () => void;
  onToast: (message: string, type: "success" | "error" | "warning") => void;
}

export function BusetaModal({
  visible,
  onClose,
  buseta,
  onSuccess,
  onToast,
}: BusetaModalProps) {
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const isEdit = !!buseta;

  const [placa, setPlaca] = useState("");
  const [capacidad, setCapacidad] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (buseta) {
      setPlaca(buseta.placa);
      setCapacidad(buseta.capacidad.toString());
    } else {
      setPlaca("");
      setCapacidad("");
    }
  }, [buseta, visible]);

  const handleClose = () => {
    setPlaca("");
    setCapacidad("");
    onClose();
  };

  const handleSubmit = async () => {
    if (!placa.trim()) {
      onToast("Ingresa la placa", "warning");
      return;
    }

    const capacidadNum = parseInt(capacidad);
    if (!capacidad.trim() || isNaN(capacidadNum) || capacidadNum <= 0) {
      onToast("Ingresa una capacidad válida", "warning");
      return;
    }

    haptic.medium();
    setLoading(true);

    if (isEdit && buseta) {
      const success = await updateBuseta(buseta.id, {
        placa: placa.trim(),
        capacidad: capacidadNum,
      });
      setLoading(false);

      if (success) {
        onToast("Buseta actualizada correctamente", "success");
        handleClose();
        onSuccess();
      } else {
        onToast("No se pudo actualizar la buseta", "error");
      }
    } else {
      const result = await createBuseta({
        placa: placa.trim(),
        capacidad: capacidadNum,
      });
      setLoading(false);

      if (result) {
        onToast("Buseta creada correctamente", "success");
        handleClose();
        onSuccess();
      } else {
        onToast("Error al crear la buseta", "error");
      }
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
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
                <Bus
                  size={22}
                  color={Colors.tecnibus[600]}
                  strokeWidth={2}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text
                  style={{ fontSize: 18, fontWeight: "700", color: "#1F2937" }}
                >
                  {isEdit ? "Editar Buseta" : "Nueva Buseta"}
                </Text>
                <Text style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>
                  {isEdit
                    ? "Actualiza la información"
                    : "Registrar nueva buseta"}
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleClose}
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
                label="Placa"
                icon={Hash}
                required
                placeholder="Ej: ABC123"
                value={placa}
                onChangeText={(text) => setPlaca(text.toUpperCase())}
                autoCapitalize="characters"
                maxLength={10}
              />
              <FormField
                label="Capacidad (pasajeros)"
                icon={Users}
                required
                placeholder="Ej: 30"
                value={capacidad}
                onChangeText={setCapacidad}
                keyboardType="numeric"
                maxLength={3}
              />

              {/* Submit */}
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={loading}
                style={{
                  backgroundColor: loading
                    ? Colors.tecnibus[400]
                    : Colors.tecnibus[600],
                  paddingVertical: 16,
                  borderRadius: 14,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 16,
                }}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <Save size={20} color="#ffffff" strokeWidth={2.5} />
                    <Text
                      style={{
                        color: "#ffffff",
                        fontWeight: "700",
                        fontSize: 16,
                        marginLeft: 8,
                      }}
                    >
                      {isEdit ? "Actualizar Buseta" : "Crear Buseta"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
      </View>
    </Modal>
  );
}
