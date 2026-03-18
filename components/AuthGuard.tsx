import { useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useAuth } from "../contexts/AuthContext";
/**
 * Componente que protege las rutas y redirige según el rol del usuario
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const segments = useSegments() as string[];
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const firstSegment = segments[0];
    const inLoginScreen = firstSegment === "login" || firstSegment === "index";
    // No autenticado → login
    if (!user && !inLoginScreen) {
      router.replace("/login");
      return;
    }
    // Autenticado → redirección por rol (el tour se muestra sobre el dashboard)
    if (user && profile) {
      const expectedPath =
        profile.rol === "admin"
          ? "admin"
          : profile.rol === "padre"
            ? "parent"
            : "driver";
      if (firstSegment !== expectedPath) {
        router.replace(`/${expectedPath}` as any);
      }
    }
  }, [user, profile, loading, segments]);

  if (loading) {
    return (
      <View className="flex-1 bg-primary-600 items-center justify-center">
        <ActivityIndicator size="large" color="#fff" />
        <Text className="text-white mt-4">Verificando sesión...</Text>
      </View>
    );
  }
  return <>{children}</>;
}
