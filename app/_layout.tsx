import SplashScreen from "@/components/SplashScreen";
import { AlertProvider } from "@/components/ui/AlertBox/AlertProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { useState } from "react";
import { Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthGuard } from "../components/AuthGuard";
import { AuthProvider } from "../contexts/AuthContext";
import "../global.css";
import { useNotificationNavigation } from "../lib/hooks/useNotificationNavigation";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutos
    },
  },
});

/**
 * Componente interno que contiene el Stack y maneja las notificaciones
 * Se ejecuta DESPUÉS de que AuthProvider esté listo
 */
function AppContent() {
  // Hook que maneja navegación desde notificaciones (solo cuando hay sesión)
  useNotificationNavigation();

  return (
    <AuthGuard>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "fade",
          animationDuration: 200,
        }}
      >
        <Stack.Screen name="index" options={{ animation: "none" }} />
        <Stack.Screen
          name="parent/chat"
          options={{ animation: "fade", animationDuration: 200 }}
        />
        <Stack.Screen
          name="driver/chat"
          options={{ animation: "fade", animationDuration: 200 }}
        />
      </Stack>
    </AuthGuard>
  );
}

export default function RootLayout() {
  // Estado para controlar el splash screen animado
  const [isAppReady, setIsAppReady] = useState(false);
  // Cargar fuentes personalizadas (si las hay)
  const [fontsLoaded] = useFonts({
    "Cal-Sans": require("../assets/fonts/CalSans-Regular.ttf"),
  });
  // Mostrar splash screen PRIMERO
  if (!isAppReady || !fontsLoaded) {
    return (
      <SplashScreen
        onFinish={(isCancelled) => !isCancelled && setIsAppReady(true)}
      />
    );
  }

  // Luego montar la app con AuthProvider
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <AlertProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </AlertProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
