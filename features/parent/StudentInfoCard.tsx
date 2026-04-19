import { Colors } from "@/lib/constants/colors";
import { EstudianteDelPadre } from "@/lib/services/students/padres.service";
import {
  ChevronDown,
  ChevronRight,
  Clock,
  GraduationCap,
} from "lucide-react-native";
import { Text, TouchableOpacity, View } from "react-native";

interface StudentInfoCardProps {
  estudiante: EstudianteDelPadre | null;
  etaMinutes: string;
  busStatus: string;
  onViewDetails: () => void;
  onChangeStudent: () => void;
  multipleStudents: boolean;
}

export function StudentInfoCard({
  estudiante,
  etaMinutes,
  busStatus,
  onViewDetails,
  onChangeStudent,
  multipleStudents,
}: StudentInfoCardProps) {
  if (!estudiante) {
    return null;
  }

  return (
    <View
      style={{
        marginTop: -40,
        marginHorizontal: 20,
        backgroundColor: "#ffffff",
        borderRadius: 20,
        padding: 20,
        shadowColor: Colors.tecnibus[600],
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 12,
      }}
    >
      {/* Header: estudiante + cambiar */}
      <View className="flex-row items-center justify-between mb-5">
        <View className="flex-row items-center flex-1">
          <View
            className="items-center justify-center"
            style={{
              width: 52,
              height: 52,
              borderRadius: 26,
              backgroundColor: Colors.tecnibus[100],
              marginRight: 14,
            }}
          >
            <GraduationCap
              size={28}
              color={Colors.tecnibus[600]}
              strokeWidth={2.5}
            />
          </View>
          <View className="flex-1">
            <Text
              className="font-bold font-calsans"
              style={{ fontSize: 18, color: "#111827", marginBottom: 2 }}
            >
              {estudiante.nombreCompleto}
            </Text>
            <Text className="text-gray-500" style={{ fontSize: 13 }}>
              {estudiante.parada?.ruta?.nombre || "Sin ruta asignada"}
            </Text>
          </View>
        </View>

        {multipleStudents && (
          <TouchableOpacity
            onPress={onChangeStudent}
            activeOpacity={0.7}
            style={{
              backgroundColor: Colors.tecnibus[100],
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 12,
            }}
          >
            <ChevronDown
              size={20}
              color={Colors.tecnibus[600]}
              strokeWidth={2.5}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Divider */}
      <View className="h-px bg-gray-200 mb-5" />

      {/* ETA + Status */}
      <View className="flex-row items-center justify-between">
        {/* ETA */}
        <View className="flex-1 mr-3">
          <View className="flex-row items-center mb-2">
            <Clock size={16} color={Colors.tecnibus[600]} strokeWidth={2.5} />
            <Text
              className="text-gray-500 font-semibold ml-2"
              style={{ fontSize: 12 }}
            >
              Tiempo estimado
            </Text>
          </View>
          <Text
            className="font-bold font-calsans"
            style={{ fontSize: 22, color: Colors.tecnibus[700] }}
          >
            {etaMinutes}
          </Text>
        </View>

        {/* Status Badge */}
        <View
          style={{
            backgroundColor:
              busStatus === "En camino" ? Colors.tecnibus[100] : "#F3F4F6",
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 14,
          }}
        >
          <Text
            className="font-bold"
            style={{
              fontSize: 13,
              color:
                busStatus === "En camino" ? Colors.tecnibus[700] : "#6B7280",
            }}
          >
            {busStatus}
          </Text>
        </View>
      </View>

      {/* Ver detalles */}
      <TouchableOpacity
        onPress={onViewDetails}
        activeOpacity={0.7}
        className="flex-row items-center justify-center mt-5"
        style={{
          backgroundColor: Colors.tecnibus[50],
          paddingVertical: 12,
          borderRadius: 12,
        }}
      >
        <Text
          className="font-semibold"
          style={{ fontSize: 14, color: Colors.tecnibus[700] }}
        >
          Ver más detalles
        </Text>
        <ChevronRight
          size={18}
          color={Colors.tecnibus[700]}
          strokeWidth={2.5}
          style={{ marginLeft: 4 }}
        />
      </TouchableOpacity>
    </View>
  );
}
