import { Colors } from "@/lib/constants/colors";
import { changeAvatar } from "@/lib/services/storage.service";
import { haptic } from "@/lib/utils/haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Camera,
  Mail,
  Phone,
  Save,
  User,
} from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AnimatedCard, Avatar, Toast } from "../../components";
import { useAuth } from "../../contexts/AuthContext";
import { updateProfile } from "../../lib/services/profile.service";
import { useAlert } from "@/components/ui/AlertBox/useAlert";

export default function ParentProfileScreen() {
  const { showAlert } = useAlert();
  const router = useRouter();
  const { profile, refreshProfile } = useAuth();
  const insets = useSafeAreaInsets();
  const paddingTop = Math.max(insets.top + 8, 48);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState({
    visible: false,
    message: "",
    type: "success" as "success" | "error",
  });
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [formData, setFormData] = useState({
    nombre: profile?.nombre || "",
    apellido: profile?.apellido || "",
    telefono: profile?.telefono || "",
  });

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ visible: true, message, type });
  };

  const handleSave = async () => {
    if (isSaving) return;

    haptic.medium();
    setIsSaving(true);

    const result = await updateProfile(formData);

    if (result.success) {
      haptic.success();
      showToast("Perfil actualizado correctamente", "success");
      await refreshProfile();
      setIsEditing(false);
    } else {
      haptic.error();
      showToast(result.error || "Error al actualizar", "error");
    }

    setIsSaving(false);
  };

  const handleCancel = () => {
    haptic.light();
    setFormData({
      nombre: profile?.nombre || "",
      apellido: profile?.apellido || "",
      telefono: profile?.telefono || "",
    });
    setIsEditing(false);
  };

  const handleChangeAvatar = () => {
    if (!profile?.id) return;

    showAlert({ title: "Cambiar foto de perfil", message: "Selecciona una opción", type: "warning", buttons: [
        {
          text: "Tomar foto",
          onPress: () => uploadAvatarFromSource("camera"),
        },
        {
          text: "Elegir de galería",
          onPress: () => uploadAvatarFromSource("gallery"),
        },
        {
          text: "Cancelar",
          style: "cancel",
        },
      ] });
  };

  const uploadAvatarFromSource = async (source: "gallery" | "camera") => {
    if (!profile?.id) return;

    setUploadingAvatar(true);
    haptic.light();

    const result = await changeAvatar(profile.id, source);

    if (result.success) {
      haptic.success();
      showToast("Foto actualizada correctamente", "success");
      await refreshProfile();
    } else {
      haptic.error();
      showToast(result.error || "Error al subir foto", "error");
    }

    setUploadingAvatar(false);
  };

  return (
    <View className="flex-1" style={{ backgroundColor: "#F8FAFB" }}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.tecnibus[600]} />

      {/* Header con LinearGradient */}
      <LinearGradient
        colors={[Colors.tecnibus[600], Colors.tecnibus[500], Colors.tecnibus[400]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={{
          paddingTop,
          paddingBottom: 24,
          paddingHorizontal: 24,
          borderBottomLeftRadius: 24,
          borderBottomRightRadius: 24,
        }}
      >
        <View className="flex-row items-center justify-between mb-4">
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
            className="p-2 rounded-xl"
          >
            <ArrowLeft size={24} color="#ffffff" strokeWidth={2.5} />
          </TouchableOpacity>

          {!isEditing ? (
            <TouchableOpacity
              onPress={() => setIsEditing(true)}
              style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
              className="px-4 py-2 rounded-xl"
            >
              <Text className="text-white font-bold">Editar</Text>
            </TouchableOpacity>
          ) : (
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={handleCancel}
                className="bg-gray-500 px-4 py-2 rounded-xl"
              >
                <Text className="text-white font-bold">Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                className={`bg-green-600 px-4 py-2 rounded-xl flex-row items-center ${isSaving && "opacity-60"}`}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Save size={16} color="#ffffff" strokeWidth={2.5} />
                )}
                <Text className="text-white font-bold ml-2">
                  {isSaving ? "Guardando..." : "Guardar"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View className="flex-row items-center">
          <View className="mr-4 relative">
            <Avatar
              avatarUrl={profile?.avatar_url}
              size={72}
              onPress={isEditing ? handleChangeAvatar : undefined}
              backgroundColor={Colors.tecnibus[700]}
              iconColor="#ffffff"
            />
            {isEditing && (
              <View
                className="absolute bottom-0 right-0 p-1.5 rounded-full border-2 border-white"
                style={{ backgroundColor: Colors.tecnibus[600] }}
              >
                {uploadingAvatar ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Camera size={16} color="#ffffff" strokeWidth={2.5} />
                )}
              </View>
            )}
          </View>
          <View className="flex-1">
            <Text className="text-white text-2xl font-bold">Mi Perfil</Text>
            <Text style={{ color: "rgba(255,255,255,0.7)" }} className="text-sm mt-1">
              Padre de Familia
            </Text>
          </View>
        </View>
      </LinearGradient>

      <KeyboardAwareScrollView
        className="flex-1 px-6 pt-6"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        enableAutomaticScroll
        extraScrollHeight={20}
      >
        {/* Información Personal */}
        <AnimatedCard delay={0} className="mb-4">
          <Text className="text-lg font-bold text-gray-800 mb-4">
            Información Personal
          </Text>

          {/* Nombre */}
          <View className="mb-4">
            <View className="flex-row items-center mb-2">
              <User size={16} color={Colors.tecnibus[600]} strokeWidth={2.5} />
              <Text className="text-gray-700 font-semibold ml-2">Nombre</Text>
            </View>
            <TextInput
              className={`bg-gray-50 rounded-xl p-4 text-gray-800 ${
                !isEditing && "opacity-60"
              }`}
              value={formData.nombre}
              onChangeText={(text) =>
                setFormData({ ...formData, nombre: text })
              }
              editable={isEditing}
              placeholder="Ingresa tu nombre"
            />
          </View>

          {/* Apellido */}
          <View className="mb-4">
            <View className="flex-row items-center mb-2">
              <User size={16} color={Colors.tecnibus[600]} strokeWidth={2.5} />
              <Text className="text-gray-700 font-semibold ml-2">Apellido</Text>
            </View>
            <TextInput
              className={`bg-gray-50 rounded-xl p-4 text-gray-800 ${
                !isEditing && "opacity-60"
              }`}
              value={formData.apellido}
              onChangeText={(text) =>
                setFormData({ ...formData, apellido: text })
              }
              editable={isEditing}
              placeholder="Ingresa tu apellido"
            />
          </View>

          {/* Teléfono */}
          <View className="mb-4">
            <View className="flex-row items-center mb-2">
              <Phone size={16} color={Colors.tecnibus[600]} strokeWidth={2.5} />
              <Text className="text-gray-700 font-semibold ml-2">Teléfono</Text>
            </View>
            <TextInput
              className={`bg-gray-50 rounded-xl p-4 text-gray-800 ${
                !isEditing && "opacity-60"
              }`}
              value={formData.telefono}
              onChangeText={(text) =>
                setFormData({ ...formData, telefono: text })
              }
              editable={isEditing}
              placeholder="Ingresa tu teléfono"
              keyboardType="phone-pad"
            />
          </View>
        </AnimatedCard>

        {/* Información de Cuenta */}
        <AnimatedCard delay={100} className="mb-4">
          <Text className="text-lg font-bold text-gray-800 mb-4">
            Información de Cuenta
          </Text>

          {/* Correo (no editable) */}
          <View className="mb-4">
            <View className="flex-row items-center mb-2">
              <Mail size={16} color="#6b7280" strokeWidth={2.5} />
              <Text className="text-gray-700 font-semibold ml-2">
                Correo Electrónico
              </Text>
            </View>
            <View className="bg-gray-100 rounded-xl p-4 border-2 border-gray-200">
              <Text className="text-gray-600">
                {profile?.correo || "No disponible"}
              </Text>
            </View>
            <Text className="text-gray-500 text-xs mt-2">
              El correo no puede ser modificado
            </Text>
          </View>

          {/* Rol (no editable) */}
          <View className="mb-4">
            <View className="flex-row items-center mb-2">
              <User size={16} color="#6b7280" strokeWidth={2.5} />
              <Text className="text-gray-700 font-semibold ml-2">Rol</Text>
            </View>
            <View
              className="rounded-xl p-4 border-2"
              style={{
                backgroundColor: Colors.tecnibus[100],
                borderColor: Colors.tecnibus[200],
              }}
            >
              <Text style={{ color: Colors.tecnibus[800] }} className="font-bold">
                Padre de Familia
              </Text>
            </View>
          </View>
        </AnimatedCard>

        {/* Nota informativa */}
        {isEditing && (
          <View className="bg-yellow-100 rounded-xl p-4 mb-6 border-2 border-yellow-200">
            <Text className="text-yellow-800 text-sm text-center font-semibold">
              Presiona "Guardar" para aplicar los cambios
            </Text>
          </View>
        )}

        <View className="h-4" />
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
