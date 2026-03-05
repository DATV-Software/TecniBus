import { Colors } from "@/lib/constants/colors";
import { FormField, RouteMapEditor, SubScreenHeader } from "@/features/admin";
import { haptic } from "@/lib/utils/haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  CheckCircle,
  Clock,
  Map,
  MapPin,
  Save,
  Trash2,
  Type,
  XCircle,
} from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "@/components/Toast";
import {
import { useAlert } from "@/components/ui/AlertBox/useAlert";
  Parada,
  deleteRuta,
  getRutaById,
  updateRuta,
} from "@/lib/services/rutas.service";

type Tab = "info" | "mapa";

export default function EditarRutaScreen() {
  const { showAlert } = useAlert();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [tab, setTab] = useState<Tab>("info");

  // Ruta form
  const [nombre, setNombre] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFin, setHoraFin] = useState("");
  const [estado, setEstado] = useState<"activa" | "inactiva">("activa");
  const [paradas, setParadas] = useState<Parada[]>([]);

  // UI
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: "success" | "error" | "warning" | "info";
  }>({ visible: false, message: "", type: "success" });

  const loadData = useCallback(async () => {
    setLoadingData(true);
    const ruta = await getRutaById(id);
    if (!ruta) {
      showAlert({ title: "Error", message: "No se encontró la ruta", type: "error", buttons: [
        { text: "OK", onPress: () => router.back() },
      ] });
      return;
    }
    setNombre(ruta.nombre);
    setHoraInicio(ruta.hora_inicio || "");
    setHoraFin(ruta.hora_fin || "");
    setEstado((ruta.estado as "activa" | "inactiva") || "activa");
    setParadas(ruta.paradas || []);
    setLoadingData(false);
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const reloadParadas = useCallback(async () => {
    const ruta = await getRutaById(id);
    if (ruta) setParadas(ruta.paradas || []);
  }, [id]);

  const validateTime = (time: string): boolean =>
    /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);

  const handleUpdateRuta = async () => {
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

    const success = await updateRuta(id, {
      nombre: nombre.trim(),
      hora_inicio: horaInicio || null,
      hora_fin: horaFin || null,
      estado,
    });

    setLoading(false);

    if (success) {
      setToast({ visible: true, message: "Ruta actualizada correctamente", type: "success" });
    } else {
      setToast({ visible: true, message: "No se pudo actualizar la ruta", type: "error" });
    }
  };

  const handleDeleteRuta = () => {
    haptic.light();
    showAlert({ title: "Confirmar eliminación", message: "¿Eliminar esta ruta y todas sus paradas? Esta acción no se puede deshacer.", type: "warning", buttons: [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            haptic.heavy();
            setLoading(true);
            const result = await deleteRuta(id);
            setLoading(false);
            if (result.success) {
              setToast({ visible: true, message: "Ruta eliminada correctamente", type: "success" });
              setTimeout(() => router.back(), 1500);
            } else {
              setToast({ visible: true, message: result.error || "No se pudo eliminar la ruta", type: "error" });
            }
          },
        },
      ] });
  };

  if (loadingData) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.tecnibus[50], alignItems: "center", justifyContent: "center" }}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.tecnibus[700]} translucent={false} />
        <ActivityIndicator size="large" color={Colors.tecnibus[600]} />
        <Text style={{ color: "#6B7280", marginTop: 16 }}>Cargando datos...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.tecnibus[50] }}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.tecnibus[700]} translucent={false} />

      <SubScreenHeader
        title="EDITAR RUTA"
        subtitle={nombre || "Cargando..."}
        icon={MapPin}
        onBack={() => router.back()}
        rightAction={{
          icon: Trash2,
          onPress: handleDeleteRuta,
        }}
      />

      {/* Tabs */}
      <View style={{ flexDirection: "row", paddingHorizontal: 20, paddingTop: 16, gap: 10 }}>
        <TouchableOpacity
          onPress={() => { haptic.light(); setTab("info"); }}
          style={{
            flex: 1,
            paddingVertical: 10,
            borderRadius: 12,
            backgroundColor: tab === "info" ? Colors.tecnibus[600] : "#ffffff",
            alignItems: "center",
            borderWidth: tab === "info" ? 0 : 1,
            borderColor: "#E5E7EB",
          }}
        >
          <Text style={{
            fontWeight: "700",
            fontSize: 13,
            color: tab === "info" ? "#ffffff" : "#6B7280",
          }}>
            Información
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => { haptic.light(); setTab("mapa"); }}
          style={{
            flex: 1,
            paddingVertical: 10,
            borderRadius: 12,
            backgroundColor: tab === "mapa" ? Colors.tecnibus[600] : "#ffffff",
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
            gap: 6,
            borderWidth: tab === "mapa" ? 0 : 1,
            borderColor: "#E5E7EB",
          }}
        >
          <Map size={14} color={tab === "mapa" ? "#ffffff" : "#6B7280"} strokeWidth={2} />
          <Text style={{
            fontWeight: "700",
            fontSize: 13,
            color: tab === "mapa" ? "#ffffff" : "#6B7280",
          }}>
            Mapa y Paradas
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab content */}
      {tab === "info" ? (
        <ScrollView
          style={{ flex: 1, paddingHorizontal: 20, paddingTop: 16 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{
            backgroundColor: "#fff",
            borderRadius: 16,
            padding: 20,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.06,
            shadowRadius: 3,
            elevation: 2,
          }}>
            <FormField
              label="Nombre de la ruta"
              icon={Type}
              required
              placeholder="Ej: Ruta Norte"
              value={nombre}
              onChangeText={setNombre}
              autoCapitalize="words"
            />
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

          {/* Update button */}
          <TouchableOpacity
            onPress={handleUpdateRuta}
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
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16, marginLeft: 8 }}>Actualizar Ruta</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
        >
          <RouteMapEditor
            rutaId={id}
            paradas={paradas}
            onParadaCreated={reloadParadas}
            onParadaUpdated={reloadParadas}
            onParadaDeleted={reloadParadas}
          />
        </ScrollView>
      )}

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={() => setToast({ ...toast, visible: false })} />
    </View>
  );
}
