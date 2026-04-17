import { Fingerprint, Lock, Mail } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { useAlert } from "@/components/ui/AlertBox/useAlert";
import {
  ActivityIndicator,
  Image,
  Keyboard,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { useBiometricAuth } from "@/lib/hooks/useBiometricAuth";
import { haptic } from "@/lib/utils/haptics";
import { useShadow } from "@/lib/utils/shadows";
import { Toast } from "../components";
import { useAuth } from "../contexts/AuthContext";

/* =====================
   AUTH ERROR MAPPING
====================== */
const AUTH_ERROR_MAP: {
  test: (msg: string) => boolean;
  text: string;
}[] = [
  {
    test: (msg) => msg.includes("invalid login credentials"),
    text: "Correo o contraseña incorrectos",
  },
  {
    test: (msg) => msg.includes("invalid email"),
    text: "El correo no tiene un formato válido",
  },
  {
    test: (msg) => msg.includes("email not confirmed"),
    text: "Debes confirmar tu correo electrónico",
  },
  {
    test: (msg) => msg.includes("too many requests"),
    text: "Demasiados intentos. Intenta más tarde",
  },
  {
    test: (msg) => msg.includes("network"),
    text: "Error de conexión. Revisa tu internet",
  },
];

function getAuthErrorMessage(error: Error): string {
  const message = error.message.toLowerCase();

  for (const rule of AUTH_ERROR_MAP) {
    if (rule.test(message)) {
      return rule.text;
    }
  }

  return "No se pudo iniciar sesión. Intenta nuevamente";
}

export default function LoginScreen() {
  const { showAlert } = useAlert();
  const { signIn, user, profile, loading: authLoading } = useAuth();
  const shadow = useShadow("lg");
  const { isBiometricSupported, hasSavedCredentials, handleBiometricAuth, saveCredentials } = useBiometricAuth();

  const scrollRef = useRef<ScrollView>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showRedirecting, setShowRedirecting] = useState(false);

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "warning">(
    "warning",
  );

  /* =====================
     ANIMACIONES
  ====================== */
  const logoScale = useSharedValue(0.8);
  const logoOpacity = useSharedValue(0);
  const formTranslateY = useSharedValue(30);
  const formOpacity = useSharedValue(0);

  useEffect(() => {
    logoScale.value = withTiming(1, {
      duration: 600,
      easing: Easing.out(Easing.cubic),
    });
    logoOpacity.value = withTiming(1, {
      duration: 600,
      easing: Easing.out(Easing.cubic),
    });

    setTimeout(() => {
      formTranslateY.value = withTiming(0, {
        duration: 500,
        easing: Easing.out(Easing.cubic),
      });
      formOpacity.value = withTiming(1, {
        duration: 500,
        easing: Easing.out(Easing.cubic),
      });
    }, 200);

    // Scroll unificado al abrir teclado
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, () => {
      scrollRef.current?.scrollTo({ y: 140, animated: true });
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* =====================
   REDIRECCIÓN AUTOMÁTICA
  ====================== */
  useEffect(() => {
    if (user && profile && !authLoading) {
      setShowRedirecting(true);
    }
  }, [user, profile, authLoading]);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));

  const formStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: formTranslateY.value }],
    opacity: formOpacity.value,
  }));

  /* =====================
     TOAST
  ====================== */
  const showToast = (
    message: string,
    type: "success" | "error" | "warning",
  ) => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  /* =====================
     BIOMETRIC AUTH
  ====================== */
  const onBiometricAuth = () => {
    handleBiometricAuth(
      signIn,
      (savedEmail, savedPassword) => {
        setEmail(savedEmail);
        setPassword(savedPassword);
        showToast("Inicio de sesión exitoso", "success");
      },
      (errorMessage) => {
        setIsLoading(false);
        showToast(errorMessage, "error");
      },
    );
  };

  /* =====================
     LOGIN
  ====================== */
  const handleLogin = async () => {
    if (!email.trim()) {
      showToast("Ingresa tu correo electrónico", "warning");
      haptic.warning();
      return;
    }

    if (!password) {
      showToast("Ingresa tu contraseña", "warning");
      haptic.warning();
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      showToast("Formato de correo inválido", "warning");
      haptic.warning();
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await signIn(email, password);

      if (error) {
        setIsLoading(false);
        showToast(`${getAuthErrorMessage(error)}`, "error");
        haptic.error();
      } else {
        showToast("Inicio de sesión exitoso", "success");
        haptic.success();
        await saveCredentials(email, password);
      }
    } catch (_error) {
      setIsLoading(false);
      showToast("Error inesperado. Intenta nuevamente", "error");
      haptic.error();
    }
  };

  /* =====================
   LOADING SCREEN
  ====================== */
  if (showRedirecting) {
    return (
      <View className="flex-1 bg-tecnibus-600 items-center justify-center">
        <ActivityIndicator size="large" color="#ffffff" />
        <Text className="text-white mt-4 text-base">Redirigiendo...</Text>
      </View>
    );
  }

  /* =====================
     UI
  ====================== */
  return (
    <View style={{ flex: 1, backgroundColor: "#eff6ff" }}>
      <StatusBar barStyle="dark-content" backgroundColor="#eff6ff" />

      <Toast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onHide={() => setToastVisible(false)}
      />

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 320 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        scrollEnabled={false}
      >
        <View className="flex-1 px-6 pt-40 pb-8">
          {/* Header */}
          <Animated.View style={logoStyle} className="items-center mb-8">
            <View className="items-center w-full">
              <View className="bg-white-500">
                <Image
                  source={require("../assets/images/adaptive-icon.png")}
                  className="w-80 h-80 -mb-14 -mt-24"
                  resizeMode="contain"
                />
              </View>
              <Text className="text-4xl font-calsans text-tecnibus-400 text-center">
                TecniBus
              </Text>
              <Text className="font-calsans text-gray-600 mt-5 text-center">
                Sistema de Gestión de Transporte Escolar
              </Text>
            </View>
          </Animated.View>

          {/* Form */}
          <Animated.View style={formStyle}>
            <View className="bg-white rounded-3xl p-6 mb-7" style={shadow}>
              {/* Email */}
              <View className="mb-4">
                <Text className="text-sm font-calsans text-gray-700 mb-2">
                  Correo electrónico
                </Text>
                <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                  <Mail size={20} color="#6b7280" />
                  <TextInput
                    className="flex-1 ml-3 text-base text-gray-800"
                    placeholder="ejemplo@correo.com"
                    placeholderTextColor="#9ca3af"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={!isLoading}
                  />
                </View>
              </View>

              {/* Password */}
              <View className="mb-2">
                <Text className="text-sm font-calsans text-gray-700 mb-2">
                  Contraseña
                </Text>
                <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                  <Lock size={20} color="#6b7280" />
                  <TextInput
                    className="flex-1 ml-3 text-base text-gray-800"
                    placeholder="••••••••"
                    placeholderTextColor="#9ca3af"
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                    editable={!isLoading}
                    onSubmitEditing={handleLogin}
                  />
                </View>
              </View>

              {/* Reset password */}
              <TouchableOpacity
                onPress={() => showAlert({ title: 'Recuperar contraseña', message: 'Contacta al administrador de tu institución para restablecer tu contraseña.', type: 'info' })}
                activeOpacity={0.7}
                className="self-end mb-2"
              >
                <Text className="text-tecnibus-500 text-sm font-calsans">
                  ¿Olvidaste tu contraseña?
                </Text>
              </TouchableOpacity>
            </View>

            {/* Button */}
            <TouchableOpacity
              className={`py-4 rounded-xl ${
                isLoading ? "bg-gray-300" : "bg-tecnibus-500"
              }`}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <View className="flex-row items-center justify-center">
                  <ActivityIndicator size="small" color="#ffffff" />
                  <Text className="text-white text-lg font-calsans ml-2">
                    Iniciando sesión...
                  </Text>
                </View>
              ) : (
                <Text className="text-white text-center text-lg font-calsans">
                  Iniciar Sesión
                </Text>
              )}
            </TouchableOpacity>

            {/* Botón de Autenticación Biométrica */}
            {isBiometricSupported && hasSavedCredentials && !isLoading && (
              <TouchableOpacity
                className="py-4 rounded-xl bg-gray-100 border-2 border-tecnibus-200 mt-3 flex-row items-center justify-center"
                onPress={onBiometricAuth}
                activeOpacity={0.8}
              >
                <Fingerprint size={24} color="#3DA7D7" strokeWidth={2.5} />
                <Text className="text-tecnibus-500 text-lg font-calsans ml-2">
                  Iniciar con Biometría
                </Text>
              </TouchableOpacity>
            )}

            {/* Mensajes informativos */}
            <View className="mt-6 space-y-2">
              <Text className="text-center text-gray-600 text-sm mt-3 font-calsans">
                ¿No tienes cuenta?{" "}
                <Text
                  onPress={() => showAlert({ title: 'Contacto', message: 'Para crear una cuenta, contacta al administrador de tu institución.', type: 'info' })}
                  className="text-tecnibus-500 underline"
                >
                  Contacta a tu institución
                </Text>
              </Text>
            </View>
          </Animated.View>
        </View>
      </ScrollView>
    </View>
  );
}
