import { useAlert } from "@/components/ui/AlertBox/useAlert";
import { Colors } from "@/lib/constants/colors";
import { FormField, SubScreenHeader } from "@/features/admin";
import { haptic } from "@/lib/utils/haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Check, Eye, EyeOff, Lock, Mail, Trash2, User, Users } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import Toast from "@/components/Toast";
import {
  actualizarUsuario,
  eliminarUsuario,
  obtenerPadres,
} from "@/lib/services/admin.service";

export default function EditarPadreScreen() {
  const { showAlert } = useAlert();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: "success" | "error" | "warning" | "info";
  }>({ visible: false, message: "", type: "success" });

  useEffect(() => {
    (async () => {
      const padres = await obtenerPadres();
      const padre = padres.find((p) => p.id === id);
      if (!padre) {
        showAlert({
          title: "Error",
          message: "No se encontró el representante",
          type: "error",
          buttons: [{ text: "OK", onPress: () => router.back() }],
        });
        return;
      }
      setNombre(padre.nombre);
      setApellido(padre.apellido ?? "");
      setCorreo(padre.correo);
      setLoadingData(false);
    })();
  }, []);

  const handleUpdate = async () => {
    if (!nombre.trim()) {
      setToast({ visible: true, message: "Ingresa el nombre", type: "warning" });
      return;
    }
    if (!apellido.trim()) {
      setToast({ visible: true, message: "Ingresa el apellido", type: "warning" });
      return;
    }
    if (!correo.trim()) {
      setToast({ visible: true, message: "Ingresa el correo", type: "warning" });
      return;
    }
    if (password && password.length < 6) {
      setToast({ visible: true, message: "La contraseña debe tener al menos 6 caracteres", type: "warning" });
      return;
    }

    haptic.medium();
    setLoading(true);

    const params: Record<string, string> = { nombre, apellido, correo };
    if (password) params.password = password;

    const result = await actualizarUsuario(id, params);
    setLoading(false);

    if (result.success) {
      setToast({ visible: true, message: "Representante actualizado", type: "success" });
      setTimeout(() => router.back(), 1500);
    } else {
      setToast({ visible: true, message: result.error ?? "No se pudo actualizar", type: "error" });
    }
  };

  const handleDelete = () => {
    haptic.light();
    showAlert({
      title: "Eliminar Representante",
      message: "¿Eliminar este representante? Esta acción no se puede deshacer.",
      type: "warning",
      buttons: [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            haptic.heavy();
            setLoading(true);
            const result = await eliminarUsuario(id);
            setLoading(false);
            if (result.success) {
              setToast({ visible: true, message: "Representante eliminado", type: "success" });
              setTimeout(() => router.back(), 1500);
            } else {
              setToast({ visible: true, message: result.error ?? "No se pudo eliminar", type: "error" });
            }
          },
        },
      ],
    });
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
        title="EDITAR REPRESENTANTE"
        subtitle="Actualizar información"
        icon={Users}
        onBack={() => router.back()}
        rightAction={{ icon: Trash2, onPress: handleDelete }}
      />

      <KeyboardAwareScrollView
        style={{ flex: 1, paddingHorizontal: 20, paddingTop: 20 }}
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        enableAutomaticScroll
        extraScrollHeight={20}
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
          <FormField
            label="Correo electrónico"
            icon={Mail}
            required
            placeholder="Ej: juan@mail.com"
            value={correo}
            onChangeText={setCorreo}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <FormField
            label="Nueva contraseña (dejar vacío para no cambiar)"
            icon={Lock}
            placeholder="Mínimo 6 caracteres"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            rightIcon={
              <TouchableOpacity onPress={() => setShowPassword((v) => !v)} style={{ padding: 4 }}>
                {showPassword
                  ? <EyeOff size={18} color="#9CA3AF" strokeWidth={2} />
                  : <Eye size={18} color="#9CA3AF" strokeWidth={2} />}
              </TouchableOpacity>
            }
          />
        </View>

        <TouchableOpacity
          onPress={handleUpdate}
          disabled={loading}
          style={{ backgroundColor: loading ? Colors.tecnibus[400] : Colors.tecnibus[600], borderRadius: 14, paddingVertical: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 20, marginBottom: 32 }}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Check size={20} color="#ffffff" strokeWidth={2.5} />
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16, marginLeft: 8 }}>Actualizar Representante</Text>
            </>
          )}
        </TouchableOpacity>
      </KeyboardAwareScrollView>

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast({ ...toast, visible: false })}
      />
    </View>
  );
}
