import { View } from "react-native";
import { ActionCard } from "@/components/ui/ActionCard";
import { BarChart2, MapPin, Megaphone, Navigation } from "lucide-react-native";
import { Colors } from "@/lib/constants/colors";

interface AdminQuickActionsProps {
  onRoutesPress: () => void;
  onAnnouncementsPress: () => void;
  onAssignmentsPress: () => void;
  onReportesPress: () => void;
}

export function AdminQuickActions({
  onRoutesPress,
  onAnnouncementsPress,
  onAssignmentsPress,
  onReportesPress,
}: AdminQuickActionsProps) {
  return (
    <View style={{ paddingHorizontal: 20 }}>
      <View className="flex-row" style={{ gap: 12, marginBottom: 12 }}>
        <View className="flex-1">
          <ActionCard
            icon={MapPin}
            iconColor={Colors.tecnibus[600]}
            iconBgColor={Colors.tecnibus[100]}
            title="Rutas"
            description="Optimizar y visualizar trayectos."
            onPress={onRoutesPress}
          />
        </View>
        <View className="flex-1">
          <ActionCard
            icon={Navigation}
            iconColor={Colors.tecnibus[700]}
            iconBgColor={Colors.tecnibus[200]}
            title="Asignaciones"
            description="Vincular conductor y bus."
            onPress={onAssignmentsPress}
          />
        </View>
      </View>
      <View className="flex-row" style={{ gap: 12 }}>
        <View className="flex-1">
          <ActionCard
            icon={Megaphone}
            iconColor="#ffffff"
            iconBgColor="rgba(255,255,255,0.2)"
            title="Anuncios"
            description="Enviar notificaciones a padres."
            onPress={onAnnouncementsPress}
            badge="NEW"
            variant="filled"
            filledBgColor={Colors.tecnibus[500]}
          />
        </View>
        <View className="flex-1">
          <ActionCard
            icon={BarChart2}
            iconColor={Colors.tecnibus[700]}
            iconBgColor={Colors.tecnibus[100]}
            title="Reportes"
            description="Estadísticas y análisis."
            onPress={onReportesPress}
          />
        </View>
      </View>
    </View>
  );
}
