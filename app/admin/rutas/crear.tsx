import { Colors } from "@/lib/constants/colors";
import { FormField, SubScreenHeader } from "@/features/admin";
import { haptic } from "@/lib/utils/haptics";
import { useRouter } from "expo-router";
import {
  CheckCircle,
  Clock,
  MapPin,
  Save,
  Type,
  XCircle,
} from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "@/components/Toast";
import { createRuta } from "@/lib/services/routing/rutas.service";

export default function CrearRutaScreen() {
  const router = useRouter();

  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState<"ida" | "vuelta">("ida");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFin, setHoraFin] = useState("");
  const [estado, setEstado] = useState<"activa" | "inactiva">("activa");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: "success" | "error" | "warning" | "info";
  }>({ visible: false, message: "", type: "success" });

  const validateTime = (time: string): boolean =>
    /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);

  const handleSubmit = async () => {
    if (!nombre.trim()) {
      setToast({ visible: true, message: "Ingresa el nombre de la ruta", type: "warning" });
      return;
    }
    if (horaInicio && !validateTime(horaInicio)) {
      setToast({ visible: true, message: "Formato de hora de inicio inválido (HH:MM)", type: "warning" });
      return;
    }
    if (horaFin && !validateTime(horaFin)) {
      setToast({ visible: true, message: "Formato de hora de fin inválido (HH:MM)", type: "warning" });
      return;
    }
    if (horaInicio && horaFin) {
      const [iH, iM] = horaInicio.split(":").map(Number);
      const [fH, fM] = horaFin.split(":").map(Number);
      if (fH * 60 + fM <= iH * 60 + iM) {
        setToast({ visible: true, message: "La hora de fin debe ser mayor que la de inicio", type: "warning" });
        return;
      }
    }

    haptic.medium();
    setLoading(true);

    const result = await createRuta({
      nombre: nombre.trim(),
      tipo,
      hora_inicio: horaInicio || null,
      hora_fin: horaFin || null,
      estado,
    });

    setLoading(false);

    if (result) {
      setToast({ visible: true, message: "Ruta creada correctamente", type: "success" });
      setTimeout(() => router.back(), 1500);
    } else {
      setToast({ visible: true, message: "Error al crear la ruta", type: "error" });
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.tecnibus[50] }}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.tecnibus[700]} translucent={false} />

      <SubScreenHeader
        title="NUEVA RUTA"
        subtitle="Completa la información"
        icon={MapPin}
        onBack={() => router.back()}
      />

      <ScrollView
        style={{ flex: 1, paddingHorizontal: 20, paddingTop: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2 }}>
          <FormField
            label="Nombre de la ruta"
            icon={Type}
            required
            placeholder="Ej: Ruta Norte"
            value={nombre}
            onChangeText={setNombre}
            autoCapitalize="words"
          />

          {/* Tipo toggle */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 }}>
              Tipo de ruta <Text style={{ color: "#EF4444" }}>*</Text>
            </Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity
                onPress={() => { haptic.light(); setTipo("ida"); }}
                style={{
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 12,
                  paddingVertical: 12,
                  backgroundColor: tipo === "ida" ? "#DBEAFE" : "#F9FAFB",
                  borderWidth: 1.5,
                  borderColor: tipo === "ida" ? Colors.tecnibus[600] : "#E5E7EB",
                }}
              >
                <MapPin size={18} color={tipo === "ida" ? Colors.tecnibus[600] : "#6B7280"} strokeWidth={2} />
                <Text style={{ marginLeft: 6, fontWeight: "600", color: tipo === "ida" ? Colors.tecnibus[700] : "#6B7280" }}>
                  Ida (→ Colegio)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { haptic.light(); setTipo("vuelta"); }}
                style={{
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 12,
                  paddingVertical: 12,
                  backgroundColor: tipo === "vuelta" ? "#DBEAFE" : "#F9FAFB",
                  borderWidth: 1.5,
                  borderColor: tipo === "vuelta" ? Colors.tecnibus[600] : "#E5E7EB",
                }}
              >
                <MapPin size={18} color={tipo === "vuelta" ? Colors.tecnibus[600] : "#6B7280"} strokeWidth={2} />
                <Text style={{ marginLeft: 6, fontWeight: "600", color: tipo === "vuelta" ? Colors.tecnibus[700] : "#6B7280" }}>
                  Vuelta (← Casa)
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <FormField
            label="Hora de inicio (HH:MM)"
            icon={Clock}
            placeholder="Ej: 07:00"
            value={horaInicio}
            onChangeText={setHoraInicio}
            maxLength={5}
          />
          <FormField
            label="Hora de fin (HH:MM)"
            icon={Clock}
            placeholder="Ej: 09:00"
            value={horaFin}
            onChangeText={setHoraFin}
            maxLength={5}
          />

          {/* Estado toggle */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 }}>Estado</Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity
                onPress={() => { haptic.light(); setEstado("activa"); }}
                style={{
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 12,
                  paddingVertical: 12,
                  backgroundColor: estado === "activa" ? "#DCFCE7" : "#F9FAFB",
                  borderWidth: 1.5,
                  borderColor: estado === "activa" ? "#16A34A" : "#E5E7EB",
                }}
              >
                <CheckCircle size={18} color={estado === "activa" ? "#16A34A" : "#6B7280"} strokeWidth={2} />
                <Text style={{ marginLeft: 6, fontWeight: "600", color: estado === "activa" ? "#16A34A" : "#6B7280" }}>Activa</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { haptic.light(); setEstado("inactiva"); }}
                style={{
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 12,
                  paddingVertical: 12,
                  backgroundColor: estado === "inactiva" ? "#F3F4F6" : "#F9FAFB",
                  borderWidth: 1.5,
                  borderColor: estado === "inactiva" ? "#6B7280" : "#E5E7EB",
                }}
              >
                <XCircle size={18} color={estado === "inactiva" ? "#374151" : "#6B7280"} strokeWidth={2} />
                <Text style={{ marginLeft: 6, fontWeight: "600", color: estado === "inactiva" ? "#374151" : "#6B7280" }}>Inactiva</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Info tip */}
        <View style={{ backgroundColor: Colors.tecnibus[50], borderRadius: 12, padding: 12, marginTop: 16, borderWidth: 1, borderColor: Colors.tecnibus[200] }}>
          <Text style={{ fontSize: 12, color: Colors.tecnibus[800], textAlign: "center" }}>
            Las paradas se agregan después de crear la ruta, usando el mapa interactivo.
          </Text>
        </View>

        {/* Submit */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading}
          style={{
            backgroundColor: loading ? Colors.tecnibus[400] : Colors.tecnibus[600],
            borderRadius: 14,
            paddingVertical: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            marginTop: 20,
            marginBottom: 32,
          }}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Save size={20} color="#ffffff" strokeWidth={2.5} />
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16, marginLeft: 8 }}>Crear Ruta</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={() => setToast({ ...toast, visible: false })} />
    </View>
  );
}
