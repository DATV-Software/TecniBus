import { Colors } from "@/lib/constants/colors";
import { haptic } from "@/lib/utils/haptics";
import { useRouter } from "expo-router";
import { ChevronRight, LogOut, Settings, User } from "lucide-react-native";
import {
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { AnimatedCard } from "../../components";
import { BottomNavigation } from "../../components/layout/BottomNavigation";
import { DashboardHeader } from "../../components/layout/DashboardHeader";
import { useAuth } from "../../contexts/AuthContext";

export default function ParentSettingsScreen() {
  const router = useRouter();
  const { signOut, profile } = useAuth();

  const handleLogout = async () => {
    haptic.warning();
    await signOut();
  };

  const handleViewProfile = () => {
    haptic.light();
    router.push("/parent/perfil");
  };

  return (
    <View className="flex-1" style={{ backgroundColor: "#F8FAFB" }}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.tecnibus[600]} />

      <DashboardHeader
        icon={Settings}
        title="AJUSTES"
        subtitle={`${profile?.nombre || ""} ${profile?.apellido || ""}`}
      />

      <ScrollView
        className="flex-1 px-6 pt-6"
        showsVerticalScrollIndicator={false}
      >
        {/* Sección Cuenta */}
        <AnimatedCard delay={0} className="mb-4">
          <Text className="text-lg font-bold text-gray-800 mb-4">
            Mi Cuenta
          </Text>

          <TouchableOpacity
            className="bg-gray-50 rounded-xl p-4 flex-row items-center justify-between"
            onPress={handleViewProfile}
            activeOpacity={0.7}
          >
            <View className="flex-row items-center flex-1">
              <View
                className="p-2 rounded-lg"
                style={{ backgroundColor: Colors.tecnibus[100] }}
              >
                <User size={24} color={Colors.tecnibus[600]} strokeWidth={2.5} />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-gray-800 font-bold text-base">
                  Ver Mi Perfil
                </Text>
                <Text className="text-gray-500 text-xs">
                  Editar información personal
                </Text>
              </View>
            </View>
            <ChevronRight size={20} color="#9ca3af" strokeWidth={2.5} />
          </TouchableOpacity>
        </AnimatedCard>

        {/* Sección Sesión */}
        <AnimatedCard delay={100} className="mb-4">
          <Text className="text-lg font-bold text-gray-800 mb-4">Sesión</Text>

          <TouchableOpacity
            className="bg-red-50 rounded-xl p-4 flex-row items-center justify-between border-2 border-red-200"
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <View className="flex-row items-center flex-1">
              <View className="bg-red-500 p-2 rounded-lg">
                <LogOut size={24} color="#ffffff" strokeWidth={2.5} />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-red-700 font-bold text-base">
                  Cerrar Sesión
                </Text>
                <Text className="text-red-600 text-xs">
                  Salir de tu cuenta
                </Text>
              </View>
            </View>
            <ChevronRight size={20} color="#dc2626" strokeWidth={2.5} />
          </TouchableOpacity>
        </AnimatedCard>

        {/* Spacer para BottomNavigation */}
        <View style={{ height: 100 }} />
      </ScrollView>

      <BottomNavigation
        activeTab="settings"
        onHomePress={() => router.back()}
        onMiddlePress={() => router.back()}
        onSettingsPress={() => {}}
      />
    </View>
  );
}
