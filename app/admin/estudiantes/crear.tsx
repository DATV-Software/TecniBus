import { Colors } from "@/lib/constants/colors";
import { FormField, SubScreenHeader } from "@/features/admin";
import { haptic } from "@/lib/utils/haptics";
import { useRouter } from "expo-router";
import {
  Check,
  GraduationCap,
  MapPin,
  Search,
  User,
  X,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useKeyboardHeight } from "@/lib/hooks/useKeyboardHeight";
import Toast from "@/components/Toast";
import {
  createEstudiante,
  getPadresParaAsignar,
  getParadasDisponibles,
} from "@/lib/services/estudiantes.service";

type Padre = {
  id: string;
  nombre: string;
  apellido: string;
  nombreCompleto: string;
};

type Parada = {
  id: string;
  nombre: string | null;
  direccion: string | null;
  ruta: { id: string; nombre: string } | null;
};

export default function CrearEstudianteScreen() {
  const router = useRouter();
  const keyboardHeight = useKeyboardHeight();

  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [padreSeleccionado, setPadreSeleccionado] = useState<Padre | null>(null);
  const [paradaSeleccionada, setParadaSeleccionada] = useState<Parada | null>(null);

  const [padres, setPadres] = useState<Padre[]>([]);
  const [paradas, setParadas] = useState<Parada[]>([]);

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [showPadresModal, setShowPadresModal] = useState(false);
  const [showParadasModal, setShowParadasModal] = useState(false);
  const [searchPadre, setSearchPadre] = useState("");
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: "success" | "error" | "warning" | "info";
  }>({ visible: false, message: "", type: "success" });

  useEffect(() => {
    (async () => {
      setLoadingData(true);
      const [padresData, paradasData] = await Promise.all([
        getPadresParaAsignar(),
        getParadasDisponibles(),
      ]);
      setPadres(padresData);
      setParadas(paradasData);
      setLoadingData(false);
    })();
  }, []);

  const filteredPadres = padres.filter((p) =>
    p.nombreCompleto.toLowerCase().includes(searchPadre.toLowerCase())
  );

  const handleSubmit = async () => {
    if (!nombre.trim()) {
      setToast({ visible: true, message: "Ingresa el nombre", type: "warning" });
      return;
    }
    if (!apellido.trim()) {
      setToast({ visible: true, message: "Ingresa el apellido", type: "warning" });
      return;
    }
    if (!padreSeleccionado) {
      setToast({ visible: true, message: "Debes seleccionar un padre", type: "warning" });
      return;
    }

    haptic.medium();
    setLoading(true);

    const result = await createEstudiante({
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      id_padre: padreSeleccionado.id,
      id_parada: paradaSeleccionada?.id || null,
    });

    setLoading(false);

    if (result) {
      setToast({ visible: true, message: "Estudiante creado correctamente", type: "success" });
      setTimeout(() => router.back(), 1500);
    } else {
      setToast({ visible: true, message: "No se pudo crear el estudiante", type: "error" });
    }
  };

  if (loadingData) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.tecnibus[50], alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={Colors.tecnibus[600]} />
        <Text style={{ color: "#6B7280", marginTop: 16 }}>Cargando datos...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.tecnibus[50] }}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.tecnibus[700]} translucent={false} />

      <SubScreenHeader
        title="NUEVO ESTUDIANTE"
        subtitle="Complete los datos"
        icon={GraduationCap}
        onBack={() => router.back()}
      />

      <KeyboardAwareScrollView
        style={{ flex: 1, paddingHorizontal: 20, paddingTop: 20 }}
        contentContainerStyle={{ flexGrow: 1 }}
        enableOnAndroid
        enableAutomaticScroll
        extraScrollHeight={20}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2 }}>
          <FormField
            label="Nombre"
            icon={User}
            required
            placeholder="Ej: Juan"
            value={nombre}
            onChangeText={setNombre}
            autoCapitalize="words"
          />
          <FormField
            label="Apellido"
            icon={User}
            required
            placeholder="Ej: Pérez"
            value={apellido}
            onChangeText={setApellido}
            autoCapitalize="words"
          />

          {/* Padre selector */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 }}>
              Padre <Text style={{ color: Colors.tecnibus[600] }}>*</Text>
            </Text>
            <TouchableOpacity
              onPress={() => setShowPadresModal(true)}
              style={{
                backgroundColor: "#F9FAFB",
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 14,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                borderWidth: 1.5,
                borderColor: "#E5E7EB",
              }}
            >
              {padreSeleccionado ? (
                <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                  <User size={18} color={Colors.tecnibus[600]} strokeWidth={2} />
                  <Text style={{ fontSize: 15, color: "#1F2937", marginLeft: 10 }}>
                    {padreSeleccionado.nombreCompleto}
                  </Text>
                </View>
              ) : (
                <Text style={{ fontSize: 15, color: "#9CA3AF" }}>Seleccionar padre</Text>
              )}
              <Search size={18} color="#9CA3AF" strokeWidth={2} />
            </TouchableOpacity>
            {padres.length === 0 && (
              <Text style={{ fontSize: 12, color: "#D97706", marginTop: 6 }}>
                No hay padres registrados. Crea uno primero.
              </Text>
            )}
          </View>

          {/* Parada selector */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 }}>
              Parada (Opcional)
            </Text>
            <TouchableOpacity
              onPress={() => setShowParadasModal(true)}
              style={{
                backgroundColor: "#F9FAFB",
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 14,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                borderWidth: 1.5,
                borderColor: "#E5E7EB",
              }}
            >
              {paradaSeleccionada ? (
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <MapPin size={18} color={Colors.tecnibus[600]} strokeWidth={2} />
                    <Text style={{ fontSize: 15, color: "#1F2937", marginLeft: 10 }}>
                      {paradaSeleccionada.nombre || "Sin nombre"}
                    </Text>
                  </View>
                  {paradaSeleccionada.ruta && (
                    <Text style={{ fontSize: 12, color: "#6B7280", marginLeft: 28, marginTop: 2 }}>
                      Ruta: {paradaSeleccionada.ruta.nombre}
                    </Text>
                  )}
                </View>
              ) : (
                <Text style={{ fontSize: 15, color: "#9CA3AF" }}>Sin parada asignada</Text>
              )}
              {paradaSeleccionada ? (
                <TouchableOpacity onPress={() => setParadaSeleccionada(null)}>
                  <X size={18} color="#9CA3AF" strokeWidth={2} />
                </TouchableOpacity>
              ) : null}
            </TouchableOpacity>
          </View>
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
              <Check size={20} color="#ffffff" strokeWidth={2.5} />
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16, marginLeft: 8 }}>
                Crear Estudiante
              </Text>
            </>
          )}
        </TouchableOpacity>
      </KeyboardAwareScrollView>

      {/* Modal Padre */}
      <Modal visible={showPadresModal} animationType="slide" transparent onRequestClose={() => setShowPadresModal(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: keyboardHeight > 0 ? 320 : "80%" }}>
            <View style={{ padding: 20, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <Text style={{ fontSize: 18, fontWeight: "700", color: "#1F2937" }}>Seleccionar Padre</Text>
                <TouchableOpacity onPress={() => setShowPadresModal(false)} style={{ backgroundColor: "#F3F4F6", padding: 8, borderRadius: 10 }}>
                  <X size={20} color="#374151" strokeWidth={2} />
                </TouchableOpacity>
              </View>
              <View style={{ backgroundColor: "#F9FAFB", borderRadius: 10, flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8 }}>
                <Search size={18} color="#9CA3AF" strokeWidth={2} />
                <TextInput
                  style={{ flex: 1, marginLeft: 8, fontSize: 15, color: "#1F2937" }}
                  placeholder="Buscar padre..."
                  placeholderTextColor="#9CA3AF"
                  value={searchPadre}
                  onChangeText={setSearchPadre}
                  autoCapitalize="words"
                />
              </View>
            </View>
            <FlatList
              data={filteredPadres}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => { haptic.light(); setPadreSeleccionado(item); setShowPadresModal(false); setSearchPadre(""); }}
                  style={{ paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#F3F4F6", flexDirection: "row", alignItems: "center" }}
                >
                  <View style={{ backgroundColor: Colors.tecnibus[100], padding: 8, borderRadius: 20, marginRight: 12 }}>
                    <User size={18} color={Colors.tecnibus[600]} strokeWidth={2} />
                  </View>
                  <Text style={{ fontSize: 15, color: "#1F2937", flex: 1 }}>{item.nombreCompleto}</Text>
                  {padreSeleccionado?.id === item.id && <Check size={18} color={Colors.tecnibus[600]} strokeWidth={2.5} />}
                </TouchableOpacity>
              )}
              ListEmptyComponent={<View style={{ paddingVertical: 48, alignItems: "center" }}><Text style={{ color: "#6B7280" }}>No se encontraron padres</Text></View>}
            />
          </View>
        </View>
      </Modal>

      {/* Modal Parada */}
      <Modal visible={showParadasModal} animationType="slide" transparent onRequestClose={() => setShowParadasModal(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "70%" }}>
            <View style={{ padding: 20, borderBottomWidth: 1, borderBottomColor: "#E5E7EB", flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: "#1F2937" }}>Seleccionar Parada</Text>
              <TouchableOpacity onPress={() => setShowParadasModal(false)} style={{ backgroundColor: "#F3F4F6", padding: 8, borderRadius: 10 }}>
                <X size={20} color="#374151" strokeWidth={2} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={paradas}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => { haptic.light(); setParadaSeleccionada(item); setShowParadasModal(false); }}
                  style={{ paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <View style={{ backgroundColor: Colors.tecnibus[100], padding: 8, borderRadius: 20, marginRight: 12 }}>
                      <MapPin size={18} color={Colors.tecnibus[600]} strokeWidth={2} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: "600", color: "#1F2937" }}>{item.nombre || "Sin nombre"}</Text>
                      {item.ruta && <Text style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>Ruta: {item.ruta.nombre}</Text>}
                      {item.direccion && <Text style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>{item.direccion}</Text>}
                    </View>
                    {paradaSeleccionada?.id === item.id && <Check size={18} color={Colors.tecnibus[600]} strokeWidth={2.5} />}
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<View style={{ paddingVertical: 48, alignItems: "center" }}><Text style={{ color: "#6B7280" }}>No hay paradas disponibles</Text></View>}
            />
          </View>
        </View>
      </Modal>

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={() => setToast({ ...toast, visible: false })} />
    </View>
  );
}
