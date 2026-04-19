import { Colors } from "@/lib/constants/colors";
import { haptic } from "@/lib/utils/haptics";
import { useKeyboardHeight } from "@/lib/hooks/useKeyboardHeight";
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  Save,
  User,
  UserCircle,
  Users,
  X,
} from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { crearUsuario } from "@/lib/services/admin/admin.service";
import { FormField } from "./FormField";

interface CreateUserModalProps {
  visible: boolean;
  onClose: () => void;
  userType: "chofer" | "padre";
  onSuccess: () => void;
  onToast: (message: string, type: "success" | "error" | "warning") => void;
}

const CONFIG = {
  chofer: {
    title: "Nuevo Conductor",
    subtitle: "Crear cuenta de conductor",
    icon: UserCircle,
    namePlaceholder: "Nombre del conductor",
    lastNamePlaceholder: "Apellido del conductor",
    emailPlaceholder: "conductor@ejemplo.com",
    successMsg: "Conductor creado correctamente",
    errorMsg: "Error al crear conductor",
    infoMsg:
      "El conductor recibirá acceso para gestionar recorridos y ver estudiantes asignados.",
  },
  padre: {
    title: "Nuevo Representante",
    subtitle: "Crear cuenta de representante",
    icon: Users,
    namePlaceholder: "Nombre del representante",
    lastNamePlaceholder: "Apellido del representante",
    emailPlaceholder: "padre@ejemplo.com",
    successMsg: "Representante creado correctamente",
    errorMsg: "Error al crear representante",
    infoMsg:
      "El representante podrá ver información de sus estudiantes y marcar asistencia.",
  },
};

export function CreateUserModal({
  visible,
  onClose,
  userType,
  onSuccess,
  onToast,
}: CreateUserModalProps) {
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const config = CONFIG[userType];

  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setNombre("");
    setApellido("");
    setEmail("");
    setPassword("");
    setShowPassword(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validar = (): boolean => {
    if (!nombre.trim()) {
      onToast("Ingresa el nombre", "warning");
      return false;
    }
    if (!apellido.trim()) {
      onToast("Ingresa el apellido", "warning");
      return false;
    }
    if (!email.trim() || !email.includes("@")) {
      onToast("Ingresa un correo válido", "warning");
      return false;
    }
    if (password.length < 6) {
      onToast("La contraseña debe tener al menos 6 caracteres", "warning");
      return false;
    }
    return true;
  };

  const handleCrear = async () => {
    if (!validar()) return;

    haptic.medium();
    setLoading(true);

    const result = await crearUsuario({
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      email: email.trim().toLowerCase(),
      password,
      rol: userType,
    });

    setLoading(false);

    if (result.success) {
      onToast(config.successMsg, "success");
      resetForm();
      onClose();
      onSuccess();
    } else {
      onToast(result.error || config.errorMsg, "error");
    }
  };

  const Icon = config.icon;

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
              maxHeight: "90%",
            }}
          >
            {/* Handle + Header */}
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
                <Icon size={22} color={Colors.tecnibus[600]} strokeWidth={2} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text
                  style={{ fontSize: 18, fontWeight: "700", color: "#1F2937" }}
                >
                  {config.title}
                </Text>
                <Text style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>
                  {config.subtitle}
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
                label="Nombre"
                icon={User}
                required
                placeholder={config.namePlaceholder}
                value={nombre}
                onChangeText={setNombre}
                autoCapitalize="words"
              />
              <FormField
                label="Apellido"
                icon={User}
                required
                placeholder={config.lastNamePlaceholder}
                value={apellido}
                onChangeText={setApellido}
                autoCapitalize="words"
              />
              <FormField
                label="Correo electrónico"
                icon={Mail}
                required
                placeholder={config.emailPlaceholder}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <FormField
                label="Contraseña"
                icon={Lock}
                required
                placeholder="Contraseña temporal"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                rightIcon={
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff size={18} color="#6B7280" strokeWidth={2} />
                    ) : (
                      <Eye size={18} color="#6B7280" strokeWidth={2} />
                    )}
                  </TouchableOpacity>
                }
              />

              {/* Info tip */}
              <View
                style={{
                  backgroundColor: Colors.tecnibus[50],
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 16,
                  borderWidth: 1,
                  borderColor: Colors.tecnibus[200],
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    color: Colors.tecnibus[800],
                    textAlign: "center",
                  }}
                >
                  {config.infoMsg}
                </Text>
              </View>

              {/* Submit */}
              <TouchableOpacity
                onPress={handleCrear}
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
                      Crear {userType === "chofer" ? "Conductor" : "Representante"}
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
