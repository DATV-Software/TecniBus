import SplashScreen from "@/components/SplashScreen";
import { AlertProvider } from "@/components/ui/AlertBox/AlertProvider";
import Toast from "@/components/Toast";
import { networkDetector } from "@/lib/network/networkDetector";
import { networkQueue } from "@/lib/network/NetworkQueue";
import { registerAllExecutors } from "@/lib/network/offlineActions";
import { useSyncQueue } from "@/lib/hooks/useSyncQueue";
import { useNetworkStatus } from "@/lib/hooks/useNetworkStatus";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthGuard } from "../components/AuthGuard";
import { AuthProvider } from "../contexts/AuthContext";
import "../global.css";
import { useNotificationNavigation } from "../lib/hooks/useNotificationNavigation";
import { TourProvider } from "@/features/tour";

// ── Initialize network system once, at module load time ──────────────────────
// Executors must be registered before any queued action can be replayed
registerAllExecutors();

// Start network detection + load persisted queue
Promise.all([
  networkDetector.initialize(),
  networkQueue.load(),
]).catch((e) => console.error('[Layout] Network init error:', e));
// ─────────────────────────────────────────────────────────────────────────────

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutos
    },
  },
});

/**
 * Componente interno que contiene el Stack y maneja las notificaciones.
 * Se ejecuta DESPUÉS de que AuthProvider esté listo.
 *
 * Also activates the sync queue: if there are pending actions from a previous
 * session, they will be processed as soon as the network is available.
 */
function AppContent() {
  useNotificationNavigation();
  useSyncQueue();

  const { isOnline } = useNetworkStatus();
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'error' | 'success' }>({
    visible: false, message: '', type: 'error',
  });
  const prevOnlineRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (networkDetector.isOnline && networkQueue.pendingCount > 0) {
      void networkQueue.processQueue();
    }
  }, []);

  useEffect(() => {
    if (prevOnlineRef.current === null) {
      prevOnlineRef.current = isOnline;
      return;
    }
    if (!isOnline && prevOnlineRef.current) {
      setToast({ visible: true, message: 'Sin conexión a internet', type: 'error' });
    } else if (isOnline && !prevOnlineRef.current) {
      setToast({ visible: true, message: 'Conexión restaurada', type: 'success' });
    }
    prevOnlineRef.current = isOnline;
  }, [isOnline]);

  return (
    <View style={{ flex: 1 }}>
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        duration={3000}
        onHide={() => setToast((t) => ({ ...t, visible: false }))}
      />
      <TourProvider>
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
      </TourProvider>
    </View>
  );
}

export default function RootLayout() {
  const [isAppReady, setIsAppReady] = useState(false);
  const [fontsLoaded] = useFonts({
    "Cal-Sans": require("../assets/fonts/CalSans-Regular.ttf"),
  });

  if (!isAppReady || !fontsLoaded) {
    return (
      <SplashScreen
        onFinish={(isCancelled) => !isCancelled && setIsAppReady(true)}
      />
    );
  }

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
