import { Colors } from "@/lib/constants/colors";
import { StatCard } from "@/components/ui/StatCard";
import { DashboardStats } from "@/lib/services/stats.service";
import { Bus, GraduationCap, User, Users } from "lucide-react-native";
import { View } from "react-native";

interface AdminStatsGridProps {
  stats: DashboardStats;
  onStudentsPress: () => void;
  onDriversPress: () => void;
  onParentsPress: () => void;
  onBusesPress: () => void;
}

export function AdminStatsGrid({
  stats,
  onStudentsPress,
  onDriversPress,
  onParentsPress,
  onBusesPress,
}: AdminStatsGridProps) {
  return (
    <View style={{ zIndex: 10 }}>
      <View className="flex-row" style={{ gap: 12, marginBottom: 12 }}>
        <StatCard
          icon={GraduationCap}
          iconColor={Colors.tecnibus[700]}
          iconBgColor={Colors.tecnibus[100]}
          value={stats.totalStudents}
          label="ESTUDIANTES"
          onPress={onStudentsPress}
        />
        <StatCard
          icon={User}
          iconColor={Colors.tecnibus[600]}
          iconBgColor={Colors.tecnibus[200]}
          value={stats.totalDrivers}
          label="CONDUCTORES"
          onPress={onDriversPress}
        />
      </View>
      <View className="flex-row" style={{ gap: 12 }}>
        <StatCard
          icon={Users}
          iconColor={Colors.tecnibus[500]}
          iconBgColor={Colors.tecnibus[100]}
          value={stats.totalParents}
          label="PADRES"
          onPress={onParentsPress}
        />
        <StatCard
          icon={Bus}
          iconColor={Colors.tecnibus[800]}
          iconBgColor={Colors.tecnibus[200]}
          value={stats.totalBuses}
          label="BUSES"
          onPress={onBusesPress}
        />
      </View>
    </View>
  );
}
